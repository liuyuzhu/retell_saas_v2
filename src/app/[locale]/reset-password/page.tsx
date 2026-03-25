"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Sparkles, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ResetPasswordPageProps {
  params: Promise<{ locale: string }>;
}

function ResetPasswordContent({ locale }: { locale: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      setError("无效的重置链接");
    } else {
      setToken(tokenParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password || !confirmPassword) {
      toast.error("请填写所有字段");
      return;
    }

    if (password.length < 6) {
      toast.error("密码至少需要6个字符");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    if (!token) {
      toast.error("无效的重置链接");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "重置密码失败");
      }

      toast.success("密码重置成功");
      router.push(`/${locale}/login`);
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error(error instanceof Error ? error.message : "重置密码失败");
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <Card className="shadow-xl">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button
            variant="link"
            className="mt-4 w-full"
            onClick={() => router.push(`/${locale}/forgot-password`)}
          >
            重新获取重置链接
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl">重置密码</CardTitle>
          <CardDescription className="text-sm">
            请输入您的新密码
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">新密码</Label>
            <Input
              id="password"
              type="password"
              placeholder="至少6个字符"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">确认密码</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="再次输入新密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              className="h-12"
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            重置密码
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}

export default function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  const [locale, setLocale] = useState<string>("zh");

  useEffect(() => {
    params.then((p) => setLocale(p.locale));
  }, [params]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 safe-area-top">
      <div className="w-full max-w-md">
        {/* Logo Section */}
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg mb-4">
            <Sparkles className="h-8 w-8 md:h-10 md:w-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            米格AI
          </h1>
          <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">AI语音管理平台</p>
        </div>

        <Suspense fallback={
          <Card className="shadow-xl">
            <CardContent className="pt-6 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </CardContent>
          </Card>
        }>
          <ResetPasswordContent locale={locale} />
        </Suspense>
      </div>
    </div>
  );
}
