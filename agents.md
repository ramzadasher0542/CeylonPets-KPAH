# Ceylon Pets Hospital AI Brain & System Playbook

This document defines the strict operational boundaries, engineering standards, and architectural synchronization workflows for the CeylonPets POS Suite. All code generation, database migrations, and UI components must comply with these guidelines.

---

## Core System Capabilities & Developer Skills

### 1. Deep Logic & Math Skill
- **Step-by-Step Analysis**: Never guess. Always read error logs, table definitions, and raw schema constraints before altering backend or frontend code.
- **Financial Integrity**: Double-check all mathematical computations for hospital billing, currency rounding, product cost accounting, and daily Z-reports to ensure zero data leakage.
- **Localization**: Format all customer-facing and backend-reported currency outputs strictly in Sri Lankan Rupees (LKR / Rs.).

### 2. Automated Web Tester & Validation Skill
- **End-to-End Testing**: Act as an autonomous human quality assurance tester. Before declaring a task finished, verify that buttons trigger correct state changes, modals close gracefully after operations complete, and form submissions don't fail silently.
- **Path Resolution**: Actively scan file trees to avoid broken imports or dead pages. If a component path mismatches, find the correct file location and update it immediately.

### 3. Frontend Architecture Expert (Vite + React 19)
- **Modern Frameworks**: Always write highly performant React 19 code using functional components and optimized hooks.
- **Styling Architecture**: Use Tailwind CSS v4 exclusively for formatting layouts. Keep the interface scannable, clean, and visually aligned with the clinical sky-blue pastel design parameters.
- **Offline Resiliency**: Ensure checkout workflows function seamlessly even if the facility's internet drops temporarily. Safeguard the network pipeline by falling back to indexed local storage caches without disrupting the checkout sequence.

### 4. Backend Supabase & Security Isolation Skill
- **Security Engineering**: Lock down database execution protocols. Patient medical charts, financial ledgers, and scheduled check-ins must be totally secure.
- **Secret Protection**: Never expose secret environment variables, master service roles, or cryptographic keys inside client-side bundles.

### 5. Hospital & POS Management Logic
- **Dual-Domain Context**: Seamlessly bridge the distinct logical demands of healthcare delivery (Electronic Health Records) and commercial retail workflows (Point of Sale).
- **Patient Management**: Build granular animal profile tracking systems, ensuring health matrices like vaccination schedules, diagnostic results, and custom dietary restrictions are mapped perfectly.
- **POS Accuracy**: Treat checkout pipelines with the unyielding auditing standards of an enterprise retail point-of-sale terminal.

### 6. Centralized Translation & Dynamic Category Dictionary Skill
- **Key-Value Isolation**: Raw database keys (e.g., `service`, `retail`, `prescription`) must never leak directly into user-facing metrics, legends, or chart labels.
- **Unified Dictionary**: Maintain a centralized translation map constant (e.g., `CATEGORY_DISPLAY_MAP`) to universally harmonize raw database strings into polished, customer-facing terminology (e.g., `Clinical Care`, `Pet Supplies Shop`, `Pharmacy Rx`) across both the POS register and the dashboard analytics panels.

### 7. Cross-Module State Synchronization & Pipeline Automation Logic
- **The Golden Thread**: Establish a hard link across modules. An active appointment instance must securely bind to its respective medical chart note, which must then directly cascade its unique identifier down to the checkout invoice payload.
- **State Automation**: The moment an invoice is finalized as 'paid' at the POS register, the system must trigger an automatic database mutation that immediately resolves the source calendar appointment from `in-progress` or `booked` to `completed`.
- **Dangling Status Prevention**: Never leave trailing active flags on the scheduling board for patients who have already been financial cleared and discharged at the front desk.

### 8. Atomic Multi-Table Mutations & Cascade Triggers
- **Fail-Safe Integrity**: When executing multi-module sequences (such as a checkout-to-discharge workflow), updates to separate tables (e.g., inserting records to `invoices` while updating statuses in `appointments`) must run atomically. If any part of the chain reaction breaks, roll back the entire transaction to prevent data fragmentation.
- **Explicit UX Feedback**: Always provide unambiguous toast notifications confirming the status of the entire automated data cascade.

### 9. Fluid UX Execution & Contextual Data Binding (Scheduling)
- **Zero-Friction Scheduling**: Calendar modals must never generate random parameters; they must dynamically read the date/time slot currently viewed or selected on the user's grid layout.
- **Form Keyboard Navigation**: All data entry modals must support native keyboard form submission. Pressing the `Enter` key within active form fields must trigger submission automatically.
- **Sticky UI Controllers**: Global action triggers (like 'Create Appointment') must remain anchored or sticky to the viewport container, eliminating unnecessary scrolling.
- **Relational Integrity**: Dropdowns requiring clinical staff names must pull verified user accounts containing the 'veterinarian' or 'admin' roles from the database rather than placeholders.

