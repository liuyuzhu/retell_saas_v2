import { getRequestConfig } from 'next-intl/server';
import { locales, type Locale } from './config';

// Import all message files statically
import zh from './messages/zh.json';
import en from './messages/en.json';
import es from './messages/es.json';
import ar from './messages/ar.json';
import hi from './messages/hi.json';
import pt from './messages/pt.json';
import fr from './messages/fr.json';
import de from './messages/de.json';
import ru from './messages/ru.json';
import ja from './messages/ja.json';
import it from './messages/it.json';

const messages: Record<Locale, typeof zh> = {
  zh,
  en,
  es,
  ar,
  hi,
  pt,
  fr,
  de,
  ru,
  ja,
  it,
};

export default getRequestConfig(async ({ requestLocale }) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;
  
  // Ensure that a valid locale is used
  if (!locale || !locales.includes(locale as Locale)) {
    locale = 'zh';
  }

  return {
    locale,
    messages: messages[locale as Locale]
  };
});
