"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, Bot, PhoneCall, MessageSquare, TrendingUp, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api-fetch";

interface Stats {
  phoneNumbers: number;
  agents: number;
  calls: number;
  conversations: number;
}

interface DashboardPageProps {
  params: Promise<{ locale: string }>;
}

export default function DashboardPage({ params }: DashboardPageProps) {
  const [locale, setLocale] = useState<string>("zh");
  const [stats, setStats] = useState<Stats>({
    phoneNumbers: 0,
    agents: 0,
    calls: 0,
    conversations: 0,
  });
  const [loading, setLoading] = useState(true);

  const t = useTranslations("dashboard");
  const tStats = useTranslations("dashboard.stats");
  const tQuickActions = useTranslations("dashboard.quickActions");
  const tApiConfig = useTranslations("dashboard.apiConfig");

  useEffect(() => {
    params.then((p) => setLocale(p.locale));
  }, [params]);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [phoneNumbersRes, agentsRes, callsRes, conversationsRes] = await Promise.all([
          apiFetch("/api/phone-numbers?limit=1"),
          apiFetch("/api/agents?limit=1"),
          apiFetch("/api/calls?limit=1"),
          apiFetch("/api/conversations?limit=1"),
        ]);

        const [phoneNumbers, agents, calls, conversations] = await Promise.all([
          phoneNumbersRes.json(),
          agentsRes.json(),
          callsRes.json(),
          conversationsRes.json(),
        ]);

        setStats({
          phoneNumbers: phoneNumbers.data?.length || 0,
          agents: agents.data?.length || 0,
          calls: calls.data?.length || 0,
          conversations: conversations.data?.length || 0,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  const statCards = [
    {
      title: tStats("phoneNumbers"),
      value: stats.phoneNumbers,
      description: tStats("phoneNumbersDesc"),
      icon: Phone,
      color: "text-blue-500",
    },
    {
      title: tStats("agents"),
      value: stats.agents,
      description: tStats("agentsDesc"),
      icon: Bot,
      color: "text-green-500",
    },
    {
      title: tStats("calls"),
      value: stats.calls,
      description: tStats("callsDesc"),
      icon: PhoneCall,
      color: "text-purple-500",
    },
    {
      title: tStats("conversations"),
      value: stats.conversations,
      description: tStats("conversationsDesc"),
      icon: MessageSquare,
      color: "text-orange-500",
    },
  ];

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground">{t("description")}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? "..." : stat.value}
                </div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {tQuickActions("title")}
              </CardTitle>
              <CardDescription>{tQuickActions("description")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <a
                href={`/${locale}/phone-numbers`}
                className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted transition-colors"
              >
                <Phone className="h-4 w-4 text-blue-500" />
                <span>{tQuickActions("managePhoneNumbers")}</span>
              </a>
              <a
                href={`/${locale}/agents`}
                className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted transition-colors"
              >
                <Bot className="h-4 w-4 text-green-500" />
                <span>{tQuickActions("configureAgents")}</span>
              </a>
              <a
                href={`/${locale}/calls`}
                className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted transition-colors"
              >
                <PhoneCall className="h-4 w-4 text-purple-500" />
                <span>{tQuickActions("makeCall")}</span>
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {tApiConfig("title")}
              </CardTitle>
              <CardDescription>{tApiConfig("description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{tApiConfig("status")}</p>
                    <p className="text-sm text-muted-foreground">
                      {loading ? tApiConfig("checking") : tApiConfig("connected")}
                    </p>
                  </div>
                  <div className={`h-3 w-3 rounded-full ${loading ? "bg-yellow-500" : "bg-green-500"}`} />
                </div>
                <div className="rounded-lg border p-3">
                  <p className="font-medium">{tApiConfig("baseUrl")}</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    https://api.retellai.com
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
