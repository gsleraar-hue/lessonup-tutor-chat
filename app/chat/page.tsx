"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ChatWidget from "@/components/ChatWidget";
import { DEFAULT_LANGUAGE, isLanguage, type Language, t } from "@/lib/i18n";
import type { LessonContent } from "@/lib/types";

export default function ChatPage() {
  const router = useRouter();
  const [lesson, setLesson] = useState<LessonContent | null | undefined>(undefined);
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const raw = sessionStorage.getItem("lesson");
    if (!raw) {
      router.replace("/");
      return;
    }
    const storedLanguage = sessionStorage.getItem("language");
    if (isLanguage(storedLanguage)) setLanguage(storedLanguage);
    try {
      setLesson(JSON.parse(raw));
    } catch {
      router.replace("/");
    }
  }, [router]);

  if (!lesson) return null;

  return (
    <div style={{ height: "100dvh", width: "100vw", position: "relative" }}>
      <Link
        href="/"
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 1000,
          background: "white",
          border: "1px solid var(--lu-border)",
          borderRadius: 8,
          padding: "6px 12px",
          fontSize: 13,
          boxShadow: "0 2px 8px rgba(15, 23, 42, 0.12)",
        }}
      >
        {t(language).chatPage.backLink}
      </Link>
      {/* De echte, live LessonUp-les — de chatbot verschijnt hier bovenop,
          rechtsonder, zoals hij bij een echte integratie ook naast de les
          zou staan. */}
      <iframe
        src={lesson.sourceUrl}
        title={lesson.title}
        style={{ width: "100%", height: "100%", border: "none" }}
        allow="fullscreen"
      />
      <ChatWidget lesson={lesson} language={language} />
    </div>
  );
}
