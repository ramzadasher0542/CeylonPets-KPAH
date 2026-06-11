# Ceylon Pets Hospital AI Brain & System Playbook

This document defines the definitive operational boundaries, engineering specifications, data processing standards, and architectural synchronization workflows for the CeylonPets POS Suite. All code generation, structural schema changes, and interface views must strictly comply with these directives.

---

## Pillar I: Financial Engineering & Accounting Audit Compliance

### 1. Unified Mathematical Source of Truth
- **Single Variable Binding**: Interactive display components, checkout submission buttons, and calculator readouts must bind strictly to the exact same top-level variable array (e.g., final rounded `sales_total` inclusive of discounts and taxes). Duplicate or separate calculations are strictly banned to prevent visual and mathematical text variances across modules.
- **Core POS Formulas**: Enforce strict accounting expressions across all financial views and ledger mutations:
  - **Gross Profit**: `Profit = sales_total (Selling Price) - cogs (Cost of Goods Sold)`.
  - **Net Total**: `Final Invoice = (Subtotal - Item Discounts) + State Vet Tax`.
  - **Inventory Assets**: `Total Asset Valuation = Current Stock Quantity * Unit Cost (Not Unit Price)`.
- **Floating-Point Defense**: Eradicate JavaScript floating-point errors by executing all ledger computations in raw cents internally before rendering them to the view layout.

### 2. Tender Channel Reconciliation & Revenue Verification
- **Shift Isolation Rule**: Gross Sales, COGS, Net Profit, and analytical chart objects must lock dynamically to the active running open shift ID. The absolute millisecond a shift is closed via a Z-Report, all display matrices on the dashboard must immediately fall back to a zero template state (`Rs. 0.00`) to guarantee isolated cashier counts.
- **Realized Revenue Filtering**: All shift totals and executive metrics must strictly isolate invoice entries where `payment_status = 'paid'`. 'Unpaid', 'pending', or 'void' invoices must be completely ignored to prevent artificial cash padding.
- **Tender Segmentation**: Group and report transactions dynamically inside the Tender Reconciliation block by payment channels (`cash`, `card`, `bank_transfer`) with high-scannability layouts for vault audits.
- **Localization**: Format all patient-facing and backend financial parameters strictly in Sri Lankan Rupees, localized explicitly to two decimal spaces (e.g., `LKR 1,500.00` or `Rs. 450.50`).

---

## Pillar II: Advanced Database Operations & Schema Protection

### 3. Non-Destructive Schema Evolution
- **Progressive Mutations Only**: Structural changes to the Supabase database configuration or table definitions must execute exclusively via progressive `ALTER TABLE` operations. Commands like `DROP TABLE` or row truncations are completely prohibited in production environments.
- **Legacy Payload Security**: When hoisting columns out of JSON structures to represent primary table fields (e.g., `sales_total`), always implement safe updates (`UPDATE tables SET new_col = data->>'old_col'`) to protect historical records from null corruption.

### 4. Manual Schema Drift Reconciliation & Fuzzy Intent Translation
- **Introspective Alignment**: When structural modifications are executed manually via the visual Supabase Table Editor UI, you must execute an immediate client-side configuration pass. Forcefully re-align interface models in `types.ts`, data fetch routines in `src/lib/db.ts`, and component views to match the updated casing and attributes down to the exact character.
- **Fuzzy Intent Resolution**: Never interpret system commands with literal rigidity. If an action refers to tables or columns via alternate nomenclature or synonyms (e.g., 'stock table' for `inventory`, 'ledger/billing' for `invoices`, or 'register till' for `pos_shifts`), automatically map the intent to the corresponding physical database target without duplicating entities.
- **Cache Invalidation**: Whenever manual modifications occur, invoke a SQL schema cache notification (`NOTIFY pgrst, 'reload schema';`) to ensure immediate gateway exposure.

### 5. Transactional Serialization & Directory Mirroring
- **Full-State Aggregation**: Compile all core collection structures (`inventory`, `appointments`, `records`, `invoices`, `pos_shifts`, `alerts`, `notifications`) into a single unified JSON backup document with synchronized timestamp validation meta-blocks.
- **Dependency-Aware Reconstitution**: Restoration routines must execute sequentially based on structural hierarchy dependencies (e.g., establishing `pos_shifts` records before injecting historical `invoices`) to prevent foreign-key reference crashes.
- **Zero Drive Pollution**: Automated backups must run continuously on the hour using the native HTML5 File System Access API (`window.showDirectoryPicker()`). The background backup loop must track the local system clock and stream-write directly into a static snapshot file (`ceylon_pets_vault_mirror.json`), completely overwriting the instance without showing recurring user download prompts.

