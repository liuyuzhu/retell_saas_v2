"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BookOpen, Link, FileText, Plus, Trash2, Loader2, ExternalLink, Clock } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api-fetch";

interface KnowledgeItem {
  id: string;
  user_id: string | null;
  type: 'url' | 'document';
  title: string;
  content: string;
  source_url?: string;
  file_name?: string;
  file_size?: number;
  created_at: string;
}

interface KnowledgePageProps {
  params: Promise<{ locale: string }>;
}

export default function KnowledgePage({ params }: KnowledgePageProps) {
  const [locale, setLocale] = useState<string>("zh");
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [urlInput, setUrlInput] = useState("");
  const [addingUrl, setAddingUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const t = useTranslations("knowledge");
  const tCommon = useTranslations("common");

  useEffect(() => {
    params.then((p) => setLocale(p.locale));
  }, [params]);

  const fetchKnowledge = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/knowledge");
      const data = await res.json();
      setItems(data.data || []);
    } catch (error) {
      console.error("Error fetching knowledge:", error);
      toast.error(tCommon("error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, []);

  const handleAddUrl = async () => {
    if (!urlInput.trim()) {
      toast.error(t("addContent.error"));
      return;
    }

    setAddingUrl(true);
    try {
      // Extract title from URL (simplified - in production, would fetch page title)
      const url = urlInput.trim();
      const titleMatch = url.match(/\/\/([^\/]+)\//);
      const title = titleMatch ? titleMatch[1] : url;

      const res = await apiFetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "url",
          title: title,
          content: `Content from: ${url}`,
          source_url: url,
          is_global: true,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to add URL");
      }

      toast.success(t("addContent.success"));
      setUrlInput("");
      fetchKnowledge();
    } catch (error) {
      console.error("Error adding URL:", error);
      toast.error(t("addContent.error"));
    } finally {
      setAddingUrl(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const allowedTypes = ['text/plain', 'application/pdf'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(txt|pdf|docx)$/i)) {
      toast.error(t("addContent.error"));
      return;
    }

    setUploadingFile(true);
    try {
      // Read file content (simplified - in production, would upload to storage)
      const content = await file.text();

      const res = await apiFetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "document",
          title: file.name,
          content: content.slice(0, 50000), // Limit content size
          file_name: file.name,
          file_size: file.size,
          is_global: true,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to upload document");
      }

      toast.success(t("addContent.success"));
      fetchKnowledge();
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error(t("addContent.error"));
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await apiFetch(`/api/knowledge?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete");
      }

      toast.success(tCommon("success"));
      fetchKnowledge();
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error(tCommon("error"));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const urlItems = items.filter((item) => item.type === "url");
  const docItems = items.filter((item) => item.type === "document");

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">
              <BookOpen className="h-4 w-4 mr-2" />
              {t("tabs.overview")}
            </TabsTrigger>
            <TabsTrigger value="addContent">
              <Plus className="h-4 w-4 mr-2" />
              {t("tabs.addContent")}
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="h-4 w-4 mr-2" />
              {t("tabs.documents")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("overview.totalDocuments")}</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{docItems.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("overview.totalUrls")}</CardTitle>
                  <Link className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{urlItems.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("overview.lastUpdated")}</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-medium">
                    {items.length > 0 ? formatDate(items[0].created_at) : "-"}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{t("overview.knowledgeStatus")}</CardTitle>
                <CardDescription>{t("tabs.documents")}</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{tCommon("noData")}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-3">
                          {item.type === "url" ? (
                            <Link className="h-4 w-4 text-blue-500" />
                          ) : (
                            <FileText className="h-4 w-4 text-green-500" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(item.created_at)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="addContent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("addContent.title")}</CardTitle>
                <CardDescription>{t("addContent.desc")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add URL */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Link className="h-5 w-5 text-blue-500" />
                    <Label>{t("addContent.url")}</Label>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder={t("addContent.urlPlaceholder")}
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleAddUrl}
                      disabled={addingUrl || !urlInput.trim()}
                    >
                      {addingUrl ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4 mr-2" />
                      )}
                      {t("addContent.addButton")}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("addContent.urlHint")}</p>
                </div>

                <div className="border-t pt-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-500" />
                    <Label>{t("addContent.document")}</Label>
                  </div>
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.pdf,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                    >
                      {uploadingFile ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4 mr-2" />
                      )}
                      {t("addContent.document")}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("addContent.documentHint")}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("documents.title")}</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t("documents.noDocuments")}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex items-center gap-4">
                          {item.type === "url" ? (
                            <Link className="h-5 w-5 text-blue-500" />
                          ) : (
                            <FileText className="h-5 w-5 text-green-500" />
                          )}
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <Badge variant="outline">{item.type}</Badge>
                              {item.file_size && (
                                <span>{formatSize(item.file_size)}</span>
                              )}
                              <span>{formatDate(item.created_at)}</span>
                              {item.source_url && (
                                <a
                                  href={item.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-primary hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
