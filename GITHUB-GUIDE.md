# FIT//OS — GitHub-এ সাজানো ও চালু করার গাইড

## ১. ফোল্ডার কাঠামো (repo-র root-এ এই ফাইল/ফোল্ডারগুলো থাকবে)

```
your-repo/
├─ index.html            ← ল্যান্ডিং পেজ (ডোমেইনের root:  yourdomain.com/)
├─ about.html            ← About পেজ
├─ contact.html          ← Contact পেজ
├─ checkout.html         ← Pro কেনার checkout (plan → details → bKash/Nagad)
├─ 404.html              ← পেজ না পাওয়া গেলে
├─ .nojekyll             ← GitHub Pages-এর জন্য (খালি ফাইল, মুছবেন না)
├─ firestore.rules       ← Firebase-এ paste করার rules (সাইটের অংশ নয়)
├─ assets/
│  ├─ css/site.css       ← ডিজাইন
│  ├─ js/config.js       ← ★ দাম, bKash/Nagad নম্বর, কন্টাক্ট — এখানেই বদলান
│  ├─ js/site.js         ← অ্যানিমেশন/নেভিগেশন
│  ├─ js/hero3d.js       ← 3D hero
│  ├─ js/checkout.js     ← checkout + Firebase
│  └─ img/               ← og.png, shots/ (অ্যাপের screenshot)
└─ app/                  ← আসল সফটওয়্যার  (yourdomain.com/app/)
   ├─ index.html
   ├─ manifest.webmanifest
   ├─ sw.js
   └─ icons/
```

> গুরুত্বপূর্ণ: আগে root-এ যে `index.html` (সফটওয়্যার) ছিল, সেটা এখন `app/index.html`-এ গেছে। root-এর `index.html` এখন ল্যান্ডিং পেজ।

## ২. GitHub-এ আপলোড (কোড না জানলেও পারবেন)

1. ZIP খুলুন (extract করুন)। ভিতরে `index.html`, `app`, `assets` ... দেখবেন।
2. GitHub-এ আপনার repo খুলুন → **Add file → Upload files**।
3. ZIP নয় — **extract করা ফোল্ডারের ভিতরের সব ফাইল ও ফোল্ডার** টেনে এনে ছাড়ুন। (`.nojekyll` লুকানো ফাইল হতে পারে; না এলে repo-তে **Add file → Create new file** → নাম `.nojekyll` → Commit।)
4. পুরনো `index.html` (সফটওয়্যার) replace হয়ে যাবে — ঠিক আছে, কারণ সেটা এখন `app/index.html`।
5. নিচে **Commit changes** চাপুন।

## ৩. GitHub Pages চালু

1. repo → **Settings → Pages**।
2. **Source: Deploy from a branch** → Branch: `main` / folder: `/ (root)` → **Save**।
3. ১–২ মিনিট পর সাইট লাইভ।

### নিজের ডোমেইন (root) বসানো
1. Pages সেটিংসে **Custom domain**-এ আপনার ডোমেইন লিখে Save করুন।
2. ডোমেইনের DNS-এ (যেখান থেকে ডোমেইন কিনেছেন):
   - `A` রেকর্ড (নাম `@`) → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (চারটাই)
   - `CNAME` রেকর্ড (নাম `www`) → `আপনার-github-username.github.io`
3. DNS ঠিক হলে Pages-এ **Enforce HTTPS** টিক দিন।

> 404.html ডোমেইনের root ধরে কাজ করে (custom domain হলে ঠিক আছে)।

## ৪. Firebase-এ ৩টা কাজ (একবারই)

**(ক) Rules publish — সবচেয়ে জরুরি**
Firebase Console → Firestore Database → **Rules** → সব মুছে `firestore.rules`-এর পুরো লেখা paste → **Publish**।
(এতে `paymentRequests`, `entitlements`, `global` তিনটা নতুন অংশ আছে; আগের সব rule আগের মতোই আছে।)

**(খ) Authorized domain**
Firebase Console → Authentication → **Settings → Authorized domains** → **Add domain** → আপনার ডোমেইন (`yourdomain.com` আর `www.yourdomain.com`) যোগ করুন। না করলে Google sign-in কাজ করবে না।

