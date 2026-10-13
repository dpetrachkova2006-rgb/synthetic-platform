import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./editorial.css";
import GlobalNavigation from "./components/GlobalNavigation";
import GlobalFooter from "./components/GlobalFooter";
const display = localFont({
  src: "../public/fonts/RobotoCondensed-Variable.ttf",
  variable: "--font-synth-display",
  weight: "100 900",
  display: "swap",
});
const note = localFont({
  src: "../public/fonts/Caveat-Variable.ttf",
  variable: "--font-synth-note",
  weight: "400 700",
  display: "swap",
  preload: false,
});
const body = localFont({
  src: [
    { path: "../public/fonts/NotoSans-Regular.ttf", weight: "400" },
    { path: "../public/fonts/NotoSans-Bold.ttf", weight: "700" },
  ],
  variable: "--font-synth-body",
  display: "swap",
});
export const metadata: Metadata = {
  title: "SYNTH Respondents — платформа синтетических респондентов",
  description: "Синтетические исследования: опросы, интервью и смешанный метод",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ru"
      className={`${display.variable} ${note.variable} ${body.variable} h-full antialiased`}
    >
      <body className="synth-site min-h-full flex flex-col">
        <GlobalNavigation />
        {children}
        <GlobalFooter />
      </body>
    </html>
  );
}
