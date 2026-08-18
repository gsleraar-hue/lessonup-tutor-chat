"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_LANGUAGE, type Language, t } from "@/lib/i18n";
import type { ChatMessage } from "@/lib/types";

// Zorgt dat er over alle chatbubbels heen maar één audiofragment tegelijk
// afspeelt — klik je een ander bericht aan, dan stopt het vorige.
let activeAudio: HTMLAudioElement | null = null;
let activeAudioUrl: string | null = null;
let onActiveAudioStopped: (() => void) | null = null;

function stopActiveAudio() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
  }
  if (activeAudioUrl) URL.revokeObjectURL(activeAudioUrl);
  if (onActiveAudioStopped) onActiveAudioStopped();
  activeAudio = null;
  activeAudioUrl = null;
  onActiveAudioStopped = null;
}

export default function MessageBubble({
  message,
  speakable = false,
  language = DEFAULT_LANGUAGE,
}: {
  message: ChatMessage;
  /** Whether de voorlezen-knop mag getoond worden — uit tijdens het
   * streamen van dit bericht, zodat er geen halve/steeds veranderende zin
   * wordt voorgelezen. */
  speakable?: boolean;
  language?: Language;
}) {
  const strings = t(language).messageBubble;
  const isUser = message.role === "user";
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Stop alleen áls dit bericht het is dat aan het afspelen was.
      if (onActiveAudioStopped === handleStopped) stopActiveAudio();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleStopped() {
    if (mountedRef.current) setIsSpeaking(false);
  }

  async function toggleSpeak() {
    if (isSpeaking) {
      stopActiveAudio();
      setIsSpeaking(false);
      return;
    }

    stopActiveAudio();
    setIsLoadingAudio(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message.content }),
      });
      if (!res.ok || !mountedRef.current) {
        throw new Error("Voorlezen is niet gelukt.");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      activeAudio = audio;
      activeAudioUrl = url;
      onActiveAudioStopped = handleStopped;

      audio.onended = () => {
        if (activeAudio === audio) {
          activeAudio = null;
          activeAudioUrl = null;
          onActiveAudioStopped = null;
        }
        URL.revokeObjectURL(url);
        handleStopped();
      };
      audio.onerror = () => handleStopped();

      if (mountedRef.current) setIsSpeaking(true);
      await audio.play();
    } catch (err) {
      console.error("Kon bericht niet voorlezen:", err);
      if (mountedRef.current) setIsSpeaking(false);
    } finally {
      if (mountedRef.current) setIsLoadingAudio(false);
    }
  }

  const showSpeakButton = !isUser && speakable && message.content.trim().length > 0;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        alignItems: "flex-end",
        gap: 6,
      }}
    >
      {showSpeakButton && (
        <button
          type="button"
          onClick={toggleSpeak}
          disabled={isLoadingAudio}
          aria-label={isSpeaking ? strings.stopSpeakAria : strings.speakAria}
          title={isSpeaking ? strings.stopSpeakAria : strings.speakAria}
          style={{
            flexShrink: 0,
            width: 26,
            height: 26,
            borderRadius: "50%",
            border: "1px solid var(--lu-border)",
            background: isSpeaking ? "var(--lu-blue)" : "white",
            color: isSpeaking ? "white" : "var(--lu-text-muted)",
            fontSize: 12,
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            opacity: isLoadingAudio ? 0.6 : 1,
          }}
        >
          {isLoadingAudio ? (
            <span
              style={{
                width: 11,
                height: 11,
                borderRadius: "50%",
                border: "2px solid rgba(0,0,0,0.2)",
                borderTopColor: "var(--lu-text-muted)",
                animation: "spin 0.7s linear infinite",
              }}
            />
          ) : isSpeaking ? (
            "■"
          ) : (
            "🔊"
          )}
        </button>
      )}
      <div
        style={{
          maxWidth: "80%",
          padding: "10px 14px",
          borderRadius: 14,
          background: isUser ? "var(--lu-blue)" : "white",
          color: isUser ? "white" : "var(--lu-text)",
          border: isUser ? "none" : "1px solid var(--lu-border)",
          whiteSpace: "pre-wrap",
          fontSize: 15,
          lineHeight: 1.45,
        }}
      >
        {message.content || (isUser ? "" : "…")}
      </div>
    </div>
  );
}
