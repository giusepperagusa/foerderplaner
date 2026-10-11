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
>    * **Sync README:** Document the new version number and notable updates in Section 11 (Changelog) of this `README.md`.

---

## 1. System Overview & Re-creation Prompt

You are tasked with building or recreating the **Förderplan-Assistent Grundschule** from scratch. This application is an entirely client-side, 100% offline-first Progressive Web App (PWA) designed for primary school teachers in Berlin to diagnose learning needs and create legally grounded, pedagogically sound individual support plans (*Förderpläne*) in accordance with official Berlin SEN/School Education guidelines (*Sonderpädagogische Förderung in Berlin* / *Senatsverwaltung für Bildung, Jugend und Familie*, Handreichung [„Fördermaßnahmen konkret!“ (PDF-Download)](https://www.berlin.de/sen/bildung/schule/foerderung/sonderpaedagogische-foerderung/fachinfo/foerdermassnahmen_konkret.pdf)).

### Fundamental Architectural Tenets
1. **100% Local / Zero Server Dependency:** All data storage (IndexedDB), NLP matching, PDF/print rendering, and optional on-device AI generation must run entirely in the user's browser. No student data, notes, or assessments ever leave the client.
2. **Dual-Engine Pedagogical Matching:**
   * **Local Deterministic Rules Engine (Instant & Offline):** Keyword, competency, and domain matching against structured official guidelines (`src/data/richtlinien.json`). Functions instantly without any AI/LLM download.
   * **Optional In-Browser Neural Engine (Wllama WebAssembly & OPFS/IndexedDB):** CPU-accelerated local GGUF models (selectable: *Llama-3.2-3B-Instruct-Q4_K_S*, *Qwen2.5-1.5b-Instruct-Q8_0*, or *Llama-3.2-1B-Instruct-Q8_0*) running via Wllama WebAssembly on CPU. Runs universally without WebGPU requirement. Model weights are stored securely in OPFS (Origin Private File System) with IndexedDB fallback. Features hardware auto-detection, on-demand lifecycle (zero idle RAM), dynamic minimum context scaling, and instant fallback to the deterministic rules engine.
3. **PWA Compliance:** Service Worker via `vite-plugin-pwa` with precached assets, runtime caching, offline indicators, update toasts, and installation triggers.
4. **Universal Accessibility & Legal Compliance (EN 301 549 & WCAG 2.2 Level AA):** Full conformance with European standard EN 301 549, the German Federal Ordinance on Accessible Information Technology (BITV 2.0 / BGG), and W3C WCAG 2.2 Level AA. Comprehensive keyboard navigation, high-contrast visible focus indicators (`:focus-visible`), modal focus trapping (`useFocusTrap.ts`), semantic landmarks and ARIA states, text contrast ratios exceeding 4.5:1, and 200% zoom resiliency without horizontal clipping.
5. **DIN 1450 & Accessible Document Legibility:** Adherence to German standard DIN 1450 (*Schriften – Leserlichkeit*) in all exported and printed documents. Clean sans-serif administrative typography, minimum 11pt continuous font size (10.5pt in tables), generous 1.40–1.45 line height, high-contrast monochrome printing (`1.5pt solid #000` / `1pt solid #000` borders with zero muddy background tints), and semantic PDF/UA-ready HTML5 hierarchy.
6. **Self-Hosting Portability:** Capable of being deployed on any static web host, Apache, Nginx, or subfolder without backend or Node.js runtime. Built-in versioned `.tar.gz` export utilities.

---

## 2. Core Functional Requirements & Workflow

The application guides the teacher through a streamlined, multi-step process with persistent auto-saving:

```
[1. Schüler-Stammdaten] ➔ [2. Diagnostische Checkliste] ➔ [3. Pädagogische Empfehlungen / KI] ➔ [4. Förderplan-Editor] ➔ [5. Drucken & PDF-Export]
```

### Global Accessibility Infrastructure
* **Skip Navigation Link:** Accessible skip link (*„Zum Hauptinhalt springen“*) focused on first tab press, jumping immediately to `#main-content`.
* **Keyboard-First Design:** All wizards, modal dialogs, tab selectors, and buttons are operable solely via keyboard (`Tab`, `Shift+Tab`, `Enter`, `Space`, `Esc`).
* **Visible Focus Indicators:** Prominent 2px solid blue outlines with 2px offsets ensure clear visibility for keyboard navigators.
* **Modal Dialog Focus Trapping (`useFocusTrap.ts`):** Tab cycles are locked within active modals and focus is automatically restored to the calling button upon closing.

### Step 1: Student Profile (`StudentProfileStep.tsx`)
* Fields: Name/pseudonym/initials, date of birth, class/grade (1–6), school/school number, class teacher, legal guardians, support period (*von/bis*), primary and secondary support focus (*Förderschwerpunkt*: *Lernen*, *Sprache*, *Emotionale und soziale Entwicklung*, *Geistige Entwicklung*, *Körperliche und motorische Entwicklung*, etc.), narrative baseline observations (*Ausgangslage, Ressourcen & bisherige Förderergebnisse*).
* **Automatic Uneditable Timestamps Record:** Displays an uneditable record containing the creation timestamp (*„Erstellt am“*) and last modification timestamp (*„Zuletzt geändert“*) within the *„Schüleridentifikation & Basisangaben“* card, formatted in German date/time syntax (`DD.MM.YYYY, HH:mm Uhr`) with an explicit non-editable assurance badge (*„Automatisch erfasst (nicht editierbar)“*). These timestamps are strictly internal and omitted from the final print/PDF plan form.
* Dynamic Initialen Tool: Transforms an entered pupil name into valid uppercase initials (e.g. "Klaus Schmidt" -> "K. S.") to protect student privacy under GDPR, or generates random initials if the field is empty.
* Anonymous Random ID generator (`ID-YYYY-XXX`).
* Local privacy guarantee badge reassuring the teacher that no data is transmitted.
* Full accessibility: All form controls explicitly coupled with `<label>` elements via `htmlFor`/`id`.

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
* Diagnostic Filter: Filter toggle (*„Nur Förderbedarf filtern“*) with real-time match counter, explanatory guideline banner, active reset pill, and clear empty state.

### Step 3: Recommendations & Optional AI Assistant (`AiAssistantStep.tsx`)
* **Instant Deterministic Recommendations (`rules` Tab):**
  * Generated instantly from `src/utils/localMatchingEngine.ts` by mapping identified deficits to matched interventions, materials, and concrete pedagogical methods from `richtlinien.json`.
  * **Visible Plan Selection & Reversibility:** Selected recommendations are clearly highlighted with an emerald border (`border-2 border-emerald-500 bg-emerald-50/40`), an explicit top banner (*„Ausgewählt: Dieser Baustein ist im Förderplan enthalten“*), and an *„Aktiv im Plan“* badge.
  * **One-Click Removal:** Teachers can effortlessly reverse their selection directly on each recommendation card via *„Aus Förderplan entfernen“* without needing to navigate to Step 4.
  * **Quick Selection Filter:** Quick-toggle checkbox (*„Nur übernommene Bausteine anzeigen“*) allows teachers to isolate and audit all selected measures in a clean view.
* **Persistent In-Browser AI Assistant (`webllm` Tab):**
  * Teacher can request customized formulation proposals, differentiation strategies, or parent-communication talking points.
  * Powered by Wllama (`@wllama/wllama`) executing GGUF models directly on the CPU via WebAssembly SIMD.
  * Configured with an expanded **4,096-token context window** (`n_ctx: 4096`) and **8-bit quantized KV-cache** (`cache_type_k: 'q8_0'`, `cache_type_v: 'q8_0'`), cutting memory usage by 50% while comfortably accommodating comprehensive evaluation criteria prompts (~1,185 tokens) and rich generation.
  * **State Preservation Across Navigation:** Generated drafts in the *„Generierte Förderbausteine“* section are permanently preserved when switching away to other steps or forms, eliminating accidental generation loss. Includes a dedicated *„Text leeren“* button to discard or reset when desired.
  * Single-sequence in-browser execution (`n_parallel: 1`) prevents sequence fragmentation and eliminates token-limit exhaustion errors.
  * Storage strictly utilizes OPFS (Origin Private File System) and IndexedDB, completely avoiding Cache Storage API eviction risks.
  * System prompt enforces German educational jargon (SMART criteria, positive formulation, Berlin curriculum orientation).
  * Prompt Inspector modal equipped with full keyboard trap and screen-reader headings.

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
* **Official Berlin Support Plan Layout (Pages 82 & 83 of Handreichung „Fördermaßnahmen konkret!“):**
  * **Page 1 (Front / Page 82):**
    * *School Indication:* Positioned in the upper right corner of the first page.
    * *Centered Document Header:* The title *„F Ö R D E R P L A N“* and legal subtitle (*„gemäß § 19 Sonderpädagogische Förderverordnung (SopädVO) Berlin“*) are mathematically centered across the entire page width using a balanced 3-column CSS Grid (`grid-cols-[1fr_auto_1fr]`), preventing any horizontal displacement from the school indication on the right.
    * *Attribution Removal:* Institutional header attribution (*Senatsverwaltung für Bildung, Jugend und Familie Berlin*) is deliberately removed from the page header.
    * *Content:* 2-column boxed pupil master data and school framework conditions, narrative section for baseline status & resources (*Ausgangslage, Ressourcen & bisherige Förderergebnisse*), and bottom-anchored footer with guaranteed vertical headroom.
  * **Page 2+ (Form Table, Agreements & Conference / Page 83):** Official 5-column table (*IST*, *SOLL*, *LERNWEG*, *Absprachen*, *Reflexion*), structured section for *Weitere Vereinbarungen / Kooperationen & Nachteilsausgleich*, conference documentation (*Gesprächsdurchführung*, *Beteiligte*, *Kenntnisnahme*), and three legal signature lines (*Klassenlehrkraft*, *Sonderpädagogin / Schulleitung*, *Erziehungsberechtigte*).
* **Guaranteed Footer Protection & Continuation-Aware Pagination:**
  * **No Institutional Footers:** Attributions of the form *„Senatsverwaltung für Bildung, Jugend und Familie Berlin“* are completely removed from all page footers.
  * **Bottom-Anchored Unified Footer on Every Page:** The document footer is strictly placed at the very bottom of each and every page (both on screen web preview via `min-h-[297mm] flex flex-col justify-between mt-auto` and in print/PDF output via a DIN-A4 page container with `flex-shrink: 0`).
  * **Alignment & Content:**
    * *Left-aligned:* Application name, clean version number, and reference PDF document date (e.g. `Förderplan-Assistent Berlin 1.4.19 • Stand: 11/2018`).
    * *Right-aligned:* Dynamic page numbers placed only in the footer (`Seite {pageNumber} von {totalPages}`).
  * **Smart Overflow Protection & Continuation Banners:** To ensure the footer NEVER slips beyond the 297mm DIN A4 page boundary, the rendering engine splits content into discrete pages:
    * Measures are strictly capped at a maximum of 2 rows per table page.
    * When measures exceed 1 detailed entry, Sections 3 (Agreements) and 4 (Conference & Signatures) automatically move to their own dedicated continuation page.
    * Every continuation page begins with an explicit continuation line and section label explaining what section it belongs to (e.g. *„Förderplan • Fortsetzung von Seite X: 3. Weitere Vereinbarungen & 4. Gesprächsdurchführung / Kenntnisnahme“*).
* **DIN 1450 Document Legibility & Pure B&W Print Engine:**
  * **DIN 1450 Typography:** Clean, universally readable sans-serif font stack (`Arial`, `Helvetica`, `Nimbus Sans L`, `sans-serif`) with an 10.5pt base font for running text and tables, and line height calibrated to 1.35 to prevent visual crowding.
  * **High-Contrast Monochrome Printing:** Suppresses all decorative pastel tints, gray fills, and colored badges in print output; renders razor-sharp `1.5pt solid #000` outer borders and `1pt solid #000` grid rules for optimal photocopy and black-and-white printer reproduction.
  * **Semantic PDF/UA Document Hierarchy:** Structured with strict HTML5 semantic landmarks (`<article>`, `<header>`, `<h1>`, `<section>`, `<h2>`, `<dl>`, `<table role="table">`, `<caption>`, `<th scope="col">`) ensuring assistive technologies and screen readers can navigate exported vector PDFs logically.
* **Clean Document Print Styling:**
  * Uses CSS `@page { margin: 0 }` to completely suppress browser-injected header elements (URL, browser page title) and footer elements (system date/time), avoiding clutter.
  * Internal DIN-A4 page sheet layout container (`.a4-page-sheet`) enforces physical DIN-A4 dimensions with a calibrated 295mm buffer (`height: 295mm; min-height: 295mm; max-height: 295mm; overflow: hidden; page-break-inside: avoid;`).
  * Root wrapper resets suppress all outer padding and screen margins on `#root`, `<main>`, and `.space-y-6`.
  * Standard adjacent-sibling page breaks (`.a4-page-sheet + .a4-page-sheet { page-break-before: always; }`) guarantee that exactly one clean page break occurs between pages, completely preventing empty intermediate pages or trailing blank pages at the end of the document.
* Single-click browser print dialog triggering high-resolution vector PDF export (*„Formular drucken / PDF“*).

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
  * **Deferred Lifecycle Timestamps Activated Upon Edit:** Each plan records an ISO creation timestamp (`erstelltAm`) and last modification timestamp (`aktualisiertAm`). Timestamps are activated and updated strictly once the user performs an actual modification/editing operation in the plan. Pure browsing across steps or switching between plans leaves unedited plans marked *„Noch nicht bearbeitet“*. As soon as any edit occurs, `erstelltAm` is set to that exact moment and `aktualisiertAm` tracks subsequent updates in real time. Both timestamps are displayed formatted in German format in the plan manager card and in Step 1, while remaining strictly excluded from exported and printed forms.

---

## 4. Official Berlin Guidelines Integration

* **Data Structure (`src/data/richtlinien.json` & `richtlinien.json`):**
  * Contains official Berlin guidelines (*Sonderpädagogische Förderung / Grundschule*).
  * Categorized by developmental areas, diagnosed criteria, recommended standard measures, legal framework references, and documentation requirements.
  * Direct reference to the official source document: [Senatsverwaltung für Bildung, Jugend und Familie Berlin: Handreichung „Fördermaßnahmen konkret!“ (Stand: 11/2018)](https://www.berlin.de/sen/bildung/schule/foerderung/sonderpaedagogische-foerderung/fachinfo/foerdermassnahmen_konkret.pdf).
* **Guidelines Manager Modal (`GuidelinesManagerModal.tsx`):**
  * Teachers can view, search, and audit the guidelines currently in memory.
  * Accessible search input with real-time filtering and screen-reader status announcements.
  * Provides direct links in the header, validator tab, and modal footer to download the official Berlin Senate PDF document (`foerdermassnahmen_konkret.pdf`).
  * Allows updating or importing custom school-specific support catalogues.

---

## 5. Deployment, PWA, Subpath Publishing & Archive Generation

* **Arbitrary Subpath & Root Publishing (`vite.config.ts`):**
  * **Configurable & Relative Base Path:** Configured with `base: process.env.VITE_BASE_PATH || process.env.BASE_URL || './'`, defaulting to relative paths (`./`). This allows the application to be hosted at:
    * The domain root (`https://example.org/` or `https://username.github.io/`)
    * Any arbitrary subfolder/subpath (e.g. `https://username.github.io/foerderplaner/`, `https://school.domain.de/tools/foerderplan/`, or on a local intranet file path) without requiring hardcoded server-side rewrites.
  * **Subpath-Safe PWA Manifest & Service Worker Scope:** PWA manifest configured with relative identifier (`id: 'foerderplaner-pwa'`), relative start URL (`start_url: './'`), relative scope (`scope: './'`), and relative icon assets (`pwa-192x192.png`, etc.). The service worker automatically registers at `${BASE_URL}sw.js` with its scope bounded to the hosting subfolder.
  * **Dynamic Wasm Asset Resolution (`webLlmManager.ts`):** The Wllama WebAssembly engine dynamically resolves `wllama.wasm` relative to `import.meta.env.BASE_URL`, preventing 404 network failures when deployed under subdirectories.
  * **Subpath-Aware Archive Downloads (`VersionInfoModal.tsx`):** Distribution archive downloads prepend the dynamic base prefix (`import.meta.env.BASE_URL`), guaranteeing that `.tar.gz` packages resolve correctly regardless of the application's mounting point.
* **Vite + PWA Configuration (`vite.config.ts`):**
  * Full manifest configuration with maskable icons (`pwa-*.png`).
  * Workbox precaching with support for large model worker scripts (`maximumFileSizeToCacheInBytes: 16MB`).
  * Custom download middleware setting explicit `Content-Type: application/gzip` and `Content-Disposition: attachment` headers for `.tar.gz` endpoints.
* **Versioned Download Dialog (`VersionInfoModal.tsx`):**
  * Shows app version (`v1.4.18-offline`), license status (`GPL-3.0-or-later`), and official guidelines edition.
  * Direct link to the open source GitHub repository: [github.com/giusepperagusa/foerderplaner](https://github.com/giusepperagusa/foerderplaner).
  * Interactive PWA update check.
  * Direct one-click download buttons for:
    * `foerderplaner-v1.4.18-web-dist.tar.gz` (Pre-compiled production bundle ready for static hosting).
    * `foerderplaner-v1.4.18-source-code.tar.gz` (Complete project source tree).
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
* **Accessibility & Focus Management:** Custom `useFocusTrap` hook, WCAG 2.2 AA compliant tokens, DIN 1450 print stylesheets
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
│   │   ├── LicenseModal.tsx
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
│   │   ├── useFocusTrap.ts
│   │   ├── usePWAInstall.ts
│   │   └── usePWAUpdate.ts
│   ├── types/
│   │   └── foerderplan.ts
│   ├── utils/
│   │   ├── localMatchingEngine.ts
│   │   ├── planStorage.ts
│   │   ├── richtlinienTools.ts
│   │   ├── webLlmManager.ts
│   │   └── wllamaStorage.ts
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
* **Independent Creative Parameter Sets:** The optional neural language models (*Llama-3.2-3B-Instruct-Q4_K_S*, *Qwen2.5-1.5b-Instruct-Q8_0*, and *Llama-3.2-1B-Instruct-Q8_0* in GGUF format) downloaded interactively by the user at runtime into browser OPFS/IndexedDB storage are **NOT** part of the application source code or build output, and constitute independent creative works.
* **Model Upstream Licenses:** 
  * Meta Llama 3.2 models are released under the **Meta Llama 3.2 Community License**.
  * Qwen 2.5 models are released under the **Apache License 2.0**.
* **Scope of GPLv3:** The application's GPLv3 license applies solely to the software source code and logic. It does not govern, relicense, or modify the terms of third-party model weights downloaded independently by the end user.
* **Zero-Download Guarantee:** The application is fully functional offline without downloading any neural model, relying on the built-in deterministic pedagogical rules engine.

### Official Berlin Educational Reference Material
The diagnostic checklists, developmental domains, and pedagogical support measures are based on the official guidelines:
> *„Fördermaßnahmen konkret! Eine Handreichung für pädagogische Fachkräfte zur Entwicklung von Fördermaßnahmen“*  
> Herausgeber: Senatsverwaltung für Bildung, Jugend und Familie Berlin (Stand: November 2018).  
> Gemäß § 19 SopädVO Berlin.

---

## 10. Accessibility & Universal Design Standards (EN 301 549, WCAG 2.2 AA & DIN 1450)

To ensure full compliance with public administration mandates (including European Standard **EN 301 549**, the German **BITV 2.0 / BGG**, and W3C **WCAG 2.2 Level AA**), as well as standard **DIN 1450** (*Schriften – Leserlichkeit*), the application incorporates the following accessibility architecture:

### 1. Keyboard Navigation & Focus Guidance
* **Complete Keyboard Controllability:** Every interactive element (buttons, tabs, inputs, selects, textareas, chip selectors, checkboxes, modal triggers) is fully operable via keyboard (`Tab`, `Shift+Tab`, `Enter`, `Space`, `Arrow Keys`, `Escape`).
* **High-Contrast Visible Focus Rings:** All focusable controls feature an unmistakable `:focus-visible` styling—a 2px high-contrast solid blue outline (`#2563eb` / `#4f46e5`) with a 2px offset. Focus indicators are never hidden or suppressed.
* **Skip-to-Content Link:** A visually hidden skip link (*„Zum Hauptinhalt springen“*) appears at the top of the viewport when focused by keyboard users, allowing immediate jump to the primary workspace (`#main-content`) bypassing the navigation headers.

### 2. Modal Focus Management (`useFocusTrap`)
* **Strict Focus Trapping:** All modal dialogs (*Förderplan-Manager*, *Richtlinien-Manager*, *KI-Modell-Zustimmung*, *Versionsinfo & Bereitstellung*, *Software-Lizenz*, and the AI prompt inspector) implement the `useFocusTrap` custom hook.
* **Active Boundary Containment:** When a dialog is active, focus is constrained within the modal; pressing `Tab` on the last focusable element loops back to the first, and `Shift+Tab` on the first loops to the last.
* **Focus Restoration:** Upon closing a dialog (via `Esc`, close button, or backdrop click), keyboard focus is automatically returned to the exact trigger element that launched the modal.
* **Scroll Locking:** Body scrolling is cleanly locked while modals are open, preventing background scroll disorientations.

### 3. Semantic HTML & Assistive Technology (Screen Readers)
* **Native Landmarks:** Clean structure using `<header role="banner">`, `<main id="main-content">`, `<nav aria-label="...">`, and `<footer role="contentinfo">`.
* **Explicit Form Associations:** Every input, textarea, and select control is explicitly linked to an accessible `<label>` element using matching `id` and `htmlFor` attributes. No unlabelled controls exist.
* **Rich ARIA States:**
  * Wizard step navigation uses `role="tablist"` and `role="tab"` with dynamic `aria-selected` and `aria-current="step"`.
  * Interactive rating chips utilize `role="radio"` with `aria-checked` inside `role="radiogroup"`.
  * Collapsible sections and toggles utilize `aria-expanded` and `aria-controls`.
  * Asynchronous progress indicators (e.g. AI model downloads, guidelines search results) feature `aria-live="polite"` regions.

### 4. Color Contrast, Typography & Responsive Zoom
* **WCAG 2.2 AA Contrast Compliance:** Text and interactive elements maintain at least a 4.5:1 contrast ratio against their background (3:1 for large headings and active graphical indicators). Muted, low-contrast grays (such as Tailwind `slate-400` on white) have been upgraded to `slate-600` or darker.
* **200% Zoom Resiliency:** The user interface remains fully readable and operable when scaled up to 200% in browser zoom without horizontal clipping, missing content, or overlapping layout boxes.
* **Reduced Motion:** Interactive transitions respect the user's operating system preferences via CSS `@media (prefers-reduced-motion: reduce)`.

### 5. DIN 1450 & Document Print Legibility
* **Administrative Sans-Serif Typography:** In accordance with DIN 1450 recommendations for legibility in official and administrative documents, print output exclusively uses a high-legibility sans-serif font stack (`Arial`, `Helvetica`, `Nimbus Sans L`, `sans-serif`).
* **Optimized Font Geometry & Spacing:** Minimum 11pt base font size for continuous prose, 10.5pt for structured table matrices, and a proportional line-height of 1.40–1.45 to guarantee visual separation of ascenders and descenders.
* **Pure High-Contrast B&W Rendering:** Eliminates ink-heavy, muddy, or unreadable background colors and decorative dropshadows in print. Outer boundaries and table cells utilize solid, crisp black borders (`1.5pt solid #000` / `1pt solid #000`) designed for flawless photocopying and carbon-copy legibility.
* **Semantic PDF/UA Tagging:** The printed document template utilizes structured HTML5 elements (`<article>`, `<header>`, `<h1>`, `<section>`, `<h2>`, `<dl>`, `<table role="table">`, `<caption>`, `<th scope="col">`) ensuring assistive screen readers can parse exported vector PDFs in logical, sequential order.

---

## 11. Versioning Strategy & Project Changelog

### Versioning Rules
* **Format:** Strict Semantic Versioning (`vMAJOR.MINOR.PATCH[-modifier]`).
* **Trigger Conditions:**
  * **MAJOR (`+1.0.0`):** Incompatible data model changes, breaking database migrations, complete UI paradigm redesigns.
  * **MINOR (`+0.1.0`):** New functional steps, compliance template restructuring, new matching engines, export format additions, significant pedagogical enhancements.
  * **PATCH (`+0.0.1`):** Bug fixes, visual/CSS adjustments, typographical fixes, dependency patches.
* **Synchronization Mandate:** `package.json`, `VersionInfoModal.tsx`, `README.md`, and distribution archive names (`foerderplaner-vX.Y.Z-*.tar.gz`) must always share the exact same version number.

* **v1.4.20 (2026-10-10):**
  * **Upgrade to Three Selectable On-Device Models, Hardware Auto-Detection & Recommendation, On-Demand Lifecycle & Optimal Wllama Tuning:**
    * *Three Selectable Top-Tier Instruction Models (in Order of Preference):* Replaced legacy model options with three modern instruction models:
      1. *Llama-3.2-3B-Instruct-Q4_K_S* (Preferred, ~1,839 MB download, ~2.3 GB RAM, Meta Llama 3.2): Highest pedagogical drafting quality and nuanced formulations adhering strictly to the Berlin Senate guideline schema.
      2. *Qwen2.5-1.5b-Instruct-Q8_0* (~1,570 MB download, ~1.95 GB RAM, Qwen Team): Lossless 8-bit quantization with balanced memory footprint and high precision German language comprehension.
      3. *Llama-3.2-1B-Instruct-Q8_0* (~1,260 MB download, ~1.55 GB RAM, Meta Llama 3.2): Compact, fast 8-bit model for resource-constrained laptops, tablets, or mobile devices.
    * *Direct Model Selection & Local Downloading:* Users can select any of the three models directly via interactive selector cards in Step 3 (*„Förderempfehlungen“*) and the consent manager modal (*„Lokales Sprachmodell (Wllama On-Device)“*). Each card displays its local cache state (*„Offline bereit“* vs *„Download: ~X MB“*), and any un-downloaded model can be fetched on demand into OPFS/IndexedDB.
    * *Hardware Auto-Detection & Persistent User Preference:* Probes device characteristics (`navigator.hardwareConcurrency`, `navigator.deviceMemory`, mobile/desktop form factor) to mark the best comfortably runnable model with an *(„Empfohlen für Ihr Gerät“)* badge and pre-select it by default. Remembers user selections persistently in `localStorage`.
    * *On-Demand Wllama Lifecycle (Zero Idle RAM):* The model is started and initialized only when the user requests text generation and is immediately stopped and unloaded (`wllama.exit()`) as soon as the response is derived or cancelled, keeping idle browser memory completely free (0 MB RAM overhead).
    * *Optimal Wllama Engine Settings:*
      * Disabled embeddings (`embeddings: false`) to eliminate unnecessary vector overhead and memory usage.
      * Adapted thread allocation (`n_threads`) to available physical CPU cores, preventing thread thrashing while leaving sufficient headroom for the browser UI and OS.
      * Dynamic minimum context calculation (`n_ctx`): Evaluates actual prompt tokens per run plus generation allowance, rounding to clean multiples of 256 tokens rather than allocating excessive fixed context buffers, drastically reducing KV-cache RAM footprint and accelerating CPU WebAssembly execution.
    * *Universal Clean Prompt & Optimal Sampling Parameters:* Verified and unified the common prompt logic in `buildLocalModelPrompt` across Llama 3.2 and Qwen 2.5 without requiring specialized templates. Configured optimal sampling parameters across all runs: `temperature: 0.3`, `top_p: 0.85`, `top_k: 40`, `repeat_penalty: 1.15`, and `repeat_last_n: 64`.

* **v1.4.19 (2026-10-06):**
  * **Restoration of Authentic German Guidelines Text (Umlauts & ß) Directly from the Berlin Senate Reference Document:**
    * *Direct Extraction from Official Reference PDF:* Extracted and restored authentic German text and orthography (`ä, ö, ü, Ä, Ö, Ü, ß`) directly from the official reference document *„Fördermaßnahmen konkret! Eine Handreichung für pädagogische Fachkräfte zur Entwicklung von Fördermaßnahmen“* (Senatsverwaltung für Bildung, Jugend und Familie Berlin, Stand November 2018) across the entire knowledge base (`richtlinien.json` and `src/data/richtlinien.json`), eliminating artificial ASCII transliterations (`ae, oe, ue, ss`) across all 114 diagnostic checklist criteria, 29 category definitions, and 107 pedagogical support measures (IST, SOLL, LERNWEG).
    * *Unicode-Aware Keyword & Profile Matching:* Updated the local matching engine (`localMatchingEngine.ts`) and guidelines search (`GuidelinesManagerModal.tsx`) to support Unicode word boundaries (`\p{L}`) and dual-matching, ensuring search queries and student profile notes match accurately regardless of whether entered with standard German umlauts or legacy ASCII transliterations.
    * *Natural German Prompts for 1.5B/3B Local Models:* Modernized the prompt generator in `buildLocalModelPrompt` to construct prompts using natural, standard German orthography (`ä, ö, ü, ß`) tailored for modern 1.5B+ parameter local models (such as Qwen2.5 1.5B/3B or Llama 3.2 1B/3B), while preserving isolated normalization hooks for legacy lightweight pipelines.
    * *Tooling & Schema Validation Alignment:* Updated `richtlinienTools.ts` and `update-richtlinien.ts` validation routines to verify schema compliance and authentic German text integrity.

* **v1.4.18 (2026-10-05):**
  * **Step 3 Renaming & Tab Clarification, Navigation Button Alignment, and Standard German Date Format (`DD/MM/YYYY`):**
    * *Step 3 Clarification & Decoupling from AI Labeling:* Renamed Step 3 across the entire application—including the main header step indicator, the step header banner, and all forward/back page navigation buttons—from *„KI-Förderempfehlungen (Optional)“* to simply *„Förderempfehlungen“*. This eliminates the misunderstanding that Step 3 is strictly an AI-driven stage or that Tab 1 requires AI execution.
    * *Internal Tab Labels in Step 3:* Explicitly re-labeled the internal tabs to clearly delineate the standard guideline workflow from optional AI drafting:
      * Tab 1: *„Amtliche Richtlinien-Bausteine ({count} Treffer)“* with badge *„Standard (Ohne KI) • Sofort“* (0 MB download, immediate access to all 107 official Senate measures).
      * Tab 2: *„Optionale KI-Formulierungshilfe ({modelDisplayTag})“* with badge *„Experimentell & Optional“* and *„Wasm • Offline“*.
    * *Aligned Navigation Buttons Across All Steps:* Harmonized all forward and back navigation buttons at the bottom of every page to consistently and accurately reflect step titles (*„Zurück zu Stammdaten“* / *„Weiter zu Förderempfehlungen“* in Step 2; *„Zurück zum Einschätzungsbogen“* / *„Weiter zum Förderplan-Editor“* in Step 3; *„Zurück zu Förderempfehlungen“* / *„Weiter zu Druck & Export“* in Step 4; *„Zurück zum Förderplan-Editor“* in Step 5).
    * *Standard German Date Format (`DD/MM/YYYY`):* Replaced HTML5 ISO date pickers (`YYYY-MM-DD`) with custom German date input components (`GermanDateInput`) for:
      * Step 1: *„Geburtsdatum“*, *„Förderzeitraum von“*, and *„Bis (Evaluation)“*.
      * Step 4: *„Gespräch wurde durchgeführt am“*.
      Inputs now accept and display dates strictly in standard German `DD/MM/YYYY` format (`TT/MM/JJJJ`), featuring smart normalization on blur (supporting slash, dot, hyphen, or continuous 8-digit inputs like `15082016` -> `15/08/2016`), an integrated calendar picker dialog button, and synchronized `DD/MM/YYYY` formatting in the final print and PDF vector output.

* **v1.4.17 (2026-10-05):**
  * **Deferred Lifecycle Timestamp Activation, Dynamic Model Tab Reactivity & Transparent Marking of AI Capabilities as Experimental and Optional:**
    * *Deferred Timestamp Activation Upon Actual Modification:* The creation timestamp (`erstelltAm`) and last modification timestamp (`aktualisiertAm`) now remain unrecorded and blank while a support plan is merely browsed, viewed, or navigated through. Newly created blank plans, duplicated template copies, or unedited plans explicitly display *„Noch nicht bearbeitet“* (along with *„Wird bei erster Änderung erfasst“* in Step 1). As soon as the user enters or edits any content (such as student data, checklist evaluations, support measures, or agreements), `erstelltAm` is immediately established for that moment and `aktualisiertAm` tracks subsequent edits in real time.
    * *Dynamic Step 3 Model Tab Reactivity:* The tab title under Step 3 (*„KI-Förderempfehlungen“*) now dynamically adapts to reflect the currently selected local model (e.g. *„Lokales Sprachmodell (Qwen2.5-1.5B Wllama CPU/OPFS)“* when the 1.5B model is active, or *„Qwen2.5-0.5B...“* when the 0.5B model is chosen), resolving the issue where the tab label was previously static and fixed to *„Qwen2.5-0.5B“*.
    * *Clear Marking of AI Capabilities as Experimental & Fully Optional:* All AI-related features and local language model capabilities are now prominently marked across the entire user interface as experimental and optional (*„Experimentell & Optional“* / *„Vollständig optional & experimentell“*). Distinct callouts in the Step 3 tab bar, the offline model consent dialog, top navigation, footer bar, license overview, and version dialog clearly inform teachers that the application can be fully and comprehensively used without activating AI models at all, relying on the 107 official Berlin guideline building blocks and manual form inputs.
* **v1.4.16 (2026-10-05):**
  * **Reliable Offline Model Status Recognition, Download Resilience (Wake Lock & Stream Error Handling) & Live Inference Progress/Abort:**
    * *Reassuring Offline Model Status Across App Updates & Reloads:* Resolved the issue where updating the application instance or changing versions caused the UI to show an alarming *„Modell noch nicht geladen“* prompt and a *„Modell laden / Zustimmen“* download button even when model weights were already 100% downloaded in OPFS/IndexedDB. The UI now distinguishes between *stored locally* and *loaded into RAM*, proactively acknowledging local presence (*„Modell ist lokal gespeichert (OPFS, 100% offline einsatzbereit)“*) with a green indicator, and offers immediate 1-click execution that seamlessly initializes the model into memory in 1–2 seconds without opening the download consent dialog.
    * *Fix for `ERR_NETWORK_IO_SUSPENDED` & `Cannot close a ERRORED writable stream`:*
      * Screen Wake Lock Integration: Automatically requests a screen wake lock via `navigator.wakeLock.request('screen')` during model downloads and local inference, preventing macOS Sequoia / Chrome from suspending network I/O (`net::ERR_NETWORK_IO_SUSPENDED`) due to system inactivity or energy-saving sleep on laptops (such as MacBook Air on battery).
      * Writable Stream Error Handling in OPFS: Fixed `OPFSStorageBackend.write` so it no longer attempts to invoke `writable.close()` inside a `finally` block when a stream is already errored (which previously threw `TypeError: Cannot close a ERRORED writable stream`). If an I/O error occurs, it aborts the writable handle via `writable.abort()`, deletes the corrupted partial file, and rethrows the underlying error cleanly.
      * Multi-Attempt Auto-Retry: Added automatic retry (up to 3 attempts with exponential backoff) for transient network glitches during model download from Hugging Face.
    * *Live Token Progress & Immediate Generation Interruption:*
      * Live Inference Metrics: Replaced the static *„Generiere Tokens...“* message with dynamic real-time telemetry, including active token counter (`{count} Tokens`), generation speed in tokens per second (`{rate} Tok/s`), elapsed execution time (`{time}s`), an animated typing cursor, and distinct prefill (*„Prompt-Verarbeitung & Kontext laden...“*) vs. generation stages.
      * 1-Click Generation Abort (*„Inferenz abbrechen“*): Added immediate cancel controls both in the streaming output header and on the primary action button, allowing teachers to interrupt long-running generation at any moment without freezing the UI while preserving whatever content was already generated.
* **v1.4.15 (2026-10-04):**
  * **Persistence of Generated AI Drafts, Guaranteed Hour:Minute Timestamps & Reversible Recommendation Selection:**
    * *State Preservation for Local Language Model:* Resolved text loss under the *„Lokales Sprachmodell“* tab in Step 3 (*„KI-Förderempfehlungen“*). The generated output in the *„Generierte Förderbausteine“* section and active tab selection are now permanently preserved across step navigation, eliminating accidental generation loss when navigating to other forms or steps. Added a dedicated *„Text leeren“* button to discard or reset drafts.
    * *Guaranteed Hour:Minute Indication on Modification Timestamps:* Updated timestamp formatting (`formatTimestamp()`) and plan storage migration so that whenever the last modification date is displayed (both in Step 1 *„Schüleridentifikation & Basisangaben“* and in the *„Plan-Verwaltung & Übersicht“* dialog), the exact hour and minute indication (`DD.MM.YYYY, HH:mm Uhr`) is strictly rendered, even for legacy date formats.
    * *Intuitive Identification & 1-Click Reversibility for Guidelines Recommendations:* In Step 3 under *„Offizielle Richtlinien-Zuordnung“*, selected recommendations now stand out clearly with emerald borders (`border-2 border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-200/70`), an explicit top notification banner (*„Ausgewählt: Dieser Baustein ist im Förderplan enthalten“*), and an *„Aktiv im Plan“* badge. Added an immediate one-click *„Aus Förderplan entfernen“* button to each selected card to allow teachers to easily revert selections directly, plus a quick toggle (*„Nur übernommene Bausteine anzeigen“*) to audit all selected items at a glance.
* **v1.4.14 (2026-10-04):**
  * **Automatic Creation and Modification Timestamps (Uneditable Plan Lifecycle Record):**
    * *Automated Lifecycle Tracking:* Implemented persistent tracking of creation timestamps (`erstelltAm`) and last modification timestamps (`aktualisiertAm`) across the entire plan lifecycle. Any state mutation—including student profile edits, diagnostic checklist ratings and flags, plan rows, additional agreements, parent meeting data, status toggles (*„Entwurf“* / *„Abgeschlossen“*), duplications, and imports—automatically updates `aktualisiertAm` with precise ISO timestamps.
    * *Display in Step 1 (Student Profile):* Embedded an uneditable metadata card within the *„Schüleridentifikation & Basisangaben“* section of Step 1 (*„Stammdaten & Schwerpunkt“*). Displays formatted German date and time values (`DD.MM.YYYY, HH:mm Uhr`) for *„Erstellt am:“* and *„Zuletzt geändert:“* alongside a security badge (*„Automatisch erfasst (nicht editierbar)“*). Form controls are read-only and uneditable.
    * *Display in Plan Manager Dialog:* Added a dedicated metadata row to each student card in the *„Plan-Verwaltung & Übersicht“* modal dialog showing formatted creation and modification timestamps with calendar and clock indicators.
    * *Strict Exclusion from Official Final Form:* Guaranteed that neither creation nor modification timestamps are exposed or printed in the official final support plan form (both web preview and vector PDF/printed version in `PrintPreviewStep.tsx`), strictly adhering to official Berlin Senate statutory template specifications.
* **v1.4.13 (2026-10-04):**
  * **PDF & Print Header Layout Alignment & Centering Fix:**
    * *Document Header Print Display Override Fix:* Corrected the print stylesheet override in `src/index.css` where `.a4-page-sheet header` had been globally forced to `display: flex !important`, which previously prevented the inner header container from expanding to full width and caused the 3-column grid to shrink-wrap and misalign in print/PDF engines. Set `.a4-page-sheet header` to `display: block !important; width: 100% !important; box-sizing: border-box !important;`.
    * *Symmetric Structural Balancer for Mathematical Centering:* Enhanced the Page 1 3-column header grid (`grid-cols-[1fr_auto_1fr]`) by embedding an identically dimensioned invisible counterpart in the left column matching the exact structure and text of the school indication on the right. This guarantees 100% identical intrinsic column width on both sides under all rendering engines, completely eliminating horizontal bias and ensuring the title *„F Ö R D E R P L A N“* and statutory subtitle (*„gemäß § 19 Sonderpädagogische Förderverordnung (SopädVO) Berlin“*) are perfectly centered across the page.
    * *Strict Right Margin Alignment:* Ensured the school indication (*Schulangabe*) in the third column spans to the physical right border of the page with `text-right` and `w-full`, achieving true right alignment in exported PDFs and printouts.
* **v1.4.12 (2026-10-02):**
  * **Centered Header Title & Elimination of Overflow Pages:**
    * *Mathematically Centered Title & Subtitle:* Restructured Page 1 header using a balanced 3-column CSS Grid (`grid-cols-[1fr_auto_1fr]`). The document title *„F Ö R D E R P L A N“* and legal subtitle (*„gemäß § 19 Sonderpädagogische Förderverordnung (SopädVO) Berlin“*) are now strictly centered across the entire physical page width, completely preventing the school indication on the upper right from pushing the centered title to the left.
    * *Page 1 Footer Overflow Fix:* Calibrated DIN-A4 page sheet height to 295mm (`min-height: 295mm; max-height: 295mm; box-sizing: border-box`), suppressed outer margins/padding on `#root`, `<main>`, and `space-y-*` containers during print, and applied compact padding (`print:p-2`, `print:space-y-1.5`) to Section 1 master data and baseline notes. This provides generous vertical headroom on Page 1, ensuring the first-page footer never slips beyond the end of the page onto an empty second page.
    * *Elimination of Final Blank Page:* Replaced conflicting `break-after` and `break-before` CSS rules with standard adjacent-sibling page breaks (`.a4-page-sheet + .a4-page-sheet { break-before: page; }`) and explicit trailing break suppression (`.a4-page-sheet:last-of-type { break-after: avoid; }`). This guarantees that exactly one page break occurs between consecutive sheets and completely eliminates extraneous blank overflow pages.
* **v1.4.11 (2026-10-01):**
  * **Form Header Optimization & Overflow-Protected Pagination:**
    * *School Indication in Upper Right:* Positioned the school name and school year in the upper right corner of the first page.
    * *Centered Document Title:* Anchored the title *„F Ö R D E R P L A N“* and statutory reference (*„gemäß § 19 Sonderpädagogische Förderverordnung (SopädVO) Berlin“*) across the upper region of the first page.
    * *Overflow-Protected Pagination:* Restricted measure table entries to a maximum of 2 rows per page to prevent footers from slipping past the DIN A4 boundary (297 mm). When multiple detailed entries exist, Section 3 (*Weitere Vereinbarungen*) and Section 4 (*Gesprächsdurchführung & Unterschriften*) automatically break onto their own continuation page.
    * *Explicit Continuation Banners:* Added explicit continuation headers to all subsequent pages explaining which section they continue (e.g., *„Förderplan • Fortsetzung von Seite X: 3. Weitere Vereinbarungen & 4. Gesprächsdurchführung / Kenntnisnahme“*).
* **v1.4.10 (2026-10-01):**
  * **Print & PDF Layout Cleanup, Subpath Publishing & Download Reference:**
    * *Removal of Senate Attributions:* Completely removed institutional attributions and reference text referring to the Berlin Senate (*„Senatsverwaltung für Bildung, Jugend und Familie Berlin“* and *„Handreichung „Fördermaßnahmen konkret!“ • Anlage Förderplan (S. 82/83)“*) from the Page 1 header and all page footers in web preview and PDF/print export.
    * *Strict Footer Anchoring & Page Numbering:* Relocated page numbers (*„Seite {current} von {total}“*) exclusively to the right side of the bottom footer on every page. Anchored program version and reference document date (*„Förderplan-Assistent Berlin 1.4.10 • Stand: 11/2018“*) on the left side of the same footer line, firmly fixed at the physical bottom margin.
    * *Arbitrary Subpath & Subfolder Publishing:* Implemented full support for deploying under arbitrary URLs differing from the domain root (e.g., GitHub Pages project repositories `username.github.io/foerderplaner/`, school portals under `/tools/foerderplan/`, or local intranet paths) via configurable `base: process.env.VITE_BASE_PATH || process.env.BASE_URL || './'`, relative PWA manifest paths (`scope: './'`, `start_url: './'`, relative icon URIs), dynamic Wasm asset resolution (`webLlmManager.ts`), and base-prefixed archive downloads (`VersionInfoModal.tsx`).
    * *Direct Download Reference for Official Berlin Senate Document:* Integrated direct PDF download links to the official guidelines document ([foerdermassnahmen_konkret.pdf](https://www.berlin.de/sen/bildung/schule/foerderung/sonderpaedagogische-foerderung/fachinfo/foerdermassnahmen_konkret.pdf)) within the Guidelines Manager (`GuidelinesManagerModal.tsx` in header, validator metadata, and footer) as well as the `README.md`.
* **v1.4.9 (2026-10-01):**
  * **PWA Immediate Activation, High-Quality 1.5B Model Option & Elimination of Repetitions/Truncations:**
    * *Service Worker Instant Cache Invalidation:* Configured `registerType: 'autoUpdate'` and `workbox.skipWaiting: true` in `vite.config.ts`, ensuring new versions take effect immediately upon deployment and resolving browser persistence of outdated app bundles (e.g. v1.4.7/v1.4.8).
    * *High-Quality 1.5B Parameter Model (`qwen2.5-1.5b-q4_k_m`):* Added `bartowski/Qwen2.5-1.5B-Instruct-GGUF` (~940 MB) as the recommended model. 1.5B parameters provide three times the linguistic and reasoning capacity of 0.5B models, properly understanding the semantic distinctions between IST, SOLL, and LERNWEG and eliminating hallucinated vocabulary.
    * *Prompt Guidance Disambiguation (`buildLocalModelPrompt`):* Completely overhauled local prompt structuring to strictly define the role and content of each section (IST: observation; SOLL: achievable goal; LERNWEG: pedagogical methods from official guideline; ABSPRACHEN: agreements; REFLEXION: timeline). Removed ambiguous keywords like *„ermutigend“* which small models confused for section headers.
    * *Native Sampling Parameters & Stop Tokens:* Configured native llama.cpp parameters (`temp: 0.6`, `temperature: 0.6`, `penalty_repeat: 1.35`, `penalty_last_n: 512`, `penalty_freq: 0.5`, `penalty_present: 0.4`, `n_predict: 420`) and explicit stop tokens (`### Ermutigung`, `### Fazit`, `Hinweis:`, `<|im_end|>`) to prevent generation drift.
    * *Stream Completion & Truncation Guard:* Implemented completion detection following the `REFLEXION` section to stop generation cleanly, and added terminal punctuation cleanup so generated text never ends on cut-off half-words.
* **v1.4.8 (2026-09-30):**
  * **Wllama bartowski Q8_0 Model Option, Anti-Repetition Sampling & 4,096-Token Context:**
    * *App Version Display Fix:* Synchronized `APP_VERSION` in `VersionInfoModal.tsx` to `v1.4.8-offline`, resolving the display persistence issue where the navigation and footer retained the v1.4.7 badge.
    * *bartowski Q8_0 High-Precision GGUF Option:* Integrated `bartowski/Qwen2.5-0.5B-Instruct-GGUF/Qwen2.5-0.5B-Instruct-Q8_0.gguf` (~506 MB) alongside the compact Q4_K_M variant (~397 MB). In 0.5B-parameter models, 8-bit quantization retains 99.5%+ of full precision, preventing degradation and semantic flattening.
    * *Anti-Repetition Sampling Parameters:* Resolved degenerative repetition loops (infinite repetition of criteria phrasing until hitting max tokens) by configuring `penalty_repeat: 1.18`, `penalty_last_n: 256`, `penalty_freq: 0.3`, `penalty_present: 0.3`, `temperature: 0.6`, and `max_tokens: 450` in `createChatCompletion`.
    * *Live Streaming Repetition Guard:* Added client-side loop detection to automatically break generation if an identical 30-character phrase repeats consecutively, preventing browser compute freezes.
    * *Fixed Context Length Ceiling:* Configured `@wllama/wllama` initialization (`loadModelFromHF`) to explicitly set `n_ctx: 4096`, resolving the runtime error `request (1185 tokens) exceeds the available context size (1024 tokens)`.
    * *KV-Cache 8-Bit Quantization (`cache_type_k: 'q8_0'`, `cache_type_v: 'q8_0'`):* Enabled 8-bit quantization for both Key and Value tensors in the WebAssembly llama.cpp context, cutting KV cache memory consumption by ~50%.
    * *Suppressed WebGPU Warnings:* Set `n_gpu_layers: 0` in Wllama load parameters to bypass WebGPU adapter polling on unsupported setups, eliminating the `No available adapters` console messages.
    * *Prompt Optimization (`buildLocalModelPrompt`):* Formatted prompt with a single clear 5-column exemplar, reducing input tokens and prefill latency on client CPUs.
* **v1.4.7 (2026-09-30):**
  * **Dialog Button & Label Standardization:** Harmonized all modal trigger buttons and tooltips across the top navigation, step headers, and footer to uniform canonical labels: *„Lokale KI (Wllama)“*, *„Richtlinien-Katalog“*, *„Software-Lizenz (GPLv3)“*, *„Förderplan-Manager“*, and *„Versionsinfo“*.
  * **Print & PDF Layout Overhaul & Multi-Page Numbering:**
    * *Restored Document Footer & Senate Citation:* Decoupled CSS `@media print` suppression rules from naked HTML tags (`header`, `footer`) to dedicated application chrome classes (`.app-header`, `.app-footer`, `.print-hidden`), restoring the official prescribed final line (*„Förderplan-Assistent Berlin {version} • Dokumentengrundlage: „Fördermaßnahmen konkret!“ Stand 11/2018“*) in all exported PDFs and printed documents.
    * *Dynamic Multi-Page Numbering:* Replaced hardcoded *„Seite 1 / 2“* and *„Seite 2 / 2“* counters with dynamic page calculation (*„Seite 1 von {totalPages}“*, *„Seite 2 von {totalPages}“*, *„Seite {totalPages} von {totalPages}“*) based on live DOM measurement and pedagogical table density heuristics for support plans spanning 3 or more pages.
* **v1.4.6 (2026-09-29):**
  * **Accessibility (EN 301 549 & WCAG 2.2 Level AA):** Comprehensive user interface overhaul to achieve full compliance with European public sector accessibility standards:
    * *Keyboard Navigation & Focus Guidance:* Complete keyboard navigability across all interactive controls (`Tab`, `Shift+Tab`, `Enter`, `Space`); high-contrast visible focus indicators (`:focus-visible`) featuring a vivid blue 2px outline with 2px offset; accessible skip navigation link (*„Zum Hauptinhalt springen“*) bypassing navigation headers to `#main-content`.
    * *Strict Modal Focus Trapping (`useFocusTrap`):* Resilient focus trapping across all modal dialogs (*Förderplan-Manager*, *Richtlinien-Manager*, *KI-Modell-Zustimmung*, *Versionsinfo & Bereitstellung*, *Software-Lizenz*, and the AI prompt inspector), with automatic focus return to trigger elements upon dismissal via `Esc` or outside click.
    * *Semantic HTML Structure & ARIA States:* Migration to native landmarks (`<main id="main-content">`, `<nav aria-label="...">`), explicit label association for all form fields via `id`/`htmlFor`, standard ARIA attributes (`aria-current="step"`, `role="tablist"`, `role="tab"`, `aria-selected`, `aria-pressed`, `aria-checked`, `aria-live="polite"`).
    * *Color Contrast & 200% Zoom Resiliency:* Elevation of all text contrast ratios to at least 4.5:1 against their backgrounds (replacing muted Slate-400 with high-contrast Slate-600/700/800); responsive flex/grid layouts maintaining integrity without text truncation, overlap, or horizontal scroll up to 200% browser zoom.
  * **DIN 1450 Print & Document Legibility (Support Plan PDF):**
    * *DIN 1450 Typography:* Overhauled all print stylesheets from serif to a highly legible, administrative sans-serif font stack (`Arial`, `Helvetica`, `Nimbus Sans L`, `sans-serif`) with an 11pt minimum base font size for running text (10.5pt in tables) and fixed line-height between 1.40 and 1.45 to prevent visual crowding.
    * *High-Contrast Black-and-White Print Layout:* Removed all distracting tinted background fills, pastel badges, and decorative drop shadows in print output; enforced sharp, administrative black borders (`1.5pt solid #000` and `1pt solid #000`) for crisp physical printing and reliable photocopying.
    * *Semantic PDF/UA Structure:* Structured the document template with a strict HTML5 hierarchy (`<article>`, `<header>`, `<h1>`, `<section>`, `<h2>`, `<dl>`, `<table role="table">`, `<caption>`, `<th scope="col">`), ensuring screen readers and assistive tools parse exported vector PDFs in logical reading order.
* **v1.4.5 (2026-09-29):**
  * **Print & Export Toolbar Cleanup:** Removed redundant *„JSON sichern“* button from Step 5 (*Druck & Export*); full single-plan and bulk backup/restore operations are now managed exclusively and consistently in the central plan manager.
  * **Print Button Standardization:** Standardized both top and bottom print action buttons in Step 5 to the uniform label *„Formular drucken / PDF“*.
* **v1.4.4 (2026-09-28):**
  * **GitHub Repository Integration:** Added direct and prominent links to the open-source repository ([https://github.com/giusepperagusa/foerderplaner](https://github.com/giusepperagusa/foerderplaner)) in both the application footer and a dedicated info card within the *„Versionsinfo & Bereitstellung“* dialog.
  * **Orthography & Umlaut Standardization:** Complete audit of all teacher-facing UI text, labels, dialog prompts, step headings, and placeholders for standard German orthography with proper umlauts (ä, ö, ü) and Eszett (ß); ASCII digraph transliteration (ae, oe, ue, ss) is strictly restricted to text ingested and generated by the local AI model.
  * **Print Output Cleanup (Page 2):** Fully suppressed the application footer and client-side processing disclaimer from printed output via targeted `@media print` rules; page 2 concludes cleanly with the official consecutive page counter (*Seite 2 / 2*).
* **v1.4.3 (2026-09-28):**
  * **Individual Plan Export (`.json`):** Direct export of single student support plans (`foerderplan_<Name>_<ID>.json`) via a download icon directly on each plan card in the plan manager.
  * **Collision Detection & Import Resolution:** Interactive prompt when importing plans with an existing ID, allowing teachers to choose between *„Bestehenden Plan aktualisieren/überschreiben“* (e.g., after editing on another workstation) or *„Als neue Kopie anlegen“* (`(Kopie)`).
  * **Security & Storage Documentation Clarification:** Corrected misleading references to in-app file encryption; transparently documented the architectural standard of using open JSON coupled with OS-level full-disk encryption (BitLocker, FileVault, LUKS) and encrypted removable media under GDPR.
* **v1.4.2 (2026-09-28):**
  * **GPLv3 Licensing & AI Model Weights Exclusion:** Migrated the entire application codebase to the GNU General Public License v3.0 (GPLv3), adding the `LICENSE` file and SPDX license identifiers.
  * **Dedicated License Modal (`LicenseModal.tsx`):** Added modal detailing GPLv3 software rights, verified 100% license compatibility across all statically bundled dependencies (MIT, ISC, BSD-2-Clause, Apache-2.0), and provided direct viewing of the complete license text.
  * **Legal Clarification on Runtime Model Weights:** Explicitly exempted runtime-downloaded neural model parameter weights (e.g., Qwen2.5-0.5B-Instruct under Apache 2.0) from the GPLv3 software license as independent creative works.
  * **Official Berlin Guidelines Attribution:** Documented the pedagogical foundation in the official Berlin ministerial guideline *„Fördermaßnahmen konkret! Eine Handreichung für pädagogische Fachkräfte zur Entwicklung von Fördermaßnahmen“* (SenBJF Berlin) pursuant to *§ 19 SopädVO Berlin*.
* **v1.4.1 (2026-09-27):**
  * **Special Education Needs Focus Expansion (GE & KME):** Added the two official Berlin support categories *„Geistige Entwicklung“ (GE)* and *„Körperliche und motorische Entwicklung“ (KME)* to Step 1, complete with developmental domains, criteria, and official support interventions from *„Fördermaßnahmen konkret!“*.
  * **Assessment Filter Clarification:** Revamped the *„Nur Förderbedarf filtern“* filter in Step 2: added real-time counter (`{count} / {total}`), explanatory info banner regarding filter criteria (ratings of *„eher nicht / trifft nicht zu“* or active focus areas), active status badge with one-click reset, and an informative empty state.
* **v1.4.0 (2026-09-27):**
  * **Wllama WebAssembly CPU Engine:** Replaced the WebGPU-only `@mlc-ai/web-llm` engine with Wllama (`@wllama/wllama`), enabling on-device execution of `Qwen2.5-0.5B-Instruct` (GGUF) on all CPUs via WebAssembly SIMD without requiring WebGPU support.
  * **OPFS & IndexedDB Storage Architecture:** Completely eliminated reliance on the Cache Storage API (`window.caches`). Model weights are now stored and streamed exclusively via OPFS (Origin Private File System) with an automatic IndexedDB fallback.
  * **Persistent Quota Protection:** Integrated `navigator.storage.persist()` to safeguard downloaded model weights from browser storage eviction.
  * **Graceful Deterministic Fallback:** Maintained the instant rule-based matching engine (`localMatchingEngine.ts`) as the primary zero-download fallback whenever model download is skipped or deferred.
* **v1.3.1 (2026-09-26):**
  * **Optimized Official Form Printing:** Suppressed browser-generated headers and footers (URL, timestamp, page title) via CSS `@page { margin: 0 }` and an internal `.print-document-sheet` container.
  * **Footer & Version Display Cleanup:** Embedded the application version (`Förderplan-Assistent Berlin 1.3.1`) into the document fine print while preserving all official citations.
  * **Page Numbering:** Consistent and accurate pagination (*Seite 1 / 2* on the front sheet and *Seite 2 / 2* on the reverse/table sheet).
* **v1.3.0 (2026-09-26):**
  * **Official Form Template Integration:** Replaced generic web print preview in Step 5 (`PrintPreviewStep.tsx`) with the official 2-page ministerial template from pages 82–83 of *„Fördermaßnahmen konkret!“* (Berlin Senatsverwaltung für Bildung, Jugend und Familie / § 19 SopädVO Berlin).
  * **5-Column Standard Grid:** Front page master data with narrative baseline, followed by the official 5-column grid (*1. IST*, *2. SOLL*, *3. LERNWEG*, *4. Absprachen*, *5. Reflexion*) and multidisciplinary conference sign-off blocks.
  * **DIN-A4 Print Stylesheet:** Added precise `@page` CSS print definitions with clean page-break splits, hidden UI chrome, and vector PDF rendering.
  * **Flow & Breadcrumb Reset:** Creating a new plan or selecting/duplicating an existing plan now consistently resets the navigation state back to Step 1 (*Stammdaten & Schwerpunkt*).
  * **Dynamic Initials Converter:** Enhanced Step 1 "Initialen" feature to dynamically convert entered names (e.g. "Klaus Schmidt" -> "K. S.") or generate pseudonyms instead of hardcoded placeholder text.
  * **Versioning Directive:** Formalized semantic versioning protocol and changelog maintenance rules in `README.md`.
* **v1.2.1:**
  * **PWA Offline Support:** Added service worker precaching and offline support via `vite-plugin-pwa`.
  * **Modal Viewport Fixes:** Corrected dialog sizing, scrollable body containers (`min-h-0`), and Escape key dismissal.
  * **Static Web Bundles:** Generated `.tar.gz` distribution packages and added interactive PWA update checking.
* **v1.2.0:**
  * **WebLLM Web Worker Integration:** Added optional in-browser LLM integration (`Qwen2.5-0.5B-Instruct-q4f16_1-MLC`) with hardware detection and opt-in consent modal.
* **v1.1.0:**
  * **Multi-Plan Management:** Added multi-plan management in IndexedDB/LocalStorage (draft/completed status, duplicate, archive, delete).
* **v1.0.0:**
  * **Initial Release:** Initial launch of *Förderplan-Assistent Grundschule Berlin* based on *„Fördermaßnahmen konkret!“*.
