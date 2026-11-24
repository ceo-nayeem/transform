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
│  ├─ js/site.js         ← থিম (dark/light), নেভিগেশন, carousel বাটন, প্রাইসিং
│  ├─ js/cms.js          ← Website Studio কানেকশন
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

---

## ১৪. Back বাটন ও Height স্কেল ফিক্স

**কী বদলেছে:** শুধু `app/index.html` আর `app/sw.js` (cache `fitos-v7`)। নতুন Firestore rules লাগবে না।

- **Back বাটন (মোবাইল/ব্রাউজার):** আগে একবার Back চাপলেই অ্যাপ থেকে বেরিয়ে যেত। এখন যেই পেজে যান (Home → Health → Track → …), Back চাপলে এক ধাপ করে আগের পেজে ফেরে এবং শেষে Home-এ আসে।
- কোনো popup / sheet / sidebar / হাইট এডিটর খোলা থাকলে প্রথম Back সেটাই বন্ধ করে, পেজ বদলায় না।
- **Home থেকে Back:** "Press back again to exit" মেসেজ আসে; ২ সেকেন্ডের মধ্যে আবার Back চাপলে তবেই বের হয়।
- **হাইট স্কেল (মোবাইল):** আগে নিচে আড়াআড়ি টেপ ছিল; এখন সব স্ক্রিনে ফিগারের পাশে লম্বালম্বি (পা থেকে মাথা) ফুট-ইঞ্চি স্কেল। আপনার হাইটের জায়গায় (মাথার উচ্চতায়) একটা দাগ ও ট্যাগে হাইট দেখায় (যেমন `5′ 9″`); ট্যাপ করলে হাইট এডিটর খোলে।

---

## ১৫. Health Overview — ট্রেন্ড ও লগ এক জায়গায় (নতুন)

**কী বদলেছে:** শুধু `app/index.html` আর `app/sw.js` (cache `fitos-v8`)। নতুন Firestore rules লাগবে না — এন্ট্রি আগের মতোই `measurements` / `vitals`-এ সেভ হয়।

### Overview-এ ফিগার/কার্ডে ট্যাপ করলে ডানে (মোবাইলে নিচে) প্যানেল খোলে
- **ট্রেন্ড (এখানেই):** 7D / 30D / 90D / 1Y / ALL / **CUSTOM** (নিজের From–To তারিখ)। **AVG, LOWEST, HIGHEST, ENTRIES** (সাথে তারিখ ও কত দিন), পিরিয়ডের পরিবর্তন (%), চার্ট (hover/tap-এ মান)। আলাদা Trends ট্যাবে যেতে হয় না।
- **＋ LOG (ড্রপডাউন, এখানেই):** প্যানেলের "＋ LOG …" চাপলে নিচে ফর্ম নামে — পেজ বদলায় না।
  - প্রতিটি মেট্রিক আলাদা: Weight, Body Fat, BMI (হাইট ft/in + ওজন), Chest, Waist, Hips, Arm, Thigh, Calf, Heart Rate, Blood Pressure, Sleep (ঘণ্টা বা Bed/Wake থেকে অটো), Sleep Quality। "Body & Measurements" / "Vitals & Sleep" ক্যাটাগরি আর নেই।
  - লিখতে লিখতেই **লাইভ প্রিভিউ** (স্ট্যাটাস, আগেরটার সাথে পার্থক্য, BMI)। **Enter** বা SAVE চাপলেই সাথে সাথে সেভ — ফিগার, স্কেল, চার্ট, গোল, ড্যাশবোর্ড নিজে আপডেট হয়।
  - পুরনো তারিখের এন্ট্রি দিতে DATE বদলান; ড্রপডাউন খোলা থাকা অবস্থায় অন্য মেট্রিকে গেলে সেটার ফর্মই খোলে — একটার পর একটা দ্রুত লগ করা যায়।
  - প্যানেলের নিচে **RECENT ENTRIES** — ✎ এডিট / ✕ ডিলিট (Undo সহ)।
- **Log ট্যাব:** এখন একটা একটা মেট্রিক বেছে (চিপ) লগ করার ফর্ম — ক্যাটাগরি ছাড়া।
- মোবাইলে কীবোর্ড খোলার সময় টাইপ করা মান মুছে যায় না।

---

