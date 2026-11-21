// Shared option lists used by validators (server) and forms (client).

export const TASK_CATEGORIES = ['Studies', 'College', 'Assignments', 'Exams', 'Career', 'Skills', 'Personal', 'Home', 'Health', 'Finance', 'Other'] as const;
export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'] as const;
export const TASK_STATUSES = ['Not started', 'In progress', 'Completed', 'Missed'] as const;
export const RECURRENCES = ['none', 'daily', 'weekly', 'monthly', 'custom'] as const;

export const MOVIE_TYPES = ['Movie', 'Series'] as const;
export const PLATFORMS = ['Netflix', 'Prime Video', 'Hotstar', 'YouTube', 'Theater', 'Other'] as const;
export const MOVIE_STATUSES = ['Want to watch', 'Watching', 'Completed', 'Dropped'] as const;
export const GENRES = ['Action', 'Comedy', 'Drama', 'Thriller', 'Sci-Fi', 'Romance', 'Horror', 'Crime', 'Animation', 'Documentary', 'Fantasy', 'Other'] as const;
export const LANGUAGES = ['Telugu', 'Hindi', 'English', 'Tamil', 'Malayalam', 'Kannada', 'Korean', 'Other'] as const;

export const MOODS = ['Great', 'Good', 'Okay', 'Low', 'Stressed', 'Angry'] as const;
export const ENERGIES = ['Low', 'Medium', 'High'] as const;
export const MOOD_EMOJI: Record<string, string> = { Great: '😄', Good: '🙂', Okay: '😐', Low: '😔', Stressed: '😫', Angry: '😠' };
export const MOOD_VALUE: Record<string, number> = { Great: 5, Good: 4, Okay: 3, Low: 2, Stressed: 1.5, Angry: 1 };
export const ENERGY_VALUE: Record<string, number> = { Low: 1, Medium: 2, High: 3 };

export const WORKOUT_TYPES = ['Gym', 'Home workout', 'Running', 'Walking', 'Cycling', 'Yoga', 'Sports', 'Stretching'] as const;
export const FITNESS_GOALS = ['Lose fat', 'Gain muscle', 'Improve stamina', 'General fitness', 'Flexibility'] as const;
export const ACTIVITY_LEVELS = ['Sedentary', 'Light', 'Moderate', 'Active', 'Very active'] as const;

export const MEAL_TYPES = ['Breakfast', 'Lunch', 'Snacks', 'Dinner'] as const;
export const MEAL_CATEGORIES = ['Home food', 'Healthy', 'Outside food', 'Junk food', 'Sugary food', 'Cheat meal'] as const;

export const INCOME_CATEGORIES = ['Pocket money', 'Part-time work', 'Freelance', 'Scholarship', 'Gifts', 'Other'] as const;
export const EXPENSE_CATEGORIES = ['Food', 'Travel', 'College fees', 'Books', 'Mobile recharge', 'Internet', 'Shopping', 'Subscriptions', 'Entertainment', 'Health', 'Gifts', 'Other'] as const;
export const PAYMENT_METHODS = ['Cash', 'UPI', 'Debit card', 'Credit card', 'Bank transfer'] as const;
export const TX_RECURRENCES = ['none', 'weekly', 'monthly'] as const;

export const DEFAULT_HABITS: { name: string; icon: string; type: 'build' | 'quit' }[] = [
  { name: 'No sugar', icon: '🚫', type: 'quit' },
  { name: 'No outside food', icon: '🏠', type: 'quit' },
  { name: 'Workout', icon: '💪', type: 'build' },
  { name: 'Reading', icon: '📖', type: 'build' },
  { name: 'Coding', icon: '💻', type: 'build' },
  { name: 'Journaling', icon: '📝', type: 'build' },
  { name: 'Wake up early', icon: '🌅', type: 'build' },
  { name: 'No social media after 10 PM', icon: '📵', type: 'quit' },
  { name: 'Drink enough water', icon: '💧', type: 'build' },
  { name: 'Sleep before 12 AM', icon: '🌙', type: 'build' },
];

export const QUOTES = [
  'Discipline is choosing between what you want now and what you want most.',
  'Small daily improvements are the key to staggering long-term results.',
  'You don\'t have to be extreme, just consistent.',
  'Your future self is watching you right now through your habits.',
  'Motivation gets you started. Habit keeps you going.',
  'A year from now you will wish you had started today.',
  'Don\'t count the days. Make the days count.',
  'Strong body, sharp mind, steady wallet. Build all three.',
  'The pain of discipline weighs grams; the pain of regret weighs tonnes.',
  'Win the morning, win the day.',
  'Progress, not perfection.',
  'Every rupee saved is a vote for the future you want.',
  'Be stronger than your excuses.',
  'Done is better than perfect. Start the task.',
  'Consistency beats intensity when intensity doesn\'t last.',
  'One workout at a time. One page at a time. One day at a time.',
  'What you do every day matters more than what you do once in a while.',
  'Eat to fuel the person you are becoming.',
  'Focus is a superpower. Protect it.',
  'You are one decision away from a completely different day.',
  'Hard choices, easy life. Easy choices, hard life.',
  'Dream big, start small, act now.',
  'Sweat now, shine later.',
  'Your only competition is who you were yesterday.',
  'Make your streaks proud of you.',
  'Learn something today that your tomorrow self will thank you for.',
  'Energy flows where attention goes.',
  'Rest is part of the plan, not a break from it.',
  'Be the student who builds, not the one who waits.',
  'Today is a great day to be disciplined.',
  'Healthy habits are the best investment you will ever make.',
] as const;
