"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { 
  Loader2, 
  Sparkles, 
  AlertCircle, 
  ArrowRight, 
  CheckCircle, 
  XCircle,
  ShieldCheck,
  Mail,
  Lock,
  User,
  Phone
} from "lucide-react";

interface LoginPageProps {
  params: Promise<{ locale: string }>;
}

// Validation helpers
const validateEmail = (email: string): { valid: boolean; error?: string } => {
  if (!email) return { valid: false };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: "邮箱格式不正确" };
  }
  return { valid: true };
};

const validatePassword = (password: string): { 
  valid: boolean; 
  score: number;
  checks: { label: string; passed: boolean }[] 
} => {
  const checks = [
    { label: "至少8个字符", passed: password.length >= 8 },
    { label: "包含大写字母 (A-Z)", passed: /[A-Z]/.test(password) },
    { label: "包含小写字母 (a-z)", passed: /[a-z]/.test(password) },
    { label: "包含数字 (0-9)", passed: /[0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.passed).length * 25;
  return { 
    valid: checks.every(c => c.passed), 
    score,
    checks 
  };
};

const validatePhone = (phone: string): { valid: boolean; error?: string } => {
  if (!phone) return { valid: true };
  const phoneRegex = /^[+]?[\d\s\-()]{7,20}$/;
  if (!phoneRegex.test(phone)) {
    return { valid: false, error: "手机号格式不正确" };
  }
  return { valid: true };
};

export default function LoginPage({ params }: LoginPageProps) {
  const router = useRouter();
  const [locale, setLocale] = useState<string>("zh");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [emailExistsError, setEmailExistsError] = useState<string | null>(null);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Register form state
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  
  // Validation state
  const emailValidation = validateEmail(registerEmail);
  const passwordValidation = validatePassword(registerPassword);
  const phoneValidation = validatePhone(registerPhone);
  
  // Check if form is valid for submission
  const isRegisterFormValid = 
    registerEmail && 
    emailValidation.valid && 
    registerPassword && 
    passwordValidation.valid &&
    (!registerPhone || phoneValidation.valid);

  // Get validation errors for summary display
  const getValidationErrors = () => {
    const errors: string[] = [];
    if (registerEmail && !emailValidation.valid) {
      errors.push(emailValidation.error || "邮箱格式错误");
    }
    if (registerPassword && !passwordValidation.valid) {
      passwordValidation.checks
        .filter(c => !c.passed)
        .forEach(c => errors.push(c.label));
    }
    if (registerPhone && !phoneValidation.valid) {
      errors.push(phoneValidation.error || "手机号格式错误");
    }
    return errors;
  };

  const validationErrors = getValidationErrors();

  useEffect(() => {
    params.then((p) => setLocale(p.locale));
  }, [params]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginEmail || !loginPassword) {
      toast.error("请填写邮箱和密码");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "登录失败");
      }

      toast.success("登录成功");

      // Cache non-sensitive user info for UI (display only, NOT used for auth)
      if (typeof window !== 'undefined' && data.user) {
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        localStorage.setItem('auth_timestamp', Date.now().toString());
      }

      router.push(`/${locale}`);
    } catch (error) {
      console.error("Login error:", error);
      toast.error(error instanceof Error ? error.message : "登录失败");
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailExistsError(null);
    
    // Validate all fields before submission
    if (!registerEmail || !emailValidation.valid) {
      toast.error("请输入有效的邮箱地址");
      return;
    }

    if (!registerPassword || !passwordValidation.valid) {
      toast.error("密码不符合要求：" + passwordValidation.checks.filter(c => !c.passed).map(c => c.label).join("、"));
      return;
    }
    
    if (registerPhone && !phoneValidation.valid) {
      toast.error("请输入有效的手机号码");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          email: registerEmail,
          password: registerPassword,
          name: registerName || undefined,
          phone: registerPhone || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "Email already registered") {
          setEmailExistsError(registerEmail);
          toast.error("该邮箱已注册，请直接登录");
          return;
        }
        if (data.error === "This email is reserved.") {
          toast.error("此邮箱不可用于注册");
          return;
        }
        throw new Error(data.error || "注册失败");
      }

      toast.success("注册成功");

      // Cache non-sensitive user info for UI (display only, NOT used for auth)
      if (typeof window !== 'undefined' && data.user) {
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        localStorage.setItem('auth_timestamp', Date.now().toString());
      }

      router.push(`/${locale}`);
    } catch (error) {
      console.error("Register error:", error);
      toast.error(error instanceof Error ? error.message : "注册失败");
      setLoading(false);
    }
  };

  const switchToLogin = () => {
    if (emailExistsError) {
      setLoginEmail(emailExistsError);
    }
    setEmailExistsError(null);
    setActiveTab("login");
  };

  // Password strength color
  const getStrengthColor = (score: number) => {
    if (score === 0) return "bg-muted";
    if (score <= 25) return "bg-red-500";
    if (score <= 50) return "bg-orange-500";
    if (score <= 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthLabel = (score: number) => {
    if (score === 0) return "";
    if (score <= 25) return "弱";
    if (score <= 50) return "中等";
    if (score <= 75) return "良好";
    return "强";
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

        {/* Login/Register Card */}
        <Card className="shadow-xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="pb-0">
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger value="login" className="text-base">登录</TabsTrigger>
                <TabsTrigger value="register" className="text-base">注册</TabsTrigger>
              </TabsList>
            </CardHeader>

            <TabsContent value="login">
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">邮箱</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      disabled={loading}
                      className="h-12"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">密码</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      disabled={loading}
                      className="h-12"
                      autoComplete="current-password"
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pt-2">
                  <Button type="submit" className="w-full h-12 text-base" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    登录
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-muted-foreground"
                    onClick={() => router.push(`/${locale}/forgot-password`)}
                  >
                    忘记密码？
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-5 pt-4">
                  {/* Email already exists error */}
                  {emailExistsError && (
                    <Alert className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <AlertDescription className="text-amber-800 dark:text-amber-200">
                        <p className="font-medium">该邮箱已注册</p>
                        <p className="text-sm mt-1">请直接使用此邮箱登录</p>
                        <Button
                          type="button"
                          variant="link"
                          className="p-0 h-auto mt-2 text-amber-700 dark:text-amber-300"
                          onClick={switchToLogin}
                        >
                          前往登录 <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Validation Summary Alert */}
                  {validationErrors.length > 0 && (
                    <Alert className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 py-3">
                      <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <AlertDescription className="text-red-800 dark:text-red-200">
                        <p className="font-medium text-sm mb-1">请修复以下问题：</p>
                        <ul className="text-sm space-y-0.5 ml-1">
                          {validationErrors.map((error, i) => (
                            <li key={i} className="flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-red-500"></span>
                              {error}
                            </li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="register-email" className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      邮箱 <span className="text-destructive">*</span>
                      {registerEmail && emailValidation.valid && (
                        <span className="text-xs text-green-600 font-normal ml-auto flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> 格式正确
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="your@email.com"
                        value={registerEmail}
                        onChange={(e) => {
                          setRegisterEmail(e.target.value);
                          setEmailExistsError(null);
                        }}
                        disabled={loading}
                        className={`h-12 pl-10 ${
                          registerEmail && !emailValidation.valid
                            ? "border-red-500 bg-red-50/50 dark:bg-red-900/10 focus-visible:ring-red-500"
                            : registerEmail && emailValidation.valid
                            ? "border-green-500 bg-green-50/50 dark:bg-green-900/10 focus-visible:ring-green-500"
                            : ""
                        }`}
                        autoComplete="email"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Mail className="h-5 w-5" />
                      </div>
                      {registerEmail && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {emailValidation.valid ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {registerEmail && !emailValidation.valid && (
                      <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3 w-3" />
                        {emailValidation.error}
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="register-password" className="flex items-center gap-1.5">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      密码 <span className="text-destructive">*</span>
                      {registerPassword && passwordValidation.valid && (
                        <span className="text-xs text-green-600 font-normal ml-auto flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3" /> 符合要求
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="设置安全密码"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        disabled={loading}
                        className={`h-12 pl-10 ${
                          registerPassword && !passwordValidation.valid
                            ? "border-red-500 bg-red-50/50 dark:bg-red-900/10 focus-visible:ring-red-500"
                            : registerPassword && passwordValidation.valid
                            ? "border-green-500 bg-green-50/50 dark:bg-green-900/10 focus-visible:ring-green-500"
                            : ""
                        }`}
                        autoComplete="new-password"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Lock className="h-5 w-5" />
                      </div>
                      {registerPassword && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {passwordValidation.valid ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Password Strength Indicator */}
                    {registerPassword && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">密码强度</span>
                          <span className={`text-xs font-medium ${
                            passwordValidation.score <= 25 ? "text-red-600" :
                            passwordValidation.score <= 50 ? "text-orange-600" :
                            passwordValidation.score <= 75 ? "text-yellow-600" :
                            "text-green-600"
                          }`}>
                            {getStrengthLabel(passwordValidation.score)}
                          </span>
                        </div>
                        <Progress 
                          value={passwordValidation.score} 
                          className={`h-2 ${getStrengthColor(passwordValidation.score)}`}
                        />
                        
                        {/* Password Requirements Checklist */}
                        <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                          <p className="text-xs text-muted-foreground font-medium mb-2">密码必须满足：</p>
                          {passwordValidation.checks.map((check, i) => (
                            <div 
                              key={i} 
                              className={`flex items-center gap-2 text-sm ${
                                check.passed ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                              }`}
                            >
                              {check.passed ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                                  <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                                </div>
                              )}
                              <span className={check.passed ? "font-medium" : ""}>{check.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Name Field */}
                  <div className="space-y-2">
                    <Label htmlFor="register-name" className="flex items-center gap-1.5">
                      <User className="h-4 w-4 text-muted-foreground" />
                      姓名 <span className="text-xs text-muted-foreground font-normal">(选填)</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="您的姓名"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        disabled={loading}
                        className="h-12 pl-10"
                        autoComplete="name"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <User className="h-5 w-5" />
                      </div>
                    </div>
                  </div>

                  {/* Phone Field */}
                  <div className="space-y-2">
                    <Label htmlFor="register-phone" className="flex items-center gap-1.5">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      手机号 <span className="text-xs text-muted-foreground font-normal">(选填)</span>
                      {registerPhone && phoneValidation.valid && (
                        <span className="text-xs text-green-600 font-normal ml-auto flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" /> 格式正确
                        </span>
                      )}
                    </Label>
                    <div className="relative">
                      <Input
                        id="register-phone"
                        type="tel"
                        placeholder="+86 1xx xxxx xxxx"
                        value={registerPhone}
                        onChange={(e) => setRegisterPhone(e.target.value)}
                        disabled={loading}
                        className={`h-12 pl-10 ${
                          registerPhone && !phoneValidation.valid
                            ? "border-red-500 bg-red-50/50 dark:bg-red-900/10 focus-visible:ring-red-500"
                            : registerPhone && phoneValidation.valid
                            ? "border-green-500 bg-green-50/50 dark:bg-green-900/10 focus-visible:ring-green-500"
                            : ""
                        }`}
                        autoComplete="tel"
                      />
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Phone className="h-5 w-5" />
                      </div>
                      {registerPhone && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {phoneValidation.valid ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                        </div>
                      )}
                    </div>
                    {registerPhone && !phoneValidation.valid && (
                      <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1 font-medium">
                        <AlertCircle className="h-3 w-3" />
                        {phoneValidation.error}
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 pt-2">
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base" 
                    disabled={loading || !isRegisterFormValid}
                  >
                    {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                    {isRegisterFormValid ? "注册" : "请完善信息后注册"}
                  </Button>
                  {!isRegisterFormValid && (registerEmail || registerPassword) && (
                    <p className="text-sm text-muted-foreground text-center">
                      请按照上方提示修复问题
                    </p>
                  )}
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          注册即表示您同意我们的服务条款和隐私政策
        </p>
      </div>
    </div>
  );
}
