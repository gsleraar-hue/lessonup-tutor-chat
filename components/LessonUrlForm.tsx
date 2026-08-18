"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LessonContent } from "@/lib/types";

const EXAMPLE_URL = "https://lessonup.app/self-paced/35f949de-80e0-4f94-a726-e7351f34d0dc";

export default function LessonUrlForm() {
  const router = useRouter();
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
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Er ging iets mis bij het ophalen van de les.");
        return;
      }
      const lesson = data as LessonContent;
      sessionStorage.setItem("lesson", JSON.stringify(lesson));
      router.push("/chat");
    } catch (err) {
      setError("Kon de server niet bereiken. Probeer het opnieuw.");
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
            <strong>Vraag je docent om de link</strong> naar de les, of zoek 'm
            op in je mail, Google Classroom of Teams — overal waar je de les
            hebt gekregen.
          </span>
        </li>
        <li className="step">
          <span className="step-badge">2</span>
          <span className="step-text">
            <strong>Kopieer de link</strong> (lang indrukken of rechtermuisknop
            → "Link kopiëren").
          </span>
        </li>
        <li className="step">
          <span className="step-badge">3</span>
          <span className="step-text">
            <strong>Plak 'm hieronder</strong> — de tutor verschijnt dan als
            chatbubbel rechtsonder in je les.
          </span>
        </li>
      </ol>

      <form onSubmit={handleSubmit}>
        <label htmlFor="lesson-url" className="field-label">
          Link naar je les
        </label>
        <input
          id="lesson-url"
          type="url"
          required
          placeholder="Plak hier de link naar je les"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="lesson-input"
        />
        <p className="field-hint">
          De link ziet er ongeveer zo uit: lessonup.app/self-paced/...
        </p>
        <div className="example-chip-row">
          <button
            type="button"
            className="example-chip"
            onClick={() => setUrl(EXAMPLE_URL)}
          >
            Geen link bij de hand? Probeer een voorbeeldles →
          </button>
        </div>

        <button type="submit" disabled={loading} className="primary-button">
          {loading && <span className="spinner" aria-hidden="true" />}
          {loading ? "Les wordt opgehaald..." : "Start met de tutor"}
        </button>
        {error && <p className="error-banner">{error}</p>}
      </form>
    </>
  );
}