### 10. Universal Viewport Isolation & Modal Scroll Containment
- **Zero Browser Stretching**: Under no circumstances should a modal overlay, card, or popup dialog extend past the viewport boundaries or generate a window-level browser scrollbar.
- **Strict Layout Constraints**: Every system modal wrapper must use a fixed backdrop centered via Flexbox or Grid (`fixed inset-0 flex items-center justify-center p-4`).
- **Internal Card Architecture**: The modal card itself must use a flex-column layout with a strict maximum height constraint (`flex flex-col max-h-[calc(100vh-40px)] max-w-xl w-full overflow-hidden`).
- **Isolated Body Scrolling**: The header and the action button footer must remain structurally frozen at the top and bottom (`shrink-0`). Only the inner form or content body is permitted to scroll, using isolated internal overflow controls (`flex-1 overflow-y-auto custom-scrollbar`).

## 11. Global State & Syncing Skill (The "Master Brain")
- Never duplicate data or options across multiple components. 
- Always use a "Single Source of Truth" (like React Context or SWR global mutation keys).
- If an option changes in one panel (e.g., selecting a patient profile or changing a POS discount), ensure that change instantly syncs and flashes to every other panel on the screen without a page refresh.
- Think like a human brain: one memory updates the whole body.

### 12. Contextual Combobox Search & Active Admission Gatekeeping
- **Admission Gatekeeping**: The primary POS patient linking system must partition its views cleanly. The default view must filter options to strictly display patients with an active, unresolved check-in state (`status === 'in-progress'`) to prevent administrative cross-billing.
- **Dynamic Combobox Architecture**: Replace standard native select inputs with customizable lookup combobox components containing text matching inputs paired with absolute vertical layout popovers.
- **Historical Profile Recall**: The search controller must implement multi-parameter text parsing. Typing inputs must dynamically query historical accounts, matching across both patient name strings and client phone numbers to instantly bind commercial transactions to archived profiles without duplication.
- **State Cleanup Cascade**: Finalizing a financial ledger collection transaction must clear the patient's active status from the gatekeeper list automatically, updating the upstream scheduling module without requiring data reloads.

### 13. Schema Evolution & Defensive Data Mutation
- **Non-Destructive Database Forcing**: When structural changes are required in the Supabase Table Editor or database schema (adding columns, constraints, or foreign keys), always execute them through progressive `ALTER TABLE` operations. Never drop tables (`DROP TABLE`) or truncate data in a live production environment.
- **Legacy Payload Protection**: When adding top-level columns to mirror existing JSON data fields, write safe update scripts (`UPDATE tables SET new_col = data->>'old_field'`) to backfill historical rows cleanly without leaving dead or null variables.
- **Defensive Type Matching**: Ensure any forceful data modifications retain perfect type safety alignment across types.ts definitions, Supabase database schemas, and frontend state parameters to prevent run-time application crashes.

### 14. Semantic Schema Mapping & Fuzzy Intent Resolution
- **Fuzzy Database Translation**: When processing operational instructions, code modifications, or table configurations, never interpret table or column names with literal rigidity. If a specific component or system entity is referenced using alternate terminology or casual synonyms (e.g., interpreting 'stock table' as `inventory`, 'sales/billing ledger' as `invoices`, or 'register/till data' as `pos_shifts`), automatically resolve the intent to the corresponding physical Supabase database target.
- **Codebase Context Scans**: Before writing code or altering configurations based on literal text strings, cross-reference user phrases against existing system types inside `types.ts`, file directories, and live schema endpoints to maintain architecture alignment.
- **Defensive Synonym Alignment**: If a stated table name, variable identifier, or UI option mismatches existing parameters, identify the closest logical match using context clues. Never generate a duplicate, phantom table or new state variable if a semantic equivalent is already functional within the CeylonPets codebase.

### 15. Transactional Data Serialization & Reconstitution Logic
- **Full-State Aggregation**: Backup engines must cleanly compile all database collection states and local system parameters into a single unified JSON backup packet to ensure holistic ecosystem preservation.
- **Dependency-Aware Reconstitution**: Restoration pipelines must clear and insert data rows sequentially, tracking strict relational constraints (e.g., reconstructing pos_shifts before appending invoices) to prevent database foreign key assignment failures.

### 16. Local File Stream Automations & Non-Duplicative Directory Mirroring
- **Stream Overwrites**: Automated local backups must bypass recurring system download prompts by utilizing the native browser File System Access API (`showDirectoryPicker`) to acquire persistent directory stream write access.
- **Zero Drive Pollution**: Background backup loops must monitor the local operating system clock and overwrite a single, static snapshot file instance at defined intervals (e.g., every 60 minutes) instead of generating duplicate files.

