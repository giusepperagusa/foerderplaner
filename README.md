# Förderplan-Assistent Grundschule (Berlin) — System Specification & Blueprint

> **CRITICAL MAINTENANCE DIRECTIVE FOR FUTURE SESSIONS / AGENTS:**  
> 1. **Continuous Documentation Sync:** This `README.md` must be kept strictly up to date with any and all future architectural changes, features, bug fixes, data schema updates, and dependency additions. Whenever modifications are made to this codebase, update this document before completing the task.
> 2. **Strict Semantic Versioning & Changelog Protocol:** Every time any change, feature, or bug fix is made to the codebase:
>    * **Increment the App Version:** Bump the version in `package.json` and sync the `APP_VERSION` constant in `src/components/VersionInfoModal.tsx` following SemVer (`MAJOR.MINOR.PATCH`).
>      * `PATCH` (e.g. `1.2.1` -> `1.2.2`): Small bug fixes, CSS/layout tweaks, minor wording revisions.
>      * `MINOR` (e.g. `1.2.1` -> `1.3.0`): New features, template adaptations, new steps, new export formats, guideline data refreshes.
>      * `MAJOR` (e.g. `1.x.x` -> `2.0.0`): Breaking data migrations, architecture overhauls.
>    * **Augment the Changelog:** Add a new entry to the `Aenderungshistorie (Changelog)` list inside `src/components/VersionInfoModal.tsx` detailing what was changed/added in the new version.
>    * **Re-bundle Offline Archives:** Re-generate the versioned web distribution and source code archives (`foerderplaner-vX.Y.Z-web-dist.tar.gz` and `foerderplaner-vX.Y.Z-source-code.tar.gz`) in both `public/` and `dist/`.
>    * **Sync README:** Document the new version number and notable updates in Section 9 (Changelog) of this `README.md`.

---

## 1. System Overview & Re-creation Prompt

You are tasked with building or recreating the **Förderplan-Assistent Grundschule** from scratch. This application is an entirely client-side, 100% offline-first Progressive Web App (PWA) designed for primary school teachers in Berlin to diagnose learning needs and create legally grounded, pedagogically sound individual support plans (*Förderpläne*) in accordance with official Berlin SEN/School Education guidelines (*Sonderpädagogische Förderung in Berlin* / *Senatsverwaltung für Bildung, Jugend und Familie*).

### Fundamental Architectural Tenets
1. **100% Local / Zero Server Dependency:** All data storage (IndexedDB), NLP matching, PDF/print rendering, and optional on-device AI generation must run entirely in the user's browser. No student data, notes, or assessments ever leave the client.
2. **Dual-Engine Pedagogical Matching:**
   * **Local Deterministic Rules Engine (Instant & Offline):** Keyword, competency, and domain matching against structured official guidelines (`src/data/richtlinien.json`). Functions instantly without any AI/LLM download.
   * **Optional In-Browser Neural Engine (Wllama WebAssembly & OPFS/IndexedDB):** CPU-accelerated local GGUF model (`Qwen2.5-0.5B-Instruct-Q4_K_M.gguf`, ~397 MB) running via Wllama WebAssembly inside dedicated worker threads. Runs universally on any desktop or mobile browser without WebGPU requirement. Model weights are stored securely in OPFS (Origin Private File System) with IndexedDB fallback, completely bypassing the Cache Storage API. Strict opt-in modal with explicit download sizing, storage selection, and live progress reporting. Instant deterministic rules engine functions as immediate zero-download fallback.
3. **PWA Compliance:** Service Worker via `vite-plugin-pwa` with precached assets, runtime caching, offline indicators, update toasts, and installation triggers.
4. **Self-Hosting Portability:** Capable of being deployed on any static web host, Apache, Nginx, or subfolder without backend or Node.js runtime. Built-in versioned `.tar.gz` export utilities.

---

## 2. Core Functional Requirements & Workflow

The application guides the teacher through a streamlined, multi-step process with persistent auto-saving:

