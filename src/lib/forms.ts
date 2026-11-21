import * as C from './constants';

export type FieldType = 'text' | 'number' | 'date' | 'time' | 'select' | 'textarea' | 'url' | 'checkbox' | 'chips' | 'rating';

export interface FieldDef {
  name: string;
  label: string;
  type: FieldType;
  options?: readonly string[];
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  hint?: string;
  full?: boolean; // span both columns
  nullable?: boolean; // clearing sends null on edit (default true)
  showIf?: (v: Record<string, unknown>) => boolean;
  suffix?: string;
}

export const MOVIE_FIELDS: FieldDef[] = [
  { name: 'title', label: 'Title', type: 'text', required: true, full: true, placeholder: 'e.g. Inception' },
  { name: 'type', label: 'Type', type: 'chips', options: C.MOVIE_TYPES, required: true, nullable: false },
  { name: 'status', label: 'Status', type: 'select', options: C.MOVIE_STATUSES, required: true, nullable: false },
  { name: 'genre', label: 'Genre', type: 'select', options: C.GENRES },
  { name: 'language', label: 'Language', type: 'select', options: C.LANGUAGES },
  { name: 'platform', label: 'Platform', type: 'select', options: C.PLATFORMS },
  { name: 'watchDate', label: 'Watch date', type: 'date' },
  { name: 'rating', label: 'Your rating (1-10)', type: 'rating', max: 10, full: true },
  { name: 'favorite', label: 'Mark as favorite', type: 'checkbox', full: true, nullable: false },
  { name: 'review', label: 'Review / notes', type: 'textarea', full: true, placeholder: 'What did you think?' },
  { name: 'posterUrl', label: 'Poster image URL', type: 'url', full: true, placeholder: 'https://...' },
  { name: 'trailerUrl', label: 'Trailer link', type: 'url', placeholder: 'https://youtube.com/...' },
  { name: 'imdbUrl', label: 'IMDb link', type: 'url', placeholder: 'https://imdb.com/...' },
];

export const MEAL_FIELDS: FieldDef[] = [
  { name: 'food', label: 'Food name', type: 'text', required: true, full: true, placeholder: 'e.g. 2 roti, dal, sabzi' },
  { name: 'mealType', label: 'Meal', type: 'select', options: C.MEAL_TYPES, required: true, nullable: false },
  { name: 'category', label: 'Category', type: 'select', options: C.MEAL_CATEGORIES, required: true, nullable: false },
  { name: 'date', label: 'Date', type: 'date', required: true, nullable: false },
  { name: 'time', label: 'Time', type: 'time', required: true, nullable: false },
  { name: 'quantity', label: 'Quantity', type: 'text', placeholder: '1 plate, 2 pieces...' },
  { name: 'calories', label: 'Calories (kcal)', type: 'number', min: 0, max: 5000, nullable: false },
  { name: 'protein', label: 'Protein (g)', type: 'number', min: 0, max: 500, step: 0.5, nullable: false },
  { name: 'carbs', label: 'Carbs (g)', type: 'number', min: 0, max: 800, step: 0.5, nullable: false },
  { name: 'fats', label: 'Fats (g)', type: 'number', min: 0, max: 500, step: 0.5, nullable: false },
  { name: 'hasSugar', label: 'Contains added sugar / sugary drink', type: 'checkbox', full: true, nullable: false },
  { name: 'notes', label: 'Notes', type: 'textarea', full: true },
];

export const expenseFields = (type: 'income' | 'expense'): FieldDef[] => [
  { name: 'amount', label: 'Amount (₹)', type: 'number', required: true, min: 1, step: 1, nullable: false, placeholder: '0' },
  { name: 'category', label: 'Category', type: 'select', options: type === 'income' ? C.INCOME_CATEGORIES : C.EXPENSE_CATEGORIES, required: true, nullable: false },
  { name: 'date', label: 'Date', type: 'date', required: true, nullable: false },
  { name: 'paymentMethod', label: 'Payment method', type: 'select', options: C.PAYMENT_METHODS, required: true, nullable: false },
  { name: 'recurrence', label: 'Repeats', type: 'select', options: C.TX_RECURRENCES, nullable: false, hint: 'Weekly / monthly entries are added automatically' },
  { name: 'notes', label: 'Notes', type: 'text', full: true, placeholder: 'Optional' },
];

