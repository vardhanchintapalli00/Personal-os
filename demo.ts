import type { PrismaClient } from '@prisma/client';
import { addDays } from './recurrence';
import { DEFAULT_HABITS } from './constants';

// Small deterministic PRNG so demo data looks the same every time it is generated.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const pick = <T,>(r: () => number, arr: readonly T[]) => arr[Math.floor(r() * arr.length)];

const MEALS: Record<string, { food: string; cal: number; p: number; c: number; f: number; cat: string; sugar?: boolean }[]> = {
  Breakfast: [
    { food: '3 egg whites + 1 egg omelette, 2 roti', cal: 380, p: 26, c: 38, f: 12, cat: 'Home food' },
    { food: 'Idli (3) with sambar', cal: 290, p: 9, c: 54, f: 4, cat: 'Home food' },
    { food: 'Oats with banana & peanuts', cal: 340, p: 12, c: 52, f: 9, cat: 'Healthy' },
    { food: 'Poha with peanuts', cal: 300, p: 7, c: 50, f: 8, cat: 'Home food' },
  ],
  Lunch: [
    { food: 'Rice (1 cup), dal, veg curry, curd', cal: 620, p: 24, c: 96, f: 14, cat: 'Home food' },
    { food: '2 roti, paneer curry, salad', cal: 580, p: 28, c: 60, f: 24, cat: 'Home food' },
    { food: 'Chicken curry, 1 cup rice, cucumber', cal: 680, p: 42, c: 70, f: 22, cat: 'Home food' },
    { food: 'Chicken biryani (restaurant)', cal: 850, p: 34, c: 100, f: 32, cat: 'Outside food' },
  ],
  Snacks: [
    { food: 'Banana + roasted chana', cal: 210, p: 9, c: 38, f: 3, cat: 'Healthy' },
    { food: 'Fruit bowl (apple, papaya)', cal: 140, p: 2, c: 34, f: 1, cat: 'Healthy' },
    { food: 'Samosa + chai with sugar', cal: 360, p: 6, c: 44, f: 18, cat: 'Junk food', sugar: true },
    { food: 'Chocolate ice cream', cal: 260, p: 4, c: 34, f: 12, cat: 'Sugary food', sugar: true },
    { food: 'Buttermilk', cal: 60, p: 3, c: 6, f: 2, cat: 'Healthy' },
  ],
  Dinner: [
    { food: '2 roti, dal, sabzi, curd', cal: 520, p: 22, c: 70, f: 14, cat: 'Home food' },
    { food: 'Egg curry with 2 roti', cal: 480, p: 26, c: 42, f: 20, cat: 'Home food' },
    { food: 'Veg khichdi with curd', cal: 450, p: 16, c: 70, f: 10, cat: 'Healthy' },
    { food: 'Fried rice & manchurian (outside)', cal: 780, p: 18, c: 98, f: 34, cat: 'Outside food' },
  ],
};