```
[1. Schüler-Stammdaten] ➔ [2. Diagnostische Checkliste] ➔ [3. Pädagogische Empfehlungen / KI] ➔ [4. Förderplan-Editor] ➔ [5. Drucken & PDF-Export]
```

### Step 1: Student Profile (`StudentProfileStep.tsx`)
* Fields: Name/pseudonym/initials, date of birth, class/grade (1–6), school/school number, class teacher, legal guardians, support period (*von/bis*), primary and secondary support focus (*Förderschwerpunkt*: *Lernen*, *Sprache*, *Emotionale und soziale Entwicklung*, etc.), narrative baseline observations (*Ausgangslage, Ressourcen & bisherige Förderergebnisse*).
* Dynamic Initialen Tool: Transforms an entered pupil name into valid uppercase initials (e.g. "Klaus Schmidt" -> "K. S.") to protect student privacy under GDPR, or generates random initials if the field is empty, instead of static hardcoding.
* Anonymous Random ID generator (`ID-YYYY-XXX`).
* Local privacy guarantee badge reassuring the teacher that no data is transmitted.

### Step 2: Diagnostic Checklist (`ChecklistAssessmentStep.tsx`)
* Structured evaluation across primary developmental & scholastic competencies:
  * **Deutsch / Schriftspracherwerb** (Phonologische Bewusstheit, Leseflüssigkeit, Textverständnis, Rechtschreibung).
  * **Mathematik** (Zahlbegriff, Rechenoperationen, Raum und Form, Sachrechnen).
  * **Lern- und Arbeitsverhalten** (Konzentration, Selbstorganisation, Ausdauer, Motivation).
  * **Sozial-emotionales Verhalten** (Impulskontrolle, Frustrationstoleranz, Regelakzeptanz, Kooperation).
  * **Motorik & Wahrnehmung** (Feinmotorik, Visuomotorik, Raumorientierung).
* 4-tier rating system with visual chip selectors:
  * `stark` (Ressource / Stärke)
  * `altersgemäß` (Kein akuter Förderbedarf)
  * `leichter Förderbedarf`
  * `hoher Förderbedarf`
* Free-form observation notes per competency area.

### Step 3: Recommendations & Optional AI Assistant (`AiAssistantStep.tsx`)
* **Instant Deterministic Recommendations:** Generated instantly from `src/utils/localMatchingEngine.ts` by mapping identified deficits to matched interventions, materials, and concrete pedagogical methods from `richtlinien.json`.
* **Optional On-Device Assistant (`webLlmManager.ts` & `wllamaStorage.ts`):**
  * Teacher can request customized formulation proposals, differentiation strategies, or parent-communication talking points.
  * Powered by Wllama (`@wllama/wllama`) executing GGUF models directly on the CPU via WebAssembly SIMD.
  * Storage strictly utilizes OPFS (Origin Private File System) and IndexedDB, completely avoiding Cache Storage API eviction risks.
  * System prompt enforces German educational jargon (SMART criteria, positive formulation, Berlin curriculum orientation).

### Step 4: Comprehensive Plan Editor (`PlanEditorStep.tsx`)
* Structured 5-column official grid dividing each support measure:
  1. **1. IST:** Beobachtung / Bedarf (= Stellungnahme)
  2. **2. SOLL:** Ziele / Kompetenzerwerb (SMART formuliert)
  3. **3. LERNWEG:** Pädagogische Angebote & Maßnahmen (Differenzierung, Anschauungsmaterial)
  4. **4. Absprachen:** Wer? Wie? Mit wem? Bis wann?
  5. **5. Reflexion:** Evaluation & Modifikation
* Additional agreements (cooperation with educators, special educators, disadvantage compensation / *Nachteilsausgleich*).
* Parent consultation documentation (meeting date, participants, notification confirmation).