---

## Pillar III: Cross-Module Automation & Global State Orchestration

### 6. The Golden Thread Integration Protocol
- **Cross-Module Cascades**: Maintain an unbroken operational line across separate application spaces. An active calendar appointment instance must firmly bind to its specific EHR medical chart entry, which must subsequently bridge its unique reference key down to the POS checkout invoice package.
- **State Automation Trigger**: The exact millisecond an invoice is successfully finalized as 'paid' at the POS checkout register, a background database transaction must automatically advance the upstream calendar appointment status from `in-progress` or `booked` to `completed`. Trailing active flags or dangling statuses on the scheduling board are strictly forbidden.

### 7. Active Admission Gatekeeping & Combobox Architectures
- **Admission Gatekeeping**: To eliminate administrative errors, the default state of the primary POS customer-linking selector must function as a strict gatekeeper. It must filter views to exclusively present patient records with a current clinic check-in status of `in-progress`.
- **Multi-Parameter Profile Recall**: Replace native static select boxes with customized text combobox panels. When a user actively types characters into the input box, expand the search query to check both active check-ins and the full historical `records` archive, matching text across both pet name strings and client owner phone numbers to prevent duplicate accounts.

---

## Pillar IV: Next-Gen UI/UX Layout Rules & Form Mechanics

### 8. Absolute Viewport Constraints & Scroll Isolation
- **Zero Browser Stretching**: Modals, slide-out panels, and popup layouts must never extend past the browser window boundary or generate a window-level document scrollbar.
- **Fixed Card Framework**: Every system overlay wrapper must deploy fixed center alignment coordinates (`fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4`). The inner card framework must be bounded by explicit maximum vertical heights (`flex flex-col max-h-[calc(100vh-40px)] w-full max-w-xl overflow-hidden`).
- **Frozen Header/Footer Architecture**: Modal title blocks and bottom form actions rows (e.g., 'Close', 'Create Slot') must remain structurally locked in position using the `shrink-0` layout property. Only the internal form body containing the input fields is permitted to scroll via isolated container directives (`flex-1 overflow-y-auto p-6 custom-scrollbar`).

### 9. Fluid Navigation & Contextual Pre-Population
- **Instant Grid Capture**: Scheduling creation modals must never initialize with blank date or time inputs. The grid component must capture the exact system cell context clicked by the user and automatically populate the `visitDate` and `hourSlot` values using real-time local system dates.
- **Keyboard Form Navigation**: All modal data entry forms must enforce native keyboard access. Wrap inputs inside semantic HTML `<form>` tags so pressing the `Enter` key inside any text block natively executes the submission sequence without forcing the cashier to touch the mouse.
- **Sticky Layout Controllers**: Keep global action triggers pinned or anchored to the top toolbar of the viewport container to eliminate scrolling dependencies.

---

## Pillar V: Autonomous Telemetry, Debloating, & QA Safeguards

### 10. Surgical Codebase Debloating
- **Dead-Code Elimination**: Scan directories regularly to safely strip out unused imports, abandoned styling classes, obsolete local state trackers, and historical mockup fallbacks left over from development sprints.
- **Core Engine Defense**: You are structurally blocked from modifying or optimizing away backend concurrency locks, stock CAS check loops, verified paid revenue calculations, or active cross-module state cascades. Verify all reference tracks across `types.ts` and API wrappers before running code removals.

### 11. Autonomous Pre-Flight QA & Regression Safeguards
- **Simulated Transaction Lifecycle**: Before declaring a task complete, you must trace data transformations sequentially through your code scope—from the raw frontend React event hooks down to the Supabase database rows mutation outputs.
- **Mandatory Self-Audit Criteria**: Verify that parent overlays terminate explicitly upon data success, component price labels reference a single source variable, and analytical assets are cleanly isolated by shift parameters. If a code change creates an accidental logic variance, instantly halt, revert the regression, and execute a fix.
- **Telemetry Console Output**: Ensure that active recovery operations, data restorations, local folder writes, or admin challenges mirror output lines directly to the live system log terminal module in real-time with verified system timestamps.

### 12. Server-Side Data Tiering & Paginated Archive Partitioning
- **Server-Side Payload Reduction**: Main live application planners and operational views must never load monolithic historical arrays from the cloud database. Always enforce server-side status filters (`.in()`, `.eq()`) to restrict data transfers to active, open records only.
- **Lazy-Loaded Archive Isolation**: Move completed, finalized, or cancelled ledger logs to independent sub-views or paginated list tables. These logs must run on decoupled, paginated fetch sequences (`limit`, `range`) that execute exclusively on explicit user initialization to preserve client-side browser rendering velocity.