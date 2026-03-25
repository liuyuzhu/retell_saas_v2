"use client";
import { apiFetch } from "@/lib/api-fetch";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, User, Shield, Phone, Bot, Save, Loader2, RefreshCw, Key, History, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserDetails {
  id: string;
  email: string;
  name: string | null;
  role: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
  agents: string[];
  phoneNumbers: string[];
}

interface Agent {
  agent_id: string;
  agent_name?: string;
}

interface PhoneNumber {
  phone_number: string;
}

interface CallRecord {
  id: number;
  call_id: string;
  phone_number: string;
  agent_id: string;
  call_status: string;
  call_duration: number;
  started_at: string;
  ended_at: string;
}

interface UserDetailsPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export default function UserDetailsPage({ params }: UserDetailsPageProps) {
  const router = useRouter();
  const [locale, setLocale] = useState<string>("zh");
  const [userId, setUserId] = useState<string>("");
  const [user, setUser] = useState<UserDetails | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    newPassword: "",
    agentIds: [] as string[],
    phoneNumbers: [] as string[],
    is_active: true,
  });

  useEffect(() => {
    params.then((p) => {
      setLocale(p.locale);
      setUserId(p.id);
    });
  }, [params]);

  const fetchUserDetails = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 403) {
          toast.error("无权限访问");
          router.push(`/${locale}/admin/users`);
          return;
        }
        if (res.status === 404) {
          toast.error("用户不存在");
          router.push(`/${locale}/admin/users`);
          return;
        }
        throw new Error("获取用户详情失败");
      }
      const data = await res.json();
      setUser(data.user);
      setFormData({
        name: data.user.name || "",
        phone: data.user.phone || "",
        newPassword: "",
        agentIds: data.user.agents || [],
        phoneNumbers: data.user.phoneNumbers || [],
        is_active: data.user.is_active,
      });
    } catch (error) {
      console.error("Error fetching user details:", error);
      toast.error("获取用户详情失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await apiFetch("/api/agents", { credentials: 'include' });
      const data = await res.json();
      setAgents(data.data || []);
    } catch (error) {
      console.error("Error fetching agents:", error);
    }
  };

  const fetchPhoneNumbers = async () => {
    try {
      const res = await apiFetch("/api/phone-numbers", { credentials: 'include' });
      const data = await res.json();
      setPhoneNumbers(data.data || []);
    } catch (error) {
      console.error("Error fetching phone numbers:", error);
    }
  };

  const fetchCallRecords = async () => {
    if (!userId) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}/calls`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setCallRecords(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching call records:", error);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
      fetchAgents();
      fetchPhoneNumbers();
      fetchCallRecords();
    }
  }, [userId]);

  const handleUpdate = async () => {
    if (!userId) return;

    setSaving(true);
    try {
      const updateData: Record<string, unknown> = {
        name: formData.name,
        phone: formData.phone,
        agentIds: formData.agentIds,
        phoneNumbers: formData.phoneNumbers,
        is_active: formData.is_active,
      };

      if (formData.newPassword) {
        if (formData.newPassword.length < 6) {
          toast.error("密码至少需要6个字符");
          setSaving(false);
          return;
        }
        updateData.password = formData.newPassword;
      }

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "更新失败");
      }

      toast.success("用户信息已更新");
      setFormData(prev => ({ ...prev, newPassword: "" }));
      fetchUserDetails();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(error instanceof Error ? error.message : "更新失败");
    } finally {
      setSaving(false);
    }
  };

  const toggleAgent = (agentId: string) => {
    setFormData(prev => ({
      ...prev,
      agentIds: prev.agentIds.includes(agentId)
        ? prev.agentIds.filter(id => id !== agentId)
        : [...prev.agentIds, agentId],
    }));
  };

  const togglePhoneNumber = (phoneNumber: string) => {
    setFormData(prev => ({
      ...prev,
      phoneNumbers: prev.phoneNumbers.includes(phoneNumber)
        ? prev.phoneNumbers.filter(pn => pn !== phoneNumber)
        : [...prev.phoneNumbers, phoneNumber],
    }));
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <DashboardLayout locale={locale}>
        <div className="flex items-center justify-center h-[50vh]">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return (
      <DashboardLayout locale={locale}>
        <div className="text-center py-12">
          <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">用户不存在</p>
          <Link href={`/${locale}/admin/users`}>
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回用户列表
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/${locale}/admin/users`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {user.name || user.email}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                  {user.role === "admin" ? "管理员" : "用户"}
                </Badge>
                {user.is_active ? (
                  <Badge variant="outline" className="text-green-600">活跃</Badge>
                ) : (
                  <Badge variant="destructive">已禁用</Badge>
                )}
              </div>
            </div>
          </div>
          <Button onClick={handleUpdate} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            保存更改
          </Button>
        </div>

        <Tabs defaultValue="info" className="space-y-4">
          <TabsList>
            <TabsTrigger value="info">
              <User className="h-4 w-4 mr-2" />
              基本信息
            </TabsTrigger>
            <TabsTrigger value="permissions">
              <Shield className="h-4 w-4 mr-2" />
              权限配置
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              通话记录
            </TabsTrigger>
          </TabsList>

          {/* Basic Info Tab */}
          <TabsContent value="info" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">账户信息</CardTitle>
                  <CardDescription>用户的基本账户信息</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>邮箱</Label>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <Input value={user.email} disabled className="bg-muted" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>姓名</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="用户姓名"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>手机号</Label>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+86 1xx xxxx xxxx"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>账户状态</Label>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                      <span className="text-sm">{formData.is_active ? "活跃" : "已禁用"}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground pt-4 border-t">
                    <p>创建时间: {formatDate(user.created_at)}</p>
                    {user.updated_at && <p>更新时间: {formatDate(user.updated_at)}</p>}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Key className="h-5 w-5" />
                    重置密码
                  </CardTitle>
                  <CardDescription>为用户设置新密码</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>新密码</Label>
                    <Input
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      placeholder="输入新密码（至少6位）"
                    />
                    <p className="text-xs text-muted-foreground">
                      留空则不修改密码
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Permissions Tab */}
          <TabsContent value="permissions" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    分配 Agent
                  </CardTitle>
                  <CardDescription>选择用户可访问的 Agent</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] border rounded-md p-3">
                    {agents.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        暂无可用 Agent
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {[...new Map(agents.map(a => [a.agent_id, a])).values()].map((agent) => (
                          <div key={agent.agent_id} className="flex items-center space-x-3 p-2 rounded hover:bg-muted">
                            <Checkbox
                              id={`agent-${agent.agent_id}`}
                              checked={formData.agentIds.includes(agent.agent_id)}
                              onCheckedChange={() => toggleAgent(agent.agent_id)}
                            />
                            <div className="flex-1 min-w-0">
                              <Label htmlFor={`agent-${agent.agent_id}`} className="cursor-pointer">
                                <p className="font-medium truncate">{agent.agent_name || "未命名 Agent"}</p>
                                <p className="text-xs text-muted-foreground font-mono truncate">
                                  {agent.agent_id}
                                </p>
                              </Label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground mt-2">
                    已选择 {formData.agentIds.length} 个 Agent
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    分配电话号码
                  </CardTitle>
                  <CardDescription>选择用户可使用的电话号码</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px] border rounded-md p-3">
                    {phoneNumbers.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        暂无可用电话号码
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {phoneNumbers.map((pn) => (
                          <div key={pn.phone_number} className="flex items-center space-x-3 p-2 rounded hover:bg-muted">
                            <Checkbox
                              id={`phone-${pn.phone_number}`}
                              checked={formData.phoneNumbers.includes(pn.phone_number)}
                              onCheckedChange={() => togglePhoneNumber(pn.phone_number)}
                            />
                            <Label htmlFor={`phone-${pn.phone_number}`} className="cursor-pointer">
                              <p className="font-medium">{pn.phone_number}</p>
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground mt-2">
                    已选择 {formData.phoneNumbers.length} 个电话号码
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Call History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">通话记录</CardTitle>
                <CardDescription>用户的通话历史</CardDescription>
              </CardHeader>
              <CardContent>
                {callRecords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4" />
                    <p>暂无通话记录</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {callRecords.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{record.phone_number}</span>
                            <Badge variant="outline" className="text-xs">
                              {record.call_status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Agent: {record.agent_id}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(record.started_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-lg">{formatDuration(record.call_duration)}</p>
                          <p className="text-xs text-muted-foreground">通话时长</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
