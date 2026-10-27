/**
 * GridWorld: the three.js scene for /projectChoice (client-only, loaded by ./index.tsx).
 *
 * The Matrix rain dissolves into a Tron grid with a fork: game projects down the left lane, software projects
 * down the right. A light cycle rides between the project panels with the camera following in third person.
 *
 *   layout.ts      where everything is, rides and camera framings (plain math)
 *   store.ts       where the bike is going (shared with the on-screen controls)
 *   timeline.ts    the intro (rain -> grid)
 *   Environment    grid floor, sky, lane lights
 *   Panels         project panels and fork signs
 *   Bridge         the raised road back to the fork from each lane
 *   Rider          the light cycle and the camera (motion.ts: speed and trail)
 *   Hud            buttons and labels on top of the canvas
 */

import { Environment, Lightformer } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import Router from 'next/router';
import * as React from 'react';
import * as THREE from 'three';

import MatrixRain3D from '@/components/three/MatrixRain3D';
import type { MatrixProject } from '@/types';
import { GridFloor, LaneLights, Sky } from './Environment';
import { Hud } from './Hud';
import { Bridge } from './Bridge';
import { bridgeEntryS, bridgePoints, Lane, panelStop, placePanels, routePoint, WORLD } from './layout';
import { ExitPortal, ForkSign, ProjectPanel } from './Panels';
import { LaneBridge, Rider } from './Rider';
import { projectSlug, Target, useGridStore } from './store';
import { advanceTimeline, createTimeline, INTRO, TimelineContext, useTimeline } from './timeline';
import { sideForKey, WorldConfig } from './worlds';

function usePrefersReducedMotion() {
    const [reduced, setReduced] = React.useState(false);
    React.useEffect(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)');
        const update = () => setReduced(query.matches);
        update();
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);
    return reduced;
}

/* ------------------------------------------------------------------ intro + rain */

const INTRO_RAIN = {
    area: { minX: -16, maxX: 16, minZ: -6, maxZ: 26 },
    keepClear: { minX: 0, maxX: 0, minZ: 0, maxZ: 0 }
};
const FAR_RAIN = {
    area: { minX: -80, maxX: 80, minZ: -70, maxZ: 70 },
    keepClear: { minX: -48, maxX: 48, minZ: -34, maxZ: 40 }
};

function IntroDirector({
    timeline,
    reducedMotion,
    initialTarget
}: {
    timeline: ReturnType<typeof createTimeline>;
    reducedMotion: boolean;
    initialTarget: Target;
}) {
    const started = React.useRef<number | null>(null);
    useFrame((state) => {
        if (started.current === null) started.current = state.clock.elapsedTime;
        const time = reducedMotion ? 1000 : state.clock.elapsedTime - started.current;
        advanceTimeline(timeline, time);
        const store = useGridStore.getState();
        if (store.phase === 'intro' && time >= INTRO.done) {
            store.setPhase('ready');
            store.goTo(initialTarget);
        }
    });
    return null;
}

function Rain({ reducedMotion }: { reducedMotion: boolean }) {
    const timeline = useTimeline();
    const intro = React.useRef<THREE.Mesh>(null);
    useFrame(() => {
        const material = intro.current?.material as THREE.ShaderMaterial | undefined;
        if (!material) return;
        const reveal = timeline.reveal;
        material.uniforms.uDissolveRadius.value =
            reveal <= 0 ? -1 : THREE.MathUtils.smootherstep(reveal, 0, 1) * INTRO.revealRadius;
        intro.current!.visible = reveal < 1;
    });
    return (
        <>
            <MatrixRain3D
                ref={intro}
                columns={520}
                area={INTRO_RAIN.area}
                keepClear={INTRO_RAIN.keepClear}
                height={[3, 7]}
                glyphSize={[0.07, 0.11]}
                fade={[10, 30]}
                intensity={1.6}
                paused={reducedMotion}
                seed={11}
                sizeOrigin={[0, WORLD.trunkStart + 8]}
                dissolveCenter={[0, WORLD.trunkStart]}
            />
            <MatrixRain3D
                columns={900}
                area={FAR_RAIN.area}
                keepClear={FAR_RAIN.keepClear}
                height={[7, 16]}
                glyphSize={[0.14, 0.24]}
                fade={[40, 95]}
                intensity={1.25}
                paused={reducedMotion}
                seed={23}
                sizeOrigin={[0, 0]}
            />
        </>
    );
}

/* ------------------------------------------------------------------ scene */

