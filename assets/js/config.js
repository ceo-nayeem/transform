/* =====================================================================
   FIT//OS — site configuration (landing page + checkout)
   Edit THIS file to change prices, payment numbers and contact links.
   No other file needs to change for those.
   ===================================================================== */
window.FITOS_SITE = {
  brand: 'FIT//OS',
  appUrl: 'app/',                       // the software lives at  yourdomain.com/app/
  currency: '৳',

  // Same Firebase project as the app (public web config — safe to keep in the browser).
  firebase: {
    apiKey: "AIzaSyC8y4IYzcU_T3CQ4LfZsZH6a-kmVx7UlsI",
    authDomain: "transform-v1.firebaseapp.com",
    projectId: "transform-v1",
    storageBucket: "transform-v1.firebasestorage.app",
    messagingSenderId: "552977260205",
    appId: "1:552977260205:web:c43346ab972d2d72ed3024"
  },

  // Subscription plans. id must stay one of: 1m, 3m, 6m, 12m (Firestore rules + admin console use these ids).
  // price = BDT (৳). Change the numbers any time — nothing else needs editing.
  plans: [
    { id: '1m',  label: 'Monthly',     months: 1,  price: 149, tag: '' },
    { id: '3m',  label: 'Quarterly',   months: 3,  price: 399, tag: '' },
    { id: '6m',  label: 'Half-Yearly', months: 6,  price: 699, tag: 'Popular' },
    { id: '12m', label: 'Yearly',      months: 12, price: 999, tag: 'Best value' }
  ],

  // Hours of provisional Pro access a customer gets while their payment is waiting for verification.
  // (Must stay ≤ 120 — the Firestore rule caps it at 5 days.)
  pendingHours: 96,

  // ⚠ PUT YOUR REAL NUMBERS HERE (the personal bKash / Nagad numbers customers will Send Money to).
  payment: {
    bkash: { name: 'bKash', number: '01XXXXXXXXX', kind: 'Send Money', color: '#e2136e' },
    nagad: { name: 'Nagad', number: '01XXXXXXXXX', kind: 'Send Money', color: '#f7941d' }
  },

  // Contact details shown on the Contact page and footer. Leave a value '' to hide that item.
  contact: {
    email: 'ceo.nayeemuhammad@gmail.com',
    whatsapp: '',          // e.g. '8801XXXXXXXXX' (country code, no +)
    facebook: '',          // e.g. 'https://facebook.com/yourpage'
    phone: ''
  },

  // Free-plan limits shown in the comparison table (keep in sync with Admin → Plans).
  free: { goals: 5, habits: 8, meals: 20 }
};
