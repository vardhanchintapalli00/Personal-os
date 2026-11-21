// Shapes returned by /api/snapshot (dates are "YYYY-MM-DD" strings; timestamps are ISO strings).

export interface Subtask { id: string; taskId?: string; title: string; completed: boolean; position?: number }

export interface Task {
  id: string; title: string; description: string | null; category: string; priority: string;
  dueDate: string | null; dueTime: string | null; estimatedMin: number | null; status: string;
  recurrence: string; recurrenceInterval: number | null; progress: number; reminderMinutes: number | null;
  notes: string | null; attachmentUrl: string | null; completedOn: string | null; position: number;
  createdAt: string; subtasks: Subtask[];
}

export interface Movie {
  id: string; title: string; type: string; genre: string | null; language: string | null; platform: string | null;
  status: string; favorite: boolean; rating: number | null; watchDate: string | null; review: string | null;
  notes: string | null; posterUrl: string | null; trailerUrl: string | null; imdbUrl: string | null; createdAt: string;
}

export interface Habit { id: string; name: string; type: string; icon: string; targetPerWeek: number; archived: boolean }
export interface HabitLog { id: string; habitId: string; date: string; done: boolean }

export interface DailyLog {
  id: string; date: string; bedtime: string | null; wakeTime: string | null; sleepHours: number | null;
  sleepQuality: number | null; water: number | null; studyHours: number | null; studySubject: string | null;
  focusRating: number | null; screenPhoneMin: number | null; screenLaptopMin: number | null;
  screenSocialMin: number | null; screenGamingMin: number | null; screenEntertainMin: number | null;
  mood: string | null; energy: string | null; steps: number | null; wentWell: string | null; improve: string | null;
}

export interface Exercise { name: string; sets: number; reps: number; weightKg: number }
export interface Workout {
  id: string; date: string; type: string; name: string | null; durationMin: number; calories: number | null;
  exercises: Exercise[]; notes: string | null;
}
export interface BodyEntry {
  id: string; date: string; weightKg: number | null; chest: number | null; waist: number | null;
  arms: number | null; thighs: number | null;
}

export interface Meal {
  id: string; date: string; time: string; mealType: string; food: string; quantity: string | null;
  calories: number; protein: number; carbs: number; fats: number; category: string; hasSugar: boolean; notes: string | null;
}

export interface Transaction {
  id: string; type: 'income' | 'expense'; amount: number; category: string; date: string;
  paymentMethod: string; notes: string | null; recurrence: string; parentId: string | null;
}
export interface Budget { id: string; category: string; monthlyLimit: number }
export interface SavingsGoal { id: string; name: string; targetAmount: number; savedAmount: number; deadline: string | null }

export interface UserProfile {
  id: string; name: string; email: string; image: string | null; age: number | null; location: string | null;
  heightCm: number | null; weightKg: number | null; targetWeightKg: number | null; fitnessGoal: string;
  activityLevel: string; goals: string[]; waterGoal: number; calorieGoal: number; proteinGoal: number;
  stepGoal: number; weeklyWorkoutGoal: number; weeklyActiveMinGoal: number; monthlyBudget: number;
  cheatMealsPerWeek: number; sleepTarget: number; studyTarget: number; currency: string; theme: string;
  notifications: Record<string, boolean>; onboarded: boolean; hasPassword: boolean; createdAt: string;
}

export interface Snapshot {
  user: UserProfile;
  tasks: Task[]; movies: Movie[]; habits: Habit[]; habitLogs: HabitLog[]; dailyLogs: DailyLog[];
  workouts: Workout[]; bodyEntries: BodyEntry[]; meals: Meal[]; transactions: Transaction[];
  budgets: Budget[]; savingsGoals: SavingsGoal[];
}

export type ResourceName =
  | 'tasks' | 'movies' | 'habits' | 'workouts' | 'bodyEntries' | 'meals' | 'transactions' | 'budgets' | 'savingsGoals';
