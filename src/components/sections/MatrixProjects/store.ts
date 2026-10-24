/**
 * State of the grid world, shared by the 3D scene and the on-screen controls (HUD).
 * The scene reads `target` and rides the camera there; the HUD and keyboard call the actions.
 */

import { create } from 'zustand';

import type { MatrixProject } from '@/types';
import type { Lane } from './layout';

export type Target =
    | { kind: 'start' }
    | { kind: 'fork' }
    | { kind: 'station'; lane: Lane; index: number; open: boolean };

type GridState = {
    lanes: Record<Lane, MatrixProject[]>;
    /** 'intro': rain is turning into the grid; 'ready': visitors can move around. */
    phase: 'intro' | 'ready';
    target: Target;
    /** True while the camera is riding somewhere. */
    moving: boolean;
    /** Id of the panel or sign under the pointer. */
    hovered: string | null;

    reset: (lanes: Record<Lane, MatrixProject[]>) => void;
    setPhase: (phase: GridState['phase']) => void;
    setMoving: (moving: boolean) => void;
    setHovered: (id: string | null) => void;
    goTo: (target: Target) => void;
    goFork: () => void;
    chooseLane: (lane: Lane, index?: number) => void;
    next: () => boolean;
    prev: () => boolean;
    open: () => void;
    close: () => void;
    /** Escape: close an open panel, otherwise go back to the fork. */
    back: () => void;
};

export const useGridStore = create<GridState>((set, get) => ({
    lanes: { game: [], software: [] },
    phase: 'intro',
    target: { kind: 'start' },
    moving: false,
    hovered: null,

    reset: (lanes) => set({ lanes, phase: 'intro', target: { kind: 'start' }, moving: false, hovered: null }),
    setPhase: (phase) => set({ phase }),
    setMoving: (moving) => set({ moving }),
    setHovered: (hovered) => set({ hovered }),
    goTo: (target) => set({ target }),
    goFork: () => set({ target: { kind: 'fork' } }),

    chooseLane: (lane, index = 0) => {
        const count = get().lanes[lane].length;
        if (!count) return;
        set({ target: { kind: 'station', lane, index: Math.min(index, count - 1), open: false } });
    },

    next: () => {
        const { target, lanes } = get();
        if (target.kind !== 'station') return false;
        if (target.index + 1 >= lanes[target.lane].length) return false;
        set({ target: { ...target, index: target.index + 1, open: false } });
        return true;
    },

    prev: () => {
        const { target } = get();
        if (target.kind !== 'station') return false;
        if (target.index === 0) set({ target: { kind: 'fork' } });
        else set({ target: { ...target, index: target.index - 1, open: false } });
        return true;
    },

    open: () => {
        const { target } = get();
        if (target.kind === 'station' && !target.open) set({ target: { ...target, open: true } });
    },

    close: () => {
        const { target } = get();
        if (target.kind === 'station' && target.open) set({ target: { ...target, open: false } });
    },

    back: () => {
        const { target } = get();
        if (target.kind === 'station' && target.open) get().close();
        else if (target.kind === 'station') get().goFork();
    }
}));

/** URL-friendly id for a project ("/projects/3-Gambit/" -> "3-Gambit"). */
export function projectSlug(project: MatrixProject) {
    const parts = (project.url ?? project.id ?? '').split('/').filter(Boolean);
    return parts[parts.length - 1] ?? project.title;
}
