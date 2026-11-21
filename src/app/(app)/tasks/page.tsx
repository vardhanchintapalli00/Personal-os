'use client';
import { useMemo, useState } from 'react';
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertCircle, CalendarDays, CheckSquare, ChevronLeft, ChevronRight, Clock, Download, ExternalLink, GripVertical, List, Pencil, Plus, Repeat, Search, Target, Trash2, Trophy, Bell } from 'lucide-react';
import { Badge, Button, Card, Checkbox, Chip, ConfirmDialog, EmptyState, Input, Modal, PageHeader, ProgressBar, ProgressRing, SectionTitle, Segmented, Select, type Tone } from '@/components/ui';
import { TaskForm } from '@/components/forms';
import { useCrud, useSnapshot } from '@/lib/hooks';
import { useUI, toast } from '@/lib/store';
import { PRIORITIES, TASK_CATEGORIES } from '@/lib/constants';
import { dayName, fmtTime12, longDate, monthDays, monthLabel, parseDay, relativeDay, shiftMonth, weekDays, monthStart, inRange } from '@/lib/dates';
import { focusScore, isDone, isOverdue, productivityScore, taskStatsForDay, weeklyTaskReport } from '@/lib/scores';
import { COLORS } from '@/lib/theme';
import { downloadCsv } from '@/lib/export';
import { cn } from '@/lib/utils';
import type { Task } from '@/types';

const PRIORITY_TONE: Record<string, Tone> = { Low: 'neutral', Medium: 'study', High: 'warn', Urgent: 'danger' };
const PRIORITY_RANK: Record<string, number> = { Urgent: 4, High: 3, Medium: 2, Low: 1 };
type Filter = 'all' | 'today' | 'week' | 'overdue' | 'completed';
type Sort = 'manual' | 'due' | 'priority' | 'created';

