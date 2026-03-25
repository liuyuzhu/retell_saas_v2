"use client";
import { apiFetch } from "@/lib/api-fetch";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Settings, Save, RefreshCw, Loader2, Plus, Trash2, Eye, EyeOff, Server, Globe, Bell, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Config {
  id: number;
  config_key: string;
  config_value: string;
  description: string;
  category: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface SettingsPageProps {
  params: Promise<{ locale: string }>;
}

const categoryIcons: Record<string, React.ElementType> = {
  api: Server,
  general: Globe,
  features: Bell,
  limits: Shield,
};

const categoryNames: Record<string, string> = {
  api: "API 配置",
  general: "通用设置",
  features: "功能设置",
  limits: "限制设置",
};

export default function SettingsPage({ params }: SettingsPageProps) {
  const router = useRouter();
  const [locale, setLocale] = useState<string>("zh");
  const [configs, setConfigs] = useState<Config[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  
  // Form state for new config
  const [newConfig, setNewConfig] = useState({
    config_key: "",
    config_value: "",
    description: "",
    category: "general",
    is_public: false,
  });

  useEffect(() => {
    params.then((p) => setLocale(p.locale));
  }, [params]);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/admin/config", { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 403) {
          toast.error("无权限访问");
          router.push(`/${locale}`);
          return;
        }
        throw new Error("获取配置失败");
      }
      const data = await res.json();
      setConfigs(data.data || []);
    } catch (error) {
      console.error("Error fetching configs:", error);
      toast.error("获取配置失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleSave = async (key: string, value: string) => {
    setSaving(true);
    try {
      const res = await apiFetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          configs: [{ config_key: key, config_value: value }],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "保存失败");
      }

      toast.success("配置已保存");
      fetchConfigs();
    } catch (error) {
      console.error("Error saving config:", error);
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const configsToUpdate = configs.map(c => ({
        config_key: c.config_key,
        config_value: c.config_value,
      }));

      const res = await apiFetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({ configs: configsToUpdate }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "保存失败");
      }

      toast.success(`已保存 ${data.updated} 项配置`);
    } catch (error) {
      console.error("Error saving configs:", error);
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleAddConfig = async () => {
    if (!newConfig.config_key) {
      toast.error("请输入配置键名");
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(newConfig),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "创建失败");
      }

      toast.success("配置已创建");
      setShowAddDialog(false);
      setNewConfig({
        config_key: "",
        config_value: "",
        description: "",
        category: "general",
        is_public: false,
      });
      fetchConfigs();
    } catch (error) {
      console.error("Error creating config:", error);
      toast.error(error instanceof Error ? error.message : "创建失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfig = async (key: string) => {
    try {
      const res = await fetch(`/api/admin/config/${key}`, {
        method: "DELETE",
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "删除失败");
      }

      toast.success("配置已删除");
      setDeleteKey(null);
      fetchConfigs();
    } catch (error) {
      console.error("Error deleting config:", error);
      toast.error(error instanceof Error ? error.message : "删除失败");
    }
  };

  const updateConfigValue = (key: string, value: string) => {
    setConfigs(prev =>
      prev.map(c => (c.config_key === key ? { ...c, config_value: value } : c))
    );
  };

  const groupedConfigs = configs.reduce((acc, config) => {
    if (!acc[config.category]) {
      acc[config.category] = [];
    }
    acc[config.category].push(config);
    return acc;
  }, {} as Record<string, Config[]>);

  const toggleShowSecret = (key: string) => {
    setShowSecret(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">系统配置</h1>
            <p className="text-sm md:text-base text-muted-foreground">管理系统参数和业务配置</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchConfigs} disabled={loading} className="shrink-0">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={() => setShowAddDialog(true)} className="shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              添加配置
            </Button>
          </div>
        </div>

        <Tabs defaultValue={Object.keys(groupedConfigs)[0] || "general"} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
            {Object.keys(groupedConfigs).map(category => {
              const Icon = categoryIcons[category] || Settings;
              return (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 rounded-md"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {categoryNames[category] || category}
                  <Badge variant="secondary" className="ml-2">
                    {groupedConfigs[category].length}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {Object.entries(groupedConfigs).map(([category, categoryConfigs]) => {
            const CategoryIcon = categoryIcons[category] || Settings;
            return (
            <TabsContent key={category} value={category} className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CategoryIcon className="h-5 w-5" />
                    {categoryNames[category] || category}
                  </CardTitle>
                  <CardDescription>
                    {category === "api" && "配置第三方 API 密钥和访问凭证"}
                    {category === "general" && "配置系统通用参数"}
                    {category === "features" && "启用或禁用系统功能"}
                    {category === "limits" && "设置系统使用限制"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {categoryConfigs.map(config => (
                    <div key={config.config_key} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 p-3 rounded-lg border">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Label className="font-mono text-sm">{config.config_key}</Label>
                          {config.is_public && (
                            <Badge variant="outline" className="text-xs">公开</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1 md:w-64">
                          <Input
                            type={config.config_key.includes("key") || config.config_key.includes("secret") || config.config_key.includes("password")
                              ? (showSecret[config.config_key] ? "text" : "password")
                              : "text"}
                            value={config.config_value}
                            onChange={(e) => updateConfigValue(config.config_key, e.target.value)}
                            className="pr-8"
                          />
                          {(config.config_key.includes("key") || config.config_key.includes("secret") || config.config_key.includes("password")) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-2"
                              onClick={() => toggleShowSecret(config.config_key)}
                            >
                              {showSecret[config.config_key] ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSave(config.config_key, config.config_value)}
                          disabled={saving}
                        >
                          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteKey(config.config_key)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
            );
          })}
        </Tabs>
      </div>

      {/* Add Config Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加新配置</DialogTitle>
            <DialogDescription>创建新的系统配置项</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>配置键名 *</Label>
              <Input
                placeholder="例如: max_users_per_page"
                value={newConfig.config_key}
                onChange={(e) => setNewConfig({ ...newConfig, config_key: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>配置值</Label>
              <Input
                placeholder="配置值"
                value={newConfig.config_value}
                onChange={(e) => setNewConfig({ ...newConfig, config_value: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>描述</Label>
              <Input
                placeholder="配置项描述"
                value={newConfig.description}
                onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>分类</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={newConfig.category}
                onChange={(e) => setNewConfig({ ...newConfig, category: e.target.value })}
              >
                <option value="general">通用设置</option>
                <option value="api">API 配置</option>
                <option value="features">功能设置</option>
                <option value="limits">限制设置</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={newConfig.is_public}
                onCheckedChange={(checked) => setNewConfig({ ...newConfig, is_public: checked })}
              />
              <Label>公开配置（前端可访问）</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>取消</Button>
            <Button onClick={handleAddConfig} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteKey} onOpenChange={() => setDeleteKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除配置 "{deleteKey}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteKey && handleDeleteConfig(deleteKey)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
