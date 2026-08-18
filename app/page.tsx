"use client";

import { useState } from "react";
import LessonUrlForm from "@/components/LessonUrlForm";
import {
  DEFAULT_LANGUAGE,
  DEFAULT_LEVEL,
  LANGUAGE_OPTIONS,
  LEVEL_OPTIONS,
  type Language,
  type Level,
  t,
} from "@/lib/i18n";

export default function HomePage() {
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [level, setLevel] = useState<Level>(DEFAULT_LEVEL);
  const strings = t(language).home;

  return (
    <main className="home-shell">
      <div className="home-inner">
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div className="home-badge" aria-hidden="true">
            🎓
          </div>
          <div className="lang-switch" role="group" aria-label="Taal / Language">
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                type="button"
                onClick={() => setLanguage(opt.code)}
                className={
                  "lang-switch-btn" + (language === opt.code ? " lang-switch-btn-active" : "")
                }
                aria-pressed={language === opt.code}
                title={opt.label}
              >
                <span aria-hidden="true">{opt.flag}</span>
              </button>
            ))}
          </div>
        </div>
        <h1 className="home-title">{strings.title}</h1>
        <p className="home-subtitle">{strings.subtitle}</p>
        <div className="home-card">
          <span className="field-label" style={{ display: "block", marginBottom: 8 }}>
            {strings.levelLabel}
          </span>
          <div className="level-switch" role="group" aria-label={strings.levelLabel}>
            {LEVEL_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                type="button"
                onClick={() => setLevel(opt.code)}
                className={
                  "level-switch-btn" + (level === opt.code ? " level-switch-btn-active" : "")
                }
                aria-pressed={level === opt.code}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <LessonUrlForm language={language} level={level} />
        </div>
      </div>
    </main>
  );
}