**(গ) Google sign-in চালু আছে কিনা** — Authentication → Sign-in method → Google = Enabled (অ্যাপ আগে থেকেই ব্যবহার করছে, তাই আছে)।

## ৫. নিজের তথ্য বসান — `assets/js/config.js`

- `payment.bkash.number` ও `payment.nagad.number` → আপনার আসল পার্সোনাল নম্বর (এখন `01XXXXXXXXX` আছে — না বদলালে checkout-এ "Submit" বন্ধ থাকবে, ভুল করে কেউ টাকা পাঠাবে না)
- `plans[].price` → দাম বদলাতে চাইলে শুধু সংখ্যা বদলান (id: 1m/3m/6m/12m বদলাবেন না)
- `contact` → WhatsApp / Facebook / ফোন দিলে Contact পেজ ও footer-এ দেখাবে; খালি রাখলে লুকানো থাকবে
- GitHub-এ ফাইলটা খুলে ✏️ (Edit) চাপুন → বদলান → Commit।

## ৬. পেমেন্ট ফ্লো (কে কী করে)

**ইউজার:** Pricing থেকে প্ল্যান বাছে → checkout-এ Google sign-in + নাম/ফোন → bKash/Nagad-এ Send Money → TrxID paste → Submit → সাথে সাথে **Pro পেয়ে যায়** (সাময়িক, ৪ দিন) → ৫ সেকেন্ডে অ্যাপে redirect।

**আপনি:** অ্যাপে admin হয়ে লগইন → **Go to Backend → Payments**।
- Pending তালিকায় নাম, ফোন, email, TrxID, amount দেখবেন।
- bKash/Nagad অ্যাপে TrxID + amount মিলিয়ে দেখুন → **✓ VERIFY** চাপুন।
  → ইউজার পুরো প্ল্যান-মেয়াদের জন্য verified Pro হয়; অ্যাপ খুললে **"Payment verified — you are Pro!"** নোটিফিকেশন পায়; Users তালিকায় PLAN = PRO দেখায়।
- মিল না পেলে **✕ REJECT** (কারণ লিখুন) → ইউজারের সাময়িক Pro বন্ধ, অ্যাপে মেসেজ যায়, সে আবার সঠিক TrxID দিতে পারে।
- আগে verified ইউজার আবার কিনলে **VERIFY** করলে মেয়াদ বর্তমান মেয়াদের পরে যোগ হয়।
- একই TrxID দুইবার জমা দেওয়া যায় না (সিস্টেম আটকায়)।

## ৭. পরে আপডেট দিলে

- ফাইল বদলে GitHub-এ commit করলেই হবে।
- অ্যাপ (`app/`): ইউজার পরের বার খুললে নতুন ভার্সন পায়; অ্যাপ খোলা থাকলে নিচে "A new version is available [Update now]" banner আসে।
- ল্যান্ডিং পেজ: ব্রাউজার reload দিলেই নতুন।

## ৮. টেস্ট চেকলিস্ট (লাইভ হওয়ার পর)

1. `yourdomain.com` → ল্যান্ডিং পেজ খোলে? `yourdomain.com/app/` → সফটওয়্যার খোলে?
2. নিজের আরেকটা Google অ্যাকাউন্ট দিয়ে checkout চালান (নিজের নম্বরে ছোট অ্যামাউন্ট বা নকল TrxID `TEST123456`)।
3. অ্যাপ → Profile → Pro কার্ডে "PENDING" দেখাচ্ছে? Backend → Payments-এ request এসেছে?
4. VERIFY চাপুন → ওই অ্যাকাউন্টে অ্যাপ খুলে নোটিফিকেশন আসছে?
5. টেস্ট শেষে ওই request REJECT/REVOKE করে দিন।

## ৯. জেনে রাখুন