export const SAVINGS_FIELDS: FieldDef[] = [
  { name: 'name', label: 'Goal name', type: 'text', required: true, full: true, placeholder: 'e.g. New laptop' },
  { name: 'targetAmount', label: 'Target amount (₹)', type: 'number', required: true, min: 1, nullable: false },
  { name: 'savedAmount', label: 'Saved so far (₹)', type: 'number', min: 0, nullable: false },
  { name: 'deadline', label: 'Deadline', type: 'date', full: true },
];

export const BODY_FIELDS: FieldDef[] = [
  { name: 'date', label: 'Date', type: 'date', required: true, full: true, nullable: false },
  { name: 'weightKg', label: 'Weight (kg)', type: 'number', min: 20, max: 400, step: 0.1 },
  { name: 'chest', label: 'Chest (cm)', type: 'number', min: 10, max: 250, step: 0.1 },
  { name: 'waist', label: 'Waist (cm)', type: 'number', min: 10, max: 250, step: 0.1 },
  { name: 'arms', label: 'Arms (cm)', type: 'number', min: 5, max: 100, step: 0.1 },
  { name: 'thighs', label: 'Thighs (cm)', type: 'number', min: 10, max: 150, step: 0.1 },
];

export const HABIT_FIELDS: FieldDef[] = [
  { name: 'name', label: 'Habit name', type: 'text', required: true, full: true, placeholder: 'e.g. Read 20 pages' },
  { name: 'icon', label: 'Emoji', type: 'text', placeholder: '📖', nullable: false },
  { name: 'type', label: 'Type', type: 'select', options: ['build', 'quit'], nullable: false, hint: 'Build a habit or quit one' },
  { name: 'targetPerWeek', label: 'Target days per week', type: 'number', min: 1, max: 7, nullable: false, full: true },
];

export const WORKOUT_TEMPLATES: { level: 'Beginner' | 'Intermediate' | 'Advanced'; name: string; type: string; durationMin: number; calories: number; exercises: { name: string; sets: number; reps: number; weightKg: number }[] }[] = [
  { level: 'Beginner', name: 'Full body starter', type: 'Home workout', durationMin: 30, calories: 180, exercises: [
    { name: 'Bodyweight squats', sets: 3, reps: 12, weightKg: 0 }, { name: 'Push-ups (knees ok)', sets: 3, reps: 8, weightKg: 0 },
    { name: 'Plank (30 sec)', sets: 3, reps: 1, weightKg: 0 }, { name: 'Glute bridges', sets: 3, reps: 12, weightKg: 0 } ] },
  { level: 'Beginner', name: 'Brisk walk + stretch', type: 'Walking', durationMin: 40, calories: 160, exercises: [] },
  { level: 'Intermediate', name: 'Push day', type: 'Gym', durationMin: 55, calories: 300, exercises: [
    { name: 'Bench press', sets: 4, reps: 8, weightKg: 40 }, { name: 'Shoulder press', sets: 3, reps: 10, weightKg: 20 },
    { name: 'Incline dumbbell press', sets: 3, reps: 10, weightKg: 16 }, { name: 'Triceps pushdown', sets: 3, reps: 12, weightKg: 25 } ] },
  { level: 'Intermediate', name: 'Pull day', type: 'Gym', durationMin: 55, calories: 290, exercises: [
    { name: 'Lat pulldown', sets: 4, reps: 10, weightKg: 45 }, { name: 'Seated row', sets: 3, reps: 10, weightKg: 40 },
    { name: 'Barbell curl', sets: 3, reps: 12, weightKg: 20 }, { name: 'Face pulls', sets: 3, reps: 15, weightKg: 15 } ] },
  { level: 'Intermediate', name: 'Leg day', type: 'Gym', durationMin: 60, calories: 350, exercises: [
    { name: 'Back squat', sets: 4, reps: 8, weightKg: 50 }, { name: 'Romanian deadlift', sets: 3, reps: 10, weightKg: 40 },
    { name: 'Leg press', sets: 3, reps: 12, weightKg: 100 }, { name: 'Calf raises', sets: 4, reps: 15, weightKg: 30 } ] },
  { level: 'Advanced', name: 'Upper power', type: 'Gym', durationMin: 75, calories: 420, exercises: [
    { name: 'Barbell bench press', sets: 5, reps: 5, weightKg: 70 }, { name: 'Weighted pull-ups', sets: 4, reps: 6, weightKg: 10 },
    { name: 'Overhead press', sets: 4, reps: 6, weightKg: 45 }, { name: 'Barbell row', sets: 4, reps: 8, weightKg: 60 } ] },
  { level: 'Advanced', name: 'HIIT 20 min', type: 'Home workout', durationMin: 25, calories: 280, exercises: [
    { name: 'Burpees', sets: 5, reps: 12, weightKg: 0 }, { name: 'Jump squats', sets: 5, reps: 15, weightKg: 0 },
    { name: 'Mountain climbers (40s)', sets: 5, reps: 1, weightKg: 0 } ] },
];

