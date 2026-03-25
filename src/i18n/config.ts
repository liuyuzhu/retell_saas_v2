import { Pathnames, LocalePrefix } from 'next-intl/routing';

export const locales = [
  'zh',      // 中文
  'en',      // English
  'es',      // Español
  'ar',      // العربية
  'hi',      // हिन्दी
  'pt',      // Português
  'fr',      // Français
  'de',      // Deutsch
  'ru',      // Русский
  'ja',      // 日本語
  'it',      // Italiano
] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'zh' satisfies Locale;

export const localeNames: Record<Locale, string> = {
  zh: '中文',
  en: 'English',
  es: 'Español',
  ar: 'العربية',
  hi: 'हिन्दी',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  ru: 'Русский',
  ja: '日本語',
  it: 'Italiano',
};

export const localeFlags: Record<Locale, string> = {
  zh: '🇨🇳',
  en: '🇬🇧',
  es: '🇪🇸',
  ar: '🇸🇦',
  hi: '🇮🇳',
  pt: '🇧🇷',
  fr: '🇫🇷',
  de: '🇩🇪',
  ru: '🇷🇺',
  ja: '🇯🇵',
  it: '🇮🇹',
};

export const pathnames: Pathnames<typeof locales> = {
  '/': '/',
  '/phone-numbers': '/phone-numbers',
  '/agents': '/agents',
  '/calls': '/calls',
  '/voices': '/voices',
  '/conversations': '/conversations',
  '/settings': '/settings',
};

export const localePrefix: LocalePrefix<typeof locales> = 'always';
