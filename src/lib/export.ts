// Client-side CSV / PDF helpers. Server CSV for everything lives in /api/export.
import type { Snapshot } from '@/types';
import { longDate, money, todayStr } from './dates';

const escCell = (v: unknown) => {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // spreadsheet formula injection guard
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => escCell(r[c])).join(','))].join('\n');
  downloadBlob(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `lifeos-${name}-${todayStr()}.csv`);
}

/** Builds a multi-section PDF of the user's data in the browser (jsPDF loaded on demand). */
export async function downloadPdf(s: Snapshot, sections: ('tasks' | 'movies' | 'workouts' | 'meals' | 'money' | 'life')[] = ['tasks', 'workouts', 'meals', 'money', 'movies', 'life']) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const cur = s.user.currency;
  // jsPDF's built-in fonts cannot render the rupee sign, so amounts use "Rs".
  const amt = (n: number) => (cur === 'INR' ? `Rs ${Math.round(n).toLocaleString('en-IN')}` : money(n, cur));

  doc.setFontSize(22).setTextColor(59, 130, 246).text('LifeOS Report', 40, 50);
  doc.setFontSize(10).setTextColor(100).text(`${s.user.name}  |  Generated ${longDate(todayStr())}`, 40, 68);

  const add = (title: string, head: string[], body: (string | number)[][]) => {
    if (!body.length) return;
    const y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 80) + 28;
    const startY = y > 740 ? (doc.addPage(), 50) : y;
    doc.setFontSize(13).setTextColor(20).text(title, 40, startY);
    autoTable(doc, { startY: startY + 8, head: [head], body, styles: { fontSize: 8, cellPadding: 4 }, headStyles: { fillColor: [59, 130, 246] }, margin: { left: 40, right: 40 } });
  };

  if (sections.includes('tasks')) add('Tasks', ['Title', 'Category', 'Priority', 'Status', 'Due', 'Progress'], s.tasks.map((t) => [t.title, t.category, t.priority, t.status, t.dueDate ?? '-', `${t.progress}%`]));
  if (sections.includes('workouts')) add('Workouts', ['Date', 'Type', 'Name', 'Minutes', 'Calories'], s.workouts.map((w) => [w.date, w.type, w.name ?? '-', w.durationMin, w.calories ?? '-']));
  if (sections.includes('meals')) add('Meals', ['Date', 'Meal', 'Food', 'Category', 'Kcal', 'P/C/F'], s.meals.slice(0, 300).map((m) => [m.date, m.mealType, m.food, m.category, m.calories, `${m.protein}/${m.carbs}/${m.fats}`]));
  if (sections.includes('money')) add('Transactions', ['Date', 'Type', 'Category', 'Amount', 'Method', 'Notes'], s.transactions.map((t) => [t.date, t.type, t.category, amt(t.amount), t.paymentMethod, t.notes ?? '']));
  if (sections.includes('movies')) add('Movies & series', ['Title', 'Type', 'Genre', 'Platform', 'Status', 'Rating'], s.movies.map((m) => [m.title, m.type, m.genre ?? '-', m.platform ?? '-', m.status, m.rating ?? '-']));
  if (sections.includes('life')) add('Daily life log', ['Date', 'Sleep (h)', 'Water', 'Study (h)', 'Mood', 'Energy', 'Steps'], s.dailyLogs.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 120).map((l) => [l.date, l.sleepHours ?? '-', l.water ?? '-', l.studyHours ?? '-', l.mood ?? '-', l.energy ?? '-', l.steps ?? '-']));

  doc.save(`lifeos-report-${todayStr()}.pdf`);
}
