"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { authFetch, clearAuth } from "@/lib/auth-client";
import { ChatBot } from "@/components/chatbot";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  locale: string;
}

// ─── Session cache helpers (localStorage + in-memory) ─

let _cachedUser: AuthUser | null = null;
let _cachedAt = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Load from localStorage on client side
function loadFromLocalStorage(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem('auth_user');
    const timestamp = localStorage.getItem('auth_timestamp');
    if (stored && timestamp) {
      const age = Date.now() - parseInt(timestamp, 10);
      if (age < CACHE_TTL) {
        return JSON.parse(stored);
      }
    }
  } catch (e) {
    console.warn('Failed to load user from localStorage:', e);
  }
  return null;
}

function getCachedUser(): AuthUser | null {
  // Check in-memory cache first
  if (_cachedUser && Date.now() - _cachedAt < CACHE_TTL) return _cachedUser;
  // Then check localStorage
  const lsUser = loadFromLocalStorage();
  if (lsUser) {
    _cachedUser = lsUser;
    _cachedAt = Date.now();
  }
  return lsUser;
}

function setCachedUser(user: AuthUser) {
  _cachedUser = user;
  _cachedAt = Date.now();
  // Also save to localStorage for persistence across page reloads
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('auth_user', JSON.stringify(user));
      localStorage.setItem('auth_timestamp', Date.now().toString());
    } catch (e) {
      console.warn('Failed to save user to localStorage:', e);
    }
  }
}

function clearCachedUser() {
  _cachedUser = null;
  _cachedAt = 0;
  // Clear localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('auth_user');
      localStorage.removeItem('auth_timestamp');
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
    }
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardLayout({ children, locale }: DashboardLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(getCachedUser);
  const [loading, setLoading] = useState(!getCachedUser());
  const verifyingRef = useRef(false);

  const verifySession = useCallback(async () => {
    if (verifyingRef.current) return;
    verifyingRef.current = true;

    try {
      // Use authFetch — sends httpOnly cookie automatically via credentials: include
      const res = await authFetch("/api/auth/me", {
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setCachedUser(data.user);
          setUser(data.user);
          setLoading(false);
          return;
        }
      }

      // Not authenticated — clear cache and redirect
      clearCachedUser();
      clearAuth();
      router.replace(`/${locale}/login`);
    } catch {
      // Network error: fall back to cache if available, else redirect
      const cached = getCachedUser();
      if (cached) {
        setUser(cached);
        setLoading(false);
      } else {
        router.replace(`/${locale}/login`);
      }
    } finally {
      verifyingRef.current = false;
    }
  }, [locale, router]);

  useEffect(() => {
    const cached = getCachedUser();
    if (cached) {
      setUser(cached);
      setLoading(false);
      // Still re-verify in background so stale sessions are caught
      verifySession();
    } else {
      verifySession();
    }
  }, [verifySession]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="hidden md:block">
        <AppSidebar locale={locale} user={user} />
      </div>
      <MobileNav locale={locale} user={user} />
      <main className="flex-1 overflow-auto bg-muted/30">
        <div className="container mx-auto p-4 md:p-6 pt-[4.5rem] md:pt-6 pb-20 md:pb-6">
          {children}
        </div>
      </main>
      <MobileBottomNav locale={locale} isAdmin={user.role === "admin"} />
      <Toaster />
      <ChatBot />
    </div>
  );
}
