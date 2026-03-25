"use client";
import { apiFetch } from "@/lib/api-fetch";

import { DashboardLayout } from "@/components/dashboard-layout";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Users, Plus, Trash2, Edit, RefreshCw, Loader2, Shield, User, MoreVertical } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserItem {
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

interface UsersPageProps {
  params: Promise<{ locale: string }>;
}

export default function UsersPage({ params }: UsersPageProps) {
  const router = useRouter();
  const [locale, setLocale] = useState<string>("zh");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: "",
    role: "user",
    agentIds: [] as string[],
    phoneNumbers: [] as string[],
  });

  useEffect(() => {
    params.then((p) => setLocale(p.locale));
  }, [params]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/users", { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 403) {
          toast.error("无权限访问");
          router.push(`/${locale}`);
          return;
        }
        throw new Error("获取用户列表失败");
      }
      const data = await res.json();
      setUsers(data.data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("获取用户列表失败");
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

  useEffect(() => {
    fetchUsers();
    fetchAgents();
    fetchPhoneNumbers();
  }, []);

  const handleCreate = async () => {
    if (!formData.email || !formData.password) {
      toast.error("请填写邮箱和密码");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("密码至少需要6个字符");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "创建用户失败");
      }

      toast.success("用户创建成功");
      setCreateDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      toast.error(error instanceof Error ? error.message : "创建用户失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const res = await apiFetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          role: formData.role,
          agentIds: formData.agentIds,
          phoneNumbers: formData.phoneNumbers,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "更新用户失败");
      }

      toast.success("用户更新成功");
      setEditDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(error instanceof Error ? error.message : "更新用户失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      const res = await apiFetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "删除用户失败");
      }

      toast.success("用户删除成功");
      fetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(error instanceof Error ? error.message : "删除用户失败");
    }
  };

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      name: "",
      phone: "",
      role: "user",
      agentIds: [],
      phoneNumbers: [],
    });
  };

  const openEditDialog = (user: UserItem) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      password: "",
      name: user.name || "",
      phone: user.phone || "",
      role: user.role,
      agentIds: user.agents || [],
      phoneNumbers: user.phoneNumbers || [],
    });
    setEditDialogOpen(true);
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

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">用户管理</h1>
            <p className="text-sm md:text-base text-muted-foreground">管理系统用户和权限分配</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchUsers} disabled={loading} className="shrink-0">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1 sm:flex-initial">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">创建用户</span>
                  <span className="sm:hidden">创建</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>创建新用户</DialogTitle>
                  <DialogDescription>创建新用户并分配权限</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">邮箱 *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="user@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">密码 *</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="至少6个字符"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">姓名</Label>
                      <Input
                        id="name"
                        placeholder="用户姓名"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">手机号</Label>
                      <Input
                        id="phone"
                        placeholder="+86 1xx xxxx xxxx"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>分配 Agent</Label>
                    <ScrollArea className="h-[120px] border rounded-md p-2">
                      {agents.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">暂无可用 Agent</p>
                      ) : (
                        <div className="space-y-2">
                          {[...new Map(agents.map(a => [a.agent_id, a])).values()].map((agent) => (
                            <div key={agent.agent_id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`agent-${agent.agent_id}`}
                                checked={formData.agentIds.includes(agent.agent_id)}
                                onCheckedChange={() => toggleAgent(agent.agent_id)}
                              />
                              <Label htmlFor={`agent-${agent.agent_id}`} className="text-sm font-normal cursor-pointer truncate">
                                {agent.agent_name || agent.agent_id}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>

                  <div className="space-y-2">
                    <Label>分配电话号码</Label>
                    <ScrollArea className="h-[120px] border rounded-md p-2">
                      {phoneNumbers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">暂无可用电话号码</p>
                      ) : (
                        <div className="space-y-2">
                          {phoneNumbers.map((pn) => (
                            <div key={pn.phone_number} className="flex items-center space-x-2">
                              <Checkbox
                                id={`phone-${pn.phone_number}`}
                                checked={formData.phoneNumbers.includes(pn.phone_number)}
                                onCheckedChange={() => togglePhoneNumber(pn.phone_number)}
                              />
                              <Label htmlFor={`phone-${pn.phone_number}`} className="text-sm font-normal cursor-pointer">
                                {pn.phone_number}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row gap-2">
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="w-full sm:w-auto">
                    取消
                  </Button>
                  <Button onClick={handleCreate} disabled={submitting} className="w-full sm:w-auto">
                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    创建
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-lg md:text-xl">所有用户</CardTitle>
            <CardDescription className="text-sm">系统中的所有用户列表</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mb-4" />
                <p>暂无用户</p>
              </div>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-start justify-between rounded-lg border p-3 md:p-4"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {user.role === "admin" ? (
                        <Shield className="h-5 w-5 text-indigo-500 mt-0.5 shrink-0" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                      )}
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-sm md:text-base">{user.name || "未设置姓名"}</p>
                          <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-xs">
                            {user.role === "admin" ? "管理员" : "用户"}
                          </Badge>
                          {!user.is_active && (
                            <Badge variant="destructive" className="text-xs">已禁用</Badge>
                          )}
                        </div>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">{user.email}</p>
                        {user.phone && (
                          <p className="text-xs text-muted-foreground">手机: {user.phone}</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {user.agents?.slice(0, 2).map((agentId, idx) => (
                            <Badge key={`${user.id}-${agentId}-${idx}`} variant="outline" className="text-xs truncate max-w-[100px]">
                              {agentId.slice(0, 10)}...
                            </Badge>
                          ))}
                          {user.agents?.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{user.agents.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      {user.role !== "admin" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>删除用户</AlertDialogTitle>
                              <AlertDialogDescription>
                                确定要删除用户 "{user.email}" 吗？此操作无法撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(user.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                删除
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
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
                          <DropdownMenuItem onClick={() => openEditDialog(user)}>
                            <Edit className="h-4 w-4 mr-2" />
                            编辑
                          </DropdownMenuItem>
                          {user.role !== "admin" && (
                            <DropdownMenuItem 
                              onClick={() => handleDelete(user.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              删除
                            </DropdownMenuItem>
                          )}
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
              <DialogTitle>编辑用户</DialogTitle>
              <DialogDescription>更新用户信息和权限分配</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>邮箱</Label>
                  <Input value={formData.email} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-name">姓名</Label>
                  <Input
                    id="edit-name"
                    placeholder="用户姓名"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">手机号</Label>
                  <Input
                    id="edit-phone"
                    placeholder="+86 1xx xxxx xxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>角色</Label>
                  <Input value={formData.role === "admin" ? "管理员" : "用户"} disabled className="bg-muted" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>分配 Agent</Label>
                <ScrollArea className="h-[120px] border rounded-md p-2">
                  {agents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">暂无可用 Agent</p>
                  ) : (
                    <div className="space-y-2">
                      {[...new Map(agents.map(a => [a.agent_id, a])).values()].map((agent) => (
                        <div key={agent.agent_id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-agent-${agent.agent_id}`}
                            checked={formData.agentIds.includes(agent.agent_id)}
                            onCheckedChange={() => toggleAgent(agent.agent_id)}
                          />
                          <Label htmlFor={`edit-agent-${agent.agent_id}`} className="text-sm font-normal cursor-pointer truncate">
                            {agent.agent_name || agent.agent_id}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>

              <div className="space-y-2">
                <Label>分配电话号码</Label>
                <ScrollArea className="h-[120px] border rounded-md p-2">
                  {phoneNumbers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">暂无可用电话号码</p>
                  ) : (
                    <div className="space-y-2">
                      {phoneNumbers.map((pn) => (
                        <div key={pn.phone_number} className="flex items-center space-x-2">
                          <Checkbox
                            id={`edit-phone-${pn.phone_number}`}
                            checked={formData.phoneNumbers.includes(pn.phone_number)}
                            onCheckedChange={() => togglePhoneNumber(pn.phone_number)}
                          />
                          <Label htmlFor={`edit-phone-${pn.phone_number}`} className="text-sm font-normal cursor-pointer">
                            {pn.phone_number}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="w-full sm:w-auto">
                取消
              </Button>
              <Button onClick={handleUpdate} disabled={submitting} className="w-full sm:w-auto">
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
