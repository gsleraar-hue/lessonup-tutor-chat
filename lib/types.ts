export interface LessonSlide {
  index: number;
  type: string;
  text: string;
}

export interface LessonContent {
  title: string;
  slideCount: number;
  slides: LessonSlide[];
  /** Compact plain-text version of the lesson, capped in length, for use as LLM context. */
  contextText: string;
  sourceUrl: string;
  /** Lesson-specific example questions, shown as clickable chips in the chat. */
  suggestedQuestions: string[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatRequestBody {
  contextText: string;
  lessonTitle: string;
  history: ChatMessage[];
  message: string;
  language?: string;
  level?: string;
}

export interface QuickRepliesRequestBody {
  contextText: string;
  lessonTitle: string;
  history: ChatMessage[];
  language?: string;
  level?: string;
}

export interface LessonRequestBody {
  url: string;
  language?: string;
  level?: string;
}

export interface LessonErrorResponse {
  error: string;
}
