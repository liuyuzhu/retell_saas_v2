"use client";
import { apiFetch } from "@/lib/api-fetch";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Mic, RefreshCw, Volume2, VolumeX, User, Play, Pause, ExternalLink } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Voice } from "@/lib/retell-types";

interface VoicesPageProps {
  params: Promise<{ locale: string }>;
}

export default function VoicesPage({ params }: VoicesPageProps) {
  const [locale, setLocale] = useState<string>("zh");
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const t = useTranslations("voices");
  const tCommon = useTranslations("common");

  useEffect(() => {
    params.then((p) => setLocale(p.locale));
  }, [params]);

  const fetchVoices = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/voices");
      const data = await res.json();
      setVoices(data.data || []);
    } catch (error) {
      console.error("Error fetching voices:", error);
      toast.error(tCommon("error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVoices();
  }, []);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlayPause = (voice: Voice) => {
    const audioUrl = voice.preview_audio_url || voice.sample_audio_url;
    if (!audioUrl) {
      toast.error(t("noPreview"));
      return;
    }

    if (playingId === voice.voice_id && audioRef.current) {
      // Pause current
      audioRef.current.pause();
      setPlayingId(null);
    } else {
      // Stop previous if playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      // Play new
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.addEventListener("timeupdate", () => {
        const percent = (audio.currentTime / audio.duration) * 100;
        setProgress((prev) => ({ ...prev, [voice.voice_id]: percent }));
      });

      audio.addEventListener("ended", () => {
        setPlayingId(null);
        setProgress((prev) => ({ ...prev, [voice.voice_id]: 0 }));
      });

      audio.addEventListener("error", () => {
        toast.error(t("playFailed"));
        setPlayingId(null);
      });

      audio.play().catch(() => {
        toast.error(t("playFailed"));
        setPlayingId(null);
      });

      setPlayingId(voice.voice_id);
    }
  };

  const stopPlaying = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayingId(null);
    setProgress({});
  };

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">{t("description")}</p>
          </div>
          <div className="flex gap-2">
            {playingId && (
              <Button variant="destructive" size="sm" onClick={stopPlaying}>
                <VolumeX className="h-4 w-4 mr-2" />
                {t("stopPlaying")}
              </Button>
            )}
            <Button variant="outline" onClick={fetchVoices} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {tCommon("refresh")}
            </Button>
          </div>
        </div>

        {/* Now Playing Banner */}
        {playingId && (
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center gap-4">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground">
              <Volume2 className="h-6 w-6 animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="font-medium">{t("nowPlaying")}</p>
              <p className="text-sm text-muted-foreground">
                {voices.find((v) => v.voice_id === playingId)?.voice_name || playingId}
              </p>
              <Progress value={progress[playingId] || 0} className="h-1 mt-2" />
            </div>
            <Button variant="outline" size="icon" onClick={() => {
              const voice = voices.find((v) => v.voice_id === playingId);
              if (voice) handlePlayPause(voice);
            }}>
              <Pause className="h-4 w-4" />
            </Button>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("availableVoices")}</CardTitle>
            <CardDescription>{t("availableVoicesDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : voices.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Mic className="h-12 w-12 mb-4" />
                <p>{tCommon("noData")}</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {voices.map((voice) => {
                  const isPlaying = playingId === voice.voice_id;
                  const hasAudio = voice.preview_audio_url || voice.sample_audio_url;
                  
                  return (
                    <div
                      key={voice.voice_id}
                      className={`rounded-lg border p-4 hover:shadow-md transition-shadow ${
                        isPlaying ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                            isPlaying ? "bg-primary text-primary-foreground" : "bg-muted"
                          }`}>
                            {voice.avatar_url ? (
                              <img
                                src={voice.avatar_url}
                                alt={voice.voice_name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <User className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{voice.voice_name}</p>
                            <p className="text-sm text-muted-foreground font-mono">
                              {voice.voice_id}
                            </p>
                          </div>
                        </div>
                        {voice.recommended && (
                          <Badge className="bg-green-500 hover:bg-green-600">
                            {t("recommended")}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="mt-4 space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {voice.language && (
                            <Badge variant="outline">{voice.language}</Badge>
                          )}
                          {voice.gender && (
                            <Badge variant="secondary">{voice.gender}</Badge>
                          )}
                          {voice.accent && (
                            <Badge variant="secondary">{voice.accent}</Badge>
                          )}
                          {voice.age && (
                            <Badge variant="outline">{voice.age}</Badge>
                          )}
                          {voice.provider && (
                            <Badge>{voice.provider}</Badge>
                          )}
                        </div>

                        {/* Audio Player */}
                        {hasAudio && (
                          <div className="space-y-2">
                            {isPlaying && (
                              <Progress 
                                value={progress[voice.voice_id] || 0} 
                                className="h-1"
                              />
                            )}
                            <div className="flex gap-2">
                              <Button
                                variant={isPlaying ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePlayPause(voice)}
                                className="flex-1"
                              >
                                {isPlaying ? (
                                  <>
                                    <Pause className="h-4 w-4 mr-2" />
                                    {t("pause")}
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-4 w-4 mr-2" />
                                    {t("preview")}
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                              >
                                <a
                                  href={voice.preview_audio_url || voice.sample_audio_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title={t("openInNewTab")}
                                >
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            </div>
                          </div>
                        )}

                        {!hasAudio && (
                          <p className="text-sm text-muted-foreground italic">
                            {t("noPreview")}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
