/**
 * The intro: the Matrix rain turns into the grid. GridWorld advances these numbers every frame
 * (0 = not started, 1 = done) and the scene parts read them in their own useFrame, so nothing re-renders.
 *
 * Seconds from the moment the world has loaded:
 *   0.0 - 0.7  fade in from black, inside heavy green code rain
 *   0.6 - 3.0  reveal: a ring sweeps out from the start, dissolving the rain into the neon grid
 *   2.0 - 3.6  the lane lights draw themselves in
 *   2.6 - 4.0  panels and fork signs rise out of the grid
 *   3.0 - 3.8  the light cycle rezzes in, then rides to the fork
 */

import * as React from 'react';

export const INTRO = {
    fade: [0, 0.7],
    reveal: [0.6, 3.0],
    lanes: [2.0, 3.6],
    panels: [2.6, 4.0],
    bike: [3.0, 3.8],
    /** When the intro hands over to the visitor (the bike sets off for the fork). */
    done: 4.0,
    /** How far the reveal ring travels (world units). */
    revealRadius: 52
} as const;

export type Timeline = {
    /** Seconds since the intro started (Infinity once skipped). */
    time: number;
    fade: number;
    reveal: number;
    lanes: number;
    panels: number;
    bike: number;
};

export const createTimeline = (): Timeline => ({ time: 0, fade: 0, reveal: 0, lanes: 0, panels: 0, bike: 0 });

const ramp = ([a, b]: readonly [number, number], t: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));

export function advanceTimeline(timeline: Timeline, time: number) {
    timeline.time = time;
    timeline.fade = ramp(INTRO.fade, time);
    timeline.reveal = ramp(INTRO.reveal, time);
    timeline.lanes = ramp(INTRO.lanes, time);
    timeline.panels = ramp(INTRO.panels, time);
    timeline.bike = ramp(INTRO.bike, time);
}

export const TimelineContext = React.createContext<Timeline>(createTimeline());
export const useTimeline = () => React.useContext(TimelineContext);

export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Frame-rate independent smoothing towards a target (seconds to cover ~63% of the gap). */
export const dampFactor = (smoothTime: number, delta: number) => 1 - Math.exp(-delta / Math.max(1e-4, smoothTime));
