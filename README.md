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
* **Component License Compatibility:** All statically bundled and linked dependencies (React, `@wllama/wllama`, Lucide Icons, Tailwind CSS, Vite) use permissive open-source licenses (MIT, ISC, BSD-2-Clause, Apache-2.0). Under Free Software Foundation (FSF) guidelines, these licenses are 100% compatible with GNU GPLv3.

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

### Changelog & Release History

The complete, unabridged release history and detailed technical change notes are maintained in [CHANGELOG.md](./CHANGELOG.md).

For a quick summary of recent updates directly inside the application, open the in-app version dialogue (*„Versionsinfo & Bereitstellung“* in the top navigation or application footer).