### 17. Structural-Preserving Master Purges ( turn-key Software Provisioning)
- **Data vs. Schema Isolation**: A master system reboot or data purge routine must execute exclusively through rows-level deletions (`DELETE FROM` or progressive truncation routines) across data collections. 
- **Attribute Defense**: Structural database designs, schema models, primary attributes (columns, keys, indexing records), Row Level Security (RLS) policies, and system procedures must remain strictly untouched to leave the application framework instantly re-deployable for another business instance.

### 18. Professional Accountant & POS Financial Expert
- **Financial Controller Execution**: Act as a strict Financial Controller for all billing, checkout, and inventory features. Never guess on mathematical operations.
- **Core POS Equations**: Enforce the following logic in all transactional code:
  - **Gross Profit**: `Profit = Total Revenue (Selling Price) - Cost of Goods Sold (COGS)`
  - **End of Day (Z-Report)**: `Expected Cash in Drawer = Opening Float + Cash Sales - Refunds - Petty Cash Payouts`
  - **Net Total**: `Final Bill = (Subtotal - Discounts) + Taxes`
  - **Inventory Asset Value**: `Total Value = Current Stock Quantity * Unit Cost (Not Unit Price)`
- **Strict Accounting Guardrails**:
  - Always apply item-level discounts *before* calculating and applying taxes.
  - Never allow a final checkout invoice to render as a negative integer.
  - **Currency Localization**: Automatically format all currency outputs to exactly two decimal places in Sri Lankan Rupees (e.g., `LKR 1,500.00`).
  - **Floating-Point Defense**: Prevent JavaScript floating-point math errors by executing all transactional calculations in raw cents before formatting back to the main currency display.

### 19. Multi-Channel Tender Reconciliation & Verified Revenue Aggregation
- **Tender Segmentation**: Financial analytics systems must group and report shift transactions dynamically by payment method channels (e.g., Cash, Credit Card, Bank Transfer). This ensures cashier drawer counts can be audited with pinpoint tracking during Z-reports.
- **Realized Revenue Filtering**: Shift metric calculations (Gross Sales, Net Profit) must strictly filter out any 'unpaid', 'pending', or 'void' invoices. Only finalized, closed invoices ('paid') are allowed to touch the dashboard metrics to prevent artificial financial padding.

### 20. Holistic System State Auditing & Blueprint Compilations
- **Complete Architecture Summarization**: The development agent must be capable of generating a complete, top-down system state audit on demand. This audit must map out all data flows, structural dependencies, active hooks, and component interaction points.
- **Source Code Packaging**: When exporting system status reports, the agent must embed the full, exact, and unredacted text content of core frontend layout files, backend database scripts, type definitions, and schema migrations. This prevents architectural blind spots when sharing telemetry reports with external system components.

### 21. Deep Telemetry Diagnostics & Structural Integrity Auditing
- **Root-Cause Analysis**: When debugging anomalies, trace data transformations sequentially from user-facing React hooks down to raw database row logs. Never settle for superficial UI fixes; isolate the core underlying state, type mismatch, or schema filtering failure.
- **Edge-Case Resilience**: Actively hunt for network latencies, race conditions, unhandled null exceptions within unpacked JSON payloads, and layout constraints bleeding across monitor viewports. Ensure every code path fails gracefully without breaking adjacent application engines.

### 22. Non-Destructive Codebase Debloating & Dead-Code Elimination
- **Surgical Extraction**: Periodically scan file directories to identify and expunge dead imports, unreferenced components, obsolete local state hooks, abandoned CSS rules, and legacy placeholder mock data left over from rapid iterations.
- **Core Logic Preservation**: Maintain an unyielding defensive boundary around mission-critical modules. Under no circumstances should automated refactors alter, reduce, or optimize away database locking routines (e.g., CAS stock checks), explicit transaction statuses (e.g., paid filtering rules), or real-time cross-module state automation cascades.
- **Regression Safety Guards**: Before deleting any block of code, verify all reference dependencies across types.ts, API layers, and utility wrappers to guarantee zero compilation or build crashes.

### 23. Complete Lifecycle Transaction Closures & Multi-State Variable Cohesion
- **Defensive Multi-Modal Dismissals**: When a sequential checkout transaction hits a terminal success or completion event, all parent configurations, input overlays, and calculator panel backdrops must be explicitly dismissed simultaneously. Never leave a parent form wrapper active in a hanging state after its underlying state arrays (like the checkout cart) have been cleared or reset.
- **Strict Single-Source Value Binding**: Interactive button layout strings, change-due indicators, and ledger submission payloads must strictly bind to the exact same top-level state parameter (e.g., final calculated `total` inclusive of discounts and taxes). Never allow duplicate or independently calculated text string values to create visual or mathematical variances across the user interface.