## ১৬. Admin Backend আপগ্রেড — Bulk Actions, Trash, Block-only নিয়ম, লগইন বাগ ফিক্স (নতুন)

**কোন ফাইল বদলেছে (৪টা):** `firestore.rules` · `assets/js/checkout.js` · `app/index.html` · `app/sw.js` (cache `fitos-v9`) — চারটাই GitHub-এ replace করুন।

### ⚠ সবার আগে করুন: `firestore.rules` পাবলিশ
Firebase Console → Firestore Database → **Rules** → `firestore.rules`-এর পুরো লেখা পেস্ট → **Publish**। এটা না করলে লগইন বাগ ঠিক হবে না।

### বাগের আসল কারণ (যা ঠিক হয়েছে)
- Firestore rules-এ `replace('.', '_')` আসলে **regex** — তাই `a@b.com` হয়ে যাচ্ছিল `_______` (সব অক্ষর `_`)। ফলে আপনি ছাড়া **কেউই নিজের অ্যাকাউন্ট ডক পড়তে/বানাতে পারত না** → *"Could not load your account: Missing or insufficient permissions."* এখন rules-এর `ownDocId()` অ্যাপের `sanitizeId()`-এর মতোই কাজ করে।
- পেমেন্ট হয়ে যেত কিন্তু Users-এ নাম আসত না, কারণ লগইনই হতো না। এখন:
  1. চেকআউটে পেমেন্ট জমা দেওয়ার সময়ই কাস্টমারের অ্যাকাউন্ট রেকর্ড (`fitos_users`) নিজে থেকে তৈরি হয়।
  2. আপনি **VERIFY** করলে রেকর্ড না থাকলেও তৈরি হয় (এবং Pro বসে)।
  3. Users পেজের উপরে কমলা প্যানেল দেখায় — *"X paying customers have no account record yet"* — **＋ Create all accounts** চাপলে এখনই সবাই Users-এ চলে আসে। (আগের যাদের পেমেন্ট হয়েছিল তারাও।)
  4. এরা প্রথমবার সাইন-ইন করলে সরাসরি onboarding-এ যায় — কোনো এরর নেই।

### নতুন নিয়ম: শুধু **Block** করলেই আটকায়
| আপনি যা করলেন | সাইন-ইন | নতুন পারচেজ |
|---|---|---|
| Trash-এ ফেলা / Delete forever | ✅ পারবে (ফ্রেশ বা আগের মতো) | ✅ পারবে |
| Payment Reject / Revoke | ✅ পারবে | ✅ পারবে (নতুন TrxID দিয়ে) |
| **Block** | ⛔ পারবে না | ⛔ পারবে না |

- Users → ⛔ Block (একজনকে বা Bulk) / ✓ Unblock। অ্যাকাউন্ট নেই এমন কাউকে আগেই আটকাতে **[ ⛔ BLOCK E-MAIL ]**।
- Block rules দিয়ে সার্ভারেই কার্যকর (সাইন-ইন, ডাটা সেভ, পেমেন্ট জমা)। পুরনো "Suspended" এখন "Blocked"।
- একই TrxID আবার জমা দিতে চাইলে (ভুলে Reject হলে): Payments → ওই রেকর্ড Trash → Trash পেজ থেকে **Delete forever**।

### Bulk Actions (সব লিস্টে)
প্রতিটি সারির বাঁ দিকে ☑ টিক। উপরের বারে **Select all (N)** — ফিল্টার/সার্চ করা সবগুলো একসাথে (পেজ ২৫-এর বেশি হলেও)। কিছু বাছলে বার সবুজ হয়ে অ্যাকশন দেখায়।
| লিস্ট | Bulk অ্যাকশন |
|---|---|
| Users | ⛔ Block · ✓ Unblock · ⭳ CSV · 🗑 Trash |
| Payments | ✓ Verify · ✕ Reject (কারণসহ) · ⭳ CSV · 🗑 Trash |
| Coupons | ⏸ Pause · ▶ Resume · ⭳ CSV · 🗑 Trash |
| Ingredient Library | ⭳ CSV · 🗑 Trash |
| Workout Library | 🗑 Trash |
| Content | 🗑 Trash |
| Trash | ↩ Restore · ✕ Delete forever |
সব Bulk কাজ আগে কনফার্মেশন চায়, প্রোগ্রেস দেখায়, আর **Audit Log**-এ লেখা হয় (Audit Log থেকে ⭳ CSV-ও পাবেন)।

