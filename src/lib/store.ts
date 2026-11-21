'use client';
import { create } from 'zustand';

export type QuickKind = 'task' | 'movie' | 'workout' | 'meal' | 'expense' | 'income' | 'habit' | 'sleep' | 'water' | 'mood' | 'body' | 'goal';

export interface Toast { id: number; kind: 'success' | 'error' | 'info' | 'warning'; message: string }

interface UIState {
  quick: { kind: QuickKind; initial?: Record<string, unknown> } | null;
  openQuick: (kind: QuickKind, initial?: Record<string, unknown>) => void;
  closeQuick: () => void;
  toasts: Toast[];
  toast: (kind: Toast['kind'], message: string) => void;
  dismissToast: (id: number) => void;
  readNotifications: string[];
  markRead: (ids: string[]) => void;
  moreOpen: boolean;
  setMoreOpen: (v: boolean) => void;
}

let nextId = 1;

export const useUI = create<UIState>((set, get) => ({
  quick: null,
  openQuick: (kind, initial) => set({ quick: { kind, initial } }),
  closeQuick: () => set({ quick: null }),
  toasts: [],
  toast: (kind, message) => {
    const id = nextId++;
    set({ toasts: [...get().toasts.slice(-3), { id, kind, message }] });
    setTimeout(() => get().dismissToast(id), kind === 'error' ? 6000 : 3200);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  readNotifications: [],
  markRead: (ids) => set({ readNotifications: Array.from(new Set([...get().readNotifications, ...ids])) }),
  moreOpen: false,
  setMoreOpen: (v) => set({ moreOpen: v }),
}));

export const toast = {
  success: (m: string) => useUI.getState().toast('success', m),
  error: (m: string) => useUI.getState().toast('error', m),
  info: (m: string) => useUI.getState().toast('info', m),
  warning: (m: string) => useUI.getState().toast('warning', m),
};
