import { NextResponse } from "next/server";
import { DEFAULT_LANGUAGE, isLanguage, t } from "@/lib/i18n";
import {
  fetchLessonContent,
  InvalidLessonUrlError,
  LessonScrapeError,
} from "@/lib/lessonup-scraper";
import { generateSuggestedQuestions } from "@/lib/suggestions";
import type { LessonRequestBody } from "@/lib/types";

// Playwright needs a real Node runtime (it launches a Chromium subprocess),
// not the Edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: LessonRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: t(DEFAULT_LANGUAGE).api.invalidRequest }, { status: 400 });
  }

  const language = isLanguage(body?.language) ? body.language : DEFAULT_LANGUAGE;
  const strings = t(language).api;

  if (!body?.url || typeof body.url !== "string") {
    return NextResponse.json({ error: strings.noLessonUrl }, { status: 400 });
  }

  try {
    const lesson = await fetchLessonContent(body.url, language);
    lesson.suggestedQuestions = await generateSuggestedQuestions(
      lesson.title,
      lesson.contextText,
      language
    );
    return NextResponse.json(lesson);
  } catch (err) {
    if (err instanceof InvalidLessonUrlError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof LessonScrapeError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("Onverwachte fout bij ophalen les:", err);
    return NextResponse.json({ error: strings.unexpectedLessonError }, { status: 500 });
  }
}
