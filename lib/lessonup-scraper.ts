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

// Chromium is launched fresh per request and fully closed afterwards,
// rather than kept resident as a shared singleton. On memory-constrained
// hosts (e.g. a 512MB free-tier instance), an always-on idle browser eats
// into the same budget Next.js needs, leaving less headroom for the actual
// page-render spike during a scrape. Launching per request costs ~1-2s but
// means the browser only exists (and only competes for memory) while it's
// actually doing work.
async function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: [
      // Without --disable-dev-shm-usage, Chromium uses /dev/shm for shared
      // memory, which Docker limits to 64MB by default — that reliably
      // crashes the browser mid-request on constrained hosts.
      "--disable-dev-shm-usage",
      // Needed because the container runs as root, where Chromium's
      // sandbox refuses to start.
      "--no-sandbox",
      "--disable-setuid-sandbox",
      // Memory-saving flags: trims background/telemetry machinery and
      // extra renderer-process isolation that this single-page,
      // text-only scrape doesn't need.
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-breakpad",
      "--disable-component-extensions-with-background-pages",
      "--disable-default-apps",
      "--disable-sync",
      "--disable-features=IsolateOrigins,site-per-process,TranslateUI",
      "--metrics-recording-only",
      "--mute-audio",
      "--no-first-run",
      // NOTE: --single-process was tried as a further memory-saving step
      // but made things worse in practice (hangs/timeouts combined with
      // request interception) — reverted. Left as a documented dead end so
      // it isn't retried blindly later.
    ],
  });
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

  let browser: Browser;
  try {
    browser = await launchBrowser();
  } catch (err) {
    throw new LessonScrapeError(
      `Kon geen headless browser starten (draai je 'npm run playwright:install'?): ${String(err)}`
    );
  }

  try {
    return await scrapeLesson(browser, trimmedUrl);
  } finally {
    await browser.close().catch(() => {});
  }
}

async function scrapeLesson(browser: Browser, trimmedUrl: string): Promise<LessonContent> {
  // Force Dutch so the scraped slide text matches what a Dutch student
  // actually sees (and what the system prompt is written in), instead of
  // whatever locale the server's default Accept-Language happens to be.
  // A small viewport keeps layout/paint work (and thus memory) down — we
  // only ever read text, never pixels.
  const context = await browser.newContext({
    locale: "nl-NL",
    extraHTTPHeaders: { "Accept-Language": "nl-NL,nl;q=0.9" },
    viewport: { width: 800, height: 600 },
  });
  const page = await context.newPage();

  // We only need the DOM text, never how the page actually looks — block
  // images/media/fonts/stylesheets so Chromium never has to download or
  // decode them. This is the single biggest memory saver: a lesson page is
  // full of slide thumbnail images that otherwise all get fetched and
  // rendered.
  await page.route("**/*", (route) => {
    const type = route.request().resourceType();
    if (["image", "media", "font", "stylesheet"].includes(type)) {
      route.abort();
    } else {
      route.continue();
    }
  });

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
