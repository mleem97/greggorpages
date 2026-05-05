import type { Metadata } from "next";
import "./globals.css";
import { loadDesignConfig, generateDesignCSS, generateGoogleFontsUrl } from "@/lib/design";

export const metadata: Metadata = {
  title: "gregFramework | System Response",
  description: "Luminescent Architect - System Response",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const config = loadDesignConfig();
  const designCSS = generateDesignCSS(config);
  const googleFontsUrl = generateGoogleFontsUrl(config);

  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href={googleFontsUrl} rel="stylesheet" />
        <style dangerouslySetInnerHTML={{ __html: designCSS }} />
      </head>
      <body className="bg-background text-on-surface font-body selection:bg-primary selection:text-on-primary antialiased">
        {children}
      </body>
    </html>
  );
}
