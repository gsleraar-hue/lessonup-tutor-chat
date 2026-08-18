import { chromium, type Browser } from "playwright";
import type { LessonContent, LessonSlide } from "./types";

// Case-insensitive: domain names aren't case-sensitive (e.g. "lessonUp.app"
// is the same host as "lessonup.app"), and people/apps often type or share
// the branded "LessonUp" capitalization.
const SELF_PACED_URL_RE =
  /^https:\/\/lessonup\.app\/self-paced\/[0-9a-fA-F-]{10,}\/?$/i;

const CONTEXT_CHAR_LIMIT = 8000;

export class InvalidLessonUrlError extends Error {}
export class LessonScrapeError extends Error {}

export function isValidSelfPacedUrl(url: string): boolean {
  return SELF_PACED_URL_RE.test(url.trim());
}

// A single shared headless Chromium instance is reused across requests
// instead of launching a fresh browser per lesson lookup — launching is the
// slow/expensive part, individual pages/contexts are cheap.
let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium
      .launch({
        headless: true,
        // Container-hardening flags: without --disable-dev-shm-usage,
        // Chromium uses /dev/shm for shared memory, which Docker limits to
        // 64MB by default — on constrained hosts (like a 1GB Fly.io
        // machine) that reliably crashes the browser mid-request, which
        // then surfaces as a confusing "Target page, context or browser
        // has been closed" error on whatever request was using it.
        // --no-sandbox/--disable-setuid-sandbox are needed because the
        // container runs as root, where Chromium's sandbox refuses to
        // start.
        args: [
          "--disable-dev-shm-usage",
          "--no-sandbox",
          "--disable-setuid-sandbox",
        ],
      })
      .catch((err) => {
        browserPromise = null;
        throw err;
      });
    browserPromise.then((browser) => {
      // If Chromium still crashes for some other reason, drop the shared
      // instance so the next request launches a fresh one instead of
      // repeatedly trying to use a dead browser.
      browser.on("disconnected", () => {
        browserPromise = null;
      });
    });
  }
  return browserPromise;
}

/**
 * Fetches a public LessonUp "self-paced" student lesson link and extracts
 * its slide content.
 *
 * MVP caveat: lessonup.app is a Meteor (DDP/reactive) app, not a
 * server-rendered page — the slide content only exists after client-side JS
 * runs and the live data subscription resolves. There is no known public
 * API for this, so this scrapes the rendered page text with a headless
 * browser and parses it with a "<number> - <SlideType>" regex, based on
 * manual inspection of real lesson pages. This is inherently fragile to a
 * LessonUp front-end redesign — replace with an internal API once available.
 */
export async function fetchLessonContent(url: string): Promise<LessonContent> {
  const trimmedUrl = url.trim();
  if (!isValidSelfPacedUrl(trimmedUrl)) {
    throw new InvalidLessonUrlError(
      "Alleen publieke LessonUp self-paced leerling-links worden ondersteund, bv. https://lessonup.app/self-paced/<id>"
    );
  }

  // One retry with a freshly-launched browser: the shared instance can have
  // crashed (e.g. OOM on a small host) between getBrowser() resolving and
  // us actually using it, which surfaces as a "Target page, context or
  // browser has been closed" error rather than a clean rejection.
  try {
    return await scrapeLesson(trimmedUrl);
  } catch (err) {
    if (err instanceof InvalidLessonUrlError) throw err;
    if (!isClosedBrowserError(err)) throw err;
    browserPromise = null;
    return await scrapeLesson(trimmedUrl);
  }
}

function isClosedBrowserError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /closed|disconnected|Target page/i.test(message);
}

async function scrapeLesson(trimmedUrl: string): Promise<LessonContent> {
  let browser: Browser;
  try {
    browser = await getBrowser();
  } catch (err) {
    throw new LessonScrapeError(
      `Kon geen headless browser starten (draai je 'npm run playwright:install'?): ${String(err)}`
    );
  }

  // Force Dutch so the scraped slide text matches what a Dutch student
  // actually sees (and what the system prompt is written in), instead of
  // whatever locale the server's default Accept-Language happens to be.
  const context = await browser.newContext({
    locale: "nl-NL",
    extraHTTPHeaders: { "Accept-Language": "nl-NL,nl;q=0.9" },
  });
  const page = await context.newPage();

  try {
    await page.goto(trimmedUrl, { waitUntil: "networkidle", timeout: 20000 });

    // The Meteor app renders the slide list reactively after the initial
    // network-idle point, so also wait for the known heading to show up.
    await page
      .waitForFunction(
        () => document.body.innerText.includes("Slides in deze les"),
        { timeout: 10000 }
      )
      .catch(() => {
        // Fall back to whatever is on the page — better to return a partial
        // result than to hard-fail if the wording ever changes slightly.
      });

    const rawText = await page.evaluate(() => document.body.innerText);
    return parseLessonText(rawText, trimmedUrl);
  } catch (err) {
    if (err instanceof InvalidLessonUrlError) throw err;
    throw new LessonScrapeError(
      `Kon de les niet ophalen van LessonUp: ${String(err)}`
    );
  } finally {
    await page.close().catch(() => {});
    await context.close().catch(() => {});
  }
}

export function parseLessonText(rawText: string, sourceUrl: string): LessonContent {
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const slideListHeaderIdx = lines.findIndex((l) => l === "Slides in deze les");
  const countLineIdx = lines.findIndex((l) => /^\d+\s+slides?\b/i.test(l));

  const title =
    countLineIdx > 0 ? lines[countLineIdx - 1] : lines[0] ?? "Onbekende les";

  const slideLines =
    slideListHeaderIdx >= 0 ? lines.slice(slideListHeaderIdx + 1) : lines;

  // Requires whitespace around the dash (LessonUp renders slide headers as
  // e.g. "3 - Meerkeuzevraag"), and a non-numeric type — otherwise a
  // timeline slide's plain "1960-1970" year range gets misparsed as a new
  // slide header.
  const slidePattern = /^(\d+)\s+-\s+(?!\d+$)(.+)$/;
  const slides: LessonSlide[] = [];
  let current: LessonSlide | null = null;

  for (const line of slideLines) {
    const match = line.match(slidePattern);
    if (match) {
      if (current) slides.push(current);
      current = { index: Number(match[1]), type: match[2], text: "" };
    } else if (current) {
      current.text = current.text ? `${current.text}\n${line}` : line;
    }
  }
  if (current) slides.push(current);

  if (slides.length === 0) {
    throw new LessonScrapeError(
      "Geen slides gevonden op de pagina — de lespagina is mogelijk niet (volledig) geladen of het formaat is gewijzigd."
    );
  }

  const contextText = buildContextText(title, slides);

  return {
    title,
    slideCount: slides.length,
    slides,
    contextText,
    sourceUrl,
    // Filled in by the caller (app/api/lesson/route.ts) via
    // generateSuggestedQuestions() — scraping and suggestion-generation are
    // kept as separate concerns.
    suggestedQuestions: [],
  };
}

function buildContextText(title: string, slides: LessonSlide[]): string {
  const header = `Lestitel: ${title}\nAantal slides: ${slides.length}\n\n`;
  let body = "";
  for (const slide of slides) {
    const chunk = `Slide ${slide.index} (${slide.type}):\n${slide.text}\n\n`;
    if (header.length + body.length + chunk.length > CONTEXT_CHAR_LIMIT) break;
    body += chunk;
  }
  return (header + body).trim();
}
