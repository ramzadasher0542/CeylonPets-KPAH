# CeylonPets POS: Core Directives (Ultra-Compressed)

## 1. Stack & Storage
* **Stack:** React, TS (Strict), Vite, Tailwind, SWR.
* **Storage:** 10/10 Hardened Local-First. HTML5 LocalStorage JSON (e.g., `ceylon_shifts_v2`).

## 2. AI Workflow (Gemini = Architect, Antigravity = Coder)
* **Execution:** STRICT micro-incremental. Modify ONE file per cycle. Run local checks (`npm run build`) before moving on.
* **Prompting:** Anchor to exact code IDs (hooks/interfaces), NEVER generic UI text.

## 3. Financial & State Logic
* **Math:** 100% Integer Cents. NO floating-point math.
* **Truth:** Bind displays/checkouts to the exact same top-level variable array.
* **Shifts:** Isolate totals dynamically to active shift ID. Reset on Z-Report.

## 4. DB & Schema (Supabase-Ready)
* **Flat Data:** Relational only. NO ghost arrays. Use status filters (`.in()`, `.eq()`).
* **IDs:** Use `crypto.randomUUID()` strictly to prevent sync collisions.
* **Metadata:** All objects MUST have `created_at`, `updated_at`, `is_deleted`.

## 5. UI/UX Physics
* **Overlays:** Fixed, centered (`fixed inset-0 z-50 bg-slate-900/60`).
* **Bounds:** Strict inner card max-heights. Zero browser scrollbars.
* **Navigation:** `<form>` for native `Enter`. Window-level `Esc` listeners to clear panels safely.