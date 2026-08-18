import { NextResponse } from "next/server";
import { DEFAULT_LANGUAGE, isLanguage, t } from "@/lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "George" — een van ElevenLabs' standaard meegeleverde stemmen die WEL op
// de gratis tier via de API werkt. Andere bekende voice-ID's (zoals de
// vaak-gedocumenteerde "Rachel") blijken inmiddels "voice library"-stemmen
// te zijn die een betaald abonnement vereisen voor API-gebruik — geeft dan
// een 402 payment_required terug. Het "eleven_multilingual_v2"-model
// spreekt de tekst uit in de taal van de tekst zelf (hier Nederlands), ook
// al is de stem oorspronkelijk Engelstalig.
const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
const MAX_TTS_CHARS = 2000;

export async function POST(req: Request) {
  let body: { text?: string; language?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: t(DEFAULT_LANGUAGE).api.invalidRequest }, { status: 400 });
  }

  const language = isLanguage(body?.language) ? body.language : DEFAULT_LANGUAGE;
  const strings = t(language).api;

  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: strings.noTextToRead }, { status: 400 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: strings.ttsMisconfigured }, { status: 500 });
  }

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: text.slice(0, MAX_TTS_CHARS),
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("ElevenLabs TTS-fout:", res.status, errText);
      return NextResponse.json({ error: strings.ttsFailed }, { status: 502 });
    }

    const audioBuffer = await res.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Onverwachte fout bij TTS:", err);
    return NextResponse.json({ error: strings.ttsUnexpectedError }, { status: 500 });
  }
}
