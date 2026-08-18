import { ANTHROPIC_MODEL, getAnthropicClient } from "./anthropic";
import { type Language, t } from "./i18n";

/**
 * Genereert een paar korte, on-topic voorbeeldvragen die een leerling zou
 * kunnen stellen over déze specifieke les — gebruikt als klikbare chips in
 * de chat, zodat leerlingen een duwtje krijgen richting relevante vragen
 * i.p.v. off-topic/onzin-input.
 */
export async function generateSuggestedQuestions(
  lessonTitle: string,
  contextText: string,
  language: Language = "nl"
): Promise<string[]> {
  const fallback = t(language).chatWindow.fallbackSuggestions;
  try {
    const anthropic = getAnthropicClient();
    const languageName = t(language).promptLanguageName;
    const response = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 300,
      system:
        "Je bedenkt korte voorbeeldvragen die een leerling als EERSTE bericht aan een AI-huiswerkbegeleider zou kunnen sturen, aan het begin van een gloednieuw gesprek over een specifieke les — er is dus nog niets gezegd of ingevuld. " +
        "De vragen zijn dingen die de LEERLING zegt (ik-vorm), niet de tutor. " +
        "Verwijs waar zinvol naar concrete onderdelen van de les (bv. een specifiek slidenummer of onderwerp). " +
        "BELANGRIJK: verklap zelf nooit een (vermoedelijk) juist antwoord op een quizvraag of opgave uit de les, ook niet terloops. " +
        "Gebruik GEEN 'klopt mijn antwoord'-achtige vragen — die slaan nergens op als openingsbericht, want de leerling heeft nog helemaal geen antwoord gegeven in dit gesprek. Dat type vraag past pas later, als vervolg op iets dat al besproken is. " +
        "Varieer in plaats daarvan met: een hint-vraag over een specifieke opgave, een uitleg-vraag over een onderdeel van de lesstof, een overhoor-verzoek, en een nieuwsgierige open vraag over de les. " +
        `Antwoord ALLEEN met een JSON-array van 4 korte strings (elk max ~12 woorden), in het ${languageName}. Geen uitleg, geen markdown, alleen de JSON-array.`,
      messages: [
        {
          role: "user",
          content: `Les: "${lessonTitle}"\n\nInhoud:\n${contextText}`,
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
    console.error("Kon geen lesspecifieke voorbeeldvragen genereren:", err);
    return fallback;
  }
}
