# FIT//OS
Landing site (root) + the FIT//OS web app (`/app`). See `GITHUB-GUIDE.md` for setup & deployment.

The whole website is editable from the app: **Admin Backend → Website Studio** (live preview, content, design, pricing, payment numbers, banner, SEO). Rules: publish `firestore.rules` once.

Coupons (influencer marketing): **Admin Backend → Coupons** — one coupon per Gmail owner, customer discount + marketer commission, applied at checkout (`checkout.html?coupon=CODE`), counted only after you VERIFY the payment, per-coupon buyer list + payouts + CSV. Publish `firestore.rules` once (see GITHUB-GUIDE §11).

Admin Backend (pro): bulk select on every list (Users, Payments, Coupons, Libraries, Content), a **Trash** section per type with Restore / Delete forever, and a **Block-only** access model — only blocked users are refused sign-in and purchase; deleted/rejected users can always return. Publish `firestore.rules` (see GITHUB-GUIDE §16).

Website: now matches the app — clean soft cards, dark/light toggle (shares `fitos_theme` with the app), left/right slide buttons instead of horizontal scroll, header **Login** (→ app, signed-in users go straight in) + **Continue** (→ checkout with a **Free** option that skips payment), all-device responsive (GITHUB-GUIDE §19).

Design: the whole app now uses a calm "Clean Soft" look — soft rounded cards, pill tabs, floating sidebar rail & mobile bottom nav, dashboard greeting + daily-goal hero (GITHUB-GUIDE §18). Presentation only; all features unchanged.

Onboarding Studio: **Admin Backend → Onboarding** — build the first-run experience yourself (flows per audience/user, steps, 10 question types, conditional logic, answer→template suggestion rules with a tester, templates library, re-run/assign per user, insights, publish & roll back). Users get a full-screen onboarding with a top stepper + progress bar and can go back and edit answers. Publish `firestore.rules` again (see GITHUB-GUIDE §17).

## Folder structure
```
/                      landing site (GitHub Pages root)
├─ index.html  about.html  contact.html  checkout.html  404.html
├─ sw.js  .nojekyll
├─ firestore.rules      publish in Firebase Console → Firestore → Rules
├─ GITHUB-GUIDE.md      setup & update guide (Bengali)
├─ assets/
│  ├─ css/site.css
│  ├─ js/   config.js  site.js  cms.js  checkout.js
│  └─ img/  og.png  shots/*.webp
└─ app/                 the FIT//OS web app (PWA)
   ├─ index.html  sw.js  manifest.webmanifest
   └─ icons/
```
Latest: Marketing Agents — auto-logging agent accounts with personalities + GitHub Actions runner (§25); all meals as cards with corner + log button, sticky image/title detail view, laptop popup (§24); image system (Admin → Images: paste links, auto-match by name, white placeholders) + new Log Food style Meal/Ingredient library with detail view, macro rings, quick add (§23); bottom-bar fix — mobile bottom bar (and the action dock) now sits edge-to-edge on the device bottom with no gap, rounded top corners, iPhone safe-area aware (§22); app-shell update #2 — profile moved to the bottom of the mobile drawer, circle streak button, pinned Back+title, pinned tab bars on every tabbed page, horizontal Settings tabs on desktop (§21); app-shell update — Back button + page title on mobile sub-pages (top bar pinned only on Home), contextual bottom bar / action dock (Log meal on Library, red Start·Pause on Timer), desktop Back + breadcrumb with expandable sidebar, theme-aware rail & bottom bar (§20); website Clean Soft redesign — dark/light toggle, Login + Continue header, button carousels, "Continue free" checkout (§19); app Clean Soft redesign (§18), Onboarding Studio (§17), inline trend + log panel (§15), Back-button stack & vertical height ruler (§14), BMI & Height body map (GITHUB-GUIDE §13), Goals 2.0 (§12).
