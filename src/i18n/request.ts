import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

const NAMESPACES = [
  'common',
  'sellers',
  'carriers',
  'customs',
  'b2b',
  'listings',
  'payouts',
  'console',
  'site',
  'home',
  'auth',
  'dashboard',
  'orders',
  'pricing',
  'shop',
  'hubSetup',
  'sourcing',
  'labels',
  'legal',
  'account',
  'store',
  'catalogAdmin',
  'checkout',
  'storeOrders',
  'ai',
  'services',
  'freightAdmin',
  'shipments',
  'cod',
  'returns',
  'inventory',
  'purchasing',
  'partners',
  'promotions',
  'reviews',
  'notificationTemplates',
] as const;

function isSupportedLocale(locale: string | undefined): locale is (typeof routing.locales)[number] {
  return routing.locales.includes(locale as (typeof routing.locales)[number]);
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isSupportedLocale(requested) ? requested : routing.defaultLocale;

  const modules = await Promise.all(
    NAMESPACES.map((namespace) => import(`../../messages/${locale}/${namespace}.json`)),
  );

  const messages = Object.fromEntries(
    NAMESPACES.map((namespace, index) => [namespace, modules[index].default]),
  );

  return { locale, messages };
});
