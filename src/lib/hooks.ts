'use client';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { toast } from './store';
import { todayStr } from './dates';
import type { DailyLog, ResourceName, Snapshot } from '@/types';

export const SNAPSHOT_KEY = ['snapshot'] as const;

/** Re-renders at midnight so "today" (and weekly/monthly views) roll over automatically. */
export function useToday(): string {
  const [today, setToday] = useState(todayStr());
  useEffect(() => {
    const id = setInterval(() => {
      const t = todayStr();
      setToday((prev) => (prev === t ? prev : t));
    }, 30_000);
    return () => clearInterval(id);
  }, []);
  return today;
}

/** Live clock that ticks every second. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function useSnapshot() {
  const today = useToday();
  const q = useQuery({
    queryKey: SNAPSHOT_KEY,
    queryFn: () => api<Snapshot>(`/api/snapshot?today=${todayStr()}`),
    staleTime: 60_000,
  });
  return { ...q, snapshot: q.data, today };
}

type AnyRow = { id: string } & Record<string, unknown>;

const TEMP = 'tmp_';

/** Applies an optimistic patch to the cached snapshot so every card, chart and score updates instantly. */
function patchSnapshot(qc: ReturnType<typeof useQueryClient>, fn: (s: Snapshot) => Snapshot) {
  qc.setQueryData<Snapshot>(SNAPSHOT_KEY, (old) => (old ? fn(old) : old));
}

const LABELS: Record<ResourceName, string> = {
  tasks: 'Task', movies: 'Movie', habits: 'Habit', workouts: 'Workout', bodyEntries: 'Entry',
  meals: 'Meal', transactions: 'Transaction', budgets: 'Budget', savingsGoals: 'Savings goal',
};

export interface CrudOptions { silent?: boolean; message?: string }

/** Generic create / update / delete with optimistic cache updates, rollback on error and toast feedback. */
export function useCrud(resource: ResourceName) {
  const qc = useQueryClient();
  const label = LABELS[resource];
  const list = (s: Snapshot) => s[resource as keyof Snapshot] as unknown as AnyRow[];
  const withList = (s: Snapshot, rows: AnyRow[]) => ({ ...s, [resource]: rows }) as Snapshot;

  const rollbackCtx = async () => {
    await qc.cancelQueries({ queryKey: SNAPSHOT_KEY });
    return { prev: qc.getQueryData<Snapshot>(SNAPSHOT_KEY) };
  };
  const rollback = (_e: unknown, _v: unknown, ctx?: { prev?: Snapshot }) => {
    if (ctx?.prev) qc.setQueryData(SNAPSHOT_KEY, ctx.prev);
  };
  const settle = () => qc.invalidateQueries({ queryKey: SNAPSHOT_KEY });
  const onError = (e: unknown, v: unknown, ctx?: { prev?: Snapshot }) => {
    rollback(e, v, ctx);
    toast.error((e as Error).message);
  };

  const create = useMutation({
    mutationFn: (v: { data: Record<string, unknown> } & CrudOptions) => api<AnyRow>(`/api/${resource}`, { method: 'POST', json: v.data }),
    onMutate: async (v) => {
      const ctx = await rollbackCtx();
      patchSnapshot(qc, (s) => withList(s, [{ id: `${TEMP}${Date.now()}`, subtasks: [], ...v.data } as AnyRow, ...list(s)]));
      return ctx;
    },
    onError,
    onSuccess: (_d, v) => !v.silent && toast.success(v.message ?? `${label} added`),
    onSettled: settle,
  });

  const update = useMutation({
    mutationFn: (v: { id: string; data: Record<string, unknown> } & CrudOptions) => api<AnyRow>(`/api/${resource}/${v.id}`, { method: 'PATCH', json: v.data }),
    onMutate: async (v) => {
      const ctx = await rollbackCtx();
      patchSnapshot(qc, (s) => withList(s, list(s).map((r) => (r.id === v.id ? { ...r, ...v.data } : r))));
      return ctx;
    },
    onError,
    onSuccess: (_d, v) => !v.silent && toast.success(v.message ?? `${label} updated`),
    onSettled: settle,
  });

  const remove = useMutation({
    mutationFn: (v: { id: string } & CrudOptions) => api(`/api/${resource}/${v.id}`, { method: 'DELETE' }),
    onMutate: async (v) => {
      const ctx = await rollbackCtx();
      patchSnapshot(qc, (s) => withList(s, list(s).filter((r) => r.id !== v.id)));
      return ctx;
    },
    onError,
    onSuccess: (_d, v) => !v.silent && toast.success(v.message ?? `${label} deleted`),
    onSettled: settle,
  });

  return {
    create: (data: Record<string, unknown>, o?: CrudOptions) => create.mutateAsync({ data, ...o }).catch(() => null),
    update: (id: string, data: Record<string, unknown>, o?: CrudOptions) => update.mutateAsync({ id, data, ...o }).catch(() => null),
    remove: (id: string, o?: CrudOptions) => remove.mutateAsync({ id, ...o }).catch(() => null),
    pending: create.isPending || update.isPending || remove.isPending,
  };
}

