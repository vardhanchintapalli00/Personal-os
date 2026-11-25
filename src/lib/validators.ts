import { z } from 'zod';
import * as C from './constants';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date');
const time = z.string().regex(/^\d{2}:\d{2}$/, 'Use a valid time');
const text = (max: number) => z.string().trim().max(max);
const optText = (max: number) => text(max).nullish();
const optUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || /^https?:\/\//i.test(v), 'Must start with http:// or https://')
  .nullish();
const en = <T extends readonly [string, ...string[]]>(v: T) => z.enum(v);

export const subtaskSchema = z.object({
  id: z.string().optional(),
  title: text(140).min(1),
  completed: z.boolean().default(false),
});

export const taskSchema = z.object({
  title: text(140).min(1, 'Title is required'),
  description: optText(2000),
  category: en(C.TASK_CATEGORIES).default('Studies'),
  priority: en(C.PRIORITIES).default('Medium'),
  dueDate: date.nullish(),
  dueTime: time.nullish(),
  estimatedMin: z.coerce.number().int().min(1).max(1440).nullish(),
  status: en(C.TASK_STATUSES).default('Not started'),
  recurrence: en(C.RECURRENCES).default('none'),
  recurrenceInterval: z.coerce.number().int().min(1).max(365).nullish(),
  progress: z.coerce.number().int().min(0).max(100).default(0),
  reminderMinutes: z.coerce.number().int().min(0).max(10080).nullish(),
  notes: optText(4000),
  attachmentUrl: optUrl,
  completedOn: date.nullish(),
  position: z.coerce.number().int().default(0),
  subtasks: z.array(subtaskSchema).max(50).optional(),
});

export const movieSchema = z.object({
  title: text(160).min(1, 'Title is required'),
  type: en(C.MOVIE_TYPES).default('Movie'),
  genre: optText(40),
  language: optText(40),
  platform: optText(40),
  status: en(C.MOVIE_STATUSES).default('Want to watch'),
  favorite: z.boolean().default(false),
  rating: z.coerce.number().int().min(1).max(10).nullish(),
  watchDate: date.nullish(),
  review: optText(3000),
  notes: optText(3000),
  posterUrl: optUrl,
  trailerUrl: optUrl,
  imdbUrl: optUrl,
});

export const habitSchema = z.object({
  name: text(80).min(1, 'Name is required'),
  type: z.enum(['build', 'quit']).default('build'),
  icon: text(8).default('✅'),
  targetPerWeek: z.coerce.number().int().min(1).max(7).default(7),
  archived: z.boolean().default(false),
});

export const workoutSchema = z.object({
  date,
  type: en(C.WORKOUT_TYPES).default('Gym'),
  name: optText(80),
  durationMin: z.coerce.number().int().min(1, 'Duration must be at least 1 minute').max(600),
  calories: z.coerce.number().int().min(0).max(5000).nullish(),
  completed: z.boolean().default(true),
  exercises: z
    .array(
      z.object({
        name: text(80).min(1),
        sets: z.coerce.number().int().min(0).max(50).default(0),
        reps: z.coerce.number().int().min(0).max(1000).default(0),
        weightKg: z.coerce.number().min(0).max(1000).default(0),
      }),
    )
    .max(40)
    .default([]),
  notes: optText(2000),
});

const bodyEntryBase = z.object({
    date,
    weightKg: z.coerce.number().min(20).max(400).nullish(),
    chest: z.coerce.number().min(10).max(250).nullish(),
    waist: z.coerce.number().min(10).max(250).nullish(),
    arms: z.coerce.number().min(5).max(100).nullish(),
    thighs: z.coerce.number().min(10).max(150).nullish(),
  });
export const bodyEntrySchema = bodyEntryBase.refine(
  (v) => [v.weightKg, v.chest, v.waist, v.arms, v.thighs].some((x) => x != null),
  { message: 'Enter at least one value' },
);

export const mealSchema = z.object({
  date,
  time: time.default('13:00'),
  mealType: en(C.MEAL_TYPES).default('Lunch'),
  food: text(160).min(1, 'Food name is required'),
  quantity: optText(60),
  calories: z.coerce.number().int().min(0).max(5000).default(0),
  protein: z.coerce.number().min(0).max(500).default(0),
  carbs: z.coerce.number().min(0).max(800).default(0),
  fats: z.coerce.number().min(0).max(500).default(0),
  category: en(C.MEAL_CATEGORIES).default('Home food'),
  hasSugar: z.boolean().default(false),
  notes: optText(1000),
});

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive('Amount must be greater than 0').max(100000000),
  category: text(60).min(1, 'Choose a category'),
  date,
  paymentMethod: en(C.PAYMENT_METHODS).default('UPI'),
  notes: optText(500),
  recurrence: en(C.TX_RECURRENCES).default('none'),
});

