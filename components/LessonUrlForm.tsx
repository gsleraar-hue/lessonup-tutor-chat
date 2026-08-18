"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type Language, type Level, t } from "@/lib/i18n";
import type { LessonContent } from "@/lib/types";

const EXAMPLE_URL = "https://lessonup.app/self-paced/35f949de-80e0-4f94-a726-e7351f34d0dc";

export default function LessonUrlForm({
  language,
  level,
}: {
  language: Language;
  level: Level;
}) {
  const router = useRouter();
  const strings = t(language).form;
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, language, level }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || strings.defaultError);
        return;
      }
      const lesson = data as LessonContent;
      sessionStorage.setItem("lesson", JSON.stringify(lesson));
      sessionStorage.setItem("language", language);
      sessionStorage.setItem("level", level);
      router.push("/chat");
    } catch (err) {
      setError(strings.networkError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ol className="steps">
        <li className="step">
          <span className="step-badge">1</span>
          <span className="step-text">
            <strong>{strings.step1Bold}</strong>
            {strings.step1Rest}
          </span>
        </li>
        <li className="step">
          <span className="step-badge">2</span>
          <span className="step-text">
            <strong>{strings.step2Bold}</strong>
            {strings.step2Rest}
          </span>
        </li>
        <li className="step">
          <span className="step-badge">3</span>
          <span className="step-text">
            <strong>{strings.step3Bold}</strong>
            {strings.step3Rest}
          </span>
        </li>
      </ol>

      <form onSubmit={handleSubmit}>
        <label htmlFor="lesson-url" className="field-label">
          {strings.fieldLabel}
        </label>
        <input
          id="lesson-url"
          type="url"
          required
          placeholder={strings.placeholder}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="lesson-input"
        />
        <p className="field-hint">{strings.fieldHint}</p>
        <div className="example-chip-row">
          <button
            type="button"
            className="example-chip"
            onClick={() => setUrl(EXAMPLE_URL)}
          >
            {strings.exampleChip}
          </button>
        </div>

        <button type="submit" disabled={loading} className="primary-button">
          {loading && <span className="spinner" aria-hidden="true" />}
          {loading ? strings.loading : strings.submit}
        </button>
        {error && <p className="error-banner">{error}</p>}
      </form>
    </>
  );
}
