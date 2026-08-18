import { NextResponse } from "next/server";
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
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  if (!body?.url || typeof body.url !== "string") {
    return NextResponse.json({ error: "Geen lesurl meegegeven." }, { status: 400 });
  }

  try {
    const lesson = await fetchLessonContent(body.url);
    lesson.suggestedQuestions = await generateSuggestedQuestions(
      lesson.title,
      lesson.contextText
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
    return NextResponse.json(
      { error: "Onverwachte fout bij het ophalen van de les." },
      { status: 500 }
    );
  }
}
