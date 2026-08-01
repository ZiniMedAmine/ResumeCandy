import type { Metadata } from "next";
import { InlineScript } from "@/components/ui/inline-script";
import { I18nProvider } from "@/lib/i18n/provider";
import { getI18n } from "@/lib/i18n/server";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.app.name, description: t.app.tagline };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Unlike the theme, the language is known on the server: it comes from a
  // cookie rather than from localStorage, so `lang` and `dir` are correct in
  // the first painted frame and need no pre-paint script.
  const { locale, dir, t } = await getI18n();

  return (
    // The server has no way to know the saved theme, so it renders light and
    // the head script corrects <html> before first paint. suppressHydrationWarning
    // tells React to keep that corrected attribute instead of its own output.
    <html
      lang={locale}
      dir={dir}
      data-theme="light"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <InlineScript html={THEME_INIT_SCRIPT} />
      </head>
      <body className="min-h-full flex flex-col">
        <I18nProvider locale={locale} dir={dir} dictionary={t}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
