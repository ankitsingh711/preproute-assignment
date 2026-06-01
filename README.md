# Preproute Test Management System

A premium, highly interactive Test Management Application built with React, TypeScript, and Vite. Designed to manage the full test lifecycle—from user authentication and dynamic test creation/configurations to chunked question composition, real-time validation, and automated scheduling workflows.

---

## 🚀 Live Demo & Deployment Information

* **Deployment Platform:** Vercel
* **Features Configured:** Client-side SPA routing rewrites, relative `/api` CORS proxying.
* **Security & Auth Access:** Authenticated endpoints are proxied securely, and local developer environments use the Railway staging API.

---

## 🎨 Visual Identity & Premium UX Design

* **Brand Customization (`PreprouteLogo.tsx`):** Handcrafted vector SVG featuring a graduation mortarboard cap sitting on the letter 'P' with a black dashed curved loop path to mimic the official branding.
* **Typography:** Integrated `'Inter'` Google Font family (`index.css` & `index.html`) globally across all elements (buttons, inputs, tables, modals) for uniform visual weight.
* **Layout Design (`Layout.tsx`):** 
  * Responsive sidebar supporting full (240px) vs narrow collapsed (72px) widths based on route context.
  * Adaptive hamburger menu for mobile devices triggering a slide-in navigation panel overlay.
  * Constrained 100vh panel scroll containers preventing parent-body page bounces.

---

## 📱 Page Flow & Core Features

### 1. Secure Authentication Login (Page 1)
* Split-screen layout (creative brand illustration on the left, login form on the right) collapsing into a single-column layout on smaller screens.
* Form validation powered by **Zod** and **React Hook Form**.
* Custom password reset modal overlay substituting native browser alerts.
* Secure JWT storage in `localStorage` with automated in-memory session cleanup.

### 2. Test Catalog & Metrics Dashboard (Page 2)
* Live overview metrics cards (Total Tests, Drafts, Scheduled, Active).
* Filterable, searchable data-table list for tests.
* **Resettable Pagination Controls:**
  * Displays 10 rows per page.
  * Auto-resets current page back to `1` when filters or search terms change.
  * Formatted list displaying first and last two pages with ellipses (e.g., `1, 2, ..., 9, 10`) when the sheet exceeds 4 pages.
  * Text-based "Go to Page" jump input with boundary validation checks.
* **Quick Edit Overlay Modal:** Triggered on-demand. Allows users to change a test's configuration (subject, marking scheme, etc.) without leaving the dashboard page.

### 3. Dynamic Test Configurator & Creation (Page 3)
* **Save as Draft & Save & Next Actions:** Provides a dedicated "Save as Draft" flow saving the configuration in `"draft"` status, and a "Next: Add Questions" routing pipeline.
* **Custom Dropdown Elements:** Replaced native selects with a custom, searchable single-select component (`SingleSelectDropdown`) for subject mapping, and a custom multi-select checkbox drop-panel for topics and subtopics.
* **Form Validation State Hooks:** Uses react-hook-form Controller wrappers configured to fire synchronous `onChange` checks to clear error states immediately after select checkboxes are checked.
* **Aligned Stepper & Inputs Grid:** Isolated the "Marking Scheme" subheader and formatted Correct (+), Incorrect (-), and Unattempted (0) steppers alongside question counters with standard `white-space: nowrap` baselines, preventing text wrapping.

### 4. Splitted Question Composer (Page 4)
* **Status Checklist Panel (Left):** Tracks completion progress (`✔ Question X` vs `● Question X`).
* **Rich Text Composer Panel (Right):** Offers rich formatting (Bold, Italic, Underline, Bullet/Numbered lists).
* **Option Choice Matrix:** Inputs for options, correct answer selectors, and dynamic cascading topics/subtopics dropdowns.
* **Safeguard Validation:** Enforces a **minimum of 1 question** rule. Tapping "Save & Continue" triggers an error alert if no questions have been populated, preventing empty submissions.

### 5. Preview & Publish Scheduler (Page 5)
* Success notification banner indicating configuration completion.
* **Deployment Schedulers:** Tab-controlled selector toggle for "Publish Now" vs "Schedule Publish".
* **Visual Inputs:** Two-column grid selector for setting live bounds ("Keep Live Indefinitely" vs "Live Until") with custom date and time selector elements.

