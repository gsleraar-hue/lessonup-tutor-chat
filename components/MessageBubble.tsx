import type { ChatMessage } from "@/lib/types";

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
      }}
    >
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
