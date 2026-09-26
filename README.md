# Förderplan-Assistent Grundschule (Berlin) — System Specification & Blueprint

> **CRITICAL MAINTENANCE DIRECTIVE FOR FUTURE SESSIONS / AGENTS:**  
> This `README.md` must be kept strictly up to date with any and all future architectural changes, features, bug fixes, data schema updates, and dependency additions. Whenever modifications are made to this codebase, update this document before completing the task.

---

## 1. System Overview & Re-creation Prompt

You are tasked with building or recreating the **Förderplan-Assistent Grundschule** from scratch. This application is an entirely client-side, 100% offline-first Progressive Web App (PWA) designed for primary school teachers in Berlin to diagnose learning needs and create legally grounded, pedagogically sound individual support plans (*Förderpläne*) in accordance with official Berlin SEN/School Education guidelines (*Sonderpädagogische Förderung in Berlin* / *Senatsverwaltung für Bildung, Jugend und Familie*).

### Fundamental Architectural Tenets
1. **100% Local / Zero Server Dependency:** All data storage (IndexedDB), NLP matching, PDF/print rendering, and optional on-device AI generation must run entirely in the user's browser. No student data, notes, or assessments ever leave the client.
2. **Dual-Engine Pedagogical Matching:**
   * **Local Deterministic Rules Engine (Instant & Offline):** Keyword, competency, and domain matching against structured official guidelines (`src/data/richtlinien.json`). Functions instantly without any AI/LLM download.
   * **Optional In-Browser Neural Engine (WebLLM via Web Workers):** WebGPU-accelerated local SLM (e.g. `SmolLM2-360M-Instruct-q4f16_1-MLC` or `Qwen2.5-0.5B-Instruct-q4f16_1-MLC`) with WebAssembly/CPU fallback running inside a dedicated Web Worker (`src/workers/llm.worker.ts`). Strict opt-in modal with explicit download sizing, memory checks, and full progress reporting.
3. **PWA Compliance:** Service Worker via `vite-plugin-pwa` with precached assets, runtime caching, offline indicators, update toasts, and installation triggers.
4. **Self-Hosting Portability:** Capable of being deployed on any static web host, Apache, Nginx, or subfolder without backend or Node.js runtime. Built-in versioned `.tar.gz` export utilities.

---

## 2. Core Functional Requirements & Workflow

The application guides the teacher through a streamlined, multi-step process with persistent auto-saving:

```
[1. Schüler-Stammdaten] ➔ [2. Diagnostische Checkliste] ➔ [3. Pädagogische Empfehlungen / KI] ➔ [4. Förderplan-Editor] ➔ [5. Drucken & PDF-Export]
```

### Step 1: Student Profile (`StudentProfileStep.tsx`)
* Fields: First name, last name, date of birth, class/grade (1–6), school year, current support status (Lern- und Entwicklungsbericht, Feststellungsverfahren, Nachteilsausgleich, Förderschwerpunkte: *Lernen*, *Sprache*, *Emotionale und soziale Entwicklung*, etc.).
* Date of diagnosis and target review date (e.g. 6-month interval).
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
* **Optional On-Device Assistant (`webLlmManager.ts` & `llm.worker.ts`):**
  * Teacher can request customized formulation proposals, differentiation strategies, or parent-communication talking points.
  * WebGPU hardware capability detection with automatic worker isolation.
  * System prompt enforces German educational jargon (SMART criteria, positive formulation, Berlin curriculum orientation).

### Step 4: Comprehensive Plan Editor (`PlanEditorStep.tsx`)
* Structured editor dividing the plan into actionable pedagogical components:
  1. **Ist-Stand / Ausgangslage & Ressourcen:** Strengths-based foundation.
  2. **Konkrete Förderziele (SMART):** Short-term (4–8 weeks) and medium-term (half-year) measurable goals.
  3. **Maßnahmen, Methoden & Differenzierung:** Concrete teaching adaptations, specialized materials, seating adjustments.
  4. **Verantwortlichkeiten & Einbindung:** Class teacher, special educator (*Sonderpädagoge/in*), educator (*Erzieher/in*), parents, external therapists.
  5. **Nachteilsausgleich (falls zutreffend):** Time extensions, modified task formats, assistive tools.
  6. **Vereinbarungen zur Evaluation:** Review dates and criteria for success.
* One-click adoption of recommendations into the active editor fields.

### Step 5: Print & PDF Export (`PrintPreviewStep.tsx`)
* Standardized, official DIN-A4 layout conforming to administrative school documentation standards.
* Print CSS stylesheet (`@media print`) ensuring zero UI clutter, proper page breaks, signature fields for class teacher, special education teacher, school leadership, and parents/guardians.
* Single-click browser print dialog triggering high-resolution vector PDF export.

---

## 3. Storage, State Management & Plan Management

* **IndexedDB Store (`planStorage.ts`):**
  * Auto-save on every change with debounce.
  * Multi-plan manager (`PlanManagerModal.tsx`): create, duplicate, switch between students, archive, and delete plans.
  * Complete JSON Backup & Restore: Import and export entire student databases in encrypted or plain JSON format for inter-device transfer without cloud sync.

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
  * Shows app version (`v1.2.1-offline`) and official guidelines edition.
  * Interactive PWA update check.
  * Direct one-click download buttons for:
    * `foerderplaner-v1.2.1-web-dist.tar.gz` (Pre-compiled production bundle ready for static hosting).
    * `foerderplaner-v1.2.1-source-code.tar.gz` (Complete project source tree).
  * Uses forced client-side `Blob` download to prevent inline browser text rendering.

---

## 6. Tech Stack & Dependencies

* **Framework:** React 19, TypeScript
* **Build Tool:** Vite 6 with `@tailwindcss/vite`
* **Styling:** Tailwind CSS 4 (`@import "tailwindcss";` in `src/index.css`)
* **Icons:** `lucide-react`
* **Offline PWA:** `vite-plugin-pwa`, `workbox-window`
* **On-Device AI Engine:** `@mlc-ai/web-llm`

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
