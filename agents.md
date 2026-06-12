# Ceylon Pets POS Suite: Core Architecture Directives

## Pillar I: Financial Engineering & Accounting Audit Compliance

### 1. Unified Mathematical Source of Truth
* **Single Variable Binding:** Display components, checkout triggers, and calculators must bind strictly to the exact same top-level variable array (e.g., final rounded `sales_total`). Duplicate or separate calculations are strictly banned to prevent mathematical variances across modules.
* **Core POS Formulas:** Enforce strict accounting expressions across all views and ledger mutations:
  * `Profit = sales_total (Selling Price) - cogs (Cost of Goods Sold)`
  * `Final Invoice = (Subtotal - Item Discounts) + State Vet Tax`
  * `Total Asset Valuation = Current Stock Quantity * Unit Cost (Not Unit Price)`
* **Floating-Point Defense:** Eradicate JavaScript floating-point errors by executing all ledger computations in raw cents internally before rendering them to the view layout.

### 2. Tender Channel Reconciliation & Revenue Verification
* **Shift Isolation Rule:** Gross Sales, COGS, Net Profit, and analytical charts must lock dynamically to the active running open shift ID. Upon Z-Report closure, all dashboard display matrices must immediately fall back to a zero template state (`Rs. 0.00`) to guarantee isolated cashier counts.
* **Realized Revenue Filtering:** All shift totals and executive metrics must strictly isolate invoice entries where `payment_status = 'paid'`. 'Unpaid', 'pending', or 'void' invoices must be completely ignored.
* **Tender & Localization:** Group transactions dynamically by payment channels (`cash`, `card`, `bank_transfer`). Format all parameters strictly in Sri Lankan Rupees, localized explicitly to two decimal spaces (e.g., `Rs. 450.50`).
* **Temporal Standards:** Store all historical logs, invoices, or scheduler mutations using the PostgreSQL `TIMESTAMPTZ` structure. Parse user-facing timestamps into a unified 24-Hour clock format (`HH:mm:ss` or `HH:mm`) and render raw dates in ISO `YYYY-MM-DD` standard format.

---

## Pillar II: Advanced Database Operations & Schema Protection

### 3. Non-Destructive Schema Evolution & Constraints
* **Progressive Mutations Only:** Structural changes to Supabase table definitions must execute exclusively via progressive `ALTER TABLE` operations. `DROP TABLE` or row truncations are completely prohibited in production.
* **Legacy Payload Security:** When hoisting columns out of JSON structures (e.g., `sales_total`), implement safe updates (`UPDATE tables SET new_col = data->>'old_col'`) to protect historical records.
* **Data-Type Constraints:** The platform core utilizes auto-incrementing `INTEGER` keys for primary tenant mapping profiles (`system_config.id`). All cross-module relational keys (`clinic_id`) must be computed and validated strictly as numeric integers, never as string-based UUIDs.

### 4. Schema Drift Reconciliation & Fuzzy Intent Translation
* **Introspective Alignment:** When modifications are executed manually via the visual Supabase Table Editor UI, forcefully re-align interface models in `types.ts`, data fetch routines in `src/lib/db.ts`, and component views to match updated attributes down to the exact character.
* **Fuzzy Intent Resolution:** Map structural commands with alternate nomenclature (e.g., 'stock' to `inventory`, 'ledger/billing' to `invoices`, 'register till' to `pos_shifts`) automatically to physical database targets without duplicating entities. Invoke a schema cache notification (`NOTIFY pgrst, 'reload schema';`) immediately on manual changes.

### 5. Transactional Serialization & Directory Mirroring
* **Full-State Aggregation:** Compile core collection structures (`inventory`, `appointments`, `records`, `invoices`, `pos_shifts`, `alerts`, `notifications`) into a single unified JSON backup document with synchronized timestamp validation.
* **Dependency-Aware Reconstitution:** Restoration routines must execute sequentially based on structural hierarchy dependencies (e.g., establishing `pos_shifts` before injecting historical `invoices`) to prevent foreign-key reference crashes.
* **Zero Drive Pollution:** Run continuous background backups on the hour using the native HTML5 File System Access API (`window.showDirectoryPicker()`). Stream-write directly into `ceylon_pets_vault_mirror.json`, completely overwriting the instance without showing recurring user download prompts.

---

## Pillar III: Cross-Module Automation & Global State Orchestration

### 6. The Golden Thread Integration Protocol
* **Cross-Module Cascades:** Maintain an unbroken operational line across application spaces: bind an active calendar appointment to its specific EHR medical chart entry, which subsequently bridges its unique reference key down to the POS checkout invoice package.
* **State Automation Trigger:** The exact millisecond an invoice is finalized as 'paid' at the POS register, a background database transaction must automatically advance the upstream calendar appointment status from `in-progress` or `booked` to `completed`. Dangling statuses are strictly forbidden.

### 7. Active Admission Gatekeeping & Combobox Architectures
* **Admission Gatekeeping:** The default state of the primary POS customer-linking selector must filter views to exclusively present patient records with a current clinic check-in status of `in-progress`.
* **Multi-Parameter Profile Recall:** Replace native select boxes with customized text combobox panels. Expand queries to check both active check-ins and the full historical `records` archive, matching text across both pet name strings and client owner phone numbers to eliminate duplicate accounts.