export const budgetSchema = z.object({
  category: text(60).min(1),
  monthlyLimit: z.coerce.number().min(0).max(100000000),
});

export const savingsGoalSchema = z.object({
  name: text(80).min(1, 'Name is required'),
  targetAmount: z.coerce.number().positive('Target must be greater than 0').max(1000000000),
  savedAmount: z.coerce.number().min(0).max(1000000000).default(0),
  deadline: date.nullish(),
});

export const dailyLogSchema = z.object({
  date,
  bedtime: time.nullish(),
  wakeTime: time.nullish(),
  sleepHours: z.coerce.number().min(0).max(24).nullish(),
  sleepQuality: z.coerce.number().int().min(1).max(5).nullish(),
  water: z.coerce.number().int().min(0).max(40).nullish(),
  studyHours: z.coerce.number().min(0).max(24).nullish(),
  studySubject: optText(80),
  focusRating: z.coerce.number().int().min(1).max(5).nullish(),
  screenPhoneMin: z.coerce.number().int().min(0).max(1440).nullish(),
  screenLaptopMin: z.coerce.number().int().min(0).max(1440).nullish(),
  screenSocialMin: z.coerce.number().int().min(0).max(1440).nullish(),
  screenGamingMin: z.coerce.number().int().min(0).max(1440).nullish(),
  screenEntertainMin: z.coerce.number().int().min(0).max(1440).nullish(),
  mood: en(C.MOODS).nullish(),
  energy: en(C.ENERGIES).nullish(),
  steps: z.coerce.number().int().min(0).max(100000).nullish(),
  wentWell: optText(2000),
  improve: optText(2000),
});

export const profileSchema = z
  .object({
    name: text(80).min(1),
    email: z.string().trim().toLowerCase().email('Enter a valid email'),
    image: z
      .string()
      .max(400000)
      .refine((v) => v === '' || /^https?:\/\//.test(v) || v.startsWith('data:image/'), 'Invalid image')
      .nullish(),
    age: z.coerce.number().int().min(10).max(100).nullish(),
    location: optText(80),
    heightCm: z.coerce.number().min(100).max(250).nullish(),
    weightKg: z.coerce.number().min(20).max(400).nullish(),
    targetWeightKg: z.coerce.number().min(20).max(400).nullish(),
    fitnessGoal: en(C.FITNESS_GOALS),
    activityLevel: en(C.ACTIVITY_LEVELS),
    goals: z.array(text(60)).max(12),
    waterGoal: z.coerce.number().int().min(1).max(30),
    calorieGoal: z.coerce.number().int().min(800).max(6000),
    proteinGoal: z.coerce.number().int().min(10).max(400),
    stepGoal: z.coerce.number().int().min(500).max(50000),
    weeklyWorkoutGoal: z.coerce.number().int().min(1).max(7),
    weeklyActiveMinGoal: z.coerce.number().int().min(10).max(2000),
    monthlyBudget: z.coerce.number().min(0).max(100000000),
    cheatMealsPerWeek: z.coerce.number().int().min(0).max(7),
    sleepTarget: z.coerce.number().min(3).max(14),
    studyTarget: z.coerce.number().min(0).max(16),
    currency: z.enum(['INR', 'USD', 'EUR', 'GBP']),
    theme: z.enum(['light', 'dark', 'system']),
    notifications: z.record(z.boolean()),
    onboarded: z.boolean(),
  })
  .partial();

export const registerSchema = z.object({
  name: text(80).min(2, 'Please enter your name'),
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100),
});

export const passwordSchema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(100),
});

/** Registry used by the generic CRUD routes. */
export const RESOURCES = {
  tasks: { model: 'task', schema: taskSchema, label: 'Task' },
  movies: { model: 'movie', schema: movieSchema, label: 'Movie' },
  habits: { model: 'habit', schema: habitSchema, label: 'Habit' },
  workouts: { model: 'workout', schema: workoutSchema, label: 'Workout' },
  bodyEntries: { model: 'bodyEntry', schema: bodyEntrySchema, partial: bodyEntryBase.partial(), label: 'Entry' },
  meals: { model: 'meal', schema: mealSchema, label: 'Meal' },
  transactions: { model: 'transaction', schema: transactionSchema, label: 'Transaction' },
  budgets: { model: 'budget', schema: budgetSchema, label: 'Budget' },
  savingsGoals: { model: 'savingsGoal', schema: savingsGoalSchema, label: 'Savings goal' },
} as const;

export type ResourceKey = keyof typeof RESOURCES;
export const isResource = (k: string): k is ResourceKey => k in RESOURCES;
