"use client";

import { useState } from "react";
import LessonUrlForm from "@/components/LessonUrlForm";
import { DEFAULT_LANGUAGE, LANGUAGE_OPTIONS, type Language, t } from "@/lib/i18n";

export default function HomePage() {
  const [language, setLanguage] = useState<Language>(DEFAULT_LANGUAGE);
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
          <LessonUrlForm language={language} />
        </div>
      </div>
    </main>
  );
}
