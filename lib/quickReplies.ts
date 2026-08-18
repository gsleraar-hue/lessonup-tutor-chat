import { ANTHROPIC_MODEL, getAnthropicClient } from "./anthropic";
import { type Language, t } from "./i18n";
import type { ChatMessage } from "./types";

const MAX_HISTORY_FOR_REPLIES = 6;

/**
 * Genereert 2-4 korte, klikbare vervolgopties passend bij het laatste
 * antwoord van de tutor — of dat nu de losse antwoordopties van een
 * meerkeuzevraag uit de les zijn (die worden opgezocht in contextText), of
 * natuurlijke vervolgzinnen ("geef nog een hint", "ik snap het nu").
 */
export async function generateQuickReplies(
  lessonTitle: string,
  contextText: string,
  history: ChatMessage[],
  language: Language = "nl"
): Promise<string[]> {
  const fallback = t(language).chatWindow.fallbackSuggestions.slice(0, 3);
  const recentHistory = history.slice(-MAX_HISTORY_FOR_REPLIES);
  if (recentHistory.length === 0) return fallback;

  try {
    const anthropic = getAnthropicClient();
    const languageName = t(language).promptLanguageName;
    const transcript = recentHistory
      .map((m) => `${m.role === "user" ? "Leerling" : "Tutor"}: ${m.content}`)
      .join("\n");

    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 250,
      system:
        "Je kijkt naar het laatste stukje van een chatgesprek tussen een leerling en een AI-huiswerkbegeleider over een specifieke les. " +
        "Bedenk 2 tot 4 korte, klikbare vervolgopties die de LEERLING als volgend bericht zou kunnen sturen (ik-vorm, max ~8 woorden per optie). " +
        "Drie gevallen — bepaal EERST welke van toepassing is: " +
        `1) De tutor had het net over een MEERKEUZEVRAAG uit de les mét letterlijk in de lesinhoud genoemde antwoordopties (bv. A/B/C/D): maak van ELKE antwoordoptie een aparte vervolgoptie waarin de leerling dat antwoord voorstelt in de ik-vorm — bv. patroon "Ik denk <optie>" in het Nederlands, of "I think <optie>" in het Engels. Zelfde volgorde als in de les, zonder te verklappen welke goed is. ` +
        `2) De tutor had het net over een OPEN vraag uit de les (een vraag zonder vaste antwoordopties in de les, bv. een "Open vraag"-type slide, of een vraag waar de leerling zelf iets moet uitleggen/formuleren): verzin dan GEEN vervolgoptie die zelf een antwoord, uitleg of definitie voorstelt — ook niet gedeeltelijk of in eigen woorden — want dat verklapt het antwoord alsnog, zelfs als het aanvoelt als "de leerling die het zelf zegt". Gebruik in dit geval UITSLUITEND inhoudsloze/algemene opties, bv. patronen als "Ik weet het niet, geef een hint" / "I don't know, give me a hint", "Ik snap het nu, dankje" / "I get it now, thanks", "Kun je dat anders uitleggen?" / "Can you explain that differently?", "Ik heb een antwoord, klopt het?" / "I have an answer, is it right?" (zonder het antwoord zelf te noemen). ` +
        `3) Anders (geen specifieke vraag uit de les net besproken): bedenk natuurlijke, korte vervolgopties die passen bij het gesprek — bv. "Geef nog een hint" / "Give me another hint", "Overhoor me verder" / "Quiz me some more"; kies steeds de versie die hoort bij de gekozen uitvoertaal (${languageName}). ` +
        "Verklap zelf nooit een antwoord dat de tutor nog niet had gegeven, en verzin bij twijfel liever een te voorzichtige/algemene optie dan een die per ongeluk het antwoord weggeeft. Blijf on-topic bij de les. " +
        `Antwoord ALLEEN met een JSON-array van strings, VOLLEDIG in het ${languageName} (dus niet in het Nederlands als de gekozen taal iets anders is). Geen uitleg, geen markdown.`,
      messages: [
        {
          role: "user",
          content: `Les: "${lessonTitle}"\n\nLesinhoud:\n${contextText}\n\nLaatste stukje van het gesprek:\n${transcript}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return fallback;

    const match = textBlock.text.match(/\[[\s\S]*\]/);
    if (!match) return fallback;

    const parsed = JSON.parse(match[0]);
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed.every((q) => typeof q === "string")
    ) {
      return parsed.slice(0, 4);
    }
    return fallback;
  } catch (err) {
    console.error("Kon geen vervolgopties genereren:", err);
    return fallback;
  }
}
