# LessonUp AI-tutor (prototype)

Webapp waarin een leerling een AI-chatbot kan raadplegen terwijl die een
bestaande, publieke LessonUp self-paced les doorloopt. De chatbot werkt
Socratisch/begeleidend: hints en wedervragen in plaats van kant-en-klare
antwoorden.

## Setup

```bash
npm install
npm run playwright:install   # installeert de headless Chromium-binary
cp .env.local.example .env.local  # vul ANTHROPIC_API_KEY in
npm run dev
```

Open <http://localhost:3000>, plak een publieke LessonUp self-paced link
(vorm: `https://lessonup.app/self-paced/<uuid>`, zoals leerlingen die krijgen
zonder in te loggen) en start het gesprek.

## Hoe het werkt

1. **`/api/lesson`** haalt de lesinhoud op. `lessonup.app` is een Meteor-app
   (reactieve client, geen server-rendered HTML), dus dit gebeurt met een
   headless browser (Playwright) die de pagina laadt en de gerenderde tekst
   uitleest en parst tot losse slides (`lib/lessonup-scraper.ts`).
2. **`/api/chat`** bouwt een systeemprompt met de les-inhoud en Socratische
   instructies (`lib/prompts.ts`) en streamt het antwoord van Claude
   (Anthropic API) terug naar de client.
3. De chatgeschiedenis wordt **alleen client-side** bijgehouden
   (`sessionStorage`/React state) — de backend is stateless en slaat niets
   op. Dat is bewust gedaan met privacy in het achterhoofd.
4. Op `/chat` staat de **echte, live les** in een iframe (LessonUp's CSP
   staat dit toe — `frame-ancestors *`), met de AI-tutor als een zwevende
   chatwidget rechtsonder (`components/ChatWidget.tsx`) — een launcher-bubbel
   die openklapt tot een chatpaneel, zoals een typische chatwidget. Dit is
   dichter bij hoe het er in een echte integratie uit zou zien dan een aparte
   chatpagina.
5. **Taalkeuze (NL/EN)**: op het startscherm kiest de leerling met een
   vlaggetje de gesprekstaal. Die keuze bepaalt de taal van de hele chat
   (systeemprompt, voorbeeldvragen, vervolgchips, UI-teksten) — ongeacht in
   welke taal de leerling zelf typt of welke taal de lesinhoud zelf heeft.
   Alle teksten staan centraal in `lib/i18n.ts`.

## Bekende MVP-beperkingen

- **Scraping, geen officiële API.** De lesinhoud wordt gehaald door de
  publieke pagina te laden en de tekst te parsen op patronen die ik
  handmatig heb waargenomen (bv. `"3 - Meerkeuzevraag"`). Dit is fragiel: een
  redesign van lessonup.app kan dit breken. Zodra er een interne LessonUp-API
  beschikbaar is voor lesinhoud, hoort die de scraper te vervangen.
- **Alleen publieke self-paced links.** Lessen die inloggen vereisen worden
  niet ondersteund.
- **Playwright vereist een gewone Node-server** (geen edge-/lightweight
  serverless runtime) omdat het een Chromium-subproces start.
- **AVG/privacy voor een echte productiefeature met minderjarigen**: dit
  prototype heeft geen accounts en bewaart niets server-side, maar voor
  productiegebruik is minimaal nodig: een verwerkersovereenkomst (DPA) met
  Anthropic, dataminimalisatie, en aansluiting op LessonUp's eigen
  authenticatie in plaats van los draaien. Dat is in dit prototype bewust
  niet opgelost.
- Er wordt geen antwoordsleutel meegegeven aan het model — de juiste
  antwoorden van meerkeuzevragen staan sowieso niet in de gescrapete tekst
  (die worden pas na interactie onthuld), dus de tutor redeneert zelf mee
  met de lesstof.
