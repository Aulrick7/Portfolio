import { create } from 'zustand';

interface TronTransitionStore {
    isTransitioning: boolean;
    targetUrl: string | null;
    startTransition: (url: string) => void;
    endTransition: () => void;
}

export const useTronTransition = create<TronTransitionStore>((set) => ({
    isTransitioning: false,
    targetUrl: null,
    startTransition: (url: string) => set({ isTransitioning: true, targetUrl: url }),
    endTransition: () => set({ isTransitioning: false, targetUrl: null })
}));
