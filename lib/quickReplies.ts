import { ANTHROPIC_MODEL, getAnthropicClient } from "./anthropic";
import type { ChatMessage } from "./types";

const FALLBACK_REPLIES = [
  "Geef nog een hint",
  "Ik snap het, dankje!",
  "Kun je het anders uitleggen?",
];

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
  history: ChatMessage[]
): Promise<string[]> {
  const recentHistory = history.slice(-MAX_HISTORY_FOR_REPLIES);
  if (recentHistory.length === 0) return FALLBACK_REPLIES;

  try {
    const anthropic = getAnthropicClient();
    const transcript = recentHistory
      .map((m) => `${m.role === "user" ? "Leerling" : "Tutor"}: ${m.content}`)
      .join("\n");

    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 250,
      system:
        "Je kijkt naar het laatste stukje van een chatgesprek tussen een leerling en een AI-huiswerkbegeleider over een specifieke les. " +
        "Bedenk 2 tot 4 korte, klikbare vervolgopties die de LEERLING als volgend bericht zou kunnen sturen (ik-vorm, max ~8 woorden per optie). " +
        "Twee gevallen: " +
        "1) Als de tutor het net had over een meerkeuzevraag uit de les (kijk in de lesinhoud hieronder naar de bijbehorende antwoordopties): maak van ELKE antwoordoptie een aparte vervolgoptie in de vorm 'Ik denk <optie>', in dezelfde volgorde als in de les, zonder te verklappen welke goed is. " +
        "2) Anders: bedenk natuurlijke, korte vervolgopties die passen bij het gesprek, zoals 'Geef nog een hint', 'Ik snap het nu, dankje', 'Kun je dat anders uitleggen?', 'Overhoor me verder'. " +
        "Verklap zelf nooit een antwoord dat de tutor nog niet had gegeven. Blijf on-topic bij de les. " +
        "Antwoord ALLEEN met een JSON-array van strings, in het Nederlands. Geen uitleg, geen markdown.",
      messages: [
        {
          role: "user",
          content: `Les: "${lessonTitle}"\n\nLesinhoud:\n${contextText}\n\nLaatste stukje van het gesprek:\n${transcript}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return FALLBACK_REPLIES;

    const match = textBlock.text.match(/\[[\s\S]*\]/);
    if (!match) return FALLBACK_REPLIES;

    const parsed = JSON.parse(match[0]);
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed.every((q) => typeof q === "string")
    ) {
      return parsed.slice(0, 4);
    }
    return FALLBACK_REPLIES;
  } catch (err) {
    console.error("Kon geen vervolgopties genereren:", err);
    return FALLBACK_REPLIES;
  }
}
