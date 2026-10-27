/**
 * Rider: drives the light cycle and the camera.
 *
 * - When the store's `target` changes, it plans a ride (layout.bikeRide) from where the bike is to the new stop, and
 *   how fast to go along it (motion.planSpeed): the bike speeds up, brakes into turns and leans through them, carves
 *   a wide U-turn when it has to go back the way it came, and slows to a stop.
 * - Going back to the fork from a lane, it rides on to the end of the lane and takes that lane's bridge (layout.ts,
 *   Bridge.tsx), boosting along it, lands behind the start point and rides up to the fork.
 * - The camera chases the bike in third person while it rides, and swings round to frame the fork or the panel when
 *   it stops (or comes in close when a panel is opened). All camera moves are smoothed, so switching between these
 *   framings never jumps.
 * - The bike glows white on the trunk and takes on each lane's colour as it rides into it (worlds.ts).
 *
 * Development aids (not in production): window.__gridCamera = { position: [x, y, z], look: [x, y, z] } overrides
 * the camera; window.__gridTimeScale = 0.25 plays the rides in slow motion.
 */

import { useFrame, useThree } from '@react-three/fiber';
import * as React from 'react';
import * as THREE from 'three';

import {
    BIKE,
    BikeStop,
    bikeRide,
    chasePose,
    exitStop,
    forkCameraPose,
    forkStop,
    Lane,
    PanelPlacement,
    panelStop,
    startStop,
    stationPose,
    stopPoint,
    verticalFov,
    WORLD
} from './layout';
import { LightCycle, LightTrail } from './LightCycle';
import { planSpeed, SpeedLimits, SpeedPlan } from './motion';
import { Target, useGridStore } from './store';
import { dampFactor, INTRO, useTimeline } from './timeline';

export type LaneBridge = { points: THREE.Vector3[]; entryS: number };

type Ride = {
    curve: THREE.CatmullRomCurve3;
    length: number;
    plan: SpeedPlan | null;
    duration: number;
    elapsed: number;
    to: BikeStop;
    /** The lane whose bridge this ride takes, if any (such a ride is finished before the next one starts). */
    bridge: Lane | null;
};

function stopFor(target: Target, panels: PanelPlacement[]): BikeStop {
    if (target.kind === 'fork') return forkStop();
    if (target.kind === 'exit') return exitStop();
    if (target.kind === 'station') {
        const panel = panels.find((p) => p.lane === target.lane && p.index === target.index);
        if (panel) return panelStop(panel);
    }
    return startStop();
}

const sameStop = (a: BikeStop, b: BikeStop) => a.lane === b.lane && Math.abs(a.s - b.s) < 0.01;

/** On a bridge (lifted off the grid) the bike boosts; elsewhere on a bridge ride it is a little quicker than usual. */
const rideLimits =
    (bridge: boolean) =>
    (point: THREE.Vector3): SpeedLimits =>
        bridge ? (point.y > 0.03 ? BIKE.bridgeRide.deck : BIKE.bridgeRide.ground) : BIKE.ride;

