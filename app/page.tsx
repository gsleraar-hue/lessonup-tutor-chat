import LessonUrlForm from "@/components/LessonUrlForm";

export default function HomePage() {
  return (
    <main className="home-shell">
      <div className="home-inner">
        <div className="home-badge" aria-hidden="true">
          🎓
        </div>
        <h1 className="home-title">Hulp bij je les, precies op tijd</h1>
        <p className="home-subtitle">
          Plak de link naar je LessonUp-les en krijg een AI-tutor die met je
          meedenkt — met hints en wedervragen, niet met kant-en-klare
          antwoorden.
        </p>
        <div className="home-card">
          <LessonUrlForm />
        </div>
      </div>
    </main>
  );
}
