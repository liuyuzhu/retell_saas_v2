"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  Phone,
  Bot,
  PhoneCall,
  Mic,
  MessageSquare,
  LayoutDashboard,
  Settings,
  Sparkles,
  Users,
  Shield,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarNavItems = [
  {
    titleKey: "dashboard",
    href: "",
    icon: LayoutDashboard,
  },
  {
    titleKey: "phoneNumbers",
    href: "/phone-numbers",
    icon: Phone,
  },
  {
    titleKey: "agents",
    href: "/agents",
    icon: Bot,
  },
  {
    titleKey: "calls",
    href: "/calls",
    icon: PhoneCall,
  },
  {
    titleKey: "voices",
    href: "/voices",
    icon: Mic,
  },
  {
    titleKey: "conversations",
    href: "/conversations",
    icon: MessageSquare,
  },
];

const adminNavItems = [
  {
    titleKey: "users",
    href: "/admin/users",
    icon: Users,
  },
];

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface MobileNavProps {
  locale: string;
  user: User;
}

export function MobileNav({ locale, user }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("sidebar");

  const isAdmin = user.role === "admin";

  const getHref = (href: string) => {
    return `/${locale}${href}`;
  };

  const isActive = (href: string) => {
    const fullPath = getHref(href);
    if (href === "") {
      return pathname === `/${locale}` || pathname === `/${locale}/`;
    }
    return pathname.startsWith(fullPath);
  };

  const handleLogout = async () => {
    try {
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_timestamp');
      }
      await fetch("/api/auth/logout", { method: "POST" });
      setOpen(false);
      router.push(`/${locale}/login`);
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      // Even if API fails, still clear local storage and redirect
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_timestamp');
      }
      setOpen(false);
      router.push(`/${locale}/login`);
      router.refresh();
    }
  };

  const handleNavClick = (href: string) => {
    setOpen(false);
    router.push(getHref(href));
  };

  return (
    <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b">
      <div className="flex h-14 items-center justify-between px-4">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">打开菜单</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <SheetTitle className="sr-only">导航菜单</SheetTitle>
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex h-14 items-center border-b px-4">
                <Link href={`/${locale}`} className="flex items-center space-x-2" onClick={() => setOpen(false)}>
                  <Sparkles className="h-6 w-6 text-primary" />
                  <span className="font-bold text-lg">米格AI</span>
                </Link>
              </div>

              {/* User info */}
              <div className="px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {isAdmin ? (
                      <Shield className="h-4 w-4 text-primary" />
                    ) : (
                      <span className="text-sm font-medium text-primary">
                        {(user.name || user.email)[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {user.name || user.email.split("@")[0]}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex-1 overflow-auto py-4">
                <nav className="grid gap-1 px-2">
                  {sidebarNavItems.map((item) => (
                    <Button
                      key={item.href}
                      variant={isActive(item.href) ? "secondary" : "ghost"}
                      className={cn(
                        "w-full justify-start gap-2",
                        isActive(item.href) && "bg-secondary"
                      )}
                      onClick={() => handleNavClick(item.href)}
                    >
                      <item.icon className="h-4 w-4" />
                      {t(item.titleKey)}
                    </Button>
                  ))}
                </nav>

                {/* Admin section */}
                {isAdmin && (
                  <>
                    <Separator className="my-4" />
                    <div className="px-4 mb-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        管理
                      </p>
                    </div>
                    <nav className="grid gap-1 px-2">
                      {adminNavItems.map((item) => (
                        <Button
                          key={item.href}
                          variant={isActive(item.href) ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start gap-2",
                            isActive(item.href) && "bg-secondary"
                          )}
                          onClick={() => handleNavClick(item.href)}
                        >
                          <item.icon className="h-4 w-4" />
                          {t(item.titleKey)}
                        </Button>
                      ))}
                    </nav>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 space-y-2 border-t">
                <LanguageSwitcher />
                <Separator />
                <Link href={getHref("/settings")} onClick={() => setOpen(false)}>
                  <Button variant="outline" className="w-full justify-start gap-2">
                    <Settings className="h-4 w-4" />
                    {t("settings")}
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  退出登录
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <Link href={`/${locale}`} className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-bold">米格AI</span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            {isAdmin ? (
              <Shield className="h-4 w-4 text-primary" />
            ) : (
              <span className="text-xs font-medium text-primary">
                {(user.name || user.email)[0].toUpperCase()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
