import { NextResponse } from "next/server";
import { DEFAULT_LANGUAGE, DEFAULT_LEVEL, isLanguage, isLevel, t } from "@/lib/i18n";
import { generateQuickReplies } from "@/lib/quickReplies";
import type { QuickRepliesRequestBody } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: QuickRepliesRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: t(DEFAULT_LANGUAGE).api.invalidRequest }, { status: 400 });
  }

  const language = isLanguage(body?.language) ? body.language : DEFAULT_LANGUAGE;
  const level = isLevel(body?.level) ? body.level : DEFAULT_LEVEL;
  const { contextText, lessonTitle, history } = body ?? {};
  if (!contextText || !Array.isArray(history)) {
    return NextResponse.json(
      { error: t(language).api.contextAndHistoryRequired },
      { status: 400 }
    );
  }

  const options = await generateQuickReplies(
    lessonTitle || "deze les",
    contextText,
    history,
    language,
    level
  );
  return NextResponse.json({ options });
}