- **সাময়িক Pro:** verify-এর আগে ইউজার ৪ দিন Pro পায় (`config.js`-এর `pendingHours`, সর্বোচ্চ ১১৯ ঘণ্টা — rules-এ ৫ দিনের সীমা)। এর মধ্যে verify/reject না করলে মেয়াদ শেষে অ্যাপে আপনা-আপনি Free হয়ে যায়।
- **Amount যাচাই:** Firestore rules টাকার অঙ্ক দামের সাথে মেলায় না (যাতে দাম বদলালে rules বদলাতে না হয়) — তাই VERIFY করার আগে bKash/Nagad-এ amount নিজে মিলিয়ে নিন।
- **Pro-র সুবিধা:** অ্যাপে এখন Pro স্ট্যাটাস, badge, নোটিফিকেশন ও `isProUser()` ফাংশন আছে। কিন্তু Free-এর সীমা (৫ goal / ৮ habit / ২০ meal / AI বন্ধ) অ্যাপে এখনো **জোর করে চাপানো হয়নি** — ল্যান্ডিং পেজের তুলনা-টেবিলে এগুলো লেখা আছে। চাইলে পরের ধাপে এগুলো enforce করে দেওয়া যাবে।
- **আগের অ্যাপ-ঠিকানা:** সফটওয়্যার আগে যে ঠিকানায় ছিল, সেখান থেকে `/app/`-এ সরলে ইউজারদের একবার নতুন করে লগইন করতে হতে পারে (ব্রাউজার ঠিকানা-ভিত্তিক স্টোরেজ আলাদা রাখে)। আগে ইনস্টল করা PWA থাকলে নতুন ঠিকানা থেকে আবার Install করতে হবে।

## ১০. Website Studio — ওয়েবসাইট এডিট করার ব্যাকএন্ড (Admin-এর ভেতরে)

সফটওয়্যারে Owner হিসেবে লগইন → **Admin Backend → Website → Website Studio**। ডানদিকে ওয়েবসাইটের লাইভ প্রিভিউ, বামদিকে এডিটর।

- **Content** — যেকোনো লেখা, লিংক, ছবি, সংখ্যা (stat) বদলান। প্রিভিউয়ে যেকোনো জিনিসে **ক্লিক** করলেই তার ফিল্ড খুলে যায়। ↺ চাপলে আসল লেখা ফিরে আসে।
- **Sections** — যেকোনো সেকশন লুকান/দেখান। **Design** — রঙ, corner radius, ফন্ট (পুরো সাইট ও 3D hero রি-থিম হয়)।
- **Pricing / Payments / Contact** — প্ল্যানের নাম-দাম-badge, bKash/Nagad নম্বর, WhatsApp/Email/Facebook — `config.js` এডিট না করেই।
- **Banner** — সবার উপরে ঘোষণা-বার। **SEO** — প্রতিটি পেজের title/description/share image। **Advanced** — Custom CSS, Export/Import, **Undo last publish**, Reset।
- কাজ **Draft**-এ থাকে (আপনার ব্রাউজারে autosave; চাইলে *Save draft* দিয়ে cloud-এ)। **Publish** চাপলে তবেই সবার জন্য লাইভ হয় — আগে একটা Review স্ক্রিন দেখায় কী কী বদলাচ্ছে।
- **একবারের কাজ:** `firestore.rules` ফাইলটা Firebase Console → Firestore → Rules-এ বসিয়ে **Publish** করুন (নতুন `site` নিয়ম আছে)। না করলে Studio "Not connected" দেখাবে।
- ছবি দিতে হলে ছবির **URL** দিন (বা repo-র `assets/img/`-এ আপলোড করে সেই পথ)। Studio-র বদল Firestore-এ থাকে, repo-র ফাইল বদলায় না — তাই ভুল হলে Undo/Reset আছে।
- নতুন ভিজিটর প্রথমবার ঢুকলে সাইট একবার নিজে থেকে রিলোড হয় (নতুন কনটেন্ট বসাতে) — এটা স্বাভাবিক।

## ১১. Coupon সিস্টেম — ইনফ্লুয়েন্সার মার্কেটিং (Website checkout + Admin Backend + অ্যাপ)

**ধারণা:** প্রতিটি কুপনের একজন **Owner (Gmail)** থাকে — যিনি মার্কেটার/ইনফ্লুয়েন্সার। কাস্টমার কুপন দিলে ডিসকাউন্ট পায়; পেমেন্ট **আপনি VERIFY করলে তবেই** সেটা ওই কুপনের "ব্যবহার" হিসেবে গোনা হয় এবং মার্কেটারের কমিশন হিসাব হয়।

