"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { apiFetch } from "@/lib/api-fetch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Bot, Plus, Trash2, Edit, RefreshCw, Loader2, MoreVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Agent, Voice } from "@/lib/retell-types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AgentsPageProps {
  params: Promise<{ locale: string }>;
}

interface AgentFormData {
  agent_name: string;
  voice_id: string;
  llm_model: string;
  llm_temperature: number;
  llm_system_prompt: string;
  enable_backchannel: boolean;
  voicemail_detection_enabled: boolean;
  emotional_authenticity: number;
  interrupt_sensitivity: number;
  speed: number;
}

export default function AgentsPage({ params }: AgentsPageProps) {
  const [locale, setLocale] = useState<string>("zh");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [voicesLoading, setVoicesLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<AgentFormData>({
    agent_name: "",
    voice_id: "",
    llm_model: "gpt-4o",
    llm_temperature: 0.7,
    llm_system_prompt: "You are a helpful AI assistant.",
    enable_backchannel: false,
    voicemail_detection_enabled: true,
    emotional_authenticity: 0.5,
    interrupt_sensitivity: 0.5,
    speed: 1.0,
  });

  const t = useTranslations("agents");
  const tCommon = useTranslations("common");

  useEffect(() => {
    params.then((p) => setLocale(p.locale));
  }, [params]);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/agents");
      const data = await res.json();
      setAgents(data.data || []);
    } catch (error) {
      console.error("Error fetching agents:", error);
      toast.error(tCommon("error"));
    } finally {
      setLoading(false);
    }
  };

  const fetchVoices = async () => {
    setVoicesLoading(true);
    try {
      const res = await apiFetch("/api/voices");
      const data = await res.json();
      setVoices(data.data || []);
    } catch (error) {
      console.error("Error fetching voices:", error);
    } finally {
      setVoicesLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    if (createDialogOpen && voices.length === 0) {
      fetchVoices();
    }
  }, [createDialogOpen, voices.length]);

  const getDefaultLlmId = () => {
    for (const agent of agents) {
      if (agent.response_engine?.llm_id) {
        return agent.response_engine.llm_id;
      }
    }
    return null;
  };

  const handleCreate = async () => {
    if (!formData.agent_name) {
      toast.error(t("agentNameRequired"));
      return;
    }

    const llmId = getDefaultLlmId();
    if (!llmId) {
      toast.error(t("noLlmConfig"));
      return;
    }

    setSubmitting(true);
    try {
      const requestBody: Record<string, unknown> = {
        agent_name: formData.agent_name,
        voice_id: formData.voice_id || voices[0]?.voice_id || "cartesia-Cleo",
        enable_backchannel: formData.enable_backchannel,
        voicemail_detection_enabled: formData.voicemail_detection_enabled,
        emotional_authenticity: formData.emotional_authenticity,
        interrupt_sensitivity: formData.interrupt_sensitivity,
        speed: formData.speed,
        response_engine: {
          type: "retell-llm",
          llm_id: llmId
        }
      };

      const res = await apiFetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || tCommon("error"));
      }
      
      toast.success(tCommon("success"));
      setCreateDialogOpen(false);
      resetForm();
      fetchAgents();
    } catch (error) {
      console.error("Error creating agent:", error);
      toast.error(error instanceof Error ? error.message : tCommon("error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedAgent) return;
    
    setSubmitting(true);
    try {
      const requestBody: Record<string, unknown> = {};
      
      if (formData.agent_name) requestBody.agent_name = formData.agent_name;
      if (formData.voice_id) requestBody.voice_id = formData.voice_id;
      requestBody.enable_backchannel = formData.enable_backchannel;
      requestBody.voicemail_detection_enabled = formData.voicemail_detection_enabled;
      if (formData.emotional_authenticity !== undefined) requestBody.emotional_authenticity = formData.emotional_authenticity;
      if (formData.interrupt_sensitivity !== undefined) requestBody.interrupt_sensitivity = formData.interrupt_sensitivity;
      if (formData.speed !== undefined) requestBody.speed = formData.speed;
      
      const res = await fetch(`/api/agents/${selectedAgent.agent_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || tCommon("error"));
      }
      
      toast.success(tCommon("success"));
      setEditDialogOpen(false);
      setSelectedAgent(null);
      fetchAgents();
    } catch (error) {
      console.error("Error updating agent:", error);
      toast.error(error instanceof Error ? error.message : tCommon("error"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (agentId: string) => {
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "DELETE",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || tCommon("error"));
      }
      
      toast.success(tCommon("success"));
      fetchAgents();
    } catch (error) {
      console.error("Error deleting agent:", error);
      toast.error(error instanceof Error ? error.message : tCommon("error"));
    }
  };

  const resetForm = () => {
    setFormData({
      agent_name: "",
      voice_id: "",
      llm_model: "gpt-4o",
      llm_temperature: 0.7,
      llm_system_prompt: "You are a helpful AI assistant.",
      enable_backchannel: false,
      voicemail_detection_enabled: true,
      emotional_authenticity: 0.5,
      interrupt_sensitivity: 0.5,
      speed: 1.0,
    });
  };

  const openEditDialog = (agent: Agent) => {
    setSelectedAgent(agent);
    setFormData({
      agent_name: agent.agent_name || "",
      voice_id: agent.voice_id || "",
      llm_model: agent.llm_model || "gpt-4o",
      llm_temperature: agent.llm_temperature || 0.7,
      llm_system_prompt: agent.llm_system_prompt || "",
      enable_backchannel: agent.enable_backchannel || false,
      voicemail_detection_enabled: agent.voicemail_detection_enabled ?? true,
      emotional_authenticity: agent.emotional_authenticity || 0.5,
      interrupt_sensitivity: agent.interrupt_sensitivity || 0.5,
      speed: agent.speed || 1.0,
    });
    setEditDialogOpen(true);
  };

  const defaultLlmId = getDefaultLlmId();

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-sm md:text-base text-muted-foreground">{t("description")}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchAgents} disabled={loading} className="shrink-0">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1 sm:flex-initial">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{t("createAgent")}</span>
                  <span className="sm:hidden">创建</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t("createAgent")}</DialogTitle>
                  <DialogDescription>{t("createAgentDesc")}</DialogDescription>
                </DialogHeader>
                {!defaultLlmId ? (
                  <div className="py-4 text-center text-muted-foreground">
                    <p>{t("noLlmConfig")}</p>
                    <p className="text-sm mt-2">{t("noLlmConfigDesc")}</p>
                  </div>
                ) : (
                  <>
                    <AgentForm 
                      formData={formData} 
                      setFormData={setFormData} 
                      t={t} 
                      tCommon={tCommon}
                      voices={voices}
                      voicesLoading={voicesLoading}
                    />
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                      <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="w-full sm:w-auto">
                        {tCommon("cancel")}
                      </Button>
                      <Button onClick={handleCreate} disabled={submitting} className="w-full sm:w-auto">
                        {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {tCommon("create")}
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-lg md:text-xl">{t("allAgents")}</CardTitle>
            <CardDescription className="text-sm">{t("allAgentsDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : agents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Bot className="h-12 w-12 mb-4" />
                <p>{tCommon("noData")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...new Map(agents.map(a => [a.agent_id, a])).values()].map((agent) => (
                  <div
                    key={agent.agent_id}
                    className="flex items-start justify-between rounded-lg border p-3 md:p-4"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <Bot className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="space-y-1 min-w-0">
                        <p className="font-medium text-sm md:text-base truncate">{agent.agent_name || "Unnamed Agent"}</p>
                        <p className="text-xs md:text-sm text-muted-foreground font-mono truncate">{agent.agent_id}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {agent.voice_id && (
                            <Badge variant="outline" className="text-xs truncate max-w-[120px]">
                              {agent.voice_id}
                            </Badge>
                          )}
                          {agent.llm_model && (
                            <Badge variant="secondary" className="text-xs">{agent.llm_model}</Badge>
                          )}
                          {agent.enable_backchannel && (
                            <Badge className="text-xs">{t("enableBackchannel")}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(agent)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t("deleteConfirm")}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t("deleteConfirmDesc")}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(agent.agent_id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {tCommon("delete")}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>

                    {/* Mobile Actions */}
                    <div className="md:hidden shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(agent)}>
                            <Edit className="h-4 w-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDelete(agent.agent_id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("editAgent")}</DialogTitle>
              <DialogDescription>{t("editAgentDesc")}</DialogDescription>
            </DialogHeader>
            <AgentForm 
              formData={formData} 
              setFormData={setFormData} 
              t={t} 
              tCommon={tCommon}
              voices={voices}
              voicesLoading={voicesLoading}
            />
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="w-full sm:w-auto">
                {tCommon("cancel")}
              </Button>
              <Button onClick={handleUpdate} disabled={submitting} className="w-full sm:w-auto">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {tCommon("save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

// Agent Form Component
function AgentForm({
  formData,
  setFormData,
  t,
  tCommon,
  voices,
  voicesLoading,
}: {
  formData: AgentFormData;
  setFormData: React.Dispatch<React.SetStateAction<AgentFormData>>;
  t: (key: string) => string;
  tCommon: (key: string) => string;
  voices: Voice[];
  voicesLoading: boolean;
}) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid gap-2">
        <Label htmlFor="agent_name">{t("agentName")} *</Label>
        <Input
          id="agent_name"
          placeholder="My AI Agent"
          value={formData.agent_name}
          onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
        />
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="voice_id">{t("voiceId")}</Label>
        <Select
          value={formData.voice_id}
          onValueChange={(value) => setFormData({ ...formData, voice_id: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder={voicesLoading ? tCommon("loading") : t("selectVoice")} />
          </SelectTrigger>
          <SelectContent>
            <ScrollArea className="h-[150px]">
              {voicesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                voices.map((voice) => (
                  <SelectItem key={voice.voice_id} value={voice.voice_id}>
                    {voice.voice_name} ({voice.provider})
                  </SelectItem>
                ))
              )}
            </ScrollArea>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{t("voiceIdDesc")}</p>
      </div>

      <div className="grid gap-2">
        <Label className="text-sm">{t("emotionalAuthenticity")}: {formData.emotional_authenticity}</Label>
        <Slider
          value={[formData.emotional_authenticity]}
          onValueChange={([value]) => setFormData({ ...formData, emotional_authenticity: value })}
          min={0}
          max={1}
          step={0.1}
        />
      </div>

      <div className="grid gap-2">
        <Label className="text-sm">{t("interruptSensitivity")}: {formData.interrupt_sensitivity}</Label>
        <Slider
          value={[formData.interrupt_sensitivity]}
          onValueChange={([value]) => setFormData({ ...formData, interrupt_sensitivity: value })}
          min={0}
          max={1}
          step={0.1}
        />
      </div>

      <div className="grid gap-2">
        <Label className="text-sm">{t("speed")}: {formData.speed}x</Label>
        <Slider
          value={[formData.speed]}
          onValueChange={([value]) => setFormData({ ...formData, speed: value })}
          min={0.5}
          max={2}
          step={0.1}
        />
      </div>

      <div className="flex items-center justify-between py-2">
        <Label htmlFor="backchannel" className="text-sm">{t("enableBackchannel")}</Label>
        <Switch
          id="backchannel"
          checked={formData.enable_backchannel}
          onCheckedChange={(checked) => setFormData({ ...formData, enable_backchannel: checked })}
        />
      </div>

      <div className="flex items-center justify-between py-2">
        <Label htmlFor="voicemail" className="text-sm">{t("voicemailDetection")}</Label>
        <Switch
          id="voicemail"
          checked={formData.voicemail_detection_enabled}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, voicemail_detection_enabled: checked })
          }
        />
      </div>
    </div>
  );
}
