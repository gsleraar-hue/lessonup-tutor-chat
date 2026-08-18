export type Language = "nl" | "en";

export const DEFAULT_LANGUAGE: Language = "nl";

export function isLanguage(value: unknown): value is Language {
  return value === "nl" || value === "en";
}

export const LANGUAGE_OPTIONS: { code: Language; label: string; flag: string }[] = [
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "en", label: "English", flag: "🇬🇧" },
];

// Centralized copy for every user-facing string in the app. Kept as plain
// data so it can be imported from client components, server components and
// API routes alike.
export const UI_STRINGS = {
  nl: {
    home: {
      title: "Hulp bij je les, precies op tijd",
      subtitle:
        "Plak de link naar je LessonUp-les en krijg een AI-tutor die met je meedenkt — met hints en wedervragen, niet met kant-en-klare antwoorden.",
    },
    form: {
      step1Bold: "Vraag je docent om de link",
      step1Rest:
        " naar de les, of zoek 'm op in je mail, Google Classroom of Teams — overal waar je de les hebt gekregen.",
      step2Bold: "Kopieer de link",
      step2Rest: ' (lang indrukken of rechtermuisknop → "Link kopiëren").',
      step3Bold: "Plak 'm hieronder",
      step3Rest:
        " — de tutor verschijnt dan als chatbubbel rechtsonder in je les.",
      fieldLabel: "Link naar je les",
      placeholder: "Plak hier de link naar je les",
      fieldHint: "De link ziet er ongeveer zo uit: lessonup.app/self-paced/...",
      exampleChip: "Geen link bij de hand? Probeer een voorbeeldles →",
      loading: "Les wordt opgehaald...",
      submit: "Start met de tutor",
      defaultError: "Er ging iets mis bij het ophalen van de les.",
      networkError: "Kon de server niet bereiken. Probeer het opnieuw.",
    },
    chatPage: {
      backLink: "← Andere les",
    },
    widget: {
      title: "AI-tutor",
      closeAria: "Chat sluiten",
      openAria: "Chat openen",
    },
    chatWindow: {
      emptyState:
        "Stel een vraag over deze les. De tutor helpt je op weg met hints in plaats van kant-en-klare antwoorden.",
      inputPlaceholder: "Typ je vraag over de les...",
      send: "Stuur",
      unknownServerError: "Onbekende fout van de server.",
      genericChatError: "Er ging iets mis tijdens het chatten.",
      fallbackSuggestions: [
        "Ik snap deze les niet zo goed, kun je een hint geven?",
        "Kun je iets uit de les nog eens simpel uitleggen?",
        "Overhoor me over deze les",
        "Waar gaat deze les eigenlijk over?",
      ],
      openingChip: "Waar kun je me allemaal mee helpen?",
    },
    api: {
      invalidRequest: "Ongeldige aanvraag.",
      noLessonUrl: "Geen lesurl meegegeven.",
      invalidLessonUrl:
        "Alleen publieke LessonUp self-paced leerling-links worden ondersteund, bv. https://lessonup.app/self-paced/<id>",
      unexpectedLessonError: "Onverwachte fout bij het ophalen van de les.",
      noBrowser:
        "Kon geen headless browser starten (draai je 'npm run playwright:install'?):",
      scrapeFailed: "Kon de les niet ophalen van LessonUp:",
      noSlidesFound:
        "Geen slides gevonden op de pagina — de lespagina is mogelijk niet (volledig) geladen of het formaat is gewijzigd.",
      unknownLessonTitle: "Onbekende les",
      contextAndMessageRequired: "Les-context en een niet-leeg bericht zijn verplicht.",
      messageTooLong: (max: number) => `Bericht is te lang (max ${max} tekens).`,
      contextAndHistoryRequired: "Les-context en gespreksgeschiedenis zijn verplicht.",
    },
    promptLanguageName: "Nederlands",
  },
  en: {
    home: {
      title: "Help with your lesson, right when you need it",
      subtitle:
        "Paste the link to your LessonUp lesson and get an AI tutor who thinks along with you — with hints and questions, not ready-made answers.",
    },
    form: {
      step1Bold: "Ask your teacher for the link",
      step1Rest:
        " to the lesson, or find it in your email, Google Classroom or Teams — wherever you received the lesson.",
      step2Bold: "Copy the link",
      step2Rest: ' (long-press or right-click → "Copy link").',
      step3Bold: "Paste it below",
      step3Rest:
        " — the tutor will then appear as a chat bubble in the bottom-right of your lesson.",
      fieldLabel: "Link to your lesson",
      placeholder: "Paste the link to your lesson here",
      fieldHint: "The link looks something like: lessonup.app/self-paced/...",
      exampleChip: "Don't have a link handy? Try an example lesson →",
      loading: "Loading lesson...",
      submit: "Start with the tutor",
      defaultError: "Something went wrong loading the lesson.",
      networkError: "Couldn't reach the server. Please try again.",
    },
    chatPage: {
      backLink: "← Different lesson",
    },
    widget: {
      title: "AI tutor",
      closeAria: "Close chat",
      openAria: "Open chat",
    },
    chatWindow: {
      emptyState:
        "Ask a question about this lesson. The tutor helps you along with hints instead of ready-made answers.",
      inputPlaceholder: "Type your question about the lesson...",
      send: "Send",
      unknownServerError: "Unknown server error.",
      genericChatError: "Something went wrong while chatting.",
      fallbackSuggestions: [
        "I don't really get this lesson, can you give me a hint?",
        "Can you explain part of the lesson more simply?",
        "Quiz me on this lesson",
        "What is this lesson actually about?",
      ],
      openingChip: "What can you help me with?",
    },
    api: {
      invalidRequest: "Invalid request.",
      noLessonUrl: "No lesson URL provided.",
      invalidLessonUrl:
        "Only public LessonUp self-paced student links are supported, e.g. https://lessonup.app/self-paced/<id>",
      unexpectedLessonError: "Unexpected error while loading the lesson.",
      noBrowser: "Could not start a headless browser (did you run 'npm run playwright:install'?):",
      scrapeFailed: "Could not load the lesson from LessonUp:",
      noSlidesFound:
        "No slides found on the page — the lesson page may not have (fully) loaded, or its format has changed.",
      unknownLessonTitle: "Unknown lesson",
      contextAndMessageRequired: "Lesson context and a non-empty message are required.",
      messageTooLong: (max: number) => `Message is too long (max ${max} characters).`,
      contextAndHistoryRequired: "Lesson context and conversation history are required.",
    },
    promptLanguageName: "English",
  },
} satisfies Record<
  Language,
  {
    home: { title: string; subtitle: string };
    form: {
      step1Bold: string;
      step1Rest: string;
      step2Bold: string;
      step2Rest: string;
      step3Bold: string;
      step3Rest: string;
      fieldLabel: string;
      placeholder: string;
      fieldHint: string;
      exampleChip: string;
      loading: string;
      submit: string;
      defaultError: string;
      networkError: string;
    };
    chatPage: { backLink: string };
    widget: { title: string; closeAria: string; openAria: string };
    chatWindow: {
      emptyState: string;
      inputPlaceholder: string;
      send: string;
      unknownServerError: string;
      genericChatError: string;
      fallbackSuggestions: string[];
      openingChip: string;
    };
    api: {
      invalidRequest: string;
      noLessonUrl: string;
      invalidLessonUrl: string;
      unexpectedLessonError: string;
      noBrowser: string;
      scrapeFailed: string;
      noSlidesFound: string;
      unknownLessonTitle: string;
      contextAndMessageRequired: string;
      messageTooLong: (max: number) => string;
      contextAndHistoryRequired: string;
    };
    promptLanguageName: string;
  }
>;

export function t(language: Language) {
  return UI_STRINGS[language];
}
