"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Phone, PhoneOff, Mic, MicOff, Bot, User, Volume2, VolumeX, Loader2 } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";

type CallStatus = "ready" | "connecting" | "connected" | "ended" | "error";
type SpeakerStatus = "idle" | "speaking";

interface WebCallPageProps {
  params: Promise<{ locale: string; callId: string }>;
}

interface TranscriptMessage {
  id: number;
  speaker: "agent" | "user";
  text: string;
  timestamp: number;
  isFinal: boolean;
}

interface RetellWebClient {
  on(event: string, callback: (data?: unknown) => void): void;
  startCall(options: { accessToken: string; emitRawAudioSamples?: boolean }): Promise<void>;
  stopCall(): void;
  mute(): void;
  unmute(): void;
  startAudioPlayback?(): Promise<void>;
}

interface RetellUpdateEvent {
  event_type: "update";
  transcript: Array<{
    role: "agent" | "user";
    content: string;
  }>;
}

declare global {
  interface Window {
    retellClientJsSdk?: {
      RetellWebClient: new () => RetellWebClient;
    };
  }
}

export default function WebCallPage({ params }: WebCallPageProps) {
  const [locale, setLocale] = useState<string>("zh");
  const [callId, setCallId] = useState<string>("");
  const [callStatus, setCallStatus] = useState<CallStatus>("ready");
  const [agentStatus, setAgentStatus] = useState<SpeakerStatus>("idle");
  const [userStatus, setUserStatus] = useState<SpeakerStatus>("idle");
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);
  const [currentText, setCurrentText] = useState<{ agent: string; user: string }>({ agent: "", user: "" });
  const [networkStatus, setNetworkStatus] = useState<"good" | "poor" | "disconnected">("good");

  const clientRef = useRef<RetellWebClient | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptIdRef = useRef(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const t = useTranslations("webCall");
  const tCommon = useTranslations("common");

  // Mark as client-side and get params
  useEffect(() => {
    setIsClient(true);
    params.then((p) => {
      setLocale(p.locale);
      setCallId(p.callId);
    });
  }, [params]);

  // Load SDK via module script
  useEffect(() => {
    if (!isClient || sdkLoaded) return;

    if (window.retellClientJsSdk?.RetellWebClient) {
      setSdkLoaded(true);
      return;
    }

    const handleReady = () => {
      if (window.retellClientJsSdk?.RetellWebClient) {
        setSdkLoaded(true);
        setSdkError(null);
      } else {
        setSdkError("SDK 初始化失败，请刷新页面重试");
        setCallStatus("error");
      }
    };

    const handleError = (e: CustomEvent) => {
      console.error("SDK load error:", e.detail);
      const detail = e.detail as { message?: string; attempts?: number };
      const errorMsg = detail?.message 
        ? `SDK 加载失败: ${detail.message}` 
        : "SDK 加载失败，请检查网络连接后刷新页面重试";
      setSdkError(errorMsg);
      setError(errorMsg);
      setCallStatus("error");
    };

    window.addEventListener("retell-sdk-ready", handleReady);
    window.addEventListener("retell-sdk-error", handleError as EventListener);

    const script = document.createElement("script");
    script.type = "module";
    script.src = "/sdk/retell-loader.mjs";
    script.onerror = () => {
      setSdkError("无法加载 SDK 脚本，请检查网络连接");
      setError("无法加载 SDK 脚本，请检查网络连接");
      setCallStatus("error");
    };
    document.head.appendChild(script);

    return () => {
      window.removeEventListener("retell-sdk-ready", handleReady);
      window.removeEventListener("retell-sdk-error", handleError as EventListener);
    };
  }, [isClient, sdkLoaded]);

  // Get access token from URL params
  useEffect(() => {
    if (!isClient) return;
    
    const token = searchParams.get("token");
    if (token) {
      setAccessToken(token);
    } else {
      setError("缺少访问令牌，请从通话管理页面重新发起");
      setCallStatus("error");
    }
  }, [searchParams, isClient]);

  // Auto-scroll transcripts
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [transcripts, currentText]);

  // Request microphone permission and start call
  const handleStartCall = useCallback(async () => {
    if (!accessToken) {
      setError("缺少访问令牌");
      setCallStatus("error");
      return;
    }

    if (!sdkLoaded || !window.retellClientJsSdk?.RetellWebClient) {
      setError("SDK 未加载完成，请稍后重试");
      setCallStatus("error");
      return;
    }

    setCallStatus("connecting");
    setError(null);
    setTranscripts([]);
    setCurrentText({ agent: "", user: "" });

    try {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
      } catch (permError) {
        console.error("Microphone permission denied:", permError);
        setError("麦克风权限被拒绝，请在浏览器设置中允许访问麦克风");
        setCallStatus("error");
        return;
      }

      const client = new window.retellClientJsSdk!.RetellWebClient();
      clientRef.current = client;

      console.log("[WebCall] Setting up event listeners...");

      client.on("call_started", () => {
        console.log("[WebCall] EVENT: call_started");
        setCallStatus("connected");
        startDurationTimer();
        toast.success(t("connected"));
      });

      client.on("call_ready", () => {
        console.log("[WebCall] EVENT: call_ready - audio playback starting");
        client.startAudioPlayback?.();
      });

      client.on("call_ended", () => {
        console.log("[WebCall] EVENT: call_ended");
        setCallStatus("ended");
        setAgentStatus("idle");
        setUserStatus("idle");
        stopDurationTimer();
        clientRef.current = null;
      });

      client.on("error", (err: unknown) => {
        console.error("[WebCall] EVENT: error -", err);
        const errorMsg = typeof err === 'string' ? err : "通话发生错误";
        setError(errorMsg);
        setCallStatus("error");
        stopDurationTimer();
      });

      // Listen for metadata event (might contain transcript)
      client.on("metadata", (data: unknown) => {
        console.log("[WebCall] EVENT: metadata -", JSON.stringify(data, null, 2));
      });

      // Listen for node_transition event
      client.on("node_transition", (data: unknown) => {
        console.log("[WebCall] EVENT: node_transition -", JSON.stringify(data, null, 2));
      });

      client.on("agent_start_talking", () => {
        console.log("[WebCall] Agent started talking");
        setAgentStatus("speaking");
      });

      client.on("agent_stop_talking", () => {
        console.log("[WebCall] Agent stopped talking");
        setAgentStatus("idle");
      });

      // Handle transcript updates - with comprehensive debugging
      client.on("update", (data: unknown) => {
        console.log("[WebCall] UPDATE EVENT RECEIVED:", JSON.stringify(data, null, 2));
        
        try {
          const update = data as RetellUpdateEvent;
          
          // Handle array format transcript: [{ role, content }, ...]
          if (update.event_type === "update" && Array.isArray(update.transcript)) {
            console.log("[WebCall] Processing transcript array with", update.transcript.length, "items");
            
            // Process each transcript item
            update.transcript.forEach((item) => {
              if (item.role && item.content) {
                console.log(`[WebCall] Processing - role: ${item.role}, content: "${item.content}"`);
                
                if (item.role === "agent") {
                  setAgentStatus("speaking");
                  setCurrentText(prev => ({ ...prev, agent: item.content }));
                } else if (item.role === "user") {
                  setUserStatus("speaking");
                  setCurrentText(prev => ({ ...prev, user: item.content }));
                }
              }
            });
          }
        } catch (e) {
          console.error("[WebCall] Error parsing update:", e, "raw data:", data);
        }
      });

      await client.startCall({
        accessToken,
        emitRawAudioSamples: false,
      });

    } catch (err) {
      console.error("Error initializing call:", err);
      const errorMessage = err instanceof Error ? err.message : "初始化通话失败";
      setError(errorMessage);
      setCallStatus("error");
    }
  }, [accessToken, sdkLoaded, t]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        clientRef.current.stopCall();
        clientRef.current = null;
      }
      stopDurationTimer();
    };
  }, []);

  const startDurationTimer = () => {
    if (durationIntervalRef.current) return;
    durationIntervalRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopDurationTimer = () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  };

  const handleMute = () => {
    if (!clientRef.current) return;
    if (isMuted) {
      clientRef.current.unmute();
      setIsMuted(false);
    } else {
      clientRef.current.mute();
      setIsMuted(true);
      setUserStatus("idle");
    }
  };

  const handleEndCall = () => {
    if (clientRef.current) {
      clientRef.current.stopCall();
      clientRef.current = null;
    }
    stopDurationTimer();
    setCallStatus("ended");
    setAgentStatus("idle");
    setUserStatus("idle");
  };

  const handleRetry = async () => {
    // Reset state and start a new call
    setError(null);
    setCallStatus("ready");
    setDuration(0);
    setTranscripts([]);
    setCurrentText({ agent: "", user: "" });
    setAgentStatus("idle");
    setUserStatus("idle");
    setIsMuted(false);
    
    // Navigate back to calls page to create a new call
    router.push(`/${locale}/calls`);
  };

  const handleBack = () => {
    router.push(`/${locale}/calls`);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getStatusConfig = () => {
    switch (callStatus) {
      case "ready": return { color: "text-blue-500", bg: "bg-blue-500/10", text: t("ready") };
      case "connecting": return { color: "text-yellow-500", bg: "bg-yellow-500/10", text: t("connecting") };
      case "connected": return { color: "text-green-500", bg: "bg-green-500/10", text: t("connected") };
      case "ended": return { color: "text-gray-500", bg: "bg-gray-500/10", text: t("ended") };
      case "error": return { color: "text-red-500", bg: "bg-red-500/10", text: t("error") };
      default: return { color: "text-gray-500", bg: "bg-gray-500/10", text: "" };
    }
  };

  return (
    <DashboardLayout locale={locale}>
      <div className="min-h-[calc(100vh-4rem)] flex flex-col max-w-2xl mx-auto p-4">
        {/* Header */}
        <Card className="p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                callStatus === "connected" ? "bg-green-500 animate-pulse" :
                callStatus === "connecting" ? "bg-yellow-500 animate-pulse" :
                callStatus === "ready" ? "bg-blue-500" :
                callStatus === "error" ? "bg-red-500" : "bg-gray-400"
              }`} />
              <span className={`font-medium ${getStatusConfig().color}`}>
                {(callStatus === "connecting" || !sdkLoaded) && (
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                )}
                {!sdkLoaded && callStatus === "ready" ? "Loading SDK..." : getStatusConfig().text}
              </span>
            </div>
            {callStatus === "connected" && (
              <div className="text-2xl font-mono font-bold text-foreground">
                {formatDuration(duration)}
              </div>
            )}
          </div>
        </Card>

        {/* Main Content */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Voice Activity Indicators */}
          {callStatus === "connected" && (
            <Card className="p-4">
              <div className="flex justify-around items-center">
                {/* AI Agent */}
                <div className="flex flex-col items-center gap-2">
                  <div className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                    agentStatus === "speaking" 
                      ? "bg-primary/20 scale-110 ring-4 ring-primary/30" 
                      : "bg-muted"
                  }`}>
                    <Bot className={`h-10 w-10 ${
                      agentStatus === "speaking" ? "text-primary animate-pulse" : "text-muted-foreground"
                    }`} />
                    {agentStatus === "speaking" && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {[1, 2, 3].map((i) => (
                          <div 
                            key={i} 
                            className="w-1 bg-primary rounded-full animate-pulse"
                            style={{ 
                              height: `${8 + Math.random() * 8}px`,
                              animationDelay: `${i * 0.1}s`
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium">{t("agent")}</span>
                  <Badge variant={agentStatus === "speaking" ? "default" : "secondary"} className="text-xs">
                    {agentStatus === "speaking" ? t("speaking") : t("idle")}
                  </Badge>
                </div>

                {/* Connection Line */}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className={`w-8 h-0.5 ${callStatus === "connected" ? "bg-green-500" : "bg-gray-300"}`} />
                  <Volume2 className="h-4 w-4" />
                  <div className={`w-8 h-0.5 ${callStatus === "connected" ? "bg-green-500" : "bg-gray-300"}`} />
                </div>

                {/* User */}
                <div className="flex flex-col items-center gap-2">
                  <div className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                    userStatus === "speaking" 
                      ? "bg-blue-500/20 scale-110 ring-4 ring-blue-500/30" 
                      : isMuted ? "bg-red-500/10" : "bg-muted"
                  }`}>
                    {isMuted ? (
                      <MicOff className="h-10 w-10 text-red-500" />
                    ) : (
                      <User className={`h-10 w-10 ${
                        userStatus === "speaking" ? "text-blue-500 animate-pulse" : "text-muted-foreground"
                      }`} />
                    )}
                    {userStatus === "speaking" && !isMuted && (
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {[1, 2, 3].map((i) => (
                          <div 
                            key={i} 
                            className="w-1 bg-blue-500 rounded-full animate-pulse"
                            style={{ 
                              height: `${8 + Math.random() * 8}px`,
                              animationDelay: `${i * 0.15}s`
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium">{t("you")}</span>
                  <Badge variant={isMuted ? "destructive" : userStatus === "speaking" ? "default" : "secondary"} className="text-xs">
                    {isMuted ? t("muted") : userStatus === "speaking" ? t("speaking") : t("idle")}
                  </Badge>
                </div>
              </div>
            </Card>
          )}

          {/* Real-time Transcripts */}
          {(callStatus === "connected" || transcripts.length > 0) && (
            <Card className="flex-1 min-h-[200px] flex flex-col">
              <div className="p-3 border-b flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{t("transcript")}</span>
              </div>
              <ScrollArea className="flex-1 p-3" ref={scrollAreaRef}>
                {transcripts.length === 0 && !currentText.agent && !currentText.user ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    {t("transcriptWaiting")}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transcripts.map((msg) => (
                      <div 
                        key={msg.id} 
                        className={`flex gap-2 ${msg.speaker === "user" ? "flex-row-reverse" : ""}`}
                      >
                        <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                          msg.speaker === "agent" ? "bg-primary/10" : "bg-blue-500/10"
                        }`}>
                          {msg.speaker === "agent" ? (
                            <Bot className="h-3 w-3 text-primary" />
                          ) : (
                            <User className="h-3 w-3 text-blue-500" />
                          )}
                        </div>
                        <div className={`rounded-lg px-3 py-2 max-w-[80%] ${
                          msg.speaker === "agent" 
                            ? "bg-muted text-foreground" 
                            : "bg-blue-500/10 text-foreground"
                        }`}>
                          <p className="text-sm">{msg.text}</p>
                        </div>
                      </div>
                    ))}
                    
                    {/* Current typing text */}
                    {currentText.agent && (
                      <div className="flex gap-2">
                        <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-primary/10">
                          <Bot className="h-3 w-3 text-primary" />
                        </div>
                        <div className="rounded-lg px-3 py-2 bg-muted/50">
                          <p className="text-sm text-muted-foreground">{currentText.agent}</p>
                        </div>
                      </div>
                    )}
                    {currentText.user && (
                      <div className="flex gap-2 flex-row-reverse">
                        <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-blue-500/10">
                          <User className="h-3 w-3 text-blue-500" />
                        </div>
                        <div className="rounded-lg px-3 py-2 bg-blue-500/5">
                          <p className="text-sm text-muted-foreground">{currentText.user}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </Card>
          )}

          {/* Error Message */}
          {error && (
            <div className="text-sm text-destructive text-center bg-destructive/10 p-4 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Controls */}
        <Card className="p-4 mt-4">
          <div className="flex items-center justify-center gap-4">
            {/* Ready state */}
            {callStatus === "ready" && sdkLoaded && accessToken && (
              <Button size="lg" onClick={handleStartCall} className="px-8 gap-2">
                <Phone className="h-5 w-5" />
                {t("startCall")}
              </Button>
            )}

            {/* Connected state */}
            {callStatus === "connected" && (
              <>
                <Button
                  variant={isMuted ? "destructive" : "outline"}
                  size="lg"
                  className="rounded-full h-14 w-14"
                  onClick={handleMute}
                >
                  {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </Button>
                <Button
                  variant="destructive"
                  size="lg"
                  className="rounded-full h-14 w-14"
                  onClick={handleEndCall}
                >
                  <PhoneOff className="h-6 w-6" />
                </Button>
              </>
            )}

            {/* Ended state */}
            {callStatus === "ended" && (
              <div className="flex flex-col items-center gap-3">
                <div className="text-center mb-2">
                  <p className="text-lg font-medium">{t("ended")}</p>
                  <p className="text-muted-foreground">{t("endedTip", { duration: formatDuration(duration) })}</p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleRetry} className="gap-2">
                    <Phone className="h-4 w-4" />
                    {t("startNewCall")}
                  </Button>
                  <Button variant="outline" onClick={handleBack} className="gap-2">
                    {t("backToCalls")}
                  </Button>
                </div>
              </div>
            )}

            {/* Error state */}
            {callStatus === "error" && (
              <div className="flex flex-col items-center gap-3">
                <div className="flex gap-3">
                  <Button onClick={handleRetry} className="gap-2">
                    <Phone className="h-4 w-4" />
                    {t("tryAgain")}
                  </Button>
                  <Button variant="outline" onClick={handleBack} className="gap-2">
                    {t("backToCalls")}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {callStatus === "ready" && sdkLoaded && t("readyTip")}
            {callStatus === "connecting" && t("connectingTip")}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
