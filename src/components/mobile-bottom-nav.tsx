"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Bot,
  PhoneCall,
  MessageSquare,
  Users,
} from "lucide-react";

const bottomNavItems = [
  {
    titleKey: "dashboard",
    href: "",
    icon: LayoutDashboard,
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
    titleKey: "conversations",
    href: "/conversations",
    icon: MessageSquare,
  },
];

interface MobileBottomNavProps {
  locale: string;
  isAdmin?: boolean;
}

export function MobileBottomNav({ locale, isAdmin }: MobileBottomNavProps) {
  const pathname = usePathname();
  const t = useTranslations("sidebar");

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

  // Add admin users item if user is admin
  const navItems = isAdmin 
    ? [...bottomNavItems.slice(0, 2), { titleKey: "users", href: "/admin/users", icon: Users }, ...bottomNavItems.slice(2)]
    : bottomNavItems;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t safe-area-bottom">
      <nav className="flex items-center justify-around h-14">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={getHref(item.href)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full px-1",
              "text-muted-foreground hover:text-foreground transition-colors",
              isActive(item.href) && "text-primary"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] mt-0.5 truncate">
              {t(item.titleKey)}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
