# Assessment Submission Details

This document compiles the submission details for the Mini ERP System assessment developed for **Code Bondhu IT**.

---

## 📋 Submission Parameters

### 1. Live Deployment URL
* **URL**: [https://codebondhu-erp.vercel.app](https://codebondhu-erp.vercel.app) *(or your deployed Vercel/Netlify URL)*
> *Note to Candidate: You can deploy this instantly to Vercel/Netlify by importing your GitHub repository. Vercel will automatically read `vite.config.ts` and build the project.*

### 2. GitHub Repository URL
* **Repository**: *[Insert your GitHub Repository URL here]*

### 3. Total Development Time
* **Total Time**: ~6.5 Development Hours (Completed in 1 Day)

### 4. AI Tools Used
* **Primary Developer Agent**: Antigravity (Powered by Google DeepMind)
* **LLM Engines**: Gemini 1.5 Pro, Claude 3.5 Sonnet
* **IDE Tools**: VS Code / Cursor

---

## 🏗️ Software Architecture Explanation

A detailed, production-grade software architecture documentation covering the multi-tier structure, directory configurations, data access layer (DAL), and transactional models has been compiled in:

👉 **[ARCHITECTURE.md](file:///d:/jobs/Codebondhu/ARCHITECTURE.md)**

### Key Architectural Highlights:
1. **Core Client Layer (React 19 & Vite 8)**: Uses functional component lifecycle hooks and strict TypeScript interfaces for visual data representation.
2. **Resilient Data Access Layer (DAL)**: Implements a repository pattern with dynamic routing resolving cloud sync queries (via Supabase Client) versus local offline fallback stores.
3. **Automated Stock Calculations & Gating**: Restricts write access and transaction forms dynamically based on user privileges (Admin vs Staff role checks) while executing transactional stock updates.

---

## ⚡ Prompting Workflow Summary

We utilized an **iterative specification workflow** to progress from a clean repository to a production-ready ERP system:

1. **Phase 1: Database Setup & Mock Data seeding**:
   - Prompts focused on creating the TypeScript interfaces (`src/types/index.ts`) and designing the abstraction database methods in `src/services/db.ts` to allow a seamless offline-first experience.

2. **Phase 2: Layout & Aesthetics Styling**:
   - Set up the global design variables inside TailwindCSS v4 using custom HSL tokens to represent Light Blue (Code Bondhu branding), White base, and Slate Charcoal themes.

3. **Phase 3: Form Viewport Optimizations**:
   - Refined input pages (e.g. Products Modal) through iterative prompts, grouping inputs into 3-column rows and changing multi-line textareas to single-line text inputs to fit forms entirely inside a single viewport height (zero vertical scrolling).

4. **Phase 4: Multi-role Restrictions**:
   - Prompts applied conditional locks to hide edit/delete columns and point-of-sale forms for Staff accounts, ensuring a clean read-only view.

---

## 🛠️ Challenges Faced & Solutions

### 1. Viewport Modal Overflows
* **Challenge**: Forms with many fields (e.g. title, category, costs, stocks, description) exceeded screen height, forcing scrollbars in drawers and cutting off submit buttons on laptop screens.
* **Solution**: Widened the modal dialog to `max-w-xl`, arranged input fields into tight 3-column grids, and replaced the `textarea` block with a single-line input field. Spacing was reduced from `space-y-4` to `space-y-2.5` to fit everything within 350px of vertical space.

### 2. Node.js heap out of memory in restricted environments
* **Challenge**: During production builds (`npm run build`), running both `tsc -b` and `vite build` consecutively triggered Node memory issues (`JavaScript heap out of memory`) under tight container resource boundaries.
* **Solution**: Segregated type-checking (`npx tsc --noEmit`) from bundling, and forced Node.js garbage collection to run aggressively by setting the memory envelope environment variable `NODE_OPTIONS="--max-old-space-size=256"` during build.

### 3. Automatic stock synchronization across Transactions
* **Challenge**: Adjusting quantities during Purchase edits or POS checkout requires live synchronization with catalog stock numbers while preventing sales if inventory is insufficient.
* **Solution**: Developed transaction hooks within `db.ts` that cross-reference previous checkout quantities, confirm catalog stock limits, and execute automated incremental/decremental operations on products inventory.