### Step 5: Print & PDF Export (`PrintPreviewStep.tsx`)
* **Official Berlin Template Replication (Pages 82 & 83 of Handreichung „Fördermaßnahmen konkret!“):**
  * **Page 82 (Front):** Institutional header (*Senatsverwaltung für Bildung, Jugend und Familie Berlin*), legal reference (*§ 19 SopädVO*), 2-column boxed pupil master data and school framework conditions, narrative section for baseline status & resources (*Ausgangslage, Ressourcen & bisherige Förderergebnisse*), and explicit *Seite 1 / 2* footer.
  * **Page 83 (Form Table & Agreements):** Complete 5-column table (*IST*, *SOLL*, *LERNWEG*, *Absprachen*, *Reflexion*), structured section for *Weitere Vereinbarungen / Kooperationen & Nachteilsausgleich*, conference documentation (*Gesprächsdurchführung*, *Beteiligte*, *Kenntnisnahme*), and three legal signature lines (*Klassenlehrkraft*, *Sonderpädagogin / Schulleitung*, *Erziehungsberechtigte*).
* **Clean Document Print Styling:**
  * Uses CSS `@page { margin: 0 }` to completely suppress browser-injected header elements (URL, browser page title) and footer elements (system date/time), avoiding clutter.
  * Internal DIN-A4 page sheet layout container (`.print-document-sheet`) provides physical 12mm/14mm margins for printer hardware.
  * Clear and consistent page indicators (*Seite 1 / 2* and *Seite 2 / 2*).
  * Fine print at the document bottom includes the application version immediately after the application name (e.g. `Förderplan-Assistent Berlin 1.3.1 • Dokumentengrundlage: „Fördermaßnahmen konkret!“ Stand 11/2018`).
* Single-click browser print dialog triggering high-resolution vector PDF export.

---

## 3. Storage, State Management & Plan Management

* **IndexedDB Store (`planStorage.ts`):**
  * Auto-save on every change with debounce.
  * Multi-plan manager (`PlanManagerModal.tsx`): create, duplicate, switch between students, archive, and delete plans.
  * **Strict Step Reset Rule:** Whenever a new plan is created, an existing plan is selected, or a plan is duplicated, the application state and top navigation breadcrumb strictly reset to **Step 1 ("Stammdaten & Schwerpunkt")**.
  * **Individual & Bulk JSON Backup / Restore:**
    * **Bulk Backup (`.json`):** Export all student plans in standard, human-readable JSON format for archiving or transfer between school computers without cloud sync.
    * **Individual Plan Export:** Export a single pupil's support plan (`foerderplan_<Name>_<ID>.json`) directly from each plan card in the plan manager.
    * **Intelligent Collision Detection on Import:** When importing plans whose IDs already exist locally, the app detects the collision and prompts the teacher to either **update / overwrite** the existing local plan or **create a separate copy** (appending `(Kopie)`), preventing accidental data loss or duplication.
    * **Security & Storage Hygiene:** The application uses clean, standard JSON without proprietary file-level encryption. In school and public administration environments, security and GDPR compliance are guaranteed through full-disk encryption at rest (BitLocker, FileVault, LUKS) on client workstations and encrypted physical transfer media (e.g. encrypted USB drives). This avoids the risk of catastrophic data loss caused by forgotten passwords while ensuring long-term auditability, transparency, and zero vendor lock-in.

---

## 4. Official Berlin Guidelines Integration

* **Data Structure (`src/data/richtlinien.json` & `richtlinien.json`):**
  * Contains official Berlin guidelines (*Sonderpädagogische Förderung / Grundschule*).
  * Categorized by developmental areas, diagnosed criteria, recommended standard measures, legal framework references, and documentation requirements.
* **Guidelines Manager Modal (`GuidelinesManagerModal.tsx`):**
  * Teachers can view, search, and audit the guidelines currently in memory.
  * Allows updating or importing custom school-specific support catalogues.

---

## 5. Deployment, PWA & Archive Generation

* **Vite + PWA Configuration (`vite.config.ts`):**
  * Full manifest configuration with maskable icons (`/public/pwa-*.png`).
  * Workbox precaching with support for large model worker scripts (`maximumFileSizeToCacheInBytes: 16MB`).
  * Custom download middleware setting explicit `Content-Type: application/gzip` and `Content-Disposition: attachment` headers for `.tar.gz` endpoints.