/** Upsert the daily log for a day (sleep, water, mood, steps, study, screen time, journal...). */
export function useDailyLog() {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (v: { date: string; data: Partial<DailyLog>; message?: string | false }) => api('/api/dailylog', { method: 'PUT', json: { date: v.date, ...v.data } }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: SNAPSHOT_KEY });
      const prev = qc.getQueryData<Snapshot>(SNAPSHOT_KEY);
      patchSnapshot(qc, (s) => {
        const exists = s.dailyLogs.some((l) => l.date === v.date);
        const logs = exists
          ? s.dailyLogs.map((l) => (l.date === v.date ? { ...l, ...v.data } : l))
          : [...s.dailyLogs, { id: `${TEMP}${v.date}`, date: v.date, ...v.data } as DailyLog];
        return { ...s, dailyLogs: logs };
      });
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(SNAPSHOT_KEY, ctx.prev);
      toast.error((e as Error).message);
    },
    onSuccess: (_d, v) => v.message !== false && toast.success(v.message ?? 'Saved'),
    onSettled: () => qc.invalidateQueries({ queryKey: SNAPSHOT_KEY }),
  });
  return { save: (date: string, data: Partial<DailyLog>, message?: string | false) => m.mutateAsync({ date, data, message }).catch(() => null), pending: m.isPending };
}

/** Toggle a habit for a day; streaks, life score and heatmap recompute immediately. */
export function useHabitToggle() {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (v: { habitId: string; date: string; done: boolean }) => api('/api/habitlog', { method: 'POST', json: v }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: SNAPSHOT_KEY });
      const prev = qc.getQueryData<Snapshot>(SNAPSHOT_KEY);
      patchSnapshot(qc, (s) => ({
        ...s,
        habitLogs: v.done
          ? [...s.habitLogs.filter((l) => !(l.habitId === v.habitId && l.date === v.date)), { id: `${TEMP}${v.habitId}${v.date}`, habitId: v.habitId, date: v.date, done: true }]
          : s.habitLogs.filter((l) => !(l.habitId === v.habitId && l.date === v.date)),
      }));
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(SNAPSHOT_KEY, ctx.prev);
      toast.error((e as Error).message);
    },
    onSuccess: (_d, v) => toast.success(v.done ? 'Habit completed. Streak updated!' : 'Habit unmarked'),
    onSettled: () => qc.invalidateQueries({ queryKey: SNAPSHOT_KEY }),
  });
  return (habitId: string, date: string, done: boolean) => m.mutate({ habitId, date, done });
}

/** Convenience: the snapshot or an empty placeholder-safe memo for derived values. */
export function useDerived<T>(fn: (s: Snapshot, today: string) => T, fallback: T): T {
  const { snapshot, today } = useSnapshot();
  return useMemo(() => (snapshot ? fn(snapshot, today) : fallback), [snapshot, today]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Saves profile/settings instantly: the cached user is patched first so the whole app reflects it at once. */
export function useProfileUpdate() {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (v: { data: Record<string, unknown>; message?: string | false }) => api('/api/profile', { method: 'PATCH', json: v.data }),
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey: SNAPSHOT_KEY });
      const prev = qc.getQueryData<Snapshot>(SNAPSHOT_KEY);
      patchSnapshot(qc, (s) => ({ ...s, user: { ...s.user, ...v.data } as Snapshot['user'] }));
      return { prev };
    },
    onError: (e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(SNAPSHOT_KEY, ctx.prev);
      toast.error((e as Error).message);
    },
    onSuccess: (_d, v) => v.message !== false && toast.success(v.message ?? 'Settings saved'),
    onSettled: () => qc.invalidateQueries({ queryKey: SNAPSHOT_KEY }),
  });
  return { update: (data: Record<string, unknown>, message?: string | false) => m.mutateAsync({ data, message }).then(() => true).catch(() => false), pending: m.isPending };
}