export const MEAL_SUGGESTIONS: Record<string, { meal: string; items: string[] }[]> = {
  'Lose fat': [
    { meal: 'Breakfast', items: ['2 boiled eggs + 1 roti + fruit', 'Moong dal chilla with mint chutney', 'Oats with banana & nuts'] },
    { meal: 'Lunch', items: ['1 cup rice, dal, 2 veg sabzi, curd', '2 roti, paneer bhurji, cucumber salad', 'Chicken curry with 1 roti, salad'] },
    { meal: 'Snacks', items: ['Roasted chana + buttermilk', 'Apple or papaya bowl', 'Sprouts chaat (no sev)'] },
    { meal: 'Dinner', items: ['2 roti, dal, sabzi', 'Veg khichdi + curd', 'Egg curry + 1 roti + salad'] },
  ],
  'Gain muscle': [
    { meal: 'Breakfast', items: ['4 egg omelette, 2 roti, banana', 'Paneer paratha + curd + milk', 'Oats, milk, peanut butter, banana'] },
    { meal: 'Lunch', items: ['1.5 cups rice, dal, chicken curry, curd', '3 roti, rajma, paneer, salad', 'Egg biryani (home) + raita'] },
    { meal: 'Snacks', items: ['Peanut chikki + milk', 'Banana shake with whey or milk', 'Boiled eggs (2) + fruit'] },
    { meal: 'Dinner', items: ['3 roti, dal, chicken/paneer, sabzi', 'Soya chunks curry + rice', 'Fish curry + rice + salad'] },
  ],
  Maintenance: [
    { meal: 'Breakfast', items: ['Idli (3) + sambar + egg', 'Poha + peanuts + fruit', 'Upma + curd'] },
    { meal: 'Lunch', items: ['Rice, dal, sabzi, curd, salad', '2 roti, chole, salad', 'Veg pulao + raita'] },
    { meal: 'Snacks', items: ['Fruit + handful of nuts', 'Roasted makhana', 'Buttermilk + chana'] },
    { meal: 'Dinner', items: ['2 roti, dal, sabzi', 'Curd rice + pickle + veg', 'Egg bhurji + 2 roti'] },
  ],
};

export const REST_TIPS = [
  'Sleep 7-8 hours; muscles grow while you rest.',
  'Do 10 minutes of light stretching or a slow walk.',
  'Drink extra water and eat enough protein today.',
  'Foam roll or gently massage sore muscles.',
  'Take a short walk in the sun to lift mood and energy.',
];