function Scene({
    world,
    lanes,
    reducedMotion,
    initialTarget
}: {
    world: WorldConfig;
    lanes: Record<Lane, MatrixProject[]>;
    reducedMotion: boolean;
    initialTarget: Target;
}) {
    const timeline = React.useMemo(() => createTimeline(), []);
    const panels = React.useMemo(
        () => [...placePanels('left', lanes.left), ...placePanels('right', lanes.right)],
        [lanes]
    );
    // Each lane's bridge back to the fork starts just past its last panel.
    const bridges = React.useMemo(() => {
        const result: Partial<Record<Lane, LaneBridge>> = {};
        for (const lane of ['left', 'right'] as const) {
            const stops = panels.filter((p) => p.lane === lane).map((p) => panelStop(p).s);
            if (!stops.length) continue;
            const entryS = bridgeEntryS(Math.max(...stops));
            result[lane] = { points: bridgePoints(lane, entryS), entryS };
        }
        return result;
    }, [panels]);
    const connectors = React.useMemo(
        () =>
            panels.map((p) => ({ lane: p.lane, from: routePoint(p.lane, p.s + WORLD.panelLead), to: p.base.clone() })),
        [panels]
    );

    return (
        <TimelineContext.Provider value={timeline}>
            <color attach="background" args={[WORLD.colors.background]} />
            <fog attach="fog" args={[WORLD.colors.background, 18, 90]} />
            <ambientLight intensity={0.25} />
            <directionalLight position={[6, 10, 8]} intensity={0.6} />
            <Environment resolution={128} frames={1}>
                <Lightformer
                    form="rect"
                    intensity={2}
                    color={world.lanes.left.color}
                    position={[0, 5, 6]}
                    scale={[10, 0.4, 1]}
                    onUpdate={(self) => self.lookAt(0, 0, 0)}
                />
                <Lightformer
                    form="rect"
                    intensity={1.2}
                    color={world.lanes.right.color}
                    position={[-6, 2, -4]}
                    scale={[0.4, 6, 1]}
                    onUpdate={(self) => self.lookAt(0, 0, 0)}
                />
                <Lightformer
                    form="rect"
                    intensity={1}
                    color="#ffffff"
                    position={[6, 3, 2]}
                    scale={[0.4, 4, 1]}
                    onUpdate={(self) => self.lookAt(0, 0, 0)}
                />
            </Environment>
            <Sky />
            <GridFloor />
            <Rain reducedMotion={reducedMotion} />
            <React.Suspense fallback={null}>
                <LaneLights connectors={connectors} />
                <ForkSign route="left" />
                <ForkSign route="right" />
                {world.straight && <ForkSign route="straight" />}
                {world.straight && <ExitPortal />}
                {panels.map((panel) => (
                    <ProjectPanel
                        key={`${panel.lane}-${panel.index}`}
                        panel={panel}
                        stagger={0.08 * (panel.index + (panel.lane === 'right' ? 0.5 : 0))}
                    />
                ))}
                {(['left', 'right'] as const).map(
                    (lane) =>
                        bridges[lane] && (
                            <Bridge
                                key={lane}
                                lane={lane}
                                points={bridges[lane]!.points}
                                color={world.lanes[lane].color}
                            />
                        )
                )}
                <Rider panels={panels} bridges={bridges} reducedMotion={reducedMotion} />
                {/* Inside the Suspense boundary: the intro only starts once the bike and fonts have loaded. */}
                <IntroDirector timeline={timeline} reducedMotion={reducedMotion} initialTarget={initialTarget} />
            </React.Suspense>
        </TimelineContext.Provider>
    );
}

/* ------------------------------------------------------------------ input + URL */

function useControls(enabled: boolean, container: React.RefObject<HTMLElement>) {
    React.useEffect(() => {
        if (!enabled) return;
        const busy = () => {
            const s = useGridStore.getState();
            return s.phase !== 'ready' || s.moving;
        };
        const onKey = (e: KeyboardEvent) => {
            if ((e.target as HTMLElement)?.closest?.('input, textarea, select, [contenteditable]')) return;
            const s = useGridStore.getState();
            if (busy()) return;
            const atFork = s.target.kind === 'fork';
            const open = s.target.kind === 'station' && s.target.open;
            let handled = true;
            switch (e.key) {
                case 'ArrowLeft':
                    if (atFork) s.chooseLane('left');
                    else if (!open) s.prev();
                    break;
                case 'ArrowRight':
                    if (atFork) s.chooseLane('right');
                    else if (!open) s.next();
                    break;
                case 'ArrowUp':
                    if (atFork) s.goStraight();
                    else if (!open) s.next();
                    break;
                case 'ArrowDown':
                    if (!atFork && !open) s.prev();
                    break;
                case 'Enter':
                    if (s.target.kind === 'station' && !open) s.open();
                    else if (open && s.target.kind === 'station') {
                        const project = s.lanes[s.target.lane][s.target.index];
                        if (project?.url) Router.push(project.url);
                    }
                    break;
                case 'Escape':
                case 'Backspace':
                    s.back();
                    break;
                default:
                    handled = false;
            }
            if (handled) e.preventDefault();
        };

        let wheelLock = 0;
        const onWheel = (e: WheelEvent) => {
            const s = useGridStore.getState();
            if (s.target.kind !== 'station' || s.target.open) return;
            e.preventDefault();
            if (busy() || performance.now() < wheelLock || Math.abs(e.deltaY) < 8) return;
            wheelLock = performance.now() + 650;
            if (e.deltaY > 0) s.next();
            else s.prev();
        };

        let touch: { x: number; y: number } | null = null;
        const onTouchStart = (e: TouchEvent) => {
            touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        };
        const onTouchEnd = (e: TouchEvent) => {
            if (!touch) return;
            const dx = e.changedTouches[0].clientX - touch.x;
            const dy = e.changedTouches[0].clientY - touch.y;
            touch = null;
            const s = useGridStore.getState();
            if (busy() || s.target.kind !== 'station' || s.target.open) return;
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) {
                if (dx < 0) s.next();
                else s.prev();
            }
        };

        const el = container.current;
        window.addEventListener('keydown', onKey);
        el?.addEventListener('wheel', onWheel, { passive: false });
        el?.addEventListener('touchstart', onTouchStart, { passive: true });
        el?.addEventListener('touchend', onTouchEnd, { passive: true });
        return () => {
            window.removeEventListener('keydown', onKey);
            el?.removeEventListener('wheel', onWheel);
            el?.removeEventListener('touchstart', onTouchStart);
            el?.removeEventListener('touchend', onTouchEnd);
        };
    }, [enabled, container]);
}

