import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import { DEFAULT_LANGUAGE, isLanguage, type Language, t } from "@/lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TTS_CHARS = 2000;

// Self-hosted Piper TTS (see Dockerfile for how the binary + voice models
// are installed) instead of a cloud TTS API. This replaces ElevenLabs,
// whose free tier turned out to have a hard one-time character quota
// (10k, not monthly-resetting) — once exhausted, every "read aloud" click
// failed. Piper runs locally, so there's no external quota to hit; the
// trade-off is slightly more robotic-sounding audio than ElevenLabs, and a
// few seconds of CPU time per message instead of a network call.
const PIPER_DIR = process.env.PIPER_DIR || "/opt/piper";
const PIPER_BIN = path.join(PIPER_DIR, "piper");
// "low" quality: noticeably faster to synthesize than "medium" on a
// CPU-constrained host (Render's free tier made "medium" take 30-50s per
// message), at the cost of a somewhat less natural voice.
const VOICE_MODELS: Record<Language, string> = {
  nl: path.join(PIPER_DIR, "voices", "nl_NL-mls_5809-low.onnx"),
  en: path.join(PIPER_DIR, "voices", "en_US-lessac-low.onnx"),
};

function synthesizeSpeech(text: string, language: Language): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const outputFile = path.join(tmpdir(), `piper-${randomUUID()}.wav`);
    const proc = spawn(
      PIPER_BIN,
      ["--model", VOICE_MODELS[language], "--output_file", outputFile],
      // The piper binary ships its own libespeak-ng/libpiper_phonemize/
      // libonnxruntime .so files alongside itself rather than relying on
      // system packages — point the dynamic linker at that folder.
      { env: { ...process.env, LD_LIBRARY_PATH: PIPER_DIR } }
    );

    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`piper exited with code ${code}: ${stderr}`));
        return;
      }
      readFile(outputFile)
        .then(resolve, reject)
        .finally(() => {
          unlink(outputFile).catch(() => {});
        });
    });

    proc.stdin.write(text);
    proc.stdin.end();
  });
}

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

  try {
    const audioBuffer = await synthesizeSpeech(text.slice(0, MAX_TTS_CHARS), language);
    return new NextResponse(new Uint8Array(audioBuffer), {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Piper TTS-fout:", err);
    return NextResponse.json({ error: strings.ttsFailed }, { status: 502 });
  }
}