### 8. Structured Clinical Payload Minimization & Legal Attestations
* **Payload Compaction:** Aggregate dense triage metrics, checkbox arrays, and exam text blocks into type-safe nested JSON payloads mapped directly to flexible `jsonb` columns to preserve long-term storage scalability. Avoid polluting primary schemas with individual symptom columns.
* **Clutter Elimination & Macros:** Utilize expandable accordion containers, sliding layout panels, and tabbed steps to keep interfaces scannable. Implement high-velocity "All Normal" initialization macro buttons to automatically backfill baseline vitals findings.
* **Immutable Legal Attestations:** Legal signatures and authorizations must never be stored as simple, mutable boolean flags; once committed, lock the associated record block into an immutable state. 
* **Cryptographic Metadata & Tamper Evidence:** Capture and bind a compound metadata payload to the transaction insert: active text version consented to, exact system timestamp, and unique user session ID. Render records as static, read-only historical badges, structurally blocking any option to edit, delete, or overwrite entries.

---

## Pillar IV: Next-Gen UI/UX Layout Rules & Form Mechanics

### 9. Absolute Viewport Constraints & Scroll Isolation
* **Zero Browser Stretching:** Modals, slide-out panels, and popup layouts must never extend past the browser window boundary or generate a window-level document scrollbar.
* **Fixed Card Framework:** Deploy system overlay wrappers with fixed center alignment coordinates (`fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4`). The inner card framework must be bounded by explicit maximum vertical heights: `flex flex-col max-h-[calc(100vh-40px)] w-full max-w-xl overflow-hidden`.
* **Frozen Header/Footer Architecture:** Modal title blocks and bottom form actions rows must remain structurally locked in position using the `shrink-0` layout property. Only the internal form body containing input fields is permitted to scroll via isolated container directives (`flex-1 overflow-y-auto p-6 custom-scrollbar`).

### 10. Fluid Navigation & Contextual Pre-Population
* **Instant Grid Capture:** Scheduling creation modals must never initialize with blank date or time inputs; the grid component must capture the exact system cell context clicked and automatically populate `visitDate` and `hourSlot` values.
* **Keyboard Form Navigation:** Wrap data entry inputs inside semantic HTML `<form>` tags so pressing the `Enter` key inside any text block natively executes the submission sequence without requiring mouse interaction.
* **Sticky Layout Controllers:** Keep global action triggers pinned or anchored to the top toolbar of the viewport container to eliminate scrolling dependencies.

---

## Pillar V: Autonomous Telemetry, Debloating, & QA Safeguards

### 11. Immutable Fail-Safe & Anti-Regression Protocols
* **The Micro-Incremental Compilation Law:** The engineering core is completely **BANNED** from refactoring or writing multiple UI presentation files within a single execution cycle. You must execute features using a single-file development loop: update that single component, programmatically run a local compilation check (`npm run build` or lint verification), and confirm zero warnings exist before requesting permission to open a separate file.
* **Async Context Safeguards & Rendering Gates:** All custom context hooks and state providers (e.g., `ClinicConfigProvider`) must explicitly utilize hardcoded fallback primitives (e.g., `currentClinicId: 1`, `clinicName: "CeylonPets Platform"`, `currencySymbol: "Rs."`) during asynchronous initialization phases. No downstream sub-component may evaluate properties dynamically without explicit conditional loading gates to eliminate application boot runtime crashes.

### 12. Surgical Codebase Debloating & Telemetry
* **Dead-Code Elimination:** Scan directories regularly to safely strip out unused imports, abandoned styling classes, obsolete local state trackers, and historical mockup fallbacks.
* **Core Engine Defense:** You are structurally blocked from modifying or optimizing away backend concurrency locks, stock CAS check loops, verified paid revenue calculations, or active cross-module state cascades. Verify reference tracks across `types.ts` and API wrappers before executing removals.
* **Telemetry Console Output:** Ensure that active recovery operations, data restorations, local folder writes, or admin challenges mirror output lines directly to the live system log terminal module in real-time with verified system timestamps.

### 13. Pre-Flight QA & Server-Side Data Tiering
* **Simulated Transaction Lifecycle:** Before declaring a task complete, trace data transformations sequentially through your code scope—from the raw frontend React event hooks down to the Supabase database rows mutation outputs. Verify parent overlays terminate explicitly upon success, component price labels reference a single source variable, and analytical assets are cleanly isolated by shift parameters.
* **Server-Side Payload Reduction:** Main live application planners and operational views must never load monolithic historical arrays from the cloud database. Always enforce server-side status filters (`.in()`, `.eq()`) to restrict data transfers to active, open records only.
* **Lazy-Loaded Archive Isolation:** Move completed, finalized, or cancelled ledger logs to independent sub-views or paginated list tables running on decoupled, paginated fetch sequences (`limit`, `range`) that execute exclusively on explicit user initialization.