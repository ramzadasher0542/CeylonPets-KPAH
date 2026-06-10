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