export default function TasksPage() {
  const { snapshot: s, today } = useSnapshot();
  const crud = useCrud('tasks');
  const openQuick = useUI((u) => u.openQuick);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [prio, setPrio] = useState('');
  const [sort, setSort] = useState<Sort>('manual');
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [calMonth, setCalMonth] = useState(monthStart(today));
  const [selDay, setSelDay] = useState<string>(today);

  const nowHm = new Date().toTimeString().slice(0, 5);
  const tasks = s?.tasks ?? [];

  const visible = useMemo(() => {
    const wk = weekDays(today);
    let list = tasks.filter((t) => {
      if (q && !`${t.title} ${t.description ?? ''} ${t.notes ?? ''}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (cat && t.category !== cat) return false;
      if (prio && t.priority !== prio) return false;
      switch (filter) {
        case 'today': return t.dueDate === today;
        case 'week': return !!t.dueDate && inRange(t.dueDate, wk[0], wk[6]);
        case 'overdue': return isOverdue(t, today, nowHm);
        case 'completed': return isDone(t);
        default: return true;
      }
    });
    const dueKey = (t: Task) => (t.dueDate ? `${t.dueDate} ${t.dueTime ?? '99:99'}` : '9999');
    if (sort === 'due') list = [...list].sort((a, b) => dueKey(a).localeCompare(dueKey(b)));
    else if (sort === 'priority') list = [...list].sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || dueKey(a).localeCompare(dueKey(b)));
    else if (sort === 'created') list = [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    else list = [...list].sort((a, b) => a.position - b.position);
    // keep finished tasks at the bottom unless the user is looking at them
    if (filter !== 'completed') list = [...list.filter((t) => !isDone(t)), ...list.filter(isDone)];
    return list;
  }, [tasks, q, cat, prio, filter, sort, today, nowHm]);

  const plan = useMemo(
    () => tasks.filter((t) => !isDone(t))
      .sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
      .filter((t) => t.priority === 'Urgent' || t.priority === 'High').slice(0, 3),
    [tasks],
  );

  const report = useMemo(() => (s ? weeklyTaskReport(s, today) : null), [s, today]);
  const todayStats = s ? taskStatsForDay(s, today) : { done: 0, total: 0, pct: 0 };
  const productivity = s ? productivityScore(s, weekDays(today)) : null;
  const focus = s ? focusScore(s, today) : null;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = visible.map((t) => t.id);
    const from = ids.indexOf(String(e.active.id));
    const to = ids.indexOf(String(e.over.id));
    const moved = arrayMove(visible, from, to);
    // Reassign the positions the visible rows already occupy, so hidden rows keep their place.
    const slots = [...visible].map((t) => t.position).sort((a, b) => a - b);
    moved.forEach((t, i) => { if (t.position !== slots[i]) crud.update(t.id, { position: slots[i] }, { silent: true }); });
    if (sort !== 'manual') setSort('manual');
    toast.success('Task order saved');
  };

  const toggleDone = (t: Task) => {
    if (isDone(t)) {
      crud.update(t.id, { status: t.progress > 0 ? 'In progress' : 'Not started', completedOn: null, progress: t.subtasks.length ? t.progress : 0 }, { message: 'Task reopened' });
    } else {
      const subs = t.subtasks.map((x) => ({ title: x.title, completed: true }));
      crud.update(t.id, { status: 'Completed', completedOn: today, progress: 100, ...(subs.length ? { subtasks: subs } : {}) },
        { message: t.recurrence !== 'none' ? 'Task completed. Next occurrence scheduled!' : 'Task completed. Productivity score up! 🎉' });
    }
  };

  const toggleSub = (t: Task, idx: number) => {
    const subs = t.subtasks.map((x, i) => ({ title: x.title, completed: i === idx ? !x.completed : x.completed }));
    const done = subs.filter((x) => x.completed).length;
    const allDone = done === subs.length;
    const patch: Record<string, unknown> = { subtasks: subs, progress: Math.round((done / subs.length) * 100) };
    if (allDone) { patch.status = 'Completed'; patch.completedOn = today; }
    else if (isDone(t)) { patch.status = 'In progress'; patch.completedOn = null; }
    else if (done > 0 && t.status === 'Not started') patch.status = 'In progress';
    crud.update(t.id, patch, { message: allDone ? 'All subtasks done. Task completed! 🎉' : 'Subtask updated' });
  };

  if (!s || !report) return null;
  const filters: { v: Filter; l: string }[] = [{ v: 'all', l: 'All' }, { v: 'today', l: 'Today' }, { v: 'week', l: 'This week' }, { v: 'overdue', l: 'Overdue' }, { v: 'completed', l: 'Completed' }];
  const overdueCount = tasks.filter((t) => isOverdue(t, today, nowHm)).length;

  return (
    <div className="space-y-5">
      <PageHeader title="Tasks" icon={CheckSquare} tone="study" subtitle={`${tasks.filter((t) => !isDone(t)).length} open · ${overdueCount} overdue`}
        action={<>
          <Button variant="outline" size="sm" onClick={() => downloadCsv('tasks', tasks.map((t) => ({ title: t.title, category: t.category, priority: t.priority, status: t.status, due: t.dueDate ?? '', time: t.dueTime ?? '', progress: t.progress, subtasks: t.subtasks.map((x) => `${x.completed ? '[x]' : '[ ]'} ${x.title}`).join(' | ') })))}><Download size={15} /> CSV</Button>
          <Button onClick={() => openQuick('task')}><Plus size={17} /> Add task</Button></>} />

      {/* Score + Daily plan */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <SectionTitle icon={Target} tone="study">Today's progress</SectionTitle>
          <div className="flex items-center gap-4">
            <ProgressRing value={todayStats.pct ?? 0} size={92} stroke={9} color={COLORS.study}><span className="text-xl font-bold">{todayStats.pct ?? 0}%</span></ProgressRing>
            <div className="space-y-1.5 text-sm">
              <p><span className="font-bold tabular-nums">{todayStats.done}/{todayStats.total}</span> <span className="text-muted-foreground">done today</span></p>
              <p><span className="font-bold text-study tabular-nums">{productivity ?? '--'}</span> <span className="text-muted-foreground">productivity</span></p>
              <p><span className="font-bold text-success tabular-nums">{focus ?? '--'}</span> <span className="text-muted-foreground">focus score</span></p>
            </div>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <SectionTitle icon={Trophy} tone="fit">Daily plan · top priorities</SectionTitle>
          {plan.length === 0 ? <p className="rounded-xl bg-success/10 px-4 py-5 text-center text-sm font-medium text-success">No urgent work pending. Pick something from your list or enjoy the free time. ✨</p> : (
            <ol className="space-y-2">
              {plan.map((t, i) => (
                <li key={t.id} className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-study text-xs font-bold text-white">{i + 1}</span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{t.title}</p>
                    <p className={cn('text-xs', isOverdue(t, today, nowHm) ? 'font-semibold text-danger' : 'text-muted-foreground')}>{t.dueDate ? `${relativeDay(t.dueDate, today)}${t.dueTime ? ` · ${fmtTime12(t.dueTime)}` : ''}` : 'No due date'} · {t.priority}</p></div>
                  <Checkbox checked={false} onChange={() => toggleDone(t)} tone="study" label={`Complete ${t.title}`} />
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {/* Weekly report */}
      <Card>
        <SectionTitle icon={CalendarDays} tone="study" action={<Badge tone="study">{report.rate}% completion</Badge>}>Weekly productivity report</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {([['Completed', report.completed, 'success'], ['Missed', report.missed, 'danger'], ['Total', report.total, 'study'], ['Best day', report.bestDay ? dayName(report.bestDay) : '--', 'fit'], ['Top category', report.topCategory ?? '--', 'movie']] as [string, string | number, Tone][]).map(([l, v, t]) => (
            <div key={l} className="rounded-xl bg-muted/60 px-3 py-2.5"><p className="text-[11px] text-muted-foreground">{l}</p><p className={cn('truncate text-lg font-bold', t === 'danger' && report.missed > 0 ? 'text-danger' : '')}>{v}</p></div>
          ))}
        </div>
      </Card>

      {/* Toolbar */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-10" placeholder="Search tasks..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search tasks" />
          </div>
          <Segmented value={view} onChange={setView} options={[{ value: 'list', label: <span className="flex items-center gap-1.5"><List size={14} />List</span> }, { value: 'calendar', label: <span className="flex items-center gap-1.5"><CalendarDays size={14} />Calendar</span> }]} />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 no-scrollbar lg:mx-0 lg:px-0">
          {filters.map((f) => <Chip key={f.v} active={filter === f.v} tone={f.v === 'overdue' ? 'danger' : 'study'} onClick={() => setFilter(f.v)}>{f.l}{f.v === 'overdue' && overdueCount ? ` (${overdueCount})` : ''}</Chip>)}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Select aria-label="Category" value={cat} onChange={(e) => setCat(e.target.value)}><option value="">All categories</option>{TASK_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</Select>
          <Select aria-label="Priority" value={prio} onChange={(e) => setPrio(e.target.value)}><option value="">All priorities</option>{PRIORITIES.map((c) => <option key={c}>{c}</option>)}</Select>
          <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="manual">Manual order</option><option value="due">Due date</option><option value="priority">Priority</option><option value="created">Newest first</option>
          </Select>
        </div>
      </div>

      {view === 'list' ? (
        visible.length === 0 ? (
          <EmptyState icon={CheckSquare} title={tasks.length ? 'No tasks match your filters' : 'No tasks yet'} text={tasks.length ? 'Try clearing the search or filters.' : 'Add your first task and start building momentum.'}
            action={tasks.length ? <Button variant="outline" onClick={() => { setQ(''); setCat(''); setPrio(''); setFilter('all'); }}>Clear filters</Button> : <Button onClick={() => openQuick('task')}><Plus size={16} /> Add task</Button>} />
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={visible.map((t) => t.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2.5">
                {visible.map((t) => (
                  <SortableTask key={t.id} task={t} today={today} nowHm={nowHm} onToggle={() => toggleDone(t)} onSub={(i) => toggleSub(t, i)} onEdit={() => setEditing(t)} onDelete={() => setDeleting(t)} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )
      ) : (
        <CalendarView tasks={visible} today={today} month={calMonth} setMonth={setCalMonth} sel={selDay} setSel={setSelDay} nowHm={nowHm} onToggle={toggleDone} onEdit={setEditing} />
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit task" size="lg">
        {editing && <TaskForm editing initial={editing} onCancel={() => setEditing(null)} onSubmit={async (d) => { const r = await crud.update(editing.id, d, { message: 'Task updated' }); if (r) setEditing(null); }} />}
      </Modal>
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} title="Delete this task?" message={`"${deleting?.title}" and its subtasks will be permanently removed.`}
        onConfirm={async () => { if (deleting) { await crud.remove(deleting.id, { message: 'Task deleted' }); setDeleting(null); } }} />
    </div>
  );
}

function SortableTask({ task: t, today, nowHm, onToggle, onSub, onEdit, onDelete }: { task: Task; today: string; nowHm: string; onToggle: () => void; onSub: (i: number) => void; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: t.id });
  const [open, setOpen] = useState(false);
  const done = isDone(t);
  const overdue = isOverdue(t, today, nowHm);
  const subDone = t.subtasks.filter((x) => x.completed).length;
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn(isDragging && 'z-10 opacity-80')}>
      <div className={cn('card overflow-hidden transition', overdue && 'border-danger/50 bg-danger/[0.04]', done && 'opacity-70', isDragging && 'shadow-pop')}>
        <div className="flex items-start gap-2.5 p-3.5">
          <button {...attributes} {...listeners} aria-label="Drag to reorder" className="mt-0.5 hidden cursor-grab touch-none text-muted-foreground/60 hover:text-foreground sm:block"><GripVertical size={18} /></button>
          <div className="pt-0.5"><Checkbox checked={done} onChange={onToggle} tone={overdue ? 'danger' : 'success'} label={`Complete ${t.title}`} /></div>
          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setOpen((o) => !o)}>
            <p className={cn('font-semibold leading-snug', done && 'text-muted-foreground line-through')}>{t.title}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge tone="study">{t.category}</Badge>
              <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
              {t.dueDate && <Badge tone={overdue ? 'danger' : t.dueDate === today ? 'fit' : 'neutral'}>{overdue && <AlertCircle size={11} />}<Clock size={11} /> {relativeDay(t.dueDate, today)}{t.dueTime ? ` ${fmtTime12(t.dueTime)}` : ''}</Badge>}
              {overdue && <Badge tone="danger">Overdue</Badge>}
              {t.recurrence !== 'none' && <Badge tone="movie"><Repeat size={11} /> {t.recurrence}</Badge>}
              {t.reminderMinutes != null && <Badge tone="neutral"><Bell size={11} /></Badge>}
              {t.estimatedMin && <span className="text-[11px] text-muted-foreground">{t.estimatedMin} min</span>}
            </div>
            {(t.subtasks.length > 0 || t.progress > 0) && (
              <div className="mt-2.5 flex items-center gap-2"><ProgressBar value={t.progress} tone={done ? 'success' : 'study'} height={6} label="Task progress" /><span className="w-16 shrink-0 text-right text-[11px] font-semibold tabular-nums text-muted-foreground">{t.subtasks.length ? `${subDone}/${t.subtasks.length} · ` : ''}{t.progress}%</span></div>
            )}
          </div>
          <div className="flex shrink-0 flex-col gap-0.5 sm:flex-row">
            <button onClick={onEdit} aria-label="Edit task" className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><Pencil size={15} /></button>
            <button onClick={onDelete} aria-label="Delete task" className="rounded-lg p-2 text-muted-foreground hover:bg-danger/10 hover:text-danger"><Trash2 size={15} /></button>
          </div>
        </div>
        {open && (
          <div className="space-y-3 border-t border-border bg-muted/30 px-4 py-3.5 text-sm animate-fade-in">
            {t.description && <p className="text-muted-foreground">{t.description}</p>}
            {t.subtasks.length > 0 && (
              <ul className="space-y-1.5">{t.subtasks.map((x, i) => (
                <li key={x.id ?? i} className="flex items-center gap-2.5"><Checkbox checked={x.completed} tone="study" onChange={() => onSub(i)} label={x.title} /><span className={cn(x.completed && 'text-muted-foreground line-through')}>{x.title}</span></li>
              ))}</ul>
            )}
            {t.notes && <p className="rounded-lg bg-card px-3 py-2 text-xs text-muted-foreground"><b className="text-foreground">Notes:</b> {t.notes}</p>}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Status: <b className="text-foreground">{t.status}</b></span>
              {t.reminderMinutes != null && <span>Reminder: <b className="text-foreground">{t.reminderMinutes === 0 ? 'at due time' : t.reminderMinutes >= 1440 ? '1 day before' : `${t.reminderMinutes} min before`}</b></span>}
              {t.recurrence !== 'none' && <span>Repeats: <b className="text-foreground">{t.recurrence === 'custom' ? `every ${t.recurrenceInterval} days` : t.recurrence}</b></span>}
              {t.attachmentUrl && <a href={t.attachmentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-study"><ExternalLink size={12} /> Attachment</a>}
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

function CalendarView({ tasks, today, month, setMonth, sel, setSel, nowHm, onToggle, onEdit }: { tasks: Task[]; today: string; month: string; setMonth: (m: string) => void; sel: string; setSel: (d: string) => void; nowHm: string; onToggle: (t: Task) => void; onEdit: (t: Task) => void }) {
  const days = monthDays(month);
  const offset = (parseDay(days[0]).getUTCDay() + 6) % 7;
  const byDay = useMemo(() => {
    const m: Record<string, Task[]> = {};
    tasks.forEach((t) => { if (t.dueDate) (m[t.dueDate] ??= []).push(t); });
    return m;
  }, [tasks]);
  const selected = byDay[sel] ?? [];
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <div className="mb-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}><ChevronLeft size={18} /></Button>
          <p className="font-semibold">{monthLabel(month)}</p>
          <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}><ChevronRight size={18} /></Button>
        </div>
        <div className="mb-1.5 grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold text-muted-foreground">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((l) => <span key={l}>{l}</span>)}</div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: offset }).map((_, i) => <span key={i} />)}
          {days.map((d) => {
            const list = byDay[d] ?? [];
            const open = list.filter((t) => !isDone(t));
            const hasOverdue = list.some((t) => isOverdue(t, today, nowHm));
            return (
              <button key={d} onClick={() => setSel(d)} className={cn('flex aspect-square flex-col items-center justify-start gap-1 rounded-xl border p-1 text-xs font-semibold transition hover:bg-muted', d === sel ? 'border-study bg-study/10' : 'border-transparent bg-muted/40', d === today && 'ring-1 ring-study')}>
                <span>{Number(d.slice(8))}</span>
                {list.length > 0 && <span className="flex gap-0.5">{(open.length ? open : list).slice(0, 3).map((t) => <i key={t.id} className={cn('h-1.5 w-1.5 rounded-full', hasOverdue && !isDone(t) && isOverdue(t, today, nowHm) ? 'bg-danger' : isDone(t) ? 'bg-success' : 'bg-study')} />)}</span>}
              </button>
            );
          })}
        </div>
      </Card>
      <Card className="lg:col-span-2">
        <SectionTitle icon={CalendarDays} tone="study">{longDate(sel)}</SectionTitle>
        {selected.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No tasks due this day.</p> : (
          <ul className="space-y-2">{selected.map((t) => (
            <li key={t.id} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5', isOverdue(t, today, nowHm) ? 'bg-danger/10' : 'bg-muted/60')}>
              <Checkbox checked={isDone(t)} onChange={() => onToggle(t)} label={`Complete ${t.title}`} />
              <button onClick={() => onEdit(t)} className="min-w-0 flex-1 text-left"><p className={cn('truncate text-sm font-semibold', isDone(t) && 'text-muted-foreground line-through')}>{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.category}{t.dueTime ? ` · ${fmtTime12(t.dueTime)}` : ''}</p></button>
              <Badge tone={PRIORITY_TONE[t.priority]}>{t.priority}</Badge>
            </li>
          ))}</ul>
        )}
      </Card>
    </div>
  );
}

