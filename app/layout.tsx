import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LessonUp AI-tutor",
  description: "Chat met een AI-tutor tijdens een LessonUp-les.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
