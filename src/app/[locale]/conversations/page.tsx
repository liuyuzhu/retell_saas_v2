"use client";
import { apiFetch } from "@/lib/api-fetch";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { MessageSquare, RefreshCw, Trash2, Clock, User, Bot, Phone, Video, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

// Call record type from database (via webhook)
interface CallRecord {
  id: string;
  user_id: string;
  call_id: string;
  call_type: string | null;
  agent_id: string | null;
  phone_number_id: string | null;
  from_number: string | null;
  to_number: string | null;
  call_status: string;
  start_timestamp: number | null;
  end_timestamp: number | null;
  duration: number | null;
  recording_url: string | null;
  transcript: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface ConversationsPageProps {
  params: Promise<{ locale: string }>;
}

export default function ConversationsPage({ params }: ConversationsPageProps) {
  const [locale, setLocale] = useState<string>("zh");
  const [conversations, setConversations] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<CallRecord | null>(null);

  const t = useTranslations("conversations");
  const tCommon = useTranslations("common");

  useEffect(() => {
    params.then((p) => setLocale(p.locale));
  }, [params]);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/conversations");
      const data = await res.json();
      setConversations(data.data || []);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      toast.error(tCommon("error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleDeleteConversation = async (callId: string) => {
    try {
      const res = await apiFetch(`/api/conversations/${callId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || tCommon("error"));
      }
      
      toast.success(tCommon("success"));
      setSelectedConversation(null);
      fetchConversations();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error(error instanceof Error ? error.message : tCommon("error"));
    }
  };

  const formatDuration = (ms?: number | null) => {
    if (!ms) return "N/A";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const formatDate = (timestamp?: number | null) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp).toLocaleString();
  };

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground">{t("description")}</p>
          </div>
          <Button variant="outline" onClick={fetchConversations} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            {tCommon("refresh")}
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Conversation List */}
          <Card>
            <CardHeader>
              <CardTitle>{t("allConversations")}</CardTitle>
              <CardDescription>{t("allConversationsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mb-4" />
                  <p>{tCommon("noData")}</p>
                </div>
              ) : (
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-3">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation.call_id}
                        className={`rounded-lg border p-4 cursor-pointer transition-colors ${
                          selectedConversation?.call_id === conversation.call_id
                            ? "border-primary bg-muted"
                            : "hover:bg-muted"
                        }`}
                        onClick={() => setSelectedConversation(conversation)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            {conversation.call_type === "phone_call" ? (
                              <Phone className="h-5 w-5 text-muted-foreground mt-1" />
                            ) : (
                              <Video className="h-5 w-5 text-muted-foreground mt-1" />
                            )}
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{conversation.call_id.slice(0, 20)}...</p>
                                <Badge variant="outline" className="text-xs">
                                  {conversation.call_type === "phone_call" ? t("phone") : t("web")}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatDate(conversation.start_timestamp)}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{t("duration")}: {formatDuration(conversation.duration)}</span>
                                {conversation.agent_id && (
                                  <Badge variant="secondary" className="text-xs">
                                    Agent: {conversation.agent_id.slice(0, 15)}...
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{t("deleteConfirm")}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("deleteConfirmDesc")}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteConversation(conversation.call_id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  {tCommon("delete")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        {conversation.from_number && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {t("from")}: {conversation.from_number} → {t("to")}: {conversation.to_number}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Conversation Detail */}
          <Card>
            <CardHeader>
              <CardTitle>{t("conversationDetails")}</CardTitle>
              <CardDescription>{t("conversationDetailsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {selectedConversation ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">{t("duration")}</p>
                      <p className="font-medium">
                        {formatDuration(selectedConversation.duration)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground">{t("type")}</p>
                      <p className="font-medium">
                        {selectedConversation.call_type === "phone_call" ? t("phone") : t("web")}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground mb-2">{t("callInfo")}</p>
                    <div className="space-y-2 text-sm">
                      {selectedConversation.from_number && (
                        <p><strong>{t("from")}:</strong> {selectedConversation.from_number}</p>
                      )}
                      {selectedConversation.to_number && (
                        <p><strong>{t("to")}:</strong> {selectedConversation.to_number}</p>
                      )}
                      {selectedConversation.agent_id && (
                        <p><strong>Agent:</strong> {selectedConversation.agent_id}</p>
                      )}
                      <p><strong>{t("startTime")}:</strong> {formatDate(selectedConversation.start_timestamp)}</p>
                      <p><strong>{t("endTime")}:</strong> {formatDate(selectedConversation.end_timestamp)}</p>
                    </div>
                  </div>

                  {selectedConversation.recording_url && (
                    <div className="rounded-lg border p-3">
                      <p className="text-sm text-muted-foreground mb-2">{t("recording")}</p>
                      <a 
                        href={selectedConversation.recording_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        {t("playRecording")}
                      </a>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{t("transcript")}</p>
                    <ScrollArea className="h-[300px] rounded-lg border p-4">
                      {selectedConversation.transcript ? (
                        <div className="space-y-3">
                          {/* Display transcript as plain text since we don't have segment info */}
                          <p className="text-sm whitespace-pre-wrap">{selectedConversation.transcript}</p>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">{t("noTranscript")}</p>
                      )}
                    </ScrollArea>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mb-4" />
                  <p>{t("selectConversation")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
