"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Sparkles } from "lucide-react";

interface ForgotPasswordPageProps {
  params: Promise<{ locale: string }>;
}

export default function ForgotPasswordPage({ params }: ForgotPasswordPageProps) {
  const router = useRouter();
  const [locale, setLocale] = useState<string>("zh");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    params.then((p) => setLocale(p.locale));
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("请输入邮箱地址");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "发送重置邮件失败");
      }

      setSubmitted(true);
      toast.success("重置邮件已发送");
    } catch (error) {
      console.error("Forgot password error:", error);
      toast.error(error instanceof Error ? error.message : "发送重置邮件失败");
    } finally {
      setLoading(false);
    }
  };

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

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">重置密码</CardTitle>
            <CardDescription className="text-sm">
              输入您的邮箱地址，我们将发送重置密码链接给您
            </CardDescription>
          </CardHeader>
          
          {submitted ? (
            <CardContent className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 p-4 rounded-lg">
                <p className="text-sm">
                  重置邮件已发送到 <strong>{email}</strong>。
                  请检查您的收件箱（和垃圾邮件文件夹）并点击链接重置密码。
                </p>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱地址</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    className="h-12"
                    autoComplete="email"
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  发送重置邮件
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>

        <div className="text-center mt-4">
          <Button
            variant="link"
            className="text-muted-foreground"
            onClick={() => router.push(`/${locale}/login`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回登录
          </Button>
        </div>
      </div>
    </div>
  );
}
