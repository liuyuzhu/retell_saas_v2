"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  BookOpen,
} from "lucide-react";

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
  {
    titleKey: "knowledge",
    href: "/knowledge",
    icon: BookOpen,
    label: "AI",
  },
];

const adminNavItems = [
  {
    titleKey: "users",
    href: "/admin/users",
    icon: Users,
  },
  {
    titleKey: "systemSettings",
    href: "/admin/settings",
    icon: Settings,
  },
];

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface AppSidebarProps {
  locale: string;
  user: User;
}

export function AppSidebar({ locale, user }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("sidebar");
  const tCommon = useTranslations("common");

  const getHref = (href: string) => {
    return `/${locale}${href}`;
  };

  // Check if current path matches the nav item
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
      router.push(`/${locale}/login`);
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);
      // Even if API fails, still clear local storage and redirect
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_timestamp');
      }
      router.push(`/${locale}/login`);
      router.refresh();
    }
  };

  const isAdmin = user.role === "admin";

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-background">
      <div className="flex h-14 items-center border-b px-4">
        <Link href={`/${locale}`} className="flex items-center space-x-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg">{tCommon("appName")}</span>
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

      <ScrollArea className="flex-1 py-4">
        <nav className="grid gap-1 px-2">
          {sidebarNavItems.map((item) => (
            <Link key={item.href} href={getHref(item.href)}>
              <Button
                variant={isActive(item.href) ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2",
                  isActive(item.href) && "bg-secondary"
                )}
              >
                <item.icon className="h-4 w-4" />
                {t(item.titleKey)}
              </Button>
            </Link>
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
                <Link key={item.href} href={getHref(item.href)}>
                  <Button
                    variant={isActive(item.href) ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-2",
                      isActive(item.href) && "bg-secondary"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {t(item.titleKey)}
                  </Button>
                </Link>
              ))}
            </nav>
          </>
        )}
      </ScrollArea>
      
      <div className="p-4 space-y-2">
        <LanguageSwitcher />
        <Separator />
        <Link href={`/${locale}/settings`}>
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
  );
}