export function Rider({
    panels,
    bridges,
    reducedMotion
}: {
    panels: PanelPlacement[];
    bridges: Partial<Record<Lane, LaneBridge>>;
    reducedMotion: boolean;
}) {
    const timeline = useTimeline();
    const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
    const bikeRef = React.useRef<THREE.Group>(null);
    const leanRef = React.useRef<THREE.Group>(null);
    const lean = React.useRef(0);
    const moving = React.useRef(false);
    const color = React.useRef(new THREE.Color(useGridStore.getState().world.neutral));
    const laneColor = React.useMemo(() => new THREE.Color(), []);

    const state = React.useRef({
        stop: startStop(),
        heading: new THREE.Vector3(0, 0, -1),
        ride: null as Ride | null,
        /** A destination asked for while riding a bridge: ridden to once the bridge ride is over. */
        pending: null as Target | null,
        speed: 0,
        yaw: Math.PI,
        yawRate: 0,
        pitch: 0,
        lookAt: new THREE.Vector3(0, 1.2, 0),
        cameraReady: false,
        placed: false
    });

    const plan = React.useCallback(
        (target: Target) => {
            const st = state.current;
            const to = stopFor(target, panels);
            if (!st.ride && sameStop(to, st.stop)) return; // already there
            const bike = bikeRef.current;
            const fromStop = st.ride ? st.ride.to : st.stop;
            const from = bike ? bike.position.clone() : stopPoint(st.stop);

            // Back to the fork from a lane: over that lane's bridge.
            const lane = fromStop.lane === 'left' || fromStop.lane === 'right' ? fromStop.lane : null;
            const bridgeLane = lane && to.lane === null && sameStop(to, forkStop()) && bridges[lane] ? lane : null;

            // A U-turn swings away from the panel the bike is parked at.
            let turnSide: 1 | -1 = 1;
            const parkedAt = panels.find((p) => p.lane === fromStop.lane && sameStop(panelStop(p), fromStop));
            if (parkedAt) {
                const right = new THREE.Vector3(-st.heading.z, 0, st.heading.x);
                turnSide = parkedAt.base.clone().sub(from).dot(right) > 0 ? -1 : 1;
            }

            const curve = bikeRide(fromStop, from, st.heading, to, {
                bridge: bridgeLane ? bridges[bridgeLane] : undefined,
                turnSide
            });
            const length = curve.getLength();
            const speedPlan = reducedMotion ? null : planSpeed(curve, st.speed, rideLimits(!!bridgeLane));
            st.ride = {
                curve,
                length,
                plan: speedPlan,
                duration: speedPlan ? speedPlan.duration : 0.001,
                elapsed: 0,
                to,
                bridge: bridgeLane
            };
            moving.current = true;
            useGridStore.getState().setMoving(true);
        },
        [panels, bridges, reducedMotion]
    );

    // Plan a ride whenever the destination changes.
    React.useEffect(
        () =>
            useGridStore.subscribe((s, prev) => {
                if (s.target === prev.target) return;
                const st = state.current;
                if (st.ride?.bridge) {
                    st.pending = s.target; // finish the bridge first
                    return;
                }
                plan(s.target);
            }),
        [plan]
    );

    const tmp = React.useMemo(
        () => ({
            pos: new THREE.Vector3(),
            tangent: new THREE.Vector3(),
            flat: new THREE.Vector3(),
            forkHeading: new THREE.Vector3(0, 0, -1)
        }),
        []
    );

    useFrame((frameState, rawDelta) => {
        const st = state.current;
        const bike = bikeRef.current;
        if (!bike) return;
        const { size } = frameState;
        const aspect = size.width / size.height;
        const timeScale =
            process.env.NODE_ENV !== 'production' ? (((window as any).__gridTimeScale as number | undefined) ?? 1) : 1;
        const delta = Math.min(rawDelta, 0.1) * timeScale;

        /* --- bike --- */
        const previousYaw = st.yaw;
        let pitch = 0;
        if (st.ride) {
            const ride = st.ride;
            ride.elapsed += delta;
            const done = reducedMotion || ride.elapsed >= ride.duration;
            const distance = done || !ride.plan ? ride.length : ride.plan.distanceAt(ride.elapsed);
            const u = THREE.MathUtils.clamp(distance / ride.length, 0, 1);
            st.speed = done || !ride.plan ? 0 : ride.plan.speedAt(ride.elapsed);
            if (ride.to.lane === 'straight' && u > 0.6 && !useGridStore.getState().exiting) {
                useGridStore.getState().setExiting(true);
            }
            ride.curve.getPointAt(u, tmp.pos);
            ride.curve.getTangentAt(Math.min(u, 0.999), tmp.tangent);
            bike.position.copy(tmp.pos);
            tmp.flat.copy(tmp.tangent).setY(0);
            const flatLength = tmp.flat.length();
            if (flatLength > 1e-4) {
                tmp.flat.divideScalar(flatLength);
                st.heading.lerp(tmp.flat, reducedMotion ? 1 : dampFactor(0.04, delta)).normalize();
            }
            pitch = -Math.atan2(tmp.tangent.y, Math.max(flatLength, 1e-4));
            if (done) {
                st.stop = ride.to;
                st.ride = null;
                st.speed = 0;
                moving.current = false;
                const store = useGridStore.getState();
                store.setMoving(false);
                if (st.pending) {
                    const next = st.pending;
                    st.pending = null;
                    plan(next); // (does nothing if the bike is already there)
                }
            }
        } else {
            stopPoint(st.stop, tmp.pos);
            // The first frame puts the bike straight on its stop (rather than gliding there from the origin).
            if (!st.placed) bike.position.copy(tmp.pos);
            else bike.position.lerp(tmp.pos, dampFactor(0.2, delta));
            st.placed = true;
            // At the fork the bike faces the junction.
            if (st.stop.lane === null) st.heading.lerp(tmp.forkHeading, dampFactor(0.25, delta)).normalize();
        }
        st.pitch += (pitch - st.pitch) * (reducedMotion ? 1 : dampFactor(0.06, delta));

        // Glow colour: white on the trunk, the lane's colour once inside a lane (kept while up on a bridge).
        const world = useGridStore.getState().world;
        const p = bike.position;
        let region: string | null = null;
        if (p.y > 0.3) region = null;
        else if (p.z > WORLD.cornerRadius * 0.6) region = world.neutral;
        else if (p.x < -0.6) region = world.lanes.left.color;
        else if (p.x > 0.6) region = world.lanes.right.color;
        else if (p.z < -0.6 && world.straight) region = world.straight.color;
        if (region) color.current.lerp(laneColor.set(region), reducedMotion ? 1 : dampFactor(BIKE.colorChange, delta));

        st.yaw = Math.atan2(st.heading.x, st.heading.z);
        bike.rotation.order = 'YXZ';
        bike.rotation.set(st.pitch, st.yaw, 0);
        // Lean into turns like a motorbike: more speed and a tighter turn mean more lean.
        let yawRate = st.yaw - previousYaw;
        if (yawRate > Math.PI) yawRate -= Math.PI * 2;
        if (yawRate < -Math.PI) yawRate += Math.PI * 2;
        yawRate /= Math.max(delta, 1e-3);
        st.yawRate += (yawRate - st.yawRate) * dampFactor(0.08, delta);
        lean.current = THREE.MathUtils.clamp(
            -Math.atan((st.speed * st.yawRate) / BIKE.leanGravity),
            -BIKE.maxLean,
            BIKE.maxLean
        );

        /* --- camera --- */
        const target = useGridStore.getState().target;
        let pose: { position: THREE.Vector3; look: THREE.Vector3 };
        let smooth = 0.55;
        if (timeline.time < INTRO.done && !st.ride) {
            // Intro: start high in the rain, settle in behind the bike as it rezzes in.
            const chase = chasePose(bike.position, st.heading, aspect);
            const high = {
                position: new THREE.Vector3(0, 3.6, WORLD.trunkStart + 8),
                look: new THREE.Vector3(0, 1.4, WORLD.trunkStart - 10)
            };
            const k = THREE.MathUtils.smoothstep(timeline.time, INTRO.reveal[0], INTRO.done);
            pose = {
                position: high.position.lerp(chase.position, k),
                look: high.look.lerp(chase.look, k)
            };
            smooth = 0.35;
        } else if (st.ride) {
            pose = chasePose(bike.position, st.heading, aspect);
            // On a bridge the camera keeps up with the boost (it trails at most about 1.5 units behind).
            smooth = st.ride.bridge ? THREE.MathUtils.clamp(1.5 / Math.max(st.speed, 0.1), 0.04, 0.3) : 0.3;
        } else if (target.kind === 'station') {
            const panel = panels.find((p) => p.lane === target.lane && p.index === target.index);
            pose = panel ? stationPose(panel, aspect, target.open) : chasePose(bike.position, st.heading, aspect);
            smooth = 0.6;
        } else if (target.kind === 'fork') {
            pose = forkCameraPose(aspect);
            smooth = 0.7;
        } else {
            pose = chasePose(bike.position, st.heading, aspect);
        }

        const debug = process.env.NODE_ENV !== 'production' ? (window as any).__gridCamera : undefined;
        if (debug?.position && debug?.look) {
            pose = { position: new THREE.Vector3(...debug.position), look: new THREE.Vector3(...debug.look) };
            st.cameraReady = false;
        }

        if (!st.cameraReady || reducedMotion) {
            camera.position.copy(pose.position);
            st.lookAt.copy(pose.look);
            st.cameraReady = true;
        } else {
            const k = dampFactor(smooth, delta);
            camera.position.lerp(pose.position, k);
            st.lookAt.lerp(pose.look, k);
        }
        camera.lookAt(st.lookAt);
        const fov = verticalFov(aspect);
        if (Math.abs(camera.fov - fov) > 0.01) {
            camera.fov = fov;
            camera.updateProjectionMatrix();
        }
        // Priority -1: the bike moves before the light cycle and its trail update, so the trail never lags a frame behind.
    }, -1);

    return (
        <>
            <LightCycle bikeRef={bikeRef} leanRef={leanRef} lean={lean} color={color} />
            <LightTrail bikeRef={bikeRef} leanRef={leanRef} moving={moving} color={color} />
        </>
    );
}