* **Versioned Download Dialog (`VersionInfoModal.tsx`):**
  * Shows app version (`v1.4.5-offline`), license status (`GPL-3.0-or-later`), and official guidelines edition.
  * Direct link to the open source GitHub repository: [github.com/giusepperagusa/foerderplaner](https://github.com/giusepperagusa/foerderplaner).
  * Interactive PWA update check.
  * Direct one-click download buttons for:
    * `foerderplaner-v1.4.5-web-dist.tar.gz` (Pre-compiled production bundle ready for static hosting).
    * `foerderplaner-v1.4.5-source-code.tar.gz` (Complete project source tree).
  * Uses forced client-side `Blob` download to prevent inline browser text rendering.
* **Automated CI/CD Workflow (`.github/workflows/deploy.yml`):**
  * **Typechecking & Build:** Runs `tsc --noEmit` and `vite build` on every push to `main`.
  * **Automated Archive Packaging:** Bundles `foerderplaner-vX.Y.Z-web-dist.tar.gz` and `foerderplaner-vX.Y.Z-source-code.tar.gz` (and unversioned aliases).
  * **Automated GitHub Releases:** Automatically creates a GitHub Release tagged `vX.Y.Z` on `foerderplaner` with release notes and attaches all four `.tar.gz` distribution archives.
  * **Direct GitHub Pages Deployment:** Deploys the uncompressed web build directly to the dedicated GitHub Pages repository (`giusepperagusa/giusepperagusa.github.io`) upon commit using secret `PAGES_DEPLOY_TOKEN`.

---

## 6. Tech Stack & Dependencies

* **Framework:** React 19, TypeScript
* **Build Tool:** Vite 6 with `@tailwindcss/vite`
* **Styling:** Tailwind CSS 4 (`@import "tailwindcss";` in `src/index.css`)
* **Icons:** `lucide-react`
* **Offline PWA:** `vite-plugin-pwa`, `workbox-window`
* **On-Device AI Engine:** `@wllama/wllama` (WebAssembly CPU SIMD execution of GGUF models) with OPFS / IndexedDB storage
* **License:** GNU General Public License v3.0 (`GPL-3.0-or-later`), see `LICENSE`

---

## 7. Project Structure

```
├── .env.example
├── .gitignore
├── index.html
├── metadata.json
├── package.json
├── public/
│   ├── apple-touch-icon.png
│   ├── icon.svg
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   └── pwa-maskable-512x512.png
├── richtlinien.json
├── scripts/
│   └── update-richtlinien.ts
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css
│   ├── components/
│   │   ├── AiAssistantStep.tsx
│   │   ├── ChecklistAssessmentStep.tsx
│   │   ├── GuidelinesManagerModal.tsx
│   │   ├── ModelConsentModal.tsx
│   │   ├── Navigation.tsx
│   │   ├── OfflineIndicator.tsx
│   │   ├── PWAInstallButton.tsx
│   │   ├── PWAUpdateToast.tsx
│   │   ├── PlanEditorStep.tsx
│   │   ├── PlanManagerModal.tsx
│   │   ├── PrintPreviewStep.tsx
│   │   ├── StudentProfileStep.tsx
│   │   └── VersionInfoModal.tsx
│   ├── data/
│   │   └── richtlinien.json
│   ├── hooks/
│   │   ├── usePWAInstall.ts
│   │   └── usePWAUpdate.ts
│   ├── types/
│   │   └── foerderplan.ts
│   ├── utils/
│   │   ├── localMatchingEngine.ts
│   │   ├── planStorage.ts
│   │   ├── richtlinienTools.ts
│   │   └── webLlmManager.ts
│   └── workers/
│       └── llm.worker.ts
├── tsconfig.json
└── vite.config.ts
```

---

## 8. Development & Build Commands

```bash
# Install dependencies
bun install   # or npm install

# Start local development server
npm run dev

# Lint and type check
npm run lint

# Compile production bundle
npm run build
```

---

## 9. License, Legal Framework & AI Model Weights Exclusion

### Software Licensing (GNU GPLv3)
The entire application source code, user interface, build scripts, and local matching algorithms of **Förderplan-Assistent Berlin** are licensed under the **GNU General Public License Version 3 (GPLv3)** (or, at your option, any later version). See the [`LICENSE`](./LICENSE) file in the root directory for the complete license terms.

* **Permissive Copyleft:** You are free to run, study, share, and modify this software. Any distributed modified versions must also be released under the GPLv3.
* **Component License Compatibility:** All statically bundled and linked dependencies (React, `@wllama/wllama`, Lucide Icons, Tailwind CSS, Motion, Vite, Express, Dotenv) use permissive open-source licenses (MIT, ISC, BSD-2-Clause, Apache-2.0). Under Free Software Foundation (FSF) guidelines, these licenses are 100% compatible with GNU GPLv3.

### Explicit Exclusion of Runtime-Downloaded AI Model Weights
* **Independent Creative Parameter Sets:** The optional neural language model (e.g. `Qwen2.5-0.5B-Instruct-Q4_K_M.gguf`, ~397 MB) downloaded interactively by the user at runtime into browser OPFS/IndexedDB storage is **NOT** part of the application source code or build output, and constitutes an independent creative work.
* **Model Upstream License:** The pre-trained weights are created by Alibaba Cloud / Qwen Team and released under the **Apache License 2.0**.
* **Scope of GPLv3:** The application's GPLv3 license applies solely to the software source code and logic. It does not govern, relicense, or modify the terms of third-party model weights downloaded independently by the end user.
* **Zero-Download Guarantee:** The application is fully functional offline without downloading any neural model, relying on the built-in deterministic pedagogical rules engine.

### Official Berlin Educational Reference Material
The diagnostic checklists, developmental domains, and pedagogical support measures are based on the official guidelines:
> *„Fördermaßnahmen konkret! Eine Handreichung für pädagogische Fachkräfte zur Entwicklung von Fördermaßnahmen“*  
> Herausgeber: Senatsverwaltung für Bildung, Jugend und Familie Berlin (Stand: November 2018).  
> Gemäß § 19 SopädVO Berlin.

---

## 10. Versioning Strategy & Project Changelog

### Versioning Rules
* **Format:** Strict Semantic Versioning (`vMAJOR.MINOR.PATCH[-modifier]`).
* **Trigger Conditions:**
  * **MAJOR (`+1.0.0`):** Incompatible data model changes, breaking database migrations, complete UI paradigm redesigns.
  * **MINOR (`+0.1.0`):** New functional steps, compliance template restructuring, new matching engines, export format additions, significant pedagogical enhancements.
  * **PATCH (`+0.0.1`):** Bug fixes, visual/CSS adjustments, typographical fixes, dependency patches.
* **Synchronization Mandate:** `package.json`, `VersionInfoModal.tsx`, `README.md`, and distribution archive names (`foerderplaner-vX.Y.Z-*.tar.gz`) must always share the exact same version number.

### Historical Changelog

* **v1.4.5 (2026-09-29):**
  * **Bereinigung der Druck- & Export-Toolbar:** Entfernung der redundanten Schaltfläche *„JSON sichern“* aus Schritt 5 (*Druck & Export*); die vollständige Sicherung und Wiederherstellung von Einzelplänen sowie der gesamten Förderplan-Datenbank erfolgt nun ausschließlich und konsistent über den zentralen Förderplan-Manager.
  * **Vereinheitlichung der Druck-Schaltflächen:** Standardisierung der oberen und unteren Druck-Aktionsschaltflächen in Schritt 5 auf die einheitliche, standardkonforme Beschriftung *„Formular drucken / PDF“*.
* **v1.4.4 (2026-09-28):**
  * **GitHub-Repository-Verlinkung:** Prominente und direkte Verlinkung des Quellcode-Repositories ([https://github.com/giusepperagusa/foerderplaner](https://github.com/giusepperagusa/foerderplaner)) sowohl im App-Footer als auch mit dedizierter Info-Karte im Dialog *„Versionsinfo & Bereitstellung“*.
  * **Orthografische Prüfung & Umlaute-Standardisierung:** Vollständige Überprüfung sämtlicher für Lehrkräfte sichtbarer UI-Texte, Beschriftungen, Dialoghinweise, Schrittüberschriften und Platzhalter auf standardkonforme deutsche Umlaute (ä, ö, ü) und Eszett (ß); die Normalisierung auf Doppelzeichen (ae, oe, ue, ss) ist strikt auf Texte beschränkt, die für das lokale KI-Modell aufbereitet und von diesem konsumiert werden.
  * **Bereinigter Druckausdruck (Seite 2):** Vollständige Unterdrückung des App-Footers und der Client-Erklärung im Ausdruck (durch gezielte `@media print`-Regeln); auf der zweiten Seite verbleibt ausschließlich die amtliche Zeile mit der fortlaufenden Seitenzahl als letzte Druckzeile.
* **v1.4.3 (2026-09-28):**
  * **Einzelplan-Export (`.json`):** Direkter Export individueller Förderpläne je Schüler/in (`foerderplan_<Name>_<ID>.json`) über das Download-Symbol direkt auf jeder Plankarte in der Plan-Verwaltung.
  * **Kollisionserkennung & Importauswahl:** Interaktive Prüfung beim Import von Förderplänen mit bereits existierender ID; Lehrkräfte können wählen zwischen *Bestehenden Plan aktualisieren/überschreiben* (z.B. nach externer Bearbeitung) oder *Als neue Kopie anlegen* (`(Kopie)`).
  * **Bereinigung & Präzisierung der Sicherheitsdokumentation:** Korrektur des irreführenden Hinweises auf In-App-Dateiverschlüsselung; transparente Erläuterung der Best-Practice-Architektur (offenes, auditierbares Standard-JSON und DSGVO-konforme Absicherung durch Betriebssystem- und Speichermedien-Verschlüsselung wie BitLocker, FileVault oder LUKS).
* **v1.4.2 (2026-09-28):**
  * **GPLv3 Lizenzierung & KI-Gewichte-Ausschluss:** Vollständige Umstellung der Anwendungssoftware unter die *GNU General Public License v3.0 (GPLv3)* mit Bereitstellung der `LICENSE`-Datei im Repository-Stammverzeichnis sowie SPDX-Lizenzheadern in den Quellcodedateien.
  * **Dedizierter Lizenz- & Rechtsdialog (`LicenseModal.tsx`):** Übersichtliche Darstellung der Software-Lizenzrechte (GPLv3), Bestätigung der 100%igen Kompatibilität aller statisch einkompilierten Bibliotheken (MIT, ISC, BSD-2, Apache-2.0) und direkter Einsicht des Lizenzvolltexts.
  * **Rechtliche Klarstellung zu Runtime-Modellgewichten:** Expliziter Ausschluss von optional zur Laufzeit nach interaktiver Zustimmung heruntergeladenen neuronalen Sprachmodell-Gewichten (Qwen2.5-0.5B-Instruct / Apache-2.0) vom Geltungsbereich der Software-GPLv3.
  * **Amtliche Referenzangaben:** Dokumentation der Berliner Handreichung *„Fördermaßnahmen konkret!“* (SenBJF Berlin) als pädagogische Referenzgrundlage.
* **v1.4.1 (2026-09-27):**
  * **Erweiterung der Förderschwerpunkte (GE & KME):** Ergänzung der beiden amtlichen Berliner Förderschwerpunkte *„Geistige Entwicklung“ (GE)* und *„Körperliche und motorische Entwicklung“ (KME)* in Schritt 1 mit vollständigen Kriterien, Entwicklungsfeldern, Richtlinienmaßnahmen und integrierten Bausteinen aus *„Fördermaßnahmen konkret!“*.
  * **Klarstellung & Überarbeitung der Förderbedarfs-Filterung:** Umfassende Überarbeitung des Filters *„Nur Förderbedarf filtern“* in Schritt 2: Live-Zähler (`{count} / {total}`), erklärender Hinweiskasten zu den Filterkriterien (Bewertung „eher nicht / trifft nicht zu“ oder aktiver Förderfokus), aktiver Status-Banner mit Schnell-Reset und verständlicher Leerzustand bei 0 Treffern.
* **v1.4.0 (2026-09-27):**
  * **Wllama WebAssembly CPU Engine:** Replaced the WebGPU-only `@mlc-ai/web-llm` engine with Wllama (`@wllama/wllama`), enabling on-device execution of `Qwen2.5-0.5B-Instruct` (GGUF) on all CPUs via WebAssembly SIMD without requiring WebGPU support.
  * **OPFS & IndexedDB Storage Architecture:** Completely eliminated reliance on the Cache Storage API (`window.caches`). Model weights are now stored and streamed exclusively via OPFS (Origin Private File System) with an automatic IndexedDB fallback.
  * **Persistent Quota Protection:** Integrated `navigator.storage.persist()` to safeguard downloaded model weights from browser storage eviction.
  * **Graceful Deterministic Fallback:** Maintained the instant rule-based matching engine (`localMatchingEngine.ts`) as the primary zero-download fallback whenever model download is skipped or deferred.
* **v1.3.1 (2026-09-26):**
  * **Optimierter amtlicher Formulardruck:** Unterdrückung automatischer Browser-Kopf- und Fußzeilen (URL, Datum, Uhrzeit, Webseitentitel) mittels `@page { margin: 0 }` und internem `.print-document-sheet`-Layoutcontainer.
  * **Bereinigte Fußzeile & Versionsanzeige:** Einbindung der Anwendungsversion (`Förderplan-Assistent Berlin 1.3.1`) im Kleingedruckten der finalen Druckansicht bei vollständiger Beibehaltung der amtlichen Referenzangaben.
  * **Seitennummerierung:** Durchgängige und präzise Darstellung der Seitenzahlen (*Seite 1 / 2* auf der Vorderseite und *Seite 2 / 2* auf der Rückseite/Rasterseite).
* **v1.3.0 (2026-09-26):**
  * **Official Form Template Integration:** Replaced generic web print preview in Step 5 (`PrintPreviewStep.tsx`) with the official 2-page ministerial template from pages 82–83 of *„Fördermaßnahmen konkret!“* (Berlin Senatsverwaltung für Bildung, Jugend und Familie / § 19 SopädVO Berlin).
  * **5-Column Standard Grid:** Front page master data with narrative baseline, followed by the official 5-column grid (*1. IST*, *2. SOLL*, *3. LERNWEG*, *4. Absprachen*, *5. Reflexion*) and multidisciplinary conference sign-off blocks.
  * **DIN-A4 Print Stylesheet:** Added precise `@page` CSS print definitions with clean page-break splits, hidden UI chrome, and vector PDF rendering.
  * **Flow & Breadcrumb Reset:** Creating a new plan or selecting/duplicating an existing plan now consistently resets the navigation state back to Step 1 (*Stammdaten & Schwerpunkt*).
  * **Dynamic Initials Converter:** Enhanced Step 1 "Initialen" feature to dynamically convert entered names (e.g. "Klaus Schmidt" -> "K. S.") or generate pseudonyms instead of hardcoded placeholder text.
  * **Versioning Directive:** Formalized semantic versioning protocol and changelog maintenance rules in `README.md`.
* **v1.2.1:**
  * PWA Offline-Unterstützung (Service Worker Precaching via `vite-plugin-pwa`).
  * Viewport-Fixes für alle Modale (Höhenanpassung, `min-h-0`, Scrollcontainer & Esc-Dismissal).
  * Webserver-Export (`.tar.gz` Bundles) und aktiver PWA-Update-Prüfer.
* **v1.2.0:**
  * WebLLM Web Worker-Integration (`Qwen2.5-0.5B-Instruct-q4f16_1-MLC`) mit Hardware-Erkennung und Opt-In-Modal.
* **v1.1.0:**
  * Mehrfach-Planverwaltung im LocalStorage / IndexedDB (Entwurf/Abgeschlossen, Duplizieren, Archivieren).
* **v1.0.0:**
  * Initiale Veröffentlichung des Förderplan-Assistenten Grundschule Berlin basierend auf *„Fördermaßnahmen konkret!“*.