### Trash (নতুন সাইডবার আইটেম 🗑)
- আগে যা সরাসরি মুছে যেত (ইউজার, পেমেন্ট, কুপন, ইনগ্রেডিয়েন্ট, ওয়ার্কআউট, কন্টেন্ট) এখন আগে **Trash**-এ যায়। ট্যাব: All / Users / Payments / Coupons / Ingredients / Workouts / Content items; সার্চ আছে।
- **Restore** = হুবহু আগের মতো ফিরে আসে (কুপন *paused* হয়ে ফেরে — Coupons থেকে Resume করুন)।
- **Delete forever** = চিরতরে। ইউজারের ক্ষেত্রে তার **সব ডাটা** (মিল, ওয়ার্কআউট, হ্যাবিট, গোল, হেলথ) মুছে যায় — তাই `DELETE` টাইপ করতে হয়।
- **Empty trash** (সব বা একটা টাইপ) আর "৩০ দিনের পুরনো গুলো মুছুন" বাটন আছে। কিছুই নিজে থেকে মুছে যায় না।
- Trash-এ থাকা ইউজার সাইন-ইন করলে নিজে থেকেই ফিরে আসে; ভেরিফাইড পেমেন্ট পেলেও ফিরে আসে।
- লাইব্রেরি/কন্টেন্ট Trash `admin/trash` ডকে থাকে (শুধু আপনি পড়তে পারেন)।

### অন্যান্য উন্নতি
- ড্যাশবোর্ডে **Blocked** ও **Paid · no account** কার্ড; Users-এ **⭳ EXPORT CSV**।
- ভেরিফাই করার পর Users পেজ ফাঁকা থাকার বাগ ঠিক (এখন নিজে রিলোড হয়)।
- লগইন এরর এখন সহজ ভাষায় ("server refused access… rules republish") — কাঁচা Firebase লেখা নয়।
- সব প্রম্পট/কনফার্ম এখন সুন্দর ডায়ালগে (মোবাইলে নিচ থেকে ওঠে), Esc/Enter কাজ করে।

### টেস্ট চেকলিস্ট
1. rules Publish → একটা টেস্ট Gmail দিয়ে আগে Trash/Reject করা ইউজার লগইন করুন → ঢুকবে, পারচেজও হবে।
2. কাউকে Block করুন → লগইনে "blocked by the admin" দেখাবে; Unblock করলে আবার ঢুকবে।
3. Users → উপরে কমলা প্যানেল থাকলে **Create all accounts** চাপুন।
4. Users → Select all → Move to Trash → Trash পেজে দেখুন → Restore।


---

## ১৭. Onboarding Studio — ব্যাকএন্ড থেকে পুরো অনবোর্ডিং কন্ট্রোল + ফুল-স্ক্রিন নতুন অনবোর্ডিং (নতুন)

**কোন ফাইল বদলেছে (৩টা + গাইড):** `app/index.html` · `app/sw.js` (cache `fitos-v10`) · `firestore.rules` — GitHub-এ replace করুন।

### ⚠ সবার আগে: `firestore.rules` আবার পাবলিশ
Firebase Console → Firestore Database → **Rules** → নতুন `firestore.rules`-এর পুরো লেখা পেস্ট → **Publish**। (শুধু একটা লাইন বেড়েছে: `admin/onboarding` ডক সাইন-ইন করা ইউজাররা পড়তে পারবে, লিখতে পারবেন শুধু আপনি।) না করলেও কেউ আটকে যাবে না — অ্যাপ তখন বিল্ট-ইন ডিফল্ট অনবোর্ডিং দেখাবে — কিন্তু আপনার বানানো অনবোর্ডিং ইউজাররা দেখবে না।