### একবারের কাজ
1. নতুন `firestore.rules` ফাইলটা Firebase Console → Firestore → Rules-এ বসিয়ে **Publish** করুন (`coupons`, `couponPub`, `couponOwners`, `couponClaims` নিয়ম যোগ হয়েছে)। না করলে Admin → Coupons "Failed to load" দেখাবে।
2. রিপোতে এই ফাইলগুলো বদলান: `checkout.html`, `assets/js/checkout.js`, `assets/js/site.js`, `assets/css/site.css`, `app/index.html`, `app/sw.js`, `firestore.rules`।

### কুপন বানানো (Admin Backend → Coupons → + NEW COUPON)
- **Owner:** নাম + Gmail। **এক Gmail = এক কুপন** — একই Gmail-এ দ্বিতীয় কুপন বানাতে গেলে error আসে (আগেরটা edit/delete করতে হবে)।
- **Code:** ৩–২০ অক্ষর/সংখ্যা (যেমন `RAFI10`) — GENERATE বাটনে অটো কোড।
- **Customer discount:** % (সর্বোচ্চ ছাড়ের cap সহ) অথবা fixed ৳; কোন কোন প্ল্যানে চলবে; মোট কত বার ব্যবহার করা যাবে (0 = unlimited); মেয়াদ (optional)।
- **Marketer commission:** প্রতি sale-এর % অথবা fixed ৳ — শুধু আপনার হিসাবের জন্য, কাস্টমার দেখে না।
- যেকোনো সময় ছাড়/কমিশন বদলানো যায় (শুধু পরের কেনাকাটায় প্রযোজ্য), **PAUSE** করে বন্ধ রাখা যায়। Verified ব্যবহার থাকলে কুপন delete করা যায় না (PAUSE করুন)।

### কাস্টমার কীভাবে ব্যবহার করে
- Checkout-এ প্ল্যানের নিচে **"Have a coupon code?"** → কোড লিখে **Apply** → প্ল্যান কার্ডে, Order summary-তে আর পেমেন্টের amount-এ ছাড় সহ দাম দেখায়।
- মার্কেটারকে এই লিংক দিন: `https://আপনার-সাইট/checkout.html?coupon=RAFI10` (চাইলে `&plan=6m` যোগ করুন)। হোমপেজসহ **যেকোনো পেজে** `?coupon=RAFI10` থাকলে কোড ৩০ দিন মনে থাকে এবং checkout-এ নিজে থেকে apply হয়।
- Apply করতে Google sign-in লাগে (sign-in না থাকলে কোড সেভ থাকে, sign-in-এর পর অটো apply হয়)।
- আটকানো হয়: ভুল/inactive/মেয়াদোত্তীর্ণ/limit শেষ কুপন, **নিজের কুপন নিজে ব্যবহার**, **একই কাস্টমারের দ্বিতীয়বার ব্যবহার**, প্ল্যানের জন্য অপ্রযোজ্য কুপন।

### Verify → গণনা → বিল
- Payments-এ কুপনওয়ালা পেমেন্টে **🏷 কোড চিপ** দেখায় (list দাম − ছাড় = প্রত্যাশিত amount)। সেই amount মিলিয়ে **VERIFY** করুন।
- VERIFY হলে কুপনের নিচে ওই কাস্টমারের নাম/Gmail/প্ল্যান/ছাড়/কমিশন যোগ হয় (**Coupons → USES & PAYOUT**)। **REJECT/REVOKE** করলে ব্যবহার বাতিল হয় আর কাস্টমার আবার কুপন ব্যবহার করতে পারে।
- **USES & PAYOUT** থেকে দেখুন: Verified uses, Sales, Discount given, Commission earned, Paid, Balance owed। মার্কেটারকে টাকা দিলে **RECORD PAYOUT** চাপুন; **EXPORT CSV** দিয়ে বিলের তালিকা নামান।
- মার্কেটার নিজের Gmail দিয়ে অ্যাপে লগইন করলে **Settings → Account**-এ **🎟 My coupon** কার্ডে নিজের কোড, লিংক, verified সংখ্যা, আয়, পাওনা ও সাম্প্রতিক ক্রেতা (email আংশিক ঢাকা) দেখতে পান।
- Pending পেমেন্ট কুপনের limit-এ গোনা হয় না — শুধু VERIFY হলেই।

