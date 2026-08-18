import { ANTHROPIC_MODEL, getAnthropicClient } from "@/lib/anthropic";
import { DEFAULT_LANGUAGE, DEFAULT_LEVEL, isLanguage, isLevel, t } from "@/lib/i18n";
import { buildSystemPrompt } from "@/lib/prompts";
import type { ChatRequestBody } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 2000;

export async function POST(req: Request) {
  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(t(DEFAULT_LANGUAGE).api.invalidRequest, { status: 400 });
  }

  const language = isLanguage(body?.language) ? body.language : DEFAULT_LANGUAGE;
  const level = isLevel(body?.level) ? body.level : DEFAULT_LEVEL;
  const strings = t(language).api;

  const { contextText, lessonTitle, history, message } = body ?? {};
  if (!contextText || !message || typeof message !== "string" || !message.trim()) {
    return new Response(strings.contextAndMessageRequired, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return new Response(strings.messageTooLong(MAX_MESSAGE_LENGTH), { status: 400 });
  }

  let anthropic;
  try {
    anthropic = getAnthropicClient();
  } catch (err) {
    return new Response(String(err instanceof Error ? err.message : err), {
      status: 500,
    });
  }

  const trimmedHistory = Array.isArray(history)
    ? history.slice(-MAX_HISTORY_MESSAGES)
    : [];

  const messages = [
    ...trimmedHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: message },
  ];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const claudeStream = anthropic.messages.stream({
          model: ANTHROPIC_MODEL,
          max_tokens: 1024,
          system: buildSystemPrompt(lessonTitle || "deze les", contextText, language, level),
          messages,
        });

        claudeStream.on("text", (text) => {
          controller.enqueue(encoder.encode(text));
        });

        claudeStream.on("error", (err) => {
          console.error("Anthropic stream-fout:", err);
          controller.error(err);
        });

        await claudeStream.finalMessage();
        controller.close();
      } catch (err) {
        console.error("Onverwachte fout in chat-stream:", err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
