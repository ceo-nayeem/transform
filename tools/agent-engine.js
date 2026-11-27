/* =====================================================================
   FIT//OS Marketing-Agent ENGINE  (UMD — runs in the Admin page AND in Node)
   Given a persona + the user's app state it produces the entries a real person
   with that personality would make (habits, meals, water, workouts, vitals,
   weigh-ins) — deterministic per (persona seed, date) and idempotent per event.
   Pure logic: no Firebase / DOM here.  Storage helpers (split/join/diff) mirror
   the app's dataService so the same data format is written.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AgentEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var VERSION = 1;

  /* ---------------- small utils ---------------- */
  function hash32(str) { var h = 2166136261; for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seedStr) { var a = hash32(seedStr) || 1; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function pick(r, arr) { return arr[Math.floor(r() * arr.length) % arr.length]; }
  function between(r, a, b) { return a + (b - a) * r(); }
  function ri(r, a, b) { return Math.round(between(r, a, b)); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function r1(x) { return Math.round(x * 10) / 10; }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function hm(min) { min = clamp(Math.round(min), 0, 1439); return p2(Math.floor(min / 60)) + ':' + p2(min % 60); }
  function toMin(s, d) { var m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '')); return m ? (+m[1]) * 60 + (+m[2]) : d; }
  function utc(ds) { var p = ds.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2], 12); }
  function addDays(ds, n) { var d = new Date(utc(ds) + n * 864e5); return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()); }
  function dow(ds) { return new Date(utc(ds)).getUTCDay(); }
  function dayNo(ds) { return Math.round(utc(ds) / 864e5); }
  function diffDays(a, b) { return dayNo(b) - dayNo(a); }
  function weekStart(ds) { return addDays(ds, -dow(ds)); }
  function localParts(ms, tz) {
    var f = new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    var o = {}; f.formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = p.value; });
    return { date: o.year + '-' + o.month + '-' + o.day, min: (+o.hour % 24) * 60 + (+o.minute) };
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  // epoch ms of a given local date + minute-of-day in a time zone
  function msFor(date, min, tz) {
    var p = date.split('-'), ms = Date.UTC(+p[0], +p[1] - 1, +p[2], 12, 0);
    for (var i = 0; i < 3; i++) { var lp = localParts(ms, tz); var d = (min - lp.min) + 1440 * (dayNo(date) - dayNo(lp.date)); if (!d) break; ms += d * 60000; }
    return ms;
  }

  /* ---------------- food database (per 100 g) ---------------- */
  var ING = {
    'Cooked white rice': [130, 2.7, 28, 0.3, 0.4, 0], 'Cooked brown rice': [112, 2.3, 23, 0.8, 1.8, 0], 'Whole wheat roti': [290, 9, 50, 6, 5, 0], 'Paratha': [326, 7, 44, 13, 3, 0],
    'Rolled oats': [389, 16.9, 66, 6.9, 10.6, 0], 'Boiled egg': [155, 12.6, 1.1, 10.6, 0, 0.1], 'Omelette': [154, 11, 1, 12, 0, 0.1], 'Chicken breast (cooked)': [165, 31, 0, 3.6, 0, 0], 'Chicken curry': [150, 14, 4, 8, 0.8, 0],
    'Rui fish curry': [130, 16, 2, 6, 0.3, 0.4], 'Grilled salmon': [208, 20, 0, 13, 0, 2.2], 'Beef bhuna': [210, 22, 2, 13, 0.5, 0], 'Masoor dal': [116, 9, 20, 0.4, 7.9, 0], 'Moong dal': [105, 7, 19, 0.4, 7.6, 0],
    'Chickpeas (boiled)': [164, 8.9, 27, 2.6, 7.6, 0], 'Paneer': [265, 18, 1.2, 21, 0, 0], 'Greek yogurt': [59, 10, 3.6, 0.4, 0, 0], 'Yogurt (doi)': [61, 3.5, 4.7, 3.3, 0, 0], 'Milk': [61, 3.2, 4.8, 3.3, 0, 0],
    'Banana': [89, 1.1, 23, 0.3, 2.6, 0], 'Apple': [52, 0.3, 14, 0.2, 2.4, 0], 'Mango': [60, 0.8, 15, 0.4, 1.6, 0], 'Papaya': [43, 0.5, 11, 0.3, 1.7, 0], 'Mixed berries': [57, 0.7, 14, 0.3, 2.4, 0],
    'Mixed vegetable curry': [70, 2, 9, 3, 3, 0], 'Cucumber tomato salad': [20, 1, 4, 0.2, 1.2, 0], 'Sautéed spinach': [45, 3, 4, 2.5, 2.4, 0.1], 'Boiled potato': [87, 1.9, 20, 0.1, 1.8, 0], 'Sweet potato': [86, 1.6, 20, 0.1, 3, 0],
    'Peanut butter': [588, 25, 20, 50, 6, 0], 'Almonds': [579, 21, 22, 50, 12.5, 0], 'Roasted peanuts': [567, 26, 16, 49, 8.5, 0], 'Whey protein': [400, 80, 8, 6, 0, 0], 'Whole wheat bread': [247, 13, 41, 3.4, 7, 0],
    'Khichuri': [135, 5.5, 22, 3, 2, 0], 'Canned tuna': [116, 26, 0, 1, 0, 0.3], 'Tofu': [76, 8, 1.9, 4.8, 0.3, 0], 'Avocado': [160, 2, 9, 15, 6.7, 0], 'Dark chocolate': [546, 4.9, 61, 31, 7, 0],
    'Honey': [304, 0.3, 82, 0, 0.2, 0], 'Digestive biscuits': [480, 7, 65, 20, 3, 0], 'Chia pudding': [140, 5, 12, 8, 9, 1.5], 'Muri (puffed rice)': [402, 6, 90, 0.5, 1.5, 0], 'Cottage cheese': [98, 11, 3.4, 4.3, 0, 0], 'Lentil soup': [90, 6, 14, 1.5, 4, 0]
  };
  var FLAGS = { 'Boiled egg': 'egg', 'Omelette': 'egg', 'Chicken breast (cooked)': 'meat', 'Chicken curry': 'meat', 'Rui fish curry': 'fish', 'Grilled salmon': 'fish', 'Beef bhuna': 'meat', 'Canned tuna': 'fish',
    'Paneer': 'dairy', 'Greek yogurt': 'dairy', 'Yogurt (doi)': 'dairy', 'Milk': 'dairy', 'Cottage cheese': 'dairy', 'Whey protein': 'dairy', 'Honey': 'honey' };
  function ingredient(name, g) {
    var d = ING[name], f = g / 100;
    return { name: name, weight: g, cal: r1(d[0] * f), pro: r1(d[1] * f), carb: r1(d[2] * f), fat: r1(d[3] * f), fiber: r1(d[4] * f), omega3: r1(d[5] * f) };
  }
  // [name, type, [[ingredient, grams]...], tags]
  var MEALS = [
    ['Oats with banana & almonds', 'Breakfast', [['Rolled oats', 60], ['Milk', 200], ['Banana', 100], ['Almonds', 15]], 'light'],
    ['Egg omelette with roti', 'Breakfast', [['Omelette', 120], ['Whole wheat roti', 80], ['Cucumber tomato salad', 80]], 'std'],
    ['Paratha & boiled eggs', 'Breakfast', [['Paratha', 100], ['Boiled egg', 100], ['Banana', 80]], 'heavy'],
    ['Greek yogurt berry bowl', 'Breakfast', [['Greek yogurt', 200], ['Mixed berries', 80], ['Rolled oats', 30], ['Honey', 10]], 'light'],
    ['Peanut butter toast & milk', 'Breakfast', [['Whole wheat bread', 80], ['Peanut butter', 25], ['Banana', 100], ['Milk', 200]], 'std'],
    ['Tofu scramble & toast', 'Breakfast', [['Tofu', 150], ['Whole wheat bread', 70], ['Avocado', 50]], 'veg'],
    ['Khichuri with egg', 'Breakfast', [['Khichuri', 250], ['Boiled egg', 50]], 'std'],
    ['Chicken rice bowl', 'Lunch', [['Cooked white rice', 220], ['Chicken breast (cooked)', 140], ['Sautéed spinach', 100]], 'std'],
    ['Rice, dal & vegetables', 'Lunch', [['Cooked white rice', 200], ['Masoor dal', 180], ['Mixed vegetable curry', 150], ['Cucumber tomato salad', 80]], 'veg'],
    ['Rui fish curry meal', 'Lunch', [['Cooked white rice', 220], ['Rui fish curry', 150], ['Mixed vegetable curry', 120], ['Masoor dal', 100]], 'std'],
    ['Chicken curry & roti', 'Lunch', [['Whole wheat roti', 120], ['Chicken curry', 200], ['Cucumber tomato salad', 100]], 'std'],
    ['Beef bhuna with rice', 'Lunch', [['Cooked white rice', 220], ['Beef bhuna', 140], ['Sautéed spinach', 100]], 'heavy'],
    ['Paneer & brown rice bowl', 'Lunch', [['Cooked brown rice', 200], ['Paneer', 100], ['Mixed vegetable curry', 150]], 'veg'],
    ['Chickpea salad bowl', 'Lunch', [['Chickpeas (boiled)', 180], ['Cucumber tomato salad', 150], ['Avocado', 60], ['Whole wheat bread', 40]], 'veg'],
    ['Tuna & sweet potato plate', 'Lunch', [['Canned tuna', 130], ['Sweet potato', 200], ['Sautéed spinach', 100]], 'light'],
    ['Grilled chicken & vegetables', 'Dinner', [['Chicken breast (cooked)', 180], ['Mixed vegetable curry', 200], ['Cooked brown rice', 120]], 'std'],
    ['Salmon with sweet potato', 'Dinner', [['Grilled salmon', 150], ['Sweet potato', 200], ['Sautéed spinach', 100]], 'light'],
    ['Dal, roti & sabzi', 'Dinner', [['Moong dal', 200], ['Whole wheat roti', 100], ['Mixed vegetable curry', 150]], 'veg'],
    ['Fish curry & rice', 'Dinner', [['Cooked white rice', 180], ['Rui fish curry', 150], ['Sautéed spinach', 100]], 'std'],
    ['Egg curry & roti', 'Dinner', [['Boiled egg', 150], ['Whole wheat roti', 100], ['Mixed vegetable curry', 150]], 'std'],
    ['Paneer tikka with salad', 'Dinner', [['Paneer', 150], ['Cucumber tomato salad', 150], ['Whole wheat roti', 60]], 'veg'],
    ['Lentil soup & toast', 'Dinner', [['Lentil soup', 350], ['Whole wheat bread', 60], ['Cucumber tomato salad', 100]], 'veg'],
    ['Beef & potato dinner', 'Dinner', [['Beef bhuna', 150], ['Boiled potato', 200], ['Sautéed spinach', 100]], 'heavy'],
    ['Apple & almonds', 'Snack', [['Apple', 150], ['Almonds', 20]], 'light'],
    ['Roasted peanuts', 'Snack', [['Roasted peanuts', 40]], 'std'],
    ['Yogurt & mango', 'Snack', [['Yogurt (doi)', 150], ['Mango', 100]], 'std'],
    ['Muri & peanuts', 'Snack', [['Muri (puffed rice)', 30], ['Roasted peanuts', 20]], 'std'],
    ['Dark chocolate & banana', 'Snack', [['Dark chocolate', 20], ['Banana', 100]], 'treat'],
    ['Cottage cheese & papaya', 'Snack', [['Cottage cheese', 120], ['Papaya', 120]], 'light'],
    ['Chia pudding', 'Snack', [['Chia pudding', 150]], 'light'],
    ['Biscuits & tea', 'Snack', [['Digestive biscuits', 40], ['Milk', 100]], 'treat'],
    ['Banana & peanut butter', 'Pre-workout', [['Banana', 120], ['Peanut butter', 15]], 'std'],
    ['Oats & honey', 'Pre-workout', [['Rolled oats', 40], ['Milk', 150], ['Honey', 8]], 'std'],
    ['Whey shake & banana', 'Post-workout', [['Whey protein', 30], ['Milk', 250], ['Banana', 100]], 'std'],
    ['Chicken & rice recovery bowl', 'Post-workout', [['Cooked white rice', 180], ['Chicken breast (cooked)', 120]], 'std'],
    ['Boiled eggs & fruit', 'Post-workout', [['Boiled egg', 100], ['Apple', 120]], 'std']
  ];
  function mealOk(m, avoid) { return m[2].every(function (x) { var f = FLAGS[x[0]]; return !(f && avoid.indexOf(f) >= 0); }); }
  function mealBase(m) { var k = 0; m[2].forEach(function (x) { k += ING[x[0]][0] * x[1] / 100; }); return k; }
  function buildMeal(tpl, type, kcalTarget, time, notes) {
    var scale = clamp(kcalTarget / Math.max(1, mealBase(tpl)), 0.55, 1.7);
    var ings = tpl[2].map(function (x) { var g = Math.max(5, Math.round(x[1] * scale / 5) * 5); return ingredient(x[0], g); });
    var t = { kcal: 0, pro: 0, carb: 0, fat: 0, fiber: 0, omega3: 0 };
    ings.forEach(function (i) { t.kcal += i.cal; t.pro += i.pro; t.carb += i.carb; t.fat += i.fat; t.fiber += i.fiber; t.omega3 += i.omega3; });
    return { name: tpl[0], type: type, time: time, kcal: Math.round(t.kcal), protein: Math.round(t.pro), carbs: Math.round(t.carb), fat: Math.round(t.fat), fiber: Math.round(t.fiber), omega3: Math.round(t.omega3), notes: notes || '', ingredients: ings };
  }

  /* ---------------- workouts ---------------- */
  // [name, type, muscles, sets, reps, restSec, baseKg(male, intermediate)]
  var EX = {
    push: [['Barbell Bench Press', 'strength', ['Chest', 'Triceps', 'Shoulders'], 4, '8-10', 90, 60], ['Incline Dumbbell Press', 'strength', ['Chest', 'Shoulders'], 3, '10', 75, 22], ['Seated Dumbbell Press', 'strength', ['Shoulders', 'Triceps'], 3, '10', 75, 18], ['Lateral Raise', 'strength', ['Shoulders'], 3, '12-15', 45, 8], ['Rope Pushdown', 'strength', ['Triceps'], 3, '12', 45, 22]],
    pull: [['Lat Pulldown', 'strength', ['Back', 'Biceps'], 4, '10', 75, 50], ['Barbell Bent-Over Row', 'strength', ['Back', 'Biceps'], 4, '8-10', 90, 50], ['Seated Cable Row', 'strength', ['Back'], 3, '12', 60, 45], ['Face Pull', 'strength', ['Shoulders', 'Back'], 3, '15', 45, 20], ['Barbell Curl', 'strength', ['Biceps'], 3, '10', 60, 25], ['Hammer Curl', 'strength', ['Biceps'], 3, '12', 45, 12]],
    legs: [['Barbell Back Squat', 'strength', ['Quads', 'Glutes'], 4, '6-8', 120, 70], ['Romanian Deadlift', 'strength', ['Hamstrings', 'Glutes'], 3, '8-10', 90, 60], ['Leg Press', 'strength', ['Quads', 'Glutes'], 3, '12', 90, 120], ['Lying Leg Curl', 'strength', ['Hamstrings'], 3, '12', 60, 35], ['Standing Calf Raise', 'strength', ['Calves'], 4, '15', 45, 50]],
    upper: [['Barbell Bench Press', 'strength', ['Chest', 'Triceps'], 4, '8', 90, 60], ['Lat Pulldown', 'strength', ['Back', 'Biceps'], 4, '10', 75, 50], ['Seated Dumbbell Press', 'strength', ['Shoulders'], 3, '10', 75, 18], ['Seated Cable Row', 'strength', ['Back'], 3, '12', 60, 45], ['Barbell Curl', 'strength', ['Biceps'], 3, '10', 60, 25]],
    lower: [['Barbell Back Squat', 'strength', ['Quads', 'Glutes'], 4, '8', 120, 70], ['Romanian Deadlift', 'strength', ['Hamstrings', 'Glutes'], 3, '10', 90, 60], ['Leg Press', 'strength', ['Quads'], 3, '12', 90, 120], ['Standing Calf Raise', 'strength', ['Calves'], 4, '15', 45, 50], ['Plank', 'timed', ['Core'], 3, '', 45, 0]],
    full: [['Goblet Squat', 'strength', ['Quads', 'Glutes'], 3, '12', 75, 20], ['Machine Chest Press', 'strength', ['Chest'], 3, '12', 75, 35], ['Lat Pulldown', 'strength', ['Back'], 3, '12', 75, 40], ['Seated Dumbbell Press', 'strength', ['Shoulders'], 3, '10', 75, 14], ['Plank', 'timed', ['Core'], 3, '', 45, 0]],
    chest: [['Barbell Bench Press', 'strength', ['Chest'], 4, '8', 90, 60], ['Incline Dumbbell Press', 'strength', ['Chest'], 4, '10', 75, 22], ['Cable Fly', 'strength', ['Chest'], 3, '12', 60, 15], ['Push-Ups', 'bodyweight', ['Chest', 'Triceps'], 3, '15', 45, 0]],
    back: [['Barbell Bent-Over Row', 'strength', ['Back'], 4, '8', 90, 55], ['Lat Pulldown', 'strength', ['Back'], 4, '10', 75, 50], ['Seated Cable Row', 'strength', ['Back'], 3, '12', 60, 45], ['Deadlift', 'strength', ['Back', 'Hamstrings', 'Glutes'], 3, '5', 150, 90]],
    shoulders: [['Seated Dumbbell Press', 'strength', ['Shoulders'], 4, '10', 75, 20], ['Lateral Raise', 'strength', ['Shoulders'], 4, '12-15', 45, 9], ['Face Pull', 'strength', ['Shoulders'], 3, '15', 45, 20], ['Barbell Shrug', 'strength', ['Traps'], 3, '12', 60, 50]],
    arms: [['Barbell Curl', 'strength', ['Biceps'], 4, '10', 60, 25], ['Hammer Curl', 'strength', ['Biceps'], 3, '12', 45, 12], ['Rope Pushdown', 'strength', ['Triceps'], 4, '12', 45, 22], ['Overhead Triceps Extension', 'strength', ['Triceps'], 3, '12', 45, 18]],
    home: [['Push-Ups', 'bodyweight', ['Chest', 'Triceps'], 4, '15', 45, 0], ['Bodyweight Squat', 'bodyweight', ['Quads', 'Glutes'], 4, '20', 45, 0], ['Glute Bridge', 'bodyweight', ['Glutes'], 3, '15', 45, 0], ['Plank', 'timed', ['Core'], 3, '', 45, 0], ['Mountain Climbers', 'bodyweight', ['Core', 'Cardio'], 3, '30', 30, 0]],
    cardio: [['Running', 'cardio', ['Cardio'], 1, '', 0, 0], ['Cycling', 'cardio', ['Cardio'], 1, '', 0, 0], ['Brisk Walking', 'cardio', ['Cardio'], 1, '', 0, 0], ['Jump Rope', 'cardio', ['Cardio'], 1, '', 0, 0]],
    yoga: [['Sun Salutations', 'flex', ['Mobility'], 1, '', 0, 0], ['Cat-Cow Stretch', 'flex', ['Mobility', 'Back'], 1, '', 0, 0], ['Hip Flexor Stretch', 'flex', ['Hips'], 1, '', 0, 0], ["Child's Pose", 'flex', ['Back'], 1, '', 0, 0]]
  };
  var SPLITS = {
    ppl: ['push', 'pull', 'legs'], upperlower: ['upper', 'lower'], fullbody: ['full'], bro: ['chest', 'back', 'legs', 'shoulders', 'arms'],
    home: ['home', 'cardio', 'home'], cardio: ['cardio', 'cardio', 'home'], yoga: ['yoga']
  };
  var DAYPAT = { 1: [6], 2: [2, 5], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6], 6: [1, 2, 3, 4, 5, 6], 7: [0, 1, 2, 3, 4, 5, 6] };

  /* ---------------- habits (same templates as onboarding) ---------------- */
  var HABITS = {
    water: { name: 'Drink water', emoji: '💧', cat: 'Health', type: 'amount', target: 8, unit: 'glasses', step: 1, tod: 'any', freq: { t: 'daily' }, why: 'Steady hydration = better energy and focus' },
    steps: { name: 'Walk 8,000 steps', emoji: '🚶', cat: 'Fitness', type: 'amount', target: 8000, unit: 'steps', step: 1000, tod: 'any', freq: { t: 'daily' } },
    sleep: { name: 'In bed by 11 PM', emoji: '😴', cat: 'Sleep', type: 'check', tod: 'evening', freq: { t: 'daily' }, cue: 'Phone down, lights low' },
    sleep7: { name: 'Sleep 7+ hours', emoji: '🛏️', cat: 'Sleep', type: 'amount', target: 7, unit: 'hours', step: 0.5, tod: 'any', freq: { t: 'daily' } },
    meditate: { name: 'Meditate', emoji: '🧘', cat: 'Mindfulness', type: 'timer', target: 10, tod: 'morning', freq: { t: 'daily' } },
    stretch: { name: 'Stretch', emoji: '🤸', cat: 'Fitness', type: 'timer', target: 10, tod: 'morning', freq: { t: 'daily' } },
    nosugar: { name: 'No sugary drinks', emoji: '🍬', cat: 'Nutrition', type: 'avoid', tod: 'any', freq: { t: 'daily' } },
    protein: { name: 'Protein with every meal', emoji: '🥩', cat: 'Nutrition', type: 'check', tod: 'any', freq: { t: 'daily' } },
    logmeals: { name: 'Log my meals', emoji: '🍎', cat: 'Nutrition', type: 'check', tod: 'evening', freq: { t: 'daily' } },
    train3: { name: 'Workout (3× a week)', emoji: '🏋️', cat: 'Fitness', type: 'check', tod: 'any', freq: { t: 'weekly', n: 3 } },
    read: { name: 'Read 15 minutes', emoji: '📖', cat: 'Learning', type: 'timer', target: 15, tod: 'evening', freq: { t: 'daily' } },
    weigh: { name: 'Weekly weigh-in', emoji: '⚖️', cat: 'Health', type: 'check', tod: 'morning', freq: { t: 'weekly', n: 1 } },
    pray: { name: 'Gratitude journal', emoji: '📝', cat: 'Mindfulness', type: 'check', tod: 'evening', freq: { t: 'daily' }, cue: 'Three good things from today' },
    nophone: { name: 'Screen time under 3h', emoji: '📵', cat: 'Productivity', type: 'timer', target: 180, tod: 'any', cmp: 'max', freq: { t: 'daily' } },
    run: { name: 'Run 5 km', emoji: '🏃', cat: 'Fitness', type: 'amount', target: 5, unit: 'km', step: 1, tod: 'morning', freq: { t: 'weekdays', days: [1, 3, 5] } },
    study: { name: 'Study session', emoji: '📚', cat: 'Learning', type: 'timer', target: 60, tod: 'evening', freq: { t: 'weekdays', days: [0, 1, 2, 3, 4] } },
    meal_prep: { name: 'Meal prep', emoji: '🥗', cat: 'Nutrition', type: 'check', tod: 'afternoon', freq: { t: 'weekdays', days: [0] } }
  };

  /* ---------------- personalities (presets) ---------------- */
  var PRESETS = {
    office_loss: { label: 'Office worker · fat loss', desc: 'Busy 9–5, trying to lose weight. Fairly consistent, skips workouts on tough days.',
      p: { gender: 'Male', age: 31, heightCm: 172, startWeight: 84, targetWeight: 74, goal: 'lose', wake: '06:45', bed: '23:15', traits: { consistency: 72, activity: 55, diet: 62, hydration: 60, detail: 65, vitals: 35 }, diet: { kcal: 1900, meals: 4, avoid: [] }, workout: { split: 'fullbody', days: 3, time: '18:30' }, habits: ['water', 'steps', 'sleep', 'nosugar', 'logmeals', 'train3', 'weigh'], voice: 'casual' } },
    gym_bulk: { label: 'Gym regular · lean bulk', desc: 'Lifts 5 days a week, eats high-protein, very consistent with logging.',
      p: { gender: 'Male', age: 26, heightCm: 178, startWeight: 68, targetWeight: 76, goal: 'gain', wake: '06:00', bed: '22:45', traits: { consistency: 90, activity: 90, diet: 82, hydration: 78, detail: 88, vitals: 50 }, diet: { kcal: 2900, meals: 5, avoid: [] }, workout: { split: 'ppl', days: 5, time: '17:30' }, habits: ['water', 'protein', 'sleep7', 'logmeals', 'stretch', 'weigh'], voice: 'upbeat' } },
    busy_mom: { label: 'Busy parent · stay healthy', desc: 'Squeezes in short home workouts, irregular meal times, misses some days.',
      p: { gender: 'Female', age: 34, heightCm: 160, startWeight: 66, targetWeight: 60, goal: 'lose', wake: '06:15', bed: '23:00', traits: { consistency: 62, activity: 45, diet: 58, hydration: 52, detail: 50, vitals: 30 }, diet: { kcal: 1650, meals: 4, avoid: ['meat'] }, workout: { split: 'home', days: 3, time: '10:30' }, habits: ['water', 'steps', 'stretch', 'sleep', 'nosugar'], voice: 'casual' } },
    beginner: { label: 'Beginner · inconsistent', desc: 'Just started. Logs most days at first, but with plenty of gaps and imperfect eating.',
      p: { gender: 'Male', age: 22, heightCm: 170, startWeight: 78, targetWeight: 70, goal: 'lose', wake: '08:00', bed: '00:30', traits: { consistency: 45, activity: 35, diet: 40, hydration: 40, detail: 35, vitals: 15 }, diet: { kcal: 2100, meals: 3, avoid: [] }, workout: { split: 'home', days: 2, time: '19:00' }, habits: ['water', 'steps', 'nosugar', 'sleep'], voice: 'casual' } },
    runner: { label: 'Runner · endurance', desc: 'Cardio-focused, lean, tracks sleep and heart rate closely.',
      p: { gender: 'Female', age: 29, heightCm: 165, startWeight: 57, targetWeight: 56, goal: 'maintain', wake: '05:30', bed: '22:00', traits: { consistency: 88, activity: 85, diet: 80, hydration: 85, detail: 75, vitals: 85 }, diet: { kcal: 2200, meals: 4, avoid: [] }, workout: { split: 'cardio', days: 5, time: '06:00' }, habits: ['run', 'water', 'sleep7', 'stretch', 'weigh'], voice: 'upbeat' } },
    yoga_veg: { label: 'Wellness · vegetarian & yoga', desc: 'Vegetarian, mindful, daily yoga, meditation, gratitude journaling.',
      p: { gender: 'Female', age: 38, heightCm: 158, startWeight: 62, targetWeight: 58, goal: 'lose', wake: '05:45', bed: '22:15', traits: { consistency: 85, activity: 60, diet: 88, hydration: 80, detail: 70, vitals: 55 }, diet: { kcal: 1750, meals: 4, avoid: ['meat', 'fish', 'egg'] }, workout: { split: 'yoga', days: 5, time: '06:15' }, habits: ['meditate', 'stretch', 'water', 'pray', 'sleep', 'nosugar'], voice: 'calm' } },
    student: { label: 'Student · busy & late nights', desc: 'Irregular schedule, snacks a lot, studies in the evening, workouts at home.',
      p: { gender: 'Male', age: 20, heightCm: 174, startWeight: 64, targetWeight: 68, goal: 'gain', wake: '08:30', bed: '01:00', traits: { consistency: 55, activity: 50, diet: 45, hydration: 45, detail: 45, vitals: 20 }, diet: { kcal: 2500, meals: 4, avoid: [] }, workout: { split: 'home', days: 3, time: '20:00' }, habits: ['study', 'water', 'read', 'steps', 'nophone'], voice: 'casual' } },
    athlete: { label: 'Athlete · hyper consistent', desc: 'Never misses. Precise logging, 6 training days, optimised nutrition and recovery.',
      p: { gender: 'Male', age: 24, heightCm: 182, startWeight: 80, targetWeight: 82, goal: 'maintain', wake: '05:30', bed: '22:00', traits: { consistency: 97, activity: 97, diet: 94, hydration: 92, detail: 96, vitals: 90 }, diet: { kcal: 3100, meals: 5, avoid: [] }, workout: { split: 'bro', days: 6, time: '16:30' }, habits: ['water', 'protein', 'sleep7', 'stretch', 'logmeals', 'weigh', 'meditate'], voice: 'serious' } }
  };
  var VOICE = {
    casual: { meal: ['Quick one today', 'Tasty!', 'Homemade', 'Ate on the go', ''], day: ['Busy day but managed', 'Not my best day', 'Felt good today', 'Tired but showed up'] },
    upbeat: { meal: ['Fuel!', 'Prepped this on Sunday', 'Hit my protein', 'Loving this one', ''], day: ['Great session!', 'PR today 💪', 'Feeling strong', 'Energy was high'] },
    calm: { meal: ['Mindful eating', 'Fresh and light', 'Cooked at home', ''], day: ['Calm and steady', 'Grateful today', 'Slow morning, good day'] },
    serious: { meal: ['Planned', 'On target', 'Macros hit', ''], day: ['Volume completed', 'On plan', 'Recovery focus'] }
  };

  function defaultPersona(presetId, over) {
    var pr = PRESETS[presetId] || PRESETS.office_loss, p = clone(pr.p);
    p.preset = PRESETS[presetId] ? presetId : 'office_loss'; p.name = ''; p.tz = 'Asia/Dhaka'; p.seed = Math.random().toString(36).slice(2, 10); p.applyName = false; p.backfillDays = 0;
    p.planDays = 120; p.cheat = true; p.weighDay = 5;
    if (over) Object.keys(over).forEach(function (k) { if (k === 'traits' || k === 'diet' || k === 'workout') p[k] = Object.assign(p[k], over[k]); else p[k] = over[k]; });
    return p;
  }
  function norm(p) {
    p = clone(p || {}); var d = defaultPersona(p.preset || 'office_loss');
    var o = Object.assign({}, d, p); o.traits = Object.assign({}, d.traits, p.traits || {}); o.diet = Object.assign({}, d.diet, p.diet || {}); o.workout = Object.assign({}, d.workout, p.workout || {});
    if (!Array.isArray(o.habits)) o.habits = d.habits; if (!Array.isArray(o.diet.avoid)) o.diet.avoid = [];
    o.seed = String(o.seed || 'seed'); o.tz = o.tz || 'Asia/Dhaka'; return o;
  }
  function T(p, k) { return clamp((p.traits[k] == null ? 60 : p.traits[k]) / 100, 0, 1); }

  /* ---------------- day plan ---------------- */
  function dayMode(p, date) {
    var r = rng(p.seed + '|mode|' + date), c = T(p, 'consistency'), x = r();
    var off = (1 - c) * 0.16, lazy = (1 - c) * 0.34 + off;
    return x < off ? 'off' : x < lazy ? 'lazy' : x < lazy + (1 - c) * 0.3 ? 'ok' : 'great';
  }
  var KEEP = { great: 0.97, ok: 0.8, lazy: 0.45, off: 0.07 };

  function weightFor(p, date, since) {
    var r = rng(p.seed + '|w|' + date), span = Math.max(14, p.planDays || 120), f = clamp(diffDays(since, date) / span, 0, 1.2);
    f = 1 - Math.pow(1 - clamp(f, 0, 1), 1.35);   // fast at first, slowing near the goal
    var base = p.startWeight + (p.targetWeight - p.startWeight) * f * (0.55 + T(p, 'consistency') * 0.45);
    return r1(base + (r() - 0.5) * 0.9);
  }

  function planDay(pIn, date, opts) {
    var p = norm(pIn), ev = [], seq = 0, since = (opts && opts.since) || date;
    var r = rng(p.seed + '|plan|' + date), mode = dayMode(p, date), keep = KEEP[mode], wd = dow(date), weekend = (wd === 5 || wd === 6);
    var wake = toMin(p.wake, 400), bed = toMin(p.bed, 1380); if (bed < wake) bed += 1440;
    function add(min, kind, data, always) { if (!always && r() > keep) return; ev.push(Object.assign({ id: date + '|' + kind + '|' + (seq++), min: clamp(Math.round(min), 0, 1439), kind: kind, date: date }, data)); }
    var jit = function (a) { return Math.round((r() - 0.5) * 2 * a); };

    var sleepH = null;
    /* -- vitals (sleep) on the morning after -- */
    if (r() < T(p, 'vitals') * (mode === 'off' ? 0.2 : 0.9)) {
      var ath = T(p, 'activity');
      sleepH = r1(clamp(7.2 + (T(p, 'consistency') - 0.5) * 0.9 + (r() - 0.5) * 1.8 - (mode === 'lazy' ? 0.4 : 0), 4.8, 9.4));
      var wk = wake + jit(25), bd = ((wk + 1440 - Math.round(sleepH * 60)) % 1440);
      add(wk + 15, 'vitals', { v: { hr: ri(r, 82 - ath * 26, 82 - ath * 26 + 8), sys: ri(r, 108, 126), dia: ri(r, 68, 82), sleep: sleepH, quality: clamp(Math.round(sleepH - 1.2 + (r() - 0.5) * 2), 3, 10), bed: hm(bd), wake: hm(wk) } }, true);
    }
    /* -- weigh-in -- */
    if (wd === (p.weighDay == null ? 5 : p.weighDay) && r() < 0.5 + T(p, 'consistency') * 0.5) {
      var wv = weightFor(p, date, since), br = rng(p.seed + '|body'), bf0 = (p.gender === 'Female' ? 27 : 18) + (p.startWeight - 70) * 0.12 + br() * 2, wa0 = (p.gender === 'Female' ? 70 : 80) + (p.startWeight - 62) * 0.55 + br() * 2;
      add(wake + 20 + jit(15), 'weigh', { w: wv, bf: r1(bf0 + (wv - p.startWeight) * 0.35 + (r() - 0.5) * 0.5), waist: r1(wa0 + (wv - p.startWeight) * 0.9 + (r() - 0.5) * 0.6) }, true);
    }
    /* -- meals -- */
    var nM = p.diet.meals, kc = p.diet.kcal * (mode === 'off' ? 0.6 : 1) * (weekend && p.cheat && T(p, 'diet') < 0.75 ? 1.12 : 1);
    var share = nM <= 3 ? { Breakfast: .28, Lunch: .38, Dinner: .34 } : nM === 4 ? { Breakfast: .25, Lunch: .33, Dinner: .30, Snack: .12 } : { Breakfast: .22, Lunch: .30, Dinner: .28, Snack: .10, 'Post-workout': .10 };
    var tm = { Breakfast: wake + 55, Lunch: 13 * 60 + 5, Dinner: 20 * 60 + 15, Snack: 16 * 60 + 40, 'Pre-workout': 0, 'Post-workout': 0 };
    var wo = null;
    var pat = DAYPAT[clamp(Math.round(p.workout.days || 3), 1, 7)] || DAYPAT[3];
    if (pat.indexOf(wd) >= 0 && (mode === 'great' || r() < keep * T(p, 'activity') + 0.2)) wo = true;
    var woMin = toMin(p.workout.time, 1110);
    if (wo && share['Post-workout'] == null && nM >= 4 && r() < 0.5) { share = { Breakfast: .24, Lunch: .32, Dinner: .30, 'Post-workout': .14 }; }
    if (wo) tm['Post-workout'] = woMin + 75;
    var types = Object.keys(share);
    types.forEach(function (type, i) {
      if (type === 'Post-workout' && !wo) return;
      var pool = MEALS.filter(function (m) { return m[1] === type && mealOk(m, p.diet.avoid); });
      if (!pool.length) return;
      var q = T(p, 'diet'), want = pool.filter(function (m) { var t = m[3]; return q > 0.7 ? t !== 'treat' && t !== 'heavy' : q < 0.5 ? t !== 'light' : t !== 'treat' || r() < 0.3; });
      var tpl = pick(r, want.length ? want : pool);
      var tgt = kc * share[type] * between(r, 0.9, 1.1) * (type === 'Snack' && weekend && p.cheat ? 1.25 : 1);
      var tmin = tm[type] + jit(type === 'Breakfast' ? 25 : 30) + (T(p, 'consistency') < 0.6 ? jit(30) : 0);
      var note = (r() < 0.25 + (1 - T(p, 'detail')) * 0) ? pick(r, VOICE[p.voice] ? VOICE[p.voice].meal : VOICE.casual.meal) : '';
      var skipP = type === 'Breakfast' ? (1 - T(p, 'consistency')) * 0.25 : 0;
      if (r() < skipP) return;
      add(tmin, 'meal', { type: type, tpl: tpl[0], kcal: Math.round(tgt), note: note, quick: r() > T(p, 'detail') && r() < 0.5 });
    });
    /* -- water: glasses through the day -- */
    var wGoal = 12, wantG = Math.round(wGoal * clamp(0.45 + T(p, 'hydration') * 0.75 + (r() - 0.5) * 0.2, 0.25, 1.15) * (mode === 'off' ? 0.5 : 1));
    var left = wantG, tcur = wake + 25;
    while (left > 0) { var n = Math.min(left, r() < 0.3 ? 2 : 1); add(tcur, 'water', { g: n }, true); left -= n; tcur += ri(r, 55, 110); if (tcur > bed - 90 - 1440 * 0) tcur = Math.min(tcur, 1380); }
    /* -- workout -- */
    if (wo) {
      var sp = SPLITS[p.workout.split] || SPLITS.fullbody, weekNo = Math.floor(dayNo(weekStart(date)) / 7), idx = (weekNo * pat.length + pat.indexOf(wd)) % sp.length;
      add(woMin + jit(20), 'workout', { split: sp[idx], week: diffDays(since, date) / 7 }, true);
    }
    /* -- habits -- */
    (opts && opts.habits || []).forEach(function (h) {
      if (!h || !h.fromAgent) return;
      var due = habitDue(h, date, p);
      if (h.key === 'train3') due = !!wo && date >= (h.start || '0000');          // follows the real workout days
      if (h.key === 'weigh') due = wd === (p.weighDay == null ? 5 : p.weighDay) && date >= (h.start || '0000');
      if (!due) return;
      var hr = rng(p.seed + '|h|' + h.id + '|' + date), done = hr() < keep * (0.78 + T(p, 'consistency') * 0.22);
      if (h.key === 'train3') done = true;
      var tod = { morning: [wake + 30, 11 * 60], afternoon: [13 * 60, 16 * 60 + 30], evening: [19 * 60, Math.min(bed - 20, 1400)], any: [10 * 60, 20 * 60] }[h.tod || 'any'];
      var tmn = between(hr, tod[0], Math.max(tod[0] + 20, tod[1]));
      var extra = {};
      if (h.key === 'sleep7') { var sv = sleepH != null ? sleepH : r1(between(hr, 5.6, 8.4)); extra.val = sv; done = sv >= 7; tmn = between(hr, wake + 20, wake + 90); }
      if (h.key === 'water') { extra.val = wantG; done = wantG >= 8; tmn = Math.max(tmn, 15 * 60); }
      ev.push(Object.assign({ id: date + '|habit|' + h.key, min: Math.round(tmn), kind: 'habit', date: date, hk: h.key, hid: h.id, done: done, f: between(hr, 0.72, 1.18), slip: hr() > T(p, 'diet') + 0.2 && hr() < 0.5, note: (hr() < 0.07) ? pick(hr, (VOICE[p.voice] || VOICE.casual).day) : '' }, extra));
    });
    /* -- day note (rare) -- */
    ev.sort(function (a, b) { return a.min - b.min || (a.id < b.id ? -1 : 1); });
    return ev;
  }
  function habitDue(h, date, p) {
    var f = h.freq || { t: 'daily' };
    if (date < (h.start || '0000')) return false;
    switch (f.t) {
      case 'daily': return true;
      case 'weekdays': return (f.days || []).indexOf(dow(date)) >= 0;
      case 'monthdays': return (f.days || []).indexOf(+date.slice(8)) >= 0;
      case 'interval': return diffDays(h.start || date, date) % Math.max(1, f.n || 1) === 0;
      case 'weekly': { var r = rng(p.seed + '|wk|' + h.id + '|' + weekStart(date)), days = [0, 1, 2, 3, 4, 5, 6]; for (var i = 6; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = days[i]; days[i] = days[j]; days[j] = t; } return days.slice(0, Math.min(7, f.n || 1)).indexOf(dow(date)) >= 0; }
      case 'monthly': { var r2 = rng(p.seed + '|mo|' + h.id + '|' + date.slice(0, 7)); return r2() < (f.n || 1) / 30; }
      default: return false;
    }
  }

  /* ---------------- applying events to the app state ---------------- */
  function getDay(S, ds) { if (!S.dailyData) S.dailyData = {}; if (!S.dailyData[ds]) S.dailyData[ds] = { meals: [], exercises: [], glasses: 0, customMl: 0 }; var d = S.dailyData[ds]; if (!d.meals) d.meals = []; if (!d.exercises) d.exercises = []; if (typeof d.glasses !== 'number') d.glasses = 0; if (typeof d.customMl !== 'number') d.customMl = 0; return d; }
  var MEAL_ORDER = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Pre-workout', 'Post-workout'];
  function sortMeals(meals) { meals.sort(function (a, b) { var x = MEAL_ORDER.indexOf(a.type); if (x < 0) x = 9; var y = MEAL_ORDER.indexOf(b.type); if (y < 0) y = 9; return x - y; }); }
  function hid(seed) { return hash32(seed).toString(36) + hash32(seed + 'x').toString(36).slice(0, 3); }
  function findHabit(S, key) { return (S.habits || []).filter(function (h) { return h.fromAgent === key; })[0] || null; }

  function applyEvent(S, p, e, ctx) {
    var ds = e.date, r = rng(p.seed + '|ap|' + e.id), out = null;
    if (e.kind === 'water') {
      var d = getDay(S, ds); d.glasses += e.g; out = '💧 Drank ' + (e.g * 250) + ' ml water';
    } else if (e.kind === 'meal') {
      var d2 = getDay(S, ds), tpl = MEALS.filter(function (m) { return m[0] === e.tpl; })[0]; if (!tpl) return null;
      var m = buildMeal(tpl, e.type, e.kcal, hm(e.min), e.note);
      if (e.quick) { m.ingredients = []; m.notes = m.notes || 'quick log'; }
      d2.meals.push(m); sortMeals(d2.meals);
      // sometimes it is a saved library meal → stamp lastLogged (the Library shows "Recent meals")
      var lib = (S.mealLibrary || []).filter(function (x) { return x.name === m.name; })[0]; if (lib) { lib.lastLogged = ctx.stamp(e); lib.logCount = (lib.logCount || 0) + 1; }
      out = '🍽️ ' + e.type + ' — ' + m.name + ' (' + m.kcal + ' kcal, ' + m.protein + 'P/' + m.carbs + 'C/' + m.fat + 'F)';
    } else if (e.kind === 'workout') {
      var d3 = getDay(S, ds), list = EX[e.split] || EX.full, n = e.split === 'cardio' || e.split === 'yoga' ? 1 : list.length - (r() < 0.25 ? 1 : 0), names = [];
      var lvl = (p.gender === 'Female' ? 0.55 : 1) * (0.7 + T(p, 'activity') * 0.55) * (1 + clamp(e.week || 0, 0, 40) * 0.012);
      var items = e.split === 'cardio' ? [pick(r, list)] : e.split === 'yoga' ? list.slice(0, 3 + (r() < 0.5 ? 1 : 0)) : list.slice(0, Math.max(3, n));
      items.forEach(function (x) {
        var ex = { id: 'x' + hid(e.id + x[0]), name: x[0], type: x[1], muscles: x[2].slice(), muscle: x[2][0], notes: '', done: true };
        if (x[1] === 'cardio') { var dur = ri(r, 25, 50) * (0.8 + T(p, 'activity') * 0.4); ex.dur = Math.round(dur); ex.dist = r1(x[0] === 'Running' ? dur * 0.165 : x[0] === 'Cycling' ? dur * 0.3 : x[0] === 'Brisk Walking' ? dur * 0.09 : dur * 0.12); ex.intens = pick(r, ['Moderate', 'Moderate', 'High']); ex.kcal = Math.round(dur * (x[0] === 'Running' ? 10.5 : 7)); ex.sets = 1; ex.setsDone = 1; }
        else if (x[1] === 'flex') { ex.dur = ri(r, 8, 15); ex.sets = 1; ex.setsDone = 1; }
        else if (x[1] === 'timed') { ex.sets = x[3]; ex.hold = ri(r, 40, 70); ex.rest = x[5]; ex.setsDone = x[3]; }
        else { ex.sets = x[3]; ex.reps = x[4] || '12'; ex.rest = x[5]; ex.setsDone = x[3]; ex.weight = x[6] > 0 ? String(Math.max(2.5, Math.round(x[6] * lvl / 2.5) * 2.5)) : 'BW'; }
        d3.exercises.push(ex); names.push(x[0]);
      });
      if (r() < 0.2) ctx.dayNote = (VOICE[p.voice] || VOICE.casual).day[ri(r, 0, 3)];
      out = '🏋️ Workout (' + e.split + ') — ' + names.slice(0, 4).join(', ') + (names.length > 4 ? ' +' + (names.length - 4) : '');
    } else if (e.kind === 'vitals') {
      if (!S.vitals) S.vitals = []; if (S.vitals.some(function (v) { return v.date === ds; })) return null;
      var v = Object.assign({ id: 'h' + hid(p.seed + ds + 'v'), date: ds }, e.v); insertByDate(S.vitals, v);
      out = '❤️ Vitals — HR ' + v.hr + ', BP ' + v.sys + '/' + v.dia + ', sleep ' + v.sleep + ' h';
    } else if (e.kind === 'weigh') {
      if (!S.measurements) S.measurements = []; if (S.measurements.some(function (v) { return v.date === ds; })) return null;
      var me = { date: ds, weight: String(e.w), bf: String(e.bf), waist: String(e.waist) }; insertByDate(S.measurements, me);
      if (S.cfg) { S.cfg.weight = e.w; }
      out = '⚖️ Weigh-in — ' + e.w + ' kg';
    } else if (e.kind === 'habit') {
      var h = findHabit(S, e.hk); if (!h) return null;
      if (!h.logs) h.logs = {}; if (!h.vals) h.vals = {}; if (!h.checks) h.checks = {}; if (!h.notes) h.notes = {};
      var neg = h.type === 'avoid' || ((h.type === 'amount' || h.type === 'timer') && h.cmp === 'max');
      if (h.type === 'avoid') { if (e.done && !e.slip) h.logs[ds] = 'done'; else if (e.slip && !e.done) h.logs[ds] = 'x'; else return null; }
      else if (h.type === 'check') { if (e.done) h.logs[ds] = 'done'; else if (r() < 0.35) h.logs[ds] = 'x'; else return null; }
      else if (h.type === 'checklist') { var all = []; for (var i = 0; i < (h.items || []).length; i++) all.push(i); if (e.done) { h.checks[ds] = all; h.logs[ds] = 'done'; } else return null; }
      else { // amount / timer
        var tg = +h.target || 0; if (tg <= 0) return null;
        var val = e.done ? (neg ? tg * between(r, 0.55, 0.98) : tg * Math.max(1, e.f)) : tg * between(r, 0.25, 0.8);
        if (e.val != null) val = e.val;
        val = e.val != null ? Math.round(val * 2) / 2 : h.type === 'timer' || (h.step && h.step >= 1 && tg >= 20) ? Math.round(val / (h.step >= 1 ? Math.min(h.step, 5) : 1)) * (h.step >= 1 ? Math.min(h.step, 5) : 1) : Math.round(val * 2) / 2;
        if (val > 0) h.vals[ds] = val;
        if (neg) { if (val > tg) h.logs[ds] = 'x'; } else if (val >= tg) h.logs[ds] = 'done';
        if (!neg && val < tg && !e.done) { /* partial progress, stays open */ }
      }
      if (e.note) h.notes[ds] = e.note;
      out = (h.logs[ds] === 'done' ? '✅ ' : h.logs[ds] === 'x' ? '✖ ' : '… ') + h.name + (h.vals[ds] ? ' — ' + h.vals[ds] + (h.type === 'timer' ? ' min' : ' ' + (h.unit || '')) : '');
    }
    return out;
  }
  function insertByDate(arr, e) { var i = arr.length; while (i > 0 && arr[i - 1].date > e.date) i--; arr.splice(i, 0, e); }

  /* ---------------- setup (profile, libraries, habits) ---------------- */
  function ensureSetup(S, pIn, since, ast) {
    var p = norm(pIn), log = [], r = rng(p.seed + '|setup'), cfg = S.cfg || (S.cfg = {}), first = !ast.setup;
    var cal = p.diet.kcal, pro = Math.round(p.startWeight * (p.goal === 'gain' ? 2.0 : 1.8)), fat = Math.round(cal * 0.27 / 9), carb = Math.max(60, Math.round((cal - pro * 4 - fat * 9) / 4));
    if (first) {
      var nm = (p.name || '').trim();
      if (nm && (p.applyName || !cfg.name)) { cfg.name = nm.toUpperCase().slice(0, 40); cfg.initials = nm.replace(/[^A-Za-z ]/g, '').split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase() || cfg.initials; }
      cfg.gender = p.gender; cfg.age = p.age; cfg.height = p.heightCm; cfg.weight = p.startWeight; cfg.calGoal = cal; cfg.protGoal = pro; cfg.carbGoal = carb; cfg.fatGoal = fat; cfg.fiberGoal = p.gender === 'Female' ? 25 : 30; cfg.waterGoal = 12;
      if (S.onboarded === undefined || S.onboarded === false) S.onboarded = true;
      log.push('⚙️ Profile set: ' + (cfg.name || 'user') + ', ' + p.gender + ' ' + p.age + 'y, ' + p.heightCm + ' cm, goal ' + cal + ' kcal');
    }
    // ingredient library (first time)
    if (!S.ingredientLibrary) S.ingredientLibrary = [];
    if (!S.mealLibrary) S.mealLibrary = [];
    if (!ast.lib) {
      var used = {}; S.ingredientLibrary.forEach(function (i) { used[String(i.name).toLowerCase()] = 1; });
      var names = Object.keys(ING).filter(function (n) { var f = FLAGS[n]; return !(f && p.diet.avoid.indexOf(f) >= 0); }), added = 0;
      names.slice(0, 22).forEach(function (n, i) { if (used[n.toLowerCase()]) return; var d = ING[n]; S.ingredientLibrary.push({ id: Date.now() + i + added * 1000 + (hash32(p.seed + n) % 997), name: n, baseWeight: 100, unit: 'g', cal: d[0], pro: d[1], carb: d[2], fat: d[3], fiber: d[4], omega3: d[5], savedAt: new Date().toLocaleDateString() }); added++; });
      // meal library: a favourite set the persona cooks regularly
      var usedM = {}; S.mealLibrary.forEach(function (m) { usedM[m.name.toLowerCase()] = 1; });
      var picks = MEALS.filter(function (m) { return mealOk(m, p.diet.avoid) && !usedM[m[0].toLowerCase()]; }), mAdded = 0;
      for (var i2 = picks.length - 1; i2 > 0; i2--) { var j = Math.floor(r() * (i2 + 1)), t = picks[i2]; picks[i2] = picks[j]; picks[j] = t; }
      picks.slice(0, 14).forEach(function (tp, k) { var m = buildMeal(tp, tp[1], mealBase(tp), '', ''); delete m.time; S.mealLibrary.push({ id: Date.now() + k + 7000 + (hash32(tp[0]) % 997), name: m.name, type: m.type, kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat, fiber: m.fiber, notes: '', ingredients: m.ingredients, savedAt: new Date().toLocaleDateString(), fav: k < 3 }); mAdded++; });
      ast.lib = 1; log.push('📚 Added ' + added + ' ingredients and ' + mAdded + ' saved meals to the libraries');
    }
    // habits
    if (!S.habits) S.habits = [];
    p.habits.forEach(function (key) {
      var t = HABITS[key]; if (!t) return; var h = findHabit(S, key);
      if (h) { if (since < h.start) h.start = since; return; }
      var fr = { t: t.freq.t }; if (t.freq.days) fr.days = t.freq.days.slice(); if (t.freq.n) fr.n = t.freq.n;
      var nh = { id: Date.now() + hash32(p.seed + key) % 100000, logs: {}, vals: {}, checks: {}, notes: {}, name: t.name, cat: t.cat, emoji: t.emoji || '', type: t.type, freq: fr, tod: t.tod, start: since, goal: (fr.t === 'daily' ? 28 : fr.t === 'weekly' ? (fr.n || 1) * 4 : 20), fromAgent: key };
      if (t.type === 'amount') { nh.target = t.target; nh.unit = t.unit || ''; nh.step = t.step > 0 ? t.step : 1; if (t.cmp === 'max') nh.cmp = 'max'; }
      if (t.type === 'timer') { nh.target = t.target; nh.unit = 'min'; if (t.cmp === 'max') nh.cmp = 'max'; }
      if (t.cue) nh.cue = t.cue; if (t.why) nh.why = t.why;
      S.habits.push(nh); log.push('➕ Habit created: ' + t.name);
    });
    ast.setup = 1; return log;
  }

  function calcStreak(S, today) {
    var s = 0, ds = today;
    while (s < 365) {
      var dd = S.dailyData && S.dailyData[ds], logged = dd && ((dd.meals || []).length || (dd.exercises || []).length || dd.glasses > 0);
      var hab = (S.habits || []).some(function (h) { return !!((h.logs && h.logs[ds]) || (h.vals && +h.vals[ds] > 0) || (h.checks && h.checks[ds] && h.checks[ds].length)); });
      if (logged || hab) { s++; ds = addDays(ds, -1); } else break;
    }
    return s;
  }

  /* ---------------- the runner ----------------
     run(state, persona, ast, nowMs, opts) → { log:[{date,t,text}], applied:n, dates:[...] }
     opts.backfillDays — also fill N past days (first run / manual backfill)
     Events of today apply only up to "now" (persona time zone); earlier days apply fully.        */
  function run(S, pIn, ast, nowMs, opts) {
    opts = opts || {};
    var p = norm(pIn), lp = localParts(nowMs, p.tz), today = lp.date, log = [], applied = 0, dates = [];
    ast.v = VERSION; if (!ast.applied) ast.applied = {};
    var back = Math.max(0, Math.min(365, opts.backfillDays != null ? opts.backfillDays : 0));
    var first = ast.since == null;
    if (first) ast.since = addDays(today, -back);
    var since = ast.since;
    if (back > 0 && addDays(today, -back) < since) since = ast.since = addDays(today, -back);
    var setupLog = ensureSetup(S, p, since, ast);
    setupLog.forEach(function (t) { log.push({ date: today, t: '--:--', text: t }); });
    S.today = S.today || today;
    var ctx = { stamp: function (e) { return utc(e.date) - 12 * 36e5 + e.min * 6e4; }, dayNote: '' };
    var habits = (S.habits || []).filter(function (h) { return h.fromAgent; }).map(function (h) { return { key: h.fromAgent, id: h.id, freq: h.freq, tod: h.tod, start: h.start, fromAgent: h.fromAgent }; });
    var cf = ast.coverFrom, ct = ast.coverTo;
    for (var ds = since; ds <= today; ds = addDays(ds, 1)) {
      if (cf && ct && ds >= cf && ds <= ct) continue;                 // that day was already completed in an earlier run
      var plan = planDay(p, ds, { since: since, habits: habits }), done = ast.applied[ds] || (ast.applied[ds] = []), isToday = ds === today, any = false;
      plan.forEach(function (e) {
        if (isToday && e.min > lp.min) return;
        if (done.indexOf(e.id) >= 0) return;
        ctx.dayNote = '';
        var txt = null; try { txt = applyEvent(S, p, e, ctx); } catch (err) { txt = null; }
        done.push(e.id);
        if (txt) { log.push({ date: ds, t: hm(e.min), text: txt }); applied++; any = true; }
      });
      if (any && dates.indexOf(ds) < 0) dates.push(ds);
    }
    // every day before today is now complete → remember the covered range, keep event ids only for today
    var yest = addDays(today, -1);
    ast.coverFrom = (cf && cf < since) ? cf : since; ast.coverTo = (ct && ct > yest) ? ct : yest;
    Object.keys(ast.applied).forEach(function (k) { if (k <= ast.coverTo) delete ast.applied[k]; });
    // sort meal order again and refresh the streak
    S.streak = calcStreak(S, today);
    ast.lastRun = new Date(nowMs).toISOString(); ast.lastDate = today; ast.runs = (ast.runs || 0) + 1; ast.total = (ast.total || 0) + applied;
    return { log: log, applied: applied, dates: dates, today: today, min: lp.min };
  }

  /* ---------------- storage format (mirror of the app's dataService) ---------------- */
  var COLLECTIONS = ['daily', 'habits', 'goals', 'measurements', 'vitals', 'mealLibrary', 'ingredientLibrary', 'savedTimers'];
  var RESERVED = { dailyData: 1, habits: 1, goals: 1, measurements: 1, vitals: 1, mealLibrary: 1, ingredientLibrary: 1, savedTimers: 1, ivPresets: 1, today: 1, cfg: 1, streak: 1 };
  function canon(v) { if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v); if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']'; return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + canon(v[k]); }).join(',') + '}'; }
  function hash53(str) { var h1 = 0xdeadbeef, h2 = 0x41c6ce57; for (var i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); } h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909); h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909); return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36); }
  function docKey(x) { return String(x).replace(/[\/\s]/g, '_').slice(0, 200) || 'x'; }
  function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
  function omitMeta(d) { var o = Object.assign({}, d); delete o._updatedAt; return o; }
  function docHash(d) { return hash53(canon(omitMeta(d))); }
  function newId() { return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function ensureIds(st) { ['measurements', 'vitals'].forEach(function (k) { (st[k] || []).forEach(function (it) { if (isObj(it) && it.id === undefined && it._id === undefined) it._id = newId(); }); }); }
  function split(st0) {
    var st = clone(st0), docs = {}, extra = {};
    Object.keys(st).forEach(function (k) { if (!RESERVED[k]) extra[k] = st[k]; });
    docs['profile/main'] = { cfg: st.cfg || {}, streak: st.streak || 0, extra: extra };
    var dd = st.dailyData || {}; Object.keys(dd).forEach(function (d) { docs['daily/' + docKey(d)] = { date: d, day: dd[d] }; });
    function addArray(coll, arr, prefix, kind) {
      var seen = {};
      (arr || []).forEach(function (it, i) {
        var base = isObj(it) ? (it.id !== undefined ? it.id : it._id) : undefined; if (base === undefined) base = 'n' + i;
        var key = prefix + docKey(base), n = 1, k0 = key; while (seen[key]) { n++; key = k0 + '_' + n; } seen[key] = 1;
        var body = isObj(it) ? Object.assign({}, it) : { _value: it }; body._order = i; if (kind) body._kind = kind; docs[coll + '/' + key] = body;
      });
    }
    addArray('habits', st.habits, '', null); addArray('goals', st.goals, '', null); addArray('measurements', st.measurements, '', null); addArray('vitals', st.vitals, '', null);
    addArray('mealLibrary', st.mealLibrary, '', null); addArray('ingredientLibrary', st.ingredientLibrary, '', null); addArray('savedTimers', st.savedTimers, 't_', 'timer'); addArray('savedTimers', st.ivPresets, 'p_', 'interval');
    return docs;
  }
  function strip(d) {
    if (Object.prototype.hasOwnProperty.call(d, '_value') && Object.keys(d).every(function (k) { return k === '_value' || k === '_order' || k === '_kind' || k === '_updatedAt'; })) return d._value;
    var o = Object.assign({}, d); delete o._order; delete o._updatedAt; delete o._kind; return o;
  }
  function join(docs) {
    var st = {}, prof = docs['profile/main'] || {}; st.cfg = prof.cfg || {}; st.streak = prof.streak || 0; Object.assign(st, prof.extra || {}); st.dailyData = {};
    var arr = { habits: [], goals: [], measurements: [], vitals: [], mealLibrary: [], ingredientLibrary: [], savedTimers: [], ivPresets: [] };
    Object.keys(docs).forEach(function (pth) { var i = pth.indexOf('/'), coll = pth.slice(0, i), d = docs[pth], target; if (coll === 'daily') { st.dailyData[d.date] = d.day; return; } if (coll === 'savedTimers') target = (d._kind === 'interval') ? arr.ivPresets : arr.savedTimers; else target = arr[coll]; if (target) target.push(d); });
    Object.keys(arr).forEach(function (k) { arr[k].sort(function (a, b) { return (a._order || 0) - (b._order || 0); }); st[k] = arr[k].map(strip); });
    return st;
  }
  // before-docs (as read) + after-state → minimal write set
  function diff(beforeDocs, afterState) {
    ensureIds(afterState);
    var parts = split(afterState), ops = [], h0 = {};
    Object.keys(beforeDocs).forEach(function (pth) { h0[pth] = docHash(beforeDocs[pth]); });
    Object.keys(parts).forEach(function (pth) { if (h0[pth] !== docHash(parts[pth])) ops.push({ path: pth, data: parts[pth] }); });
    return ops;
  }
  function summarize(st) {
    var m = (st.measurements || []), v = (st.vitals || []), c = st.cfg || {}, lm = m.length ? m[m.length - 1] : null, lv = v.length ? v[v.length - 1] : null;
    return { name: c.name || null, gender: c.gender || null, age: c.age || null, onboarded: st.onboarded !== false, onb: null, streak: st.streak || 0, dailyDataDays: Object.keys(st.dailyData || {}).length,
      habitsCount: (st.habits || []).length, goalsCount: (st.goals || []).length, measurementsCount: m.length, vitalsCount: v.length, mealLibraryCount: (st.mealLibrary || []).length, ingredientLibraryCount: (st.ingredientLibrary || []).length,
      lastMeasurement: lm ? { date: lm.date || null, weight: lm.weight || null } : null, lastVital: lv ? { date: lv.date || null, hr: lv.hr || null } : null, updatedAt: new Date().toISOString() };
  }

  return { VERSION: VERSION, PRESETS: PRESETS, HABITS: HABITS, MEALS: MEALS, SPLITS: Object.keys(SPLITS), defaultPersona: defaultPersona, norm: norm, planDay: planDay, run: run, ensureSetup: ensureSetup,
    localParts: localParts, msFor: msFor, addDays: addDays, calcStreak: calcStreak, dayMode: dayMode, COLLECTIONS: COLLECTIONS, split: split, join: join, diff: diff, docHash: docHash, summarize: summarize, canon: canon, ensureIds: ensureIds };
});