---

## ১২. Goals & Progress 2.0 (নতুন)

**কী বদলেছে:** শুধু `app/index.html` আর `app/sw.js` (cache `fitos-v5`)। **নতুন Firestore rules লাগবে না** — গোল আগের মতোই `users/{uid}/goals/{id}`-এ সেভ হয়।

### GitHub-এ আপলোড
1. রিপোতে `app/index.html` এবং `app/sw.js` replace করুন → Commit।
2. অ্যাপ রিলোড দিলে "update available" ব্যানার আসবে; পুরনো সব গোল নিজে থেকে নতুন ফরম্যাটে মাইগ্রেট হয় (কিছু হারায় না)।

### গোল কত রকম
- **Track a number (manual)** — যেকোনো সংখ্যার টার্গেট (সঞ্চয় ৳, বই পড়া…)। নিজে আপডেট করেন।
- **Checklist** — task + subtask; প্রগ্রেস = কতটা কাজ শেষ। সব শেষ হলে নিজে complete।
- **Habit-linked** — একটা হ্যাবিটের সাথে জোড়া: মোট completion / streak / ৩০ দিনের consistency %।
- **Feature-linked (auto)** — ওজন ও বডি মাপ, workout (দিন/ভলিউম/কার্ডিও km/মিনিট/লিফট), meals (প্রোটিন/ক্যালোরি দিন ও গড়), water, sleep (রাত/বেডটাইম/গড়)। আপনি স্বাভাবিকভাবে এন্ট্রি দিলেই প্রগ্রেস নিজে আপডেট হয়, টার্গেট ছুঁলে নিজে **Achieved**।

### Milestone → Task → Subtask
- Auto checkpoint (২৫/৫০/৭৫%) বা নিজের milestone (মান দিয়ে, যেমন "৭৭ কেজি")। মান পেরোলে milestone নিজে ✔ হয়।
- যেকোনো গোলে task/subtask যোগ করা যায়; কোনো milestone-এর নিচে task রাখলে ওই task শেষ হলেই milestone শেষ।

### আরও
- Dashboard-এ "Goals in progress" কার্ড; AI Agent আপনার গোল জানে।
- Pace: "সপ্তাহে কত লাগবে", Ahead / On track / Behind, forecast তারিখ।
- Pause / Resume / Mark achieved / Reopen / Edit / Delete।

---

## ১৩. BMI & Height — বডি ম্যাপ নিজে থেকে বদলায় (নতুন)

**কী বদলেছে:** শুধু `app/index.html` আর `app/sw.js` (cache `fitos-v6`)। **নতুন Firestore rules লাগবে না** — হাইট ও BMI সেটিং আগের মতোই `users/{uid}`-এর profile (`cfg`)-এর সাথে সিঙ্ক হয়।

### GitHub-এ আপলোড
1. রিপোতে `app/index.html` এবং `app/sw.js` replace করুন → Commit।
2. অ্যাপ রিলোড দিলে "update available" ব্যানার আসবে। পুরনো ডেটা নষ্ট হয় না।

