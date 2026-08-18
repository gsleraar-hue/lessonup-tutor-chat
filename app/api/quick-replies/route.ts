import { NextResponse } from "next/server";
import { generateQuickReplies } from "@/lib/quickReplies";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface QuickRepliesRequestBody {
  contextText: string;
  lessonTitle: string;
  history: ChatMessage[];
}

export async function POST(req: Request) {
  let body: QuickRepliesRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige aanvraag." }, { status: 400 });
  }

  const { contextText, lessonTitle, history } = body ?? {};
  if (!contextText || !Array.isArray(history)) {
    return NextResponse.json(
      { error: "Les-context en gespreksgeschiedenis zijn verplicht." },
      { status: 400 }
    );
  }

  const options = await generateQuickReplies(
    lessonTitle || "deze les",
    contextText,
    history
  );
  return NextResponse.json({ options });
}