### ইউজার যা দেখে (ফ্রন্টএন্ড)
- পপআপ নেই — **ফুল-স্ক্রিন**, মনে হয় সরাসরি সফটওয়্যারে ঢুকেছে। অ্যানিমেটেড ফিউচারিস্টিক ব্যাকগ্রাউন্ড, ডার্ক/লাইট দুটোতেই সুন্দর, মোবাইলে ঠিকঠাক।
- **উপরে স্টেপ ১ → ২ → ৩ → ৪ → ৫** আর তার ঠিক উপরে **প্রগ্রেস বার** (শতাংশসহ) — উত্তর দিলে নিজে থেকে এগোয়।
- **পেছনে যাওয়া যায়**: Back বাটন বা উপরের পুরনো স্টেপে ক্লিক। আগের উত্তর বদলালে বাকি উত্তর/স্টেপ একটুও নড়ে না।
- ট্যাব বন্ধ করলে বা রিফ্রেশ দিলে **যেখানে ছিল সেখান থেকেই** আবার শুরু (উত্তরসহ)।
- শেষ স্টেপে উত্তর অনুযায়ী **স্টার্টার টেমপ্লেট সাজেস্ট** (নিউট্রিশন প্ল্যান + ক্যালরি/প্রোটিন, ওয়ার্কআউট রুটিন, হ্যাবিট, গোল) — কেন সাজেস্ট হলো তার ছোট ট্যাগসহ। যা পছন্দ নয় টিক তুলে দিন; চাইলে "Skip — I will set it up myself" দিয়ে ফাঁকা শুরু।
- শেষে "Building your space…" অ্যানিমেশনে সব তৈরি হয়ে সরাসরি অ্যাপে ঢোকে। আগে থেকে থাকা একই নামের হ্যাবিট/রুটিন/গোল **ডুপ্লিকেট হয় না**।

### Admin → Onboarding (সাইডবার, Configuration গ্রুপে)
উপরে স্ট্যাটাস (`Published v3` / `Unpublished changes`), **Onboarding ON/OFF** সুইচ (OFF করলে নতুন ইউজার সরাসরি অ্যাপে), আর বাটন: **▶ Preview · ⭳ Export · ⭱ Import · ↩ Roll back · ✕ Discard · 🚀 Publish**। সব এডিট আগে **ড্রাফটে** থাকে (ব্রাউজারে অটো-সেভ) — **Publish** না চাপা পর্যন্ত কেউ দেখে না।

| ট্যাব | কী করবেন |
|---|---|
| 🧭 **Flows** | একটা Flow = এক সেট অনবোর্ডিং। **Default** সবার জন্য। আলাদা Flow বানান নির্দিষ্ট অডিয়েন্সের জন্য (ই-মেইল বা `@company.com` লাইন ধরে) — যেমন জিম-মেম্বার, ট্রেইনার, ডায়াবেটিস-ফ্রেন্ডলি। ওয়েলকাম টাইটেল/টেক্সট/আইকন, শেষ বাটনের লেখা, Back/Stepper/Progress অন-অফ, সাজেশন স্টেপ অন-অফ, কোন টাইপের কয়টা সাজেশন — সব এখানে। Duplicate / Make default / Delete। |
| 🧱 **Questions** | **Step** বানান, সাজান (▲▼), অন-অফ। প্রতিটা স্টেপে **Question** — টাইপ: Short text · Number · Single choice · Multiple choice · Yes/No · Weight (kg/lb) · Height (ft·in/cm) · Scale slider · Date · Info text। অপশনে ইমোজি + লেখা + ছোট বিবরণ + `value`। প্রশ্নের উত্তর **Profile-এর কোন ফিল্ডে** যাবে (নাম, বয়স, জেন্ডার, ওজন, উচ্চতা, টার্গেট ওজন, অ্যাক্টিভিটি) বেছে দিন। |
| 🔗 **Suggestions** | **Rule**: *যখন* (শর্ত) → *তখন* এই টেমপ্লেটগুলো সাজেস্ট। শর্ত বিল্ডারে: is / is not / is any of / includes / > / ≥ / between / is answered ইত্যাদি, আর BMI, বয়স, ওজন, BMI-ক্যাটাগরি, অ্যাক্টিভিটি-ও ব্যবহার করা যায়। একই টেমপ্লেট একাধিক রুলে এলে **priority যোগ হয়** — সবচেয়ে বেশি স্কোরগুলো জেতে। নিচে **🧪 Suggestion tester**: উত্তর বাছুন → ঠিক কী কী সাজেস্ট হবে (স্কোর, কারণ, ক্যালরি) তখনই দেখুন। |
| 📦 **Templates** | আপনার টেমপ্লেট লাইব্রেরি: **Habits** (check/amount/timer/checklist/avoid, ফ্রিকোয়েন্সি, সময়), **Routines** (এক্সারসাইজ লিস্ট — Workout Library-র নামের সাথে মেলে), **Goals** (ওজন −৫ কেজি, ওয়ার্কআউট সংখ্যা, BMI ইত্যাদি — বর্তমান ভ্যালু থেকে হিসাব), **Nutrition plans** (মেইন্টেন্যান্স ± ক্যালরি, প্রোটিন g/kg, ফ্যাট %, পানি)। কোন রুলে ব্যবহার হচ্ছে তা দেখায়। |
| 👥 **Users** | কাউকে (বা Bulk-এ অনেককে) **↻ আবার অনবোর্ডিং করতে বলুন** (আগের উত্তর পূর্ণ থাকে), অথবা **🧭 নির্দিষ্ট Flow Assign** করুন। CSV-তে উত্তর এক্সপোর্ট। (Users পেজের Bulk বারেও একই দুটো অ্যাকশন আছে।) |
| 📊 **Insights** | কতজন শেষ করল, ফাঁকা শুরু %, গড়ে কয়টা হ্যাবিট/রুটিন/গোল নিল, আর প্রতিটা চয়েস-প্রশ্নের উত্তরের বার-চার্ট। |

