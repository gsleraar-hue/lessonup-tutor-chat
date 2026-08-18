"use client";

import { useState } from "react";
import { DEFAULT_LEVEL, type Language, type Level, t } from "@/lib/i18n";
import type { LessonContent } from "@/lib/types";
import ChatWindow from "./ChatWindow";

/**
 * Floating chat widget, anchored bottom-right — a launcher bubble that
 * expands into a chat panel, meant to sit on top of the real lesson (shown
 * behind it, e.g. in an iframe) rather than replacing the lesson screen.
 */
export default function ChatWidget({
  lesson,
  language,
  level = DEFAULT_LEVEL,
}: {
  lesson: LessonContent;
  language: Language;
  level?: Level;
}) {
  const [open, setOpen] = useState(false);
  const strings = t(language).widget;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 12,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {open && (
        <div
          style={{
            width: 360,
            height: 520,
            maxHeight: "calc(100dvh - 110px)",
            background: "var(--lu-bg, #f7f8fa)",
            borderRadius: 16,
            boxShadow: "0 12px 32px rgba(15, 23, 42, 0.25)",
            border: "1px solid var(--lu-border, #e2e5ea)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              background: "var(--lu-blue, #1d4ed8)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{strings.title}</div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>{lesson.title}</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label={strings.closeAria}
              style={{
                background: "transparent",
                border: "none",
                color: "white",
                fontSize: 20,
                lineHeight: 1,
                padding: 4,
              }}
            >
              ×
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ChatWindow lesson={lesson} language={language} level={level} />
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? strings.closeAria : strings.openAria}
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "none",
          background: "var(--lu-blue, #1d4ed8)",
          color: "white",
          boxShadow: "0 6px 18px rgba(15, 23, 42, 0.3)",
          fontSize: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {open ? "×" : "💬"}
      </button>
    </div>
  );
}
