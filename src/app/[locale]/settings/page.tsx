"use client";
import { apiFetch } from "@/lib/api-fetch";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Key, Globe, CheckCircle, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface SettingsPageProps {
  params: Promise<{ locale: string }>;
}

export default function SettingsPage({ params }: SettingsPageProps) {
  const [locale, setLocale] = useState<string>("zh");
  const [apiKey, setApiKey] = useState("");
  const [isConfigured, setIsConfigured] = useState(false);
  const [testing, setTesting] = useState(false);

  const t = useTranslations("settings");

  useEffect(() => {
    params.then((p) => setLocale(p.locale));
  }, [params]);

  useEffect(() => {
    // Check if API key is configured
    const checkConfig = async () => {
      try {
        const res = await apiFetch("/api/agents?limit=1");
        if (res.ok) {
          setIsConfigured(true);
        }
      } catch {
        setIsConfigured(false);
      }
    };
    checkConfig();
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await apiFetch("/api/agents?limit=1");
      if (res.ok) {
        toast.success(t("connected"));
        setIsConfigured(true);
      } else {
        const error = await res.json();
        throw new Error(error.error || "Connection failed");
      }
    } catch (error) {
      console.error("Connection test failed:", error);
      toast.error(error instanceof Error ? error.message : t("notConnected"));
      setIsConfigured(false);
    } finally {
      setTesting(false);
    }
  };

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>

        <div className="grid gap-6">
          {/* API Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {t("apiConfig")}
              </CardTitle>
              <CardDescription>{t("apiConfigDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="api_key">{t("apiKey")}</Label>
                <Input
                  id="api_key"
                  type="password"
                  placeholder="Enter your API key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">{t("apiKeyDesc")}</p>
              </div>

              <div className="flex items-center gap-4">
                <Button onClick={handleTestConnection} disabled={testing}>
                  {testing ? "Testing..." : t("testConnection")}
                </Button>
                {isConfigured ? (
                  <Badge className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {t("connected")}
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {t("notConnected")}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* API Endpoints */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t("apiEndpoints")}
              </CardTitle>
              <CardDescription>{t("apiEndpointsDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: "Phone Numbers", endpoints: ["/get-phone-numbers", "/create-phone-number", "/get-phone-number", "/update-phone-number", "/delete-phone-number"] },
                  { name: "Agents", endpoints: ["/get-agents", "/create-agent", "/get-agent", "/update-agent", "/delete-agent"] },
                  { name: "Calls", endpoints: ["/get-calls", "/create-phone-call", "/create-web-call", "/get-call", "/delete-call"] },
                  { name: "Voices", endpoints: ["/get-voices", "/get-voice"] },
                  { name: "Conversations", endpoints: ["/get-conversations", "/get-conversation", "/delete-conversation"] },
                ].map((category) => (
                  <div key={category.name} className="rounded-lg border p-4">
                    <p className="font-medium mb-2">{category.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {category.endpoints.map((endpoint) => (
                        <Badge key={endpoint} variant="outline" className="font-mono text-xs">
                          {endpoint}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Documentation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {t("documentation")}
              </CardTitle>
              <CardDescription>{t("documentationDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <a
                  href="https://docs.retellai.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted transition-colors"
                >
                  <Globe className="h-4 w-4" />
                  <span>{t("officialDocs")}</span>
                </a>
                <a
                  href="https://www.retellai.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted transition-colors"
                >
                  <Globe className="h-4 w-4" />
                  <span>{t("website")}</span>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