### Publish, Roll back, নিরাপত্তা
- **Publish** আগে ভুল-ত্রুটি চেক করে (যেমন চয়েস প্রশ্নে ২টার কম অপশন = আটকায়; ওজন-প্রশ্ন নেই / মুছে ফেলা টেমপ্লেটের রুল = সতর্কতা)। নতুন ভার্সন শুধু **নতুন ইউজার** (বা যাদের আবার করতে বলেছেন) দেখবে; আগে যারা শেষ করেছে তারা প্রভাবিত হয় না।
- আগের ভার্সন `admin/onboardingPrev`-এ থাকে → **↩ Roll back** এক ক্লিকে ফেরত।
- কনফিগ নষ্ট/অনুপস্থিত হলে বা পড়তে না পারলে অ্যাপ **বিল্ট-ইন ডিফল্ট** ব্যবহার করে — কেউ কখনো আটকে যায় না।
- Publish / Rollback / Re-run / Flow-assign সব **Audit Log**-এ লেখা হয়।
- **▶ Preview** পুরো ফুল-স্ক্রিন অভিজ্ঞতা দেখায় (ড্রাফটসহ) — কিছুই সেভ হয় না, আপনার প্রোফাইল বদলায় না।

### বাড়তি ফিক্স
অনবোর্ডিং অর্ধেক রেখে ট্যাব বন্ধ করলে, পরের বার (রিফ্রেশ/সেশন রিস্টোর) আগে সরাসরি অ্যাপে ঢুকে যেত — এখন আবার অনবোর্ডিংয়েই ফিরে আসে।


---

## ১৮. "Clean Soft" নতুন ডিজাইন — পুরো অ্যাপ আরও ক্লিন ও মডার্ন (নতুন)

**শুধু লুক বদলেছে — ফিচার/ডেটা/লজিক কিছুই ছোঁয়া হয়নি।** রেফারেন্স স্ক্রিনশট থেকে ধারণা নিয়ে (হুবহু কপি নয়) নতুন ডিজাইন সিস্টেম বসানো হয়েছে।

### কী কী বদলেছে
- **ফন্ট ও টাইপ**: পুরো অ্যাপ এখন একটাই ক্লিন ফন্টে (Plus Jakarta Sans)। আগের মনো/টার্মিনাল ও uppercase লেটার-স্পেসিং লুক কমানো হয়েছে; বড় বোল্ড হেডিং, ছোট মিউটেড ডেসক্রিপশন। `[ ▶ START ]` ধরনের বাটন লেখা এখন `▶ Start`।
- **কার্ড ও কালার**: নিয়ন গ্লো/গ্রেডিয়েন্ট বাদ। Light থিমে হালকা-ধূসর ক্যানভাসে সাদা রাউন্ডেড কার্ড + নরম ছায়া; Dark থিমে গাঢ় গ্রাফাইট-গ্রিন কার্ড। একটাই অ্যাকসেন্ট (Settings → Appearance-এর রঙ আগের মতোই কাজ করে)।
- **Dashboard**: উপরে বড় গ্রিটিং ("You're halfway there"), **Daily goal প্রগ্রেস বার**, গোল quick-action বাটন (Meal · Workout · Water · Habits · Health), ডানে Daily summary রিং। ডেস্কটপে দুই-কলাম, মোবাইলে এক-কলাম।
- **ট্যাব/ফিল্টার**: সব ট্যাব এখন একই "pill segmented" স্টাইলে (ট্রফের ভেতর সাদা/হাইলাইটেড চিপ)।
- **Sidebar (ডেস্কটপ)**: ভাসমান ভার্টিকাল pill rail — গোল SVG আইকন + নিচে ছোট লেখা; অ্যাক্টিভ পেজের আইকন সাদা/অ্যাকসেন্ট সার্কেল।
- **মোবাইল**: ভাসমান bottom nav (অ্যাক্টিভ আইটেম লেবেলসহ পিল, মাঝে বড় গোল ＋ বাটন), নতুন Quick-log শিট, সলিড ড্রয়ার।
- **অন্যান্য**: Habits/Goals/Workout/Health/Library/Settings, Login, Onboarding, Admin Studio — সবই একই কার্ড/বাটন/ইনপুট ভাষায়।

