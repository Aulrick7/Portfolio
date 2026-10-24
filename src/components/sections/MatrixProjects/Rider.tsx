/**
 * Rider: drives the light cycle and the camera.
 *
 * - When the store's `target` changes, it plans a ride (layout.bikeRide) from where the bike is to the
 *   new stop and plays it: the bike speeds up, follows the lines, leans into turns and slows to a stop.
 * - The camera chases the bike in third person while it rides, and swings round to frame the fork or the
 *   panel when it stops (or comes in close when a panel is opened). All camera moves are smoothed, so
 *   switching between these framings never jumps.
 */

import { useFrame, useThree } from '@react-three/fiber';
import * as React from 'react';
import * as THREE from 'three';

import {
    BIKE,
    BikeStop,
    bikeRide,
    chasePose,
    forkCameraPose,
    forkStop,
    PanelPlacement,
    panelStop,
    startStop,
    stationPose,
    stopPoint,
    verticalFov,
    WORLD
} from './layout';
import { LightCycle, LightTrail } from './LightCycle';
import { Target, useGridStore } from './store';
import { dampFactor, INTRO, useTimeline } from './timeline';

type Ride = {
    curve: THREE.CatmullRomCurve3;
    length: number;
    duration: number;
    startedAt: number | null;
    to: BikeStop;
};

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

function stopFor(target: Target, panels: PanelPlacement[]): BikeStop {
    if (target.kind === 'fork') return forkStop();
    if (target.kind === 'station') {
        const panel = panels.find((p) => p.lane === target.lane && p.index === target.index);
        if (panel) return panelStop(panel);
    }
    return startStop();
}

export function Rider({ panels, reducedMotion }: { panels: PanelPlacement[]; reducedMotion: boolean }) {
    const timeline = useTimeline();
    const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
    const bikeRef = React.useRef<THREE.Group>(null);
    const lean = React.useRef(0);
    const moving = React.useRef(false);

    const state = React.useRef({
        stop: startStop(),
        heading: new THREE.Vector3(0, 0, -1),
        ride: null as Ride | null,
        yaw: Math.PI,
        lookAt: new THREE.Vector3(0, 1.2, 0),
        cameraReady: false
    });

    // Plan a ride whenever the destination changes.
    React.useEffect(
        () =>
            useGridStore.subscribe((s, prev) => {
                if (s.target === prev.target) return;
                const st = state.current;
                const to = stopFor(s.target, panels);
                if (to.lane === st.stop.lane && Math.abs(to.s - st.stop.s) < 0.01 && !st.ride) return; // already there
                const bike = bikeRef.current;
                const from = bike ? bike.position.clone() : stopPoint(st.stop);
                const curve = bikeRide(st.ride ? st.ride.to : st.stop, from, st.heading, to);
                const length = curve.getLength();
                st.ride = {
                    curve,
                    length,
                    duration: reducedMotion ? 0.001 : Math.max(BIKE.minRide, length / BIKE.speed + 0.5),
                    startedAt: null,
                    to
                };
                moving.current = true;
                useGridStore.getState().setMoving(true);
            }),
        [panels, reducedMotion]
    );

    const tmp = React.useMemo(
        () => ({ pos: new THREE.Vector3(), tangent: new THREE.Vector3(), forkHeading: new THREE.Vector3(0, 0, -1) }),
        []
    );

    useFrame((frameState, delta) => {
        const st = state.current;
        const bike = bikeRef.current;
        if (!bike) return;
        const { size, clock } = frameState;
        const aspect = size.width / size.height;
        const now = clock.elapsedTime;

        /* --- bike --- */
        const previousYaw = st.yaw;
        if (st.ride) {
            const ride = st.ride;
            if (ride.startedAt === null) ride.startedAt = now;
            const t = Math.min(1, (now - ride.startedAt) / ride.duration);
            const u = easeInOutSine(t);
            ride.curve.getPointAt(u, tmp.pos);
            ride.curve.getTangentAt(Math.min(u, 0.999), tmp.tangent).setY(0).normalize();
            bike.position.copy(tmp.pos).setY(0);
            st.heading.lerp(tmp.tangent, reducedMotion ? 1 : dampFactor(0.06, delta)).normalize();
            if (t >= 1) {
                st.stop = ride.to;
                st.ride = null;
                moving.current = false;
                useGridStore.getState().setMoving(false);
            }
        } else {
            stopPoint(st.stop, tmp.pos);
            bike.position.lerp(tmp.pos, dampFactor(0.2, delta));
            // At the fork the bike turns to face the junction.
            if (st.stop.lane === null) st.heading.lerp(tmp.forkHeading, dampFactor(0.25, delta)).normalize();
        }
        st.yaw = Math.atan2(st.heading.x, st.heading.z);
        bike.rotation.y = st.yaw;
        // Lean into turns (proportional to how fast we are turning).
        let yawRate = st.yaw - previousYaw;
        if (yawRate > Math.PI) yawRate -= Math.PI * 2;
        if (yawRate < -Math.PI) yawRate += Math.PI * 2;
        lean.current = THREE.MathUtils.clamp((-yawRate / Math.max(delta, 1e-3)) * 0.12, -0.4, 0.4);

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
            smooth = 0.3;
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

        // Development aid: window.__gridCamera = { position: [x, y, z], look: [x, y, z] } overrides the camera.
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
    });

    return (
        <>
            <LightCycle bikeRef={bikeRef} lean={lean} />
            <LightTrail bikeRef={bikeRef} moving={moving} />
        </>
    );
}