/** Wipes the user's tracked data (not the account) and inserts ~30 days of realistic demo data. */
export async function seedDemoData(prisma: PrismaClient, userId: string, today: string) {
  await clearUserData(prisma, userId);
  const r = rng(42);
  const monthStart = `${today.slice(0, 7)}-01`;
  const dayN = (n: number) => addDays(today, -n);

  // ---- Habits + logs ----
  const habits = [];
  for (const h of DEFAULT_HABITS) {
    habits.push(await prisma.habit.create({ data: { userId, name: h.name, icon: h.icon, type: h.type, targetPerWeek: 7 } }));
  }
  const habitOdds = [0.8, 0.7, 0.65, 0.6, 0.7, 0.5, 0.45, 0.6, 0.75, 0.55];
  const habitLogs = [];
  for (let n = 0; n < 35; n++) {
    habits.forEach((h, i) => {
      if (n === 0 && r() > 0.5) return; // today is still in progress
      if (r() < habitOdds[i] + (n < 4 ? 0.2 : 0)) habitLogs.push({ userId, habitId: h.id, date: dayN(n), done: true });
    });
  }
  await prisma.habitLog.createMany({ data: habitLogs, skipDuplicates: true });

  // ---- Tasks ----
  type T = { title: string; category: string; priority: string; off: number; time?: string; status?: string; est?: number; subs?: [string, boolean][]; recur?: string; doneOff?: number };
  const tasks: T[] = [
    { title: 'Submit DBMS assignment 3', category: 'Assignments', priority: 'Urgent', off: 0, time: '17:00', est: 90, subs: [['Write ER diagram', true], ['Normalize tables', true], ['SQL queries', false], ['Proofread & upload', false]] },
    { title: 'Revise Operating Systems unit 4', category: 'Exams', priority: 'High', off: 0, time: '20:00', est: 60, status: 'In progress' },
    { title: 'Solve 3 LeetCode problems', category: 'Skills', priority: 'Medium', off: 0, time: '21:30', est: 45, recur: 'daily' },
    { title: 'Pay college lab fee', category: 'Finance', priority: 'High', off: -1, status: 'Not started' },
    { title: 'Update resume with new project', category: 'Career', priority: 'Medium', off: 1, est: 40 },
    { title: 'React course: finish hooks module', category: 'Skills', priority: 'High', off: 2, est: 120, subs: [['useState & useEffect', true], ['useReducer', false], ['Custom hooks', false]] },
    { title: 'Mid-sem preparation: Computer Networks', category: 'Exams', priority: 'Urgent', off: 4, est: 180, subs: [['Unit 1-2 notes', true], ['Unit 3-4 notes', false], ['Previous papers', false]] },
    { title: 'Clean room & organise desk', category: 'Home', priority: 'Low', off: 3, recur: 'weekly' },
    { title: 'Book dentist appointment', category: 'Health', priority: 'Low', off: 6 },
    { title: 'Weekly review & planning', category: 'Personal', priority: 'Medium', off: 5, recur: 'weekly' },
    { title: 'Apply for internship at startup', category: 'Career', priority: 'High', off: 7, est: 60 },
    { title: 'Physics lab record', category: 'College', priority: 'Medium', off: -2, status: 'Not started' },
    { title: 'Finish OS assignment 2', category: 'Assignments', priority: 'High', off: -1, status: 'Completed', doneOff: 1 },
    { title: 'Read chapter 6 (Algorithms)', category: 'Studies', priority: 'Medium', off: -2, status: 'Completed', doneOff: 2 },
    { title: 'Gym bag & plan for week', category: 'Health', priority: 'Low', off: -3, status: 'Completed', doneOff: 3 },
    { title: 'Practice SQL joins', category: 'Skills', priority: 'High', off: -3, status: 'Completed', doneOff: 3 },
    { title: 'Group project meeting notes', category: 'College', priority: 'Medium', off: -4, status: 'Completed', doneOff: 4 },
    { title: 'Mobile recharge', category: 'Finance', priority: 'Medium', off: -5, status: 'Completed', doneOff: 5 },
    { title: 'Revise Maths unit 2', category: 'Exams', priority: 'High', off: -5, status: 'Completed', doneOff: 5 },
    { title: 'Portfolio website: hero section', category: 'Career', priority: 'Medium', off: -6, status: 'Completed', doneOff: 6 },
    { title: 'Submit seminar abstract', category: 'College', priority: 'High', off: -6, status: 'Missed' },
  ];
  let pos = 0;
  for (const t of tasks) {
    const subs = t.subs ?? [];
    const done = subs.filter((s) => s[1]).length;
    const completed = t.status === 'Completed';
    await prisma.task.create({
      data: {
        userId,
        title: t.title,
        category: t.category,
        priority: t.priority,
        dueDate: addDays(today, t.off),
        dueTime: t.time ?? null,
        estimatedMin: t.est ?? null,
        status: t.status ?? 'Not started',
        recurrence: t.recur ?? 'none',
        progress: completed ? 100 : subs.length ? Math.round((done / subs.length) * 100) : t.status === 'In progress' ? 40 : 0,
        reminderMinutes: t.time ? 60 : null,
        completedOn: completed ? dayN(t.doneOff ?? 0) : null,
        position: pos++,
        subtasks: { create: subs.map((s, i) => ({ title: s[0], completed: s[1], position: i })) },
      },
    });
  }

  // ---- Movies ----
  const movies = [
    { title: 'Inception', type: 'Movie', genre: 'Sci-Fi', language: 'English', platform: 'Netflix', status: 'Completed', rating: 9, favorite: true, watchDate: dayN(12), review: 'Mind-bending. The ending still has me thinking.' },
    { title: 'Mirzapur', type: 'Series', genre: 'Crime', language: 'Hindi', platform: 'Prime Video', status: 'Watching', rating: null, favorite: false },
    { title: 'RRR', type: 'Movie', genre: 'Action', language: 'Telugu', platform: 'Netflix', status: 'Completed', rating: 10, favorite: true, watchDate: dayN(20), review: 'Pure goosebumps. Peak cinema.' },
    { title: 'Money Heist', type: 'Series', genre: 'Thriller', language: 'English', platform: 'Netflix', status: 'Completed', rating: 8, favorite: false, watchDate: dayN(30) },
    { title: 'Interstellar', type: 'Movie', genre: 'Sci-Fi', language: 'English', platform: 'Prime Video', status: 'Want to watch', rating: null, favorite: false },
    { title: 'Panchayat', type: 'Series', genre: 'Comedy', language: 'Hindi', platform: 'Prime Video', status: 'Want to watch', rating: null, favorite: false },
    { title: 'Jersey', type: 'Movie', genre: 'Drama', language: 'Telugu', platform: 'Hotstar', status: 'Completed', rating: 8, favorite: false, watchDate: dayN(8) },
    { title: 'Dune: Part Two', type: 'Movie', genre: 'Sci-Fi', language: 'English', platform: 'Theater', status: 'Completed', rating: 9, favorite: false, watchDate: dayN(15) },
    { title: 'Stranger Things', type: 'Series', genre: 'Fantasy', language: 'English', platform: 'Netflix', status: 'Watching', rating: null, favorite: false },
    { title: 'Kalki 2898 AD', type: 'Movie', genre: 'Sci-Fi', language: 'Telugu', platform: 'Prime Video', status: 'Want to watch', rating: null, favorite: false },
    { title: 'The Family Man', type: 'Series', genre: 'Action', language: 'Hindi', platform: 'Prime Video', status: 'Dropped', rating: 5, favorite: false },
    { title: 'Oppenheimer', type: 'Movie', genre: 'Drama', language: 'English', platform: 'Other', status: 'Want to watch', rating: null, favorite: false },
  ];
  await prisma.movie.createMany({ data: movies.map((m) => ({ ...m, userId })) });

  // ---- Daily logs ----
  const moods = ['Great', 'Good', 'Good', 'Okay', 'Okay', 'Low', 'Stressed'];
  const energies = ['High', 'Medium', 'Medium', 'Low'];
  const logs = [];
  for (let n = 0; n < 35; n++) {
    const sleep = Math.round((5.5 + r() * 3) * 10) / 10;
    const bedHour = Math.round((22.5 + r() * 2.5) * 2) / 2;
    const bt = `${String(Math.floor(bedHour) % 24).padStart(2, '0')}:${bedHour % 1 ? '30' : '00'}`;
    const wake = (bedHour + sleep) % 24;
    const wt = `${String(Math.floor(wake)).padStart(2, '0')}:${wake % 1 >= 0.5 ? '30' : '00'}`;
    const isToday = n === 0;
    logs.push({
      userId,
      date: dayN(n),
      bedtime: bt,
      wakeTime: wt,
      sleepHours: sleep,
      sleepQuality: 2 + Math.floor(r() * 4),
      water: isToday ? 3 : 4 + Math.floor(r() * 6),
      studyHours: isToday ? 1.5 : Math.round(r() * 5 * 2) / 2,
      studySubject: pick(r, ['DBMS', 'Operating Systems', 'React', 'DSA', 'Networks', 'Maths']),
      focusRating: 2 + Math.floor(r() * 4),
      screenPhoneMin: 120 + Math.floor(r() * 180),
      screenLaptopMin: 120 + Math.floor(r() * 240),
      screenSocialMin: 30 + Math.floor(r() * 120),
      screenGamingMin: Math.floor(r() * 90),
      screenEntertainMin: 20 + Math.floor(r() * 120),
      mood: pick(r, moods),
      energy: pick(r, energies),
      steps: isToday ? 3200 : 3000 + Math.floor(r() * 9000),
      wentWell: n % 3 === 0 ? 'Stayed consistent with my study plan.' : null,
      improve: n % 3 === 0 ? 'Sleep earlier and cut down on social media.' : null,
    });
  }
  await prisma.dailyLog.createMany({ data: logs });

  // ---- Workouts ----
  const wTypes = ['Gym', 'Gym', 'Running', 'Home workout', 'Walking', 'Yoga', 'Cycling'];
  const workouts = [];
  for (let n = 0; n < 35; n++) {
    if (n % 7 === 6 || (n > 0 && r() < 0.35)) continue; // rest days & skips
    const type = pick(r, wTypes);
    workouts.push({
      userId,
      date: dayN(n),
      type,
      name: type === 'Gym' ? pick(r, ['Push day', 'Pull day', 'Leg day']) : null,
      durationMin: 25 + Math.floor(r() * 45),
      calories: 150 + Math.floor(r() * 300),
      exercises:
        type === 'Gym'
          ? [
              { name: 'Bench press', sets: 3, reps: 10, weightKg: 40 },
              { name: 'Shoulder press', sets: 3, reps: 12, weightKg: 20 },
              { name: 'Triceps pushdown', sets: 3, reps: 12, weightKg: 25 },
            ]
          : [],
      notes: null,
    });
  }
  await prisma.workout.createMany({ data: workouts });

  // ---- Body entries ----
  const weights = [74.2, 73.8, 73.3, 73.0, 72.6];
  const body = weights.map((w, i) => ({
    userId,
    date: dayN((weights.length - 1 - i) * 7),
    weightKg: w,
    waist: 84 - i * 0.6,
    chest: 98 + i * 0.2,
    arms: 31 + i * 0.2,
    thighs: 56,
  }));
  await prisma.bodyEntry.createMany({ data: body });

  // ---- Meals ----
  const meals = [];
  for (let n = 0; n < 35; n++) {
    const types = n === 0 ? ['Breakfast', 'Lunch'] : ['Breakfast', 'Lunch', 'Snacks', 'Dinner'];
    for (const mt of types) {
      const options = MEALS[mt];
      let m = pick(r, options);
      // bias toward healthy choices so the demo looks believable
      if (m.cat !== 'Home food' && m.cat !== 'Healthy' && r() < 0.65) m = options[0];
      meals.push({
        userId,
        date: dayN(n),
        time: { Breakfast: '08:30', Lunch: '13:30', Snacks: '17:30', Dinner: '20:30' }[mt]!,
        mealType: mt,
        food: m.food,
        quantity: null,
        calories: m.cal,
        protein: m.p,
        carbs: m.c,
        fats: m.f,
        category: m.cat,
        hasSugar: Boolean(m.sugar),
      });
    }
  }
  await prisma.meal.createMany({ data: meals });

  // ---- Transactions ----
  const tx: {
    userId: string; type: string; amount: number; category: string; date: string;
    paymentMethod: string; notes: string | null; recurrence: string;
  }[] = [];
  const addTx = (type: string, amount: number, category: string, date: string, paymentMethod: string, notes: string | null, recurrence = 'none') =>
    tx.push({ userId, type, amount, category, date, paymentMethod, notes, recurrence });

  for (let m = 0; m < 3; m++) {
    const base = addDays(monthStart, -30 * m);
    const first = `${base.slice(0, 7)}-01`;
    addTx('income', 6000, 'Pocket money', `${first.slice(0, 8)}02`, 'Bank transfer', 'Monthly allowance');
    if (m !== 1) addTx('income', 2500, 'Freelance', `${first.slice(0, 8)}12`, 'UPI', 'Small web design gig');
    addTx('expense', 299, 'Mobile recharge', `${first.slice(0, 8)}05`, 'UPI', 'Monthly plan', m === 0 ? 'monthly' : 'none');
    addTx('expense', 199, 'Subscriptions', `${first.slice(0, 8)}08`, 'Credit card', 'Netflix mobile plan', m === 0 ? 'monthly' : 'none');
    addTx('expense', 499, 'Internet', `${first.slice(0, 8)}10`, 'UPI', 'Broadband share');
  }
  const cats = [
    ['Food', 60, 220], ['Food', 50, 180], ['Travel', 30, 120], ['Shopping', 200, 900],
    ['Books', 150, 450], ['Entertainment', 120, 400], ['Health', 80, 300], ['Gifts', 150, 500],
  ] as const;
  for (let n = 0; n < 75; n++) {
    if (r() < 0.25) continue;
    const [c, lo, hi] = pick(r, cats.slice(0, n % 5 === 0 ? 8 : 4));
    addTx('expense', Math.round(lo + r() * (hi - lo)), c, dayN(n), pick(r, ['UPI', 'UPI', 'Cash', 'Debit card']), null);
  }
  const todayTx = tx.filter((t) => t.date > today); // guard: never future-dated demo rows
  await prisma.transaction.createMany({ data: tx.filter((t) => !todayTx.includes(t)) });

  // ---- Budgets & savings goals ----
  const budgets: [string, number][] = [['Food', 2500], ['Travel', 800], ['Shopping', 1200], ['Entertainment', 700], ['Books', 500], ['Subscriptions', 400]];
  await prisma.budget.createMany({ data: budgets.map(([category, monthlyLimit]) => ({ userId, category, monthlyLimit })) });
  await prisma.savingsGoal.createMany({
    data: [
      { userId, name: 'New laptop', targetAmount: 60000, savedAmount: 18500, deadline: addDays(today, 200) },
      { userId, name: 'Goa trip with friends', targetAmount: 12000, savedAmount: 7200, deadline: addDays(today, 70) },
      { userId, name: 'Emergency fund', targetAmount: 15000, savedAmount: 4000, deadline: null },
    ],
  });
}

export async function clearUserData(prisma: PrismaClient, userId: string) {
  await prisma.$transaction([
    prisma.habitLog.deleteMany({ where: { userId } }),
    prisma.habit.deleteMany({ where: { userId } }),
    prisma.task.deleteMany({ where: { userId } }), // subtasks cascade
    prisma.movie.deleteMany({ where: { userId } }),
    prisma.dailyLog.deleteMany({ where: { userId } }),
    prisma.workout.deleteMany({ where: { userId } }),
    prisma.bodyEntry.deleteMany({ where: { userId } }),
    prisma.meal.deleteMany({ where: { userId } }),
    prisma.transaction.deleteMany({ where: { userId } }),
    prisma.budget.deleteMany({ where: { userId } }),
    prisma.savingsGoal.deleteMany({ where: { userId } }),
    prisma.report.deleteMany({ where: { userId } }),
  ]);
}

/** Creates the default habit list for a user who chose not to load demo data. */
export async function createDefaultHabits(prisma: PrismaClient, userId: string) {
  const count = await prisma.habit.count({ where: { userId } });
  if (count) return;
  await prisma.habit.createMany({ data: DEFAULT_HABITS.map((h) => ({ userId, name: h.name, icon: h.icon, type: h.type })) });
}