### কোথায় আছে (এডিট করতে চাইলে)
`app/index.html`-এর একদম শেষে `<style id="ds-css">` (মার্কার `DS-CSS-START … DS-CSS-END`) — এটাই নতুন ডিজাইন লেয়ার। রঙ/রেডিয়াস/ছায়া বদলাতে শুরুর `:root{…}` ও `html.alpha{…}` টোকেন বদলান (`--g` অ্যাকসেন্ট, `--radius-*`, `--ds-shadow`)। ড্যাশবোর্ড হিরোর লেখা `dsHeroUpdate()` (`<script id="ds-js">`)। পুরনো লুকে ফিরতে চাইলে শুধু ওই `<style id="ds-css">` ব্লকটা মুছে দিন।

### আপলোড
`app/index.html` ও `app/sw.js` (cache `fitos-v11`) রিপ্লেস করুন। ইনস্টল করা অ্যাপে "update available" ব্যানার আসবে। নতুন ফন্ট Google Fonts থেকে আসে; অফলাইনে সিস্টেম ফন্টে ফলব্যাক করে।

---

## ১৯. ওয়েবসাইট "Clean Soft" আপডেট — অ্যাপের মতো ক্লিন ও মডার্ন (নতুন)

পুরো ওয়েবসাইট (Home, About, Contact, Checkout, 404) এখন অ্যাপের নতুন ডিজাইনের সাথে মিলিয়ে আবার বানানো হয়েছে।

**কী কী বদলেছে**
- **নতুন মকআপ:** ওয়েবসাইটের সব phone/desktop স্ক্রিনশট এখন অ্যাপের *বর্তমান* চেহারা (Dashboard, Nutrition, Workout, Habits, Goals, Desktop Dashboard)। প্রতিটার **dark ও light** দুই ভার্সন আছে — ওয়েবসাইটের থিম বদলালে মকআপও নিজে থেকে বদলায়। ফাইল: `assets/img/shots/*-d.webp` (dark), `*-l.webp` (light)।
- **ক্লিন লুক:** ভারী 3D / GSAP / three.js / pinned-scroll বাদ। এখন নরম কার্ড, pill বাটন, পরিষ্কার spacing — ফলে সাইট অনেক হালকা ও দ্রুত।
- **Horizontal scroll নেই:** আগের পাশে-স্ক্রল-হওয়া কার্ডের জায়গায় এখন **বাম/ডান (‹ ›) বাটন + dots** দিয়ে স্লাইড হয় (Modules সেকশন)। ডেস্কটপে ৩টা, ট্যাবলেটে ২টা, ফোনে ১টা কার্ড দেখায়। ফোনে আঙুল দিয়ে swipe-ও করা যায়, কিন্তু কোনো horizontal scrollbar আসে না।
- **Dark / Light মোড:** হেডারে সূর্য/চাঁদ বাটন। শুধু ২টা অপশন (কোনো কালার থিম নেই)। পছন্দ `localStorage`-এর `fitos_theme` কী-তে সেভ হয় — **অ্যাপও একই কী ব্যবহার করে**, তাই ওয়েবসাইটে light করলে অ্যাপও light-এ খোলে (আর উল্টোটাও)।
- **হেডারের নতুন বাটন:** আগের "Go Pro" + "Open App"-এর জায়গায় এখন **Login** ও **Continue**।
- **অল-ডিভাইস রেসপন্সিভ:** 320px থেকে 1920px পর্যন্ত, dark ও light দুই মোডে টেস্ট করা — কোনো পেজে sideways overflow নেই।