---

## ⚡ API and Performance Optimizations

### 1. Client-Side In-Memory Caching
To minimize backend load and optimize application routing speeds, a custom client-side cache is integrated in [services.ts](file:///Users/ankitsingh/preproute-assignment/src/api/services.ts):
* **Indefinite Static Lookups:** Caches results from `/subjects`, `/topics/subject/:id`, and `/sub-topics/multi-topics` queries.
* **Sorted Array Key Generation:** Generates cache lookup strings for subtopics by sorting selections alphabetically (`[...ids].sort().join(',')`). This prevents duplicate fetches when items are checked in different visual sequences.
* **Lazily Loaded Questions Chunking:** Refactored `getByIds` in `questionService`. It isolates uncached question IDs, makes a single bulk POST payload to `/questions/fetchBulk`, merges newly retrieved questions into memory, and outputs the requested array order.
* **Write-Through cache syncs:** Additions (`createBulk`), updates (`update`), and deletions (`delete`) automatically write back changes or prune indexes inside the memory cache.
* **Session Purges:** Authenticated logout automatically invokes the `clearCache()` utility inside `AuthContext.tsx` to wipe all reference sets, preventing data leakage between user sessions.

### 2. CORS Bypass & Router Rewrite Policies
For zero-setup, reliable cloud deployments, [vercel.json](file:///Users/ankitsingh/preproute-assignment/vercel.json) defines:
* **Single Page Application Fallbacks:** Route rewriting to redirect all routing patterns back to `/index.html` to prevent `404` errors when reloading dynamic paths.
* **Proxy Middleware:** Redirects browser requests from `/api/:path*` directly to the back-end staging server, resolving cross-origin (CORS) resource failures.

---

## 🛠️ Tech Stack & Dependencies

* **Library Core:** React 18, TypeScript, Vite
* **Routing:** React Router DOM (v7)
* **Form Logic & Validation:** React Hook Form, Zod Resolver, Zod schema libraries
* **Network Queries:** Axios
* **Vector Graphics & UI Elements:** Lucide React icons, Tailwind CSS / Vanilla CSS Modules
* **Toasts & Feedback:** React Hot Toast

---

## 📁 Repository Structure

```text
├── vercel.json                 # Vercel deployment rewriting & API proxies
├── vite.config.ts              # Bundler specifications
├── tsconfig.json               # TypeScript compiler rules
├── src
│   ├── App.tsx                 # Core Router mapping
│   ├── main.tsx                # App bootstrap entrypoint
│   ├── index.css               # Design tokens, custom scrolls, variables
│   ├── types                   # Global API payloads & schema types
│   ├── contexts
│   │   └── AuthContext.tsx     # Session state & Cache Purges
│   ├── api
│   │   ├── axios.ts            # Dynamic URLs, Error Interceptors
│   │   └── services.ts         # In-memory caching services
│   ├── components
│   │   ├── Layout.tsx          # Drawer and full-height sidebar wrapper
│   │   ├── ProtectedRoute.tsx  # Auth guards
│   │   ├── LoadingSpinner.tsx  # Spinner animation
│   │   └── PreprouteLogo.tsx   # Custom SVG cap branding
│   └── pages
│       ├── Login.tsx           # Page 1 Login split
│       ├── Dashboard.tsx       # Page 2 Metric list & overlay Edit Modal
│       ├── CreateEditTest.tsx  # Page 3 Multi-select custom dropdown config
│       ├── AddQuestions.tsx    # Page 4 Left progress tracker & option matrix
│       └── PreviewPublish.tsx  # Page 5 Publish settings & scheduler tabs
```

---

## 💻 Local Setup and Run Guide

### 1. Prerequisites
Ensure you have **Node.js** (v18+) and **npm** installed.

### 2. Installation
Clone this repository and install all dependencies:
```bash
npm install
```

### 3. Local Development Mode
Start the Vite dev server locally:
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000` (or the local port provided in the terminal output).

### 4. Build & Production Check
Verify compilation correctness and bundle assets for production deployment:
```bash
npm run build
```
This runs TypeScript checking and outputs optimized static bundles into the `dist/` directory.
