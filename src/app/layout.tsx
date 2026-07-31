import type { Metadata } from "next";
import { InlineScript } from "@/components/ui/inline-script";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResumeCandy",
  description: "One resume per career — unlimited tailored versions per resume.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The server has no way to know the saved theme, so it renders light and
    // the head script corrects <html> before first paint. suppressHydrationWarning
    // tells React to keep that corrected attribute instead of its own output.
    <html lang="en" data-theme="light" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <InlineScript html={THEME_INIT_SCRIPT} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
