import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  const cookieStore = cookies();
  const locale = cookieStore.get('locale')?.value ?? 'el';
  const validLocales = ['el', 'en'];
  const resolvedLocale = validLocales.includes(locale) ? locale : 'el';

  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default,
  };
});
