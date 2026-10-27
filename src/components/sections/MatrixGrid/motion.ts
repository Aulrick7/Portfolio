/**
 * How the light cycle moves along a ride, as plain math (three.js only, so it can be tested on its own):
 *
 * - planSpeed: how fast the bike goes at every point of a ride. It brakes before turns (tighter turn = slower),
 *   speeds up out of them, never goes faster than its top speed, and comes to a smooth stop at the end.
 * - TrailPoints: the points of the light trail behind the bike. The trail lingers when the bike stops, then fades.
 */

import * as THREE from 'three';

/** Limits on the bike's speed (world units per second, and per second squared). */
export type SpeedLimits = {
    /** Top speed. */
    cruise: number;
    /** How hard it can turn: in a turn of radius r the speed is at most sqrt(grip * r). */
    grip: number;
    /** How quickly it speeds up and slows down. */
    accel: number;
    brake: number;
};

export type SpeedPlan = {
    length: number;
    duration: number;
    /** Distance along the ride `t` seconds after it started. */
    distanceAt: (t: number) => number;
    /** Speed `t` seconds after the ride started. */
    speedAt: (t: number) => number;
};

const STEP = 0.1; // the ride is checked every 10 cm
const TURN_LOOKAHEAD = 3; // samples either side used to judge how tight a turn is

/**
 * Plans the speed along `curve`, starting at `startSpeed`. `limitsAt` gives the limits at each point (so a part of
 * the ride, like a bridge, can be faster).
 */
export function planSpeed(
    curve: THREE.Curve<THREE.Vector3>,
    startSpeed: number,
    limitsAt: (point: THREE.Vector3) => SpeedLimits
): SpeedPlan {
    const length = curve.getLength();
    const n = Math.max(2, Math.ceil(length / STEP));
    const ds = length / n;
    const points = curve.getSpacedPoints(n);
    const limits = points.map((p) => limitsAt(p));

    // How sharply the ride turns at each point (radians per unit of distance).
    const dirs = points.slice(1).map((p, i) => p.clone().sub(points[i]).normalize());
    const bend = new Float32Array(n + 1);
    for (let i = 1; i < n; i++) bend[i] = dirs[i - 1].angleTo(dirs[i]) / ds;
    bend[0] = bend[1];
    bend[n] = bend[n - 1];
    const curvature = new Float32Array(n + 1);
    for (let i = 0; i <= n; i++) {
        let k = 0;
        for (let j = Math.max(0, i - TURN_LOOKAHEAD); j <= Math.min(n, i + TURN_LOOKAHEAD); j++)
            k = Math.max(k, bend[j]);
        curvature[i] = k;
    }

    // Fastest allowed speed at each point, then limit it by how quickly the bike can speed up (forwards) and
    // slow down (backwards), ending at a standstill.
    const speed = new Float32Array(n + 1);
    for (let i = 0; i <= n; i++) {
        const turnLimit = Math.sqrt(limits[i].grip / Math.max(curvature[i], 1e-6));
        speed[i] = Math.min(limits[i].cruise, turnLimit);
    }
    speed[0] = Math.min(Math.max(startSpeed, 0), speed[0]);
    for (let i = 1; i <= n; i++) {
        speed[i] = Math.min(speed[i], Math.sqrt(speed[i - 1] ** 2 + 2 * limits[i].accel * ds));
    }
    speed[n] = 0;
    for (let i = n - 1; i >= 0; i--) {
        speed[i] = Math.min(speed[i], Math.sqrt(speed[i + 1] ** 2 + 2 * limits[i].brake * ds));
    }

    // Time at each point (constant acceleration between points).
    const times = new Float32Array(n + 1);
    for (let i = 1; i <= n; i++) times[i] = times[i - 1] + (2 * ds) / Math.max(speed[i - 1] + speed[i], 1e-3);
    const duration = times[n];

    const segment = (t: number) => {
        let lo = 0;
        let hi = n;
        while (hi - lo > 1) {
            const mid = (lo + hi) >> 1;
            if (times[mid] <= t) lo = mid;
            else hi = mid;
        }
        const dt = Math.max(times[lo + 1] - times[lo], 1e-6);
        const tau = THREE.MathUtils.clamp(t - times[lo], 0, dt);
        const a = (speed[lo + 1] - speed[lo]) / dt;
        return { i: lo, tau, a };
    };

    return {
        length,
        duration,
        distanceAt: (t) => {
            if (t <= 0) return 0;
            if (t >= duration) return length;
            const { i, tau, a } = segment(t);
            return Math.min(length, i * ds + speed[i] * tau + 0.5 * a * tau * tau);
        },
        speedAt: (t) => {
            if (t <= 0) return speed[0];
            if (t >= duration) return 0;
            const { i, tau, a } = segment(t);
            return Math.max(0, speed[i] + a * tau);
        }
    };
}

/**
 * The points of the light trail, newest first. Point 0 always sits at the back wheel; a new fixed point is added
 * whenever the wheel has moved `spacing` away from the last one (however small each frame's step is, so the trail
 * draws the same at any frame rate).
 */
export class TrailPoints {
    points: THREE.Vector3[] = [];
    /** Length of the trail (world units). */
    length = 0;
    /** 1 while riding and lingering, fading to 0 after the bike has stopped for a while. */
    opacity = 1;

    private stoppedAt: number | null = null;
    private readonly spacing: number;
    private readonly maxLength: number;
    private readonly maxPoints: number;
    private readonly linger: number;
    private readonly fade: number;

    constructor(options: { spacing: number; maxLength: number; maxPoints: number; linger: number; fade: number }) {
        this.spacing = options.spacing;
        this.maxLength = options.maxLength;
        this.maxPoints = options.maxPoints;
        this.linger = options.linger;
        this.fade = options.fade;
    }

    /** Call once per frame with the back wheel's position, whether the bike is riding, and the time in seconds. */
    update(back: THREE.Vector3, moving: boolean, now: number) {
        const list = this.points;
        if (moving) {
            // Riding again while the old trail was fading: start a fresh one (a lingering one just carries on).
            if (this.stoppedAt !== null && this.opacity < 1) list.length = 0;
            this.stoppedAt = null;
            this.opacity = 1;
            if (!list.length) list.push(back.clone(), back.clone());
            list[0].copy(back);
            if (list[0].distanceTo(list[1]) >= this.spacing) list.splice(1, 0, back.clone());
        } else if (list.length) {
            if (this.stoppedAt === null) this.stoppedAt = now;
            const stopped = now - this.stoppedAt;
            this.opacity = stopped <= this.linger ? 1 : Math.max(0, 1 - (stopped - this.linger) / this.fade);
            if (this.opacity <= 0) list.length = 0;
        }

        // Keep at most maxLength of trail: the oldest point is pulled in so the tail shortens smoothly.
        let total = 0;
        for (let i = 1; i < list.length; i++) {
            const d = list[i].distanceTo(list[i - 1]);
            if (total + d > this.maxLength || i >= this.maxPoints - 1) {
                if (total + d > this.maxLength && d > 0) {
                    list[i].lerpVectors(list[i - 1], list[i], (this.maxLength - total) / d);
                    total = this.maxLength;
                } else total += d;
                list.length = i + 1;
                break;
            }
            total += d;
        }
        this.length = total;
    }
}
