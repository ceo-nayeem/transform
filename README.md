# FIT//OS
Landing site (root) + the FIT//OS web app (`/app`). See `GITHUB-GUIDE.md` for setup & deployment.

The whole website is editable from the app: **Admin Backend → Website Studio** (live preview, content, design, pricing, payment numbers, banner, SEO). Rules: publish `firestore.rules` once.

Coupons (influencer marketing): **Admin Backend → Coupons** — one coupon per Gmail owner, customer discount + marketer commission, applied at checkout (`checkout.html?coupon=CODE`), counted only after you VERIFY the payment, per-coupon buyer list + payouts + CSV. Publish `firestore.rules` once (see GITHUB-GUIDE §11).

## Folder structure
```
/                      landing site (GitHub Pages root)
├─ index.html  about.html  contact.html  checkout.html  404.html
├─ sw.js  .nojekyll
├─ firestore.rules      publish in Firebase Console → Firestore → Rules
├─ GITHUB-GUIDE.md      setup & update guide (Bengali)
├─ assets/
│  ├─ css/site.css
│  ├─ js/   config.js  site.js  cms.js  checkout.js  hero3d.js  device3d.js
│  └─ img/  og.png  shots/*.webp
└─ app/                 the FIT//OS web app (PWA)
   ├─ index.html  sw.js  manifest.webmanifest
   └─ icons/
```
Latest: BMI & Height body map (GITHUB-GUIDE §13), Goals 2.0 (§12).