**Login ও Continue কীভাবে কাজ করে**
| বাটন | কোথায় যায় | আচরণ |
|---|---|---|
| **Login** | `app/` | নতুন ইউজার → অ্যাপের Google login স্ক্রিন দেখে। আগে থেকে login করা ইউজার → অ্যাপ নিজেই সেশন রিস্টোর করে **সরাসরি ভেতরে** ঢুকে যায় (আবার login লাগে না)। login থাকলে বাটনের কোণে ছোট সবুজ ডট দেখা যায়। |
| **Continue** | `checkout.html` | প্ল্যান বাছাইয়ের পেজ। সবার আগে **Free** অপশন + ৪টা Pro প্ল্যান। |

**Checkout-এ "Continue free"**
- Free কার্ড সিলেক্ট করলে কুপন, Google sign-in ফর্ম, নাম/মোবাইল, bKash/Nagad, TrxID — **কিছুই চাইবে না**। শুধু **"Continue free →"** বাটন আসে, চাপলে অ্যাপের login স্ক্রিনে যায় (ফ্রি-তে যেভাবে login করে ঠিক সেভাবে)।
- Pro প্ল্যান সিলেক্ট করলে আগের মতোই: Google sign-in → নাম/মোবাইল → bKash/Nagad → TrxID। নিচে একটা "Not ready to pay? Continue free" লিংকও থাকে।
- সরাসরি লিংক: `checkout.html?plan=free` (Free আগে থেকে সিলেক্ট), `checkout.html?plan=6m` (নির্দিষ্ট প্ল্যান)। কুপন লিংক আগের মতোই কাজ করে।
- Landing page-এর Pricing সেকশনে Free কার্ডের "Continue Free" বাটন সরাসরি অ্যাপে নিয়ে যায়।

**Website Studio আগের মতোই কাজ করে** — সব `data-cms` কী অক্ষত। নতুন কী: `g.login`, `g.continue` (হেডার/মেনু/ফুটার বাটনের লেখা), `checkout.s1.11–15` (Free অংশের লেখা), `checkout.main.19–22` (Free perks)। Studio-র Accent/Font/Radius ওভাররাইড dark ও light দুই মোডেই লাগে; **Background রঙ ওভাররাইড শুধু dark মোডে** লাগে (light মোড নিজের ক্লিন সাদা/ধূসর ধরে রাখে)। একই ছবির key (যেমন `home.img.1`) দিয়ে আপলোড করা ছবি dark ও light দুই ভার্সনেই বসে।

**আপলোড করতে হলে (শুধু ওয়েবসাইট আপডেট)**
1. `website-update.zip` খুলুন। এর ভেতরের ফাইল/ফোল্ডার আপনার GitHub repo-র **root**-এ কপি করুন (পুরনো ফাইল replace হবে): `index.html`, `about.html`, `contact.html`, `checkout.html`, `404.html`, `assets/`।
2. **মুছে ফেলুন** (আর লাগে না): `assets/js/hero3d.js`, `assets/js/device3d.js`, এবং পুরনো `assets/img/shots/*.webp` যেগুলোর নামের শেষে `-d`/`-l` নেই (zip-এর `assets/img/shots/` ফোল্ডার দিয়ে পুরোটা replace করাই সবচেয়ে সহজ)।
3. **অ্যাপ (`app/`) বদলাতে হয়নি** — `app/index.html` ও `app/sw.js` আগের মতোই থাকবে।
4. Commit → কয়েক মিনিটে Pages লাইভ। ব্রাউজারে একবার **Ctrl+Shift+R** (hard refresh) দিন।

**টেস্ট চেকলিস্ট:** (১) হেডারে Login/Continue দেখাচ্ছে? (২) সূর্য/চাঁদ চাপলে dark↔light বদলায়, রিলোডেও থাকে? (৩) Modules সেকশনে ‹ › চাপলে কার্ড স্লাইড হয়? (৪) Continue → Free সিলেক্ট → "Continue free" → অ্যাপের login স্ক্রিন? (৫) অ্যাপে login থাকা অবস্থায় Login চাপলে সরাসরি ড্যাশবোর্ডে ঢোকে? (৬) ফোনে কোনো পেজ পাশে সরে না?