/** Keeps ?lane=&project= in the address bar in step with where the bike is, so a stop can be shared. */
function useUrlSync() {
    React.useEffect(
        () =>
            useGridStore.subscribe((s, prev) => {
                if (s.moving || (s.target === prev.target && s.moving === prev.moving)) return;
                if (s.phase !== 'ready') return;
                const query: Record<string, string> = {};
                if (s.target.kind === 'exit') return;
                if (s.target.kind === 'station') {
                    const project = s.lanes[s.target.lane][s.target.index];
                    query.lane = s.world.lanes[s.target.lane].key;
                    if (project) query.project = projectSlug(project);
                }
                const path = window.location.pathname;
                const search = new URLSearchParams(query).toString();
                const url = search ? `${path}?${search}` : path;
                if (url !== `${window.location.pathname}${window.location.search}`) {
                    Router.replace(url, undefined, { shallow: true, scroll: false });
                }
            }),
        []
    );
}

/* ------------------------------------------------------------------ main */

/** When the bike has ridden through the straight lane's portal, go to that page. */
function useExit() {
    React.useEffect(
        () =>
            useGridStore.subscribe((s) => {
                if (s.target.kind === 'exit' && !s.moving && s.exiting && s.world.straight) {
                    Router.push(s.world.straight.href);
                }
            }),
        []
    );
}

export default function GridWorld({ world, items }: { world: WorldConfig; items: MatrixProject[] }) {
    const reducedMotion = usePrefersReducedMotion();
    const container = React.useRef<HTMLDivElement>(null);
    const lanes = React.useMemo(
        () => ({
            left: items.filter((item) => world.lanes.left.match(item)),
            right: items.filter((item) => !world.lanes.left.match(item) && world.lanes.right.match(item))
        }),
        [items, world]
    );

    // Where to go once the intro is over: the fork, or a project named in the URL.
    const initialTarget = React.useMemo<Target>(() => {
        if (typeof window === 'undefined') return { kind: 'fork' };
        const params = new URLSearchParams(window.location.search);
        const lane = sideForKey(world, params.get('lane'));
        const slug = params.get('project');
        if (lane) {
            const index = Math.max(
                0,
                lanes[lane].findIndex((p) => projectSlug(p) === slug)
            );
            if (lanes[lane].length) return { kind: 'station', lane, index, open: false };
        }
        return { kind: 'fork' };
    }, [lanes, world]);

    // Set up the shared state before anything in the scene renders (so it never shows the wrong grid).
    React.useState(() => useGridStore.getState().reset(world, lanes));
    React.useLayoutEffect(() => {
        useGridStore.getState().reset(world, lanes);
    }, [world, lanes]);

    const [loaded, setLoaded] = React.useState(false);
    const phase = useGridStore((s) => s.phase);
    const exiting = useGridStore((s) => s.exiting);
    useControls(phase === 'ready', container);
    useUrlSync();
    useExit();

    return (
        <div ref={container} className="grid-world">
            <Canvas
                className="grid-world__canvas"
                dpr={[1, 2]}
                gl={{ antialias: true }}
                camera={{ fov: 50, near: 0.05, far: 400, position: [0, 3.6, WORLD.trunkStart + 8] }}
                onCreated={({ gl }) => {
                    gl.localClippingEnabled = true;
                    setLoaded(true);
                }}
            >
                <Scene world={world} lanes={lanes} reducedMotion={reducedMotion} initialTarget={initialTarget} />
            </Canvas>
            <div
                className={`grid-world__blackout ${loaded ? 'is-gone' : ''} ${exiting ? 'is-exiting' : ''}`}
                aria-hidden="true"
            />
            <Hud />
        </div>
    );
}