### Health → Overview-এ কী দেখবেন
- **ফিগার নিজে বদলায়:** নতুন ওজন লগ করলেই বডি BMI অনুযায়ী বদলায় — Underweight হলে চিকন, Normal হলে সুগঠিত, Overweight/Obese হলে ক্রমশ চওড়া (পেশি, হাড়, অঙ্গ, চর্বির স্তর সব ফিগারের সাথে মানিয়ে যায়)। ওজনের প্রতিটি পরিবর্তনে ছোট অ্যানিমেশনে আকার বদলায়।
- **হাইট রুলার:** ফিগারের পাশে ফুট-ইঞ্চি স্কেল (মোবাইলে নিচে টেপ), ট্যাবে আপনার হাইট (`5′ 9″ · 175 cm`)। হাইট কম-বেশি হলে ফিগারের উচ্চতাও সেই অনুযায়ী হয়। রুলার/ট্যাবে ট্যাপ করলে হাইট এডিটর খোলে (স্লাইডার, ft/in/cm)।
- **BMI কার্ড (কর্নারে):** বর্তমান BMI, ক্যাটাগরি (Underweight / Normal / Overweight / Obese I–III), রঙিন গেজ, **ideal BMI** (জেন্ডার অনুযায়ী) এবং **ideal ওজন রেঞ্জ (kg)**।
- **Ideal ghost:** আপনার ideal গঠন ফিগারের পিছনে হালকা ডটেড রেখায় দেখা যায় — বর্তমান ও ideal-এর পার্থক্য এক নজরে বোঝা যায়।

### জেন্ডার অনুযায়ী ideal BMI
| স্ট্যান্ডার্ড | Normal রেঞ্জ | Ideal (পুরুষ / নারী / অন্য) |
|---|---|---|
| **WHO** (ডিফল্ট) | 18.5 – 24.9 | 22.5 / 21 / 21.75 |
| **Asia-Pacific** | 18.5 – 22.9 | 21.5 / 20.5 / 21 |

স্ট্যান্ডার্ড বদলান: **Settings → Profile → BMI standard**।

### হাইট কোথায় দেবেন
- **Settings → Profile → Height → Set**, অথবা বডি ম্যাপের রুলার/ট্যাবে ট্যাপ।
- নতুন ইউজারের Onboarding-এ ঐচ্ছিক হাইট (ft/in) আছে।
- Health → **Log**-এ "Height" মেট্রিক দিয়েও হাইট যোগ করা যায় — তারিখসহ সেভ হয়, ফলে আগের তারিখের BMI আগের হাইট দিয়ে হিসাব হয় (বাড়ন্ত বয়সের জন্য সুবিধা)।
- হাইট না দিলে ফিগার নিরপেক্ষ থাকে এবং "Add height" কার্ড দেখায়; BMI হিসাব হয় না।

### সফটওয়্যার জুড়ে
- **Health Trends:** BMI চার্টে ক্যাটাগরির রঙিন ব্যান্ড; History-তেও BMI।
- **Dashboard:** BMI ও ক্যাটাগরির সারি।
- **Goals:** নতুন "Body → BMI" গোল ও প্রিসেট **"Reach a healthy BMI (22)"** — ওজন/হাইট লগ করলে অটো-প্রগ্রেস।
- **Weight প্যানেল:** BMI ও ideal-এর নোট।
- **AI Agent:** আপনার হাইট, BMI, ক্যাটাগরি ও ideal ওজন রেঞ্জ জানে।

### টেস্ট চেকলিস্ট
1. Settings → Profile → Height সেট করুন (যেমন 5′ 9″) → Health খুলুন → ফিগারের পাশে রুলারে হাইট ট্যাব দেখা যাবে।
2. Log থেকে ওজন ৪৬ → ৬৯ → ৮৬ → ১১৮ kg করে দেখুন — ফিগার চিকন → স্বাভাবিক → ভারী → আরও ভারী হয় ও BMI কার্ডের ক্যাটাগরি/রঙ বদলায়।
3. Settings-এ জেন্ডার বদলালে ideal BMI/রেঞ্জ ও ফিগারের ভিত্তি আকৃতি বদলায়।
4. Dark/Light থিম ও মোবাইলে: ফিগার একটা স্ক্রিনে ধরে, পাশে স্ক্রল হয় না।

> ⚠️ BMI একটি সাধারণ স্ক্রিনিং মাপ — পেশি/হাড়ের গঠন আলাদা করে ধরে না (বডিবিল্ডারের BMI বেশি দেখালেও সে মোটা নয়)। ফিগারের আকৃতি BMI-র একটা **ভিজ্যুয়াল অনুমান**, মেডিকেল নির্ণয় নয়; স্বাস্থ্যের সিদ্ধান্তে ডাক্তারের পরামর্শ নিন।
