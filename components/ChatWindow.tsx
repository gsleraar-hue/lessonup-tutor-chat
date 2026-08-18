"use client";

import { useRef, useState } from "react";
import { DEFAULT_LEVEL, type Language, type Level, t } from "@/lib/i18n";
import type { ChatMessage, LessonContent } from "@/lib/types";
import MessageBubble from "./MessageBubble";

function buildInitialQuickReplies(lesson: LessonContent, language: Language): string[] {
  const fallback = t(language).chatWindow.fallbackSuggestions;
  const lessonSpecific =
    lesson.suggestedQuestions && lesson.suggestedQuestions.length > 0
      ? lesson.suggestedQuestions
      : fallback;
  return [t(language).chatWindow.openingChip, ...lessonSpecific.slice(0, 3)];
}

export default function ChatWindow({
  lesson,
  language,
  level = DEFAULT_LEVEL,
}: {
  lesson: LessonContent;
  language: Language;
  level?: Level;
}) {
  const strings = t(language).chatWindow;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickReplies, setQuickReplies] = useState<string[]>(() =>
    buildInitialQuickReplies(lesson, language)
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }

  async function fetchQuickReplies(historyWithReply: ChatMessage[]) {
    try {
      const res = await fetch("/api/quick-replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contextText: lesson.contextText,
          lessonTitle: lesson.title,
          history: historyWithReply,
          language,
          level,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.options) && data.options.length > 0) {
        setQuickReplies(data.options);
      }
    } catch {
      // Vervolgopties zijn een leuke extra, geen kritiek pad — bij een fout
      // laten we gewoon geen nieuwe knoppen zien in plaats van te crashen.
    }
  }

  async function submitMessage(text: string) {
    if (!text || isStreaming) return;

    setError(null);
    setQuickReplies([]);
    const history = messages;
    const userMessage: ChatMessage = { role: "user", content: text };
    const assistantMessage: ChatMessage = { role: "assistant", content: "" };
    setMessages([...history, userMessage, assistantMessage]);
    setInput("");
    setIsStreaming(true);
    scrollToBottom();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contextText: lesson.contextText,
          lessonTitle: lesson.title,
          history,
          message: text,
          language,
          level,
        }),
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || strings.unknownServerError);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: assistantText };
          return next;
        });
        scrollToBottom();
      }

      const completedHistory: ChatMessage[] = [
        ...history,
        userMessage,
        { role: "assistant", content: assistantText },
      ];
      fetchQuickReplies(completedHistory);
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.genericChatError);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setIsStreaming(false);
    }
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitMessage(input.trim());
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: "var(--lu-text-muted)", fontSize: 14, margin: 0 }}>
            {strings.emptyState}
          </p>
        )}
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {!isStreaming && quickReplies.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {quickReplies.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => submitMessage(q)}
                style={{
                  background: "var(--lu-blue-light, #eff6ff)",
                  color: "var(--lu-blue, #1d4ed8)",
                  border: "1px solid var(--lu-blue, #1d4ed8)",
                  borderRadius: 14,
                  padding: "7px 12px",
                  fontSize: 13,
                  lineHeight: 1.35,
                  textAlign: "left",
                  alignSelf: "flex-start",
                  cursor: "pointer",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {error && (
        <p style={{ color: "#b91c1c", fontSize: 14, padding: "0 16px" }}>{error}</p>
      )}
      <form
        onSubmit={handleFormSubmit}
        style={{
          display: "flex",
          gap: 8,
          padding: 16,
          borderTop: "1px solid var(--lu-border)",
          background: "white",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={strings.inputPlaceholder}
          disabled={isStreaming}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--lu-border)",
            fontSize: 15,
          }}
        />
        <button
          type="submit"
          disabled={isStreaming || !input.trim()}
          style={{
            background: "var(--lu-blue)",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "10px 18px",
            fontWeight: 600,
            opacity: isStreaming || !input.trim() ? 0.6 : 1,
          }}
        >
          {strings.send}
        </button>
      </form>
    </div>
  );
}
