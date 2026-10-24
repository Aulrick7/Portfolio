/**
 * The three.js scene for the home page (client-only, loaded by ./index.tsx).
 *
 * - <ComputerTerminal> is the Sketchfab model (src/components/three/ComputerTerminal.tsx).
 * - <Screen> puts real, clickable HTML on the CRT glass using drei's <Html transform>.
 *   It shows the same pill choice as the old home page (PillsRender from MatrixPillChoice).
 * - <CameraRig> flies the camera in from the dark, then follows the mouse slightly.
 * - <MatrixRain3D> is the falling code in the 3D space around the computer.
 * - Clicking a pill runs the dive into the screen (./ScreenDive.tsx), then the usual navigation.
 *
 * The renderer uses no tone mapping (`flat`), so the dive's full-screen effect starts from exactly the
 * same picture as the normal render.
 *
 * Handy knobs are grouped at the top of the file.
 */

import { Environment, Html, Lightformer, useProgress } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as React from 'react';
import * as THREE from 'three';

import { ComputerTerminal, SCREEN } from '@/components/three/ComputerTerminal';
import MatrixCodeRain from '@/components/three/MatrixCodeRain';
import MatrixRain3D from '@/components/three/MatrixRain3D';
import { PillChoice, PillsRender } from '../MatrixPillChoice';
import { DivePass, pointOnScreen, ScreenSnapshot, snapshotScreen } from './ScreenDive';

/* ------------------------------------------------------------------ knobs */

const BACKGROUND = '#020403';
const MATRIX_GREEN = '#00ff41';

/** Brightness of the 3D code rain around the computer (1 = subtle, 2 = very bright). */
const RAIN_INTENSITY = 1.5;
/** Also run code rain behind the text on the CRT screen. Off: the rain now lives in the 3D scene. */
const SCREEN_RAIN = false;

/** Camera field of view (degrees). */
const FOV = 30;
/** How long the fly-in takes (seconds). */
const INTRO_SECONDS = 3.4;
/** Where the fly-in starts and what it looks at first. */
const INTRO_FROM = new THREE.Vector3(2.3, 2.0, 5.6);
const INTRO_LOOK = new THREE.Vector3(0.05, 0.5, 0.1);
/**
 * At rest the screen fills REST_FILL_HEIGHT of the canvas height, but is never shorter than
 * REST_MIN_SCREEN_PX (so the text stays readable on short windows) and never wider than
 * REST_FILL_WIDTH of the canvas (MOBILE on portrait screens).
 */
const REST_FILL_HEIGHT = 0.4;
const REST_MIN_SCREEN_PX = 340;
const REST_MAX_FILL_HEIGHT = 0.62;
const REST_FILL_WIDTH = 0.72;
const REST_FILL_WIDTH_MOBILE = 0.94;
/**
 * At rest the camera sits a little above and to the right of the screen and looks slightly below it,
 * so the keyboard and the side panel show and the machine reads as 3D.
 */
const REST_CAMERA_OFFSET = new THREE.Vector3(0.16, 0.12, 0);
const REST_LOOK_OFFSET = new THREE.Vector3(0.07, -0.07, 0);
/** How far the camera drifts with the mouse once it has arrived (world units). */
const PARALLAX = { x: 0.07, y: 0.045 };

/** The HTML screen is laid out at this size (CSS px), then scaled onto the glass. 3:2 like the CRT. */
const SCREEN_PX = { width: 720, height: 480 };
/** Share of the glass the HTML covers; slightly under 1 hides the flat-vs-curved edge of the CRT. */
const SCREEN_COVER = 0.965;
/** drei <Html transform>: 1 CSS px = distanceFactor / 400 world units. */
const SCREEN_DISTANCE_FACTOR = (SCREEN.width * SCREEN_COVER * 400) / SCREEN_PX.width;
/** Size of the HTML screen on the glass, in world units. */
const SCREEN_PLANE = {
    width: SCREEN.width * SCREEN_COVER,
    height: (SCREEN.width * SCREEN_COVER * SCREEN_PX.height) / SCREEN_PX.width
};

/* ------------------------------------------------------------------ helpers */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Side offsets fade out on portrait screens, where the screen needs the full width. */
const sideOffsetAmount = (aspect: number) => clamp01((aspect - 0.8) / 0.6);

function restLook(width: number, height: number, target: THREE.Vector3) {
    target.copy(SCREEN.center).add(REST_LOOK_OFFSET);
    target.x = SCREEN.center.x + REST_LOOK_OFFSET.x * sideOffsetAmount(width / height);
    return target;
}

function restPosition(width: number, height: number, target: THREE.Vector3) {
    const aspect = width / height;
    const viewHeightPerUnit = 2 * Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
    const fillHeight = Math.min(REST_MAX_FILL_HEIGHT, Math.max(REST_FILL_HEIGHT, REST_MIN_SCREEN_PX / height));
    const fillWidth = aspect < 1 ? REST_FILL_WIDTH_MOBILE : REST_FILL_WIDTH;
    const distance = Math.max(
        SCREEN.height / (fillHeight * viewHeightPerUnit),
        SCREEN.width / (fillWidth * viewHeightPerUnit * aspect)
    );
    return target.set(
        SCREEN.center.x + REST_CAMERA_OFFSET.x * sideOffsetAmount(aspect),
        SCREEN.center.y + REST_CAMERA_OFFSET.y,
        SCREEN.center.z + distance
    );
}

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

/* ------------------------------------------------------------------ scene parts */

type CameraRigProps = {
    reducedMotion: boolean;
    /** Stop moving the camera (the dive into the screen has taken over). */
    frozen: boolean;
    onArrive: () => void;
};

function CameraRig({ reducedMotion, frozen, onArrive }: CameraRigProps) {
    const startedAt = React.useRef<number | null>(null);
    const arrived = React.useRef(false);
    const rest = React.useMemo(() => new THREE.Vector3(), []);
    const goal = React.useMemo(() => new THREE.Vector3(), []);
    const look = React.useMemo(() => new THREE.Vector3(), []);
    const lookAtRest = React.useMemo(() => new THREE.Vector3(), []);

    useFrame((state, delta) => {
        if (frozen) return;
        const { camera, clock, pointer, size } = state;
        if (startedAt.current === null) startedAt.current = clock.elapsedTime;

        const t = reducedMotion ? 1 : clamp01((clock.elapsedTime - startedAt.current) / INTRO_SECONDS);
        const eased = easeInOutCubic(t);

        restPosition(size.width, size.height, rest);
        goal.lerpVectors(INTRO_FROM, rest, eased);
        if (!reducedMotion) {
            goal.x += pointer.x * PARALLAX.x * eased;
            goal.y += pointer.y * PARALLAX.y * eased;
        }

        if (t < 1) camera.position.copy(goal);
        else camera.position.lerp(goal, 1 - Math.pow(0.002, delta)); // smooth mouse follow

        restLook(size.width, size.height, lookAtRest);
        look.lerpVectors(INTRO_LOOK, lookAtRest, eased);
        camera.lookAt(look);

        if (!arrived.current && t >= 0.75) {
            arrived.current = true;
            onArrive();
        }
        // Priority -1: move the camera before drei's <Html> reads it, so the screen never lags a frame behind.
    }, -1);

    return null;
}

type ScreenProps = {
    pills: any[];
    poweredOn: boolean;
    screenRef: React.Ref<HTMLDivElement>;
    onSelect: (choice: PillChoice, proceed: () => void) => void;
};

function Screen({ pills, poweredOn, screenRef, onSelect }: ScreenProps) {
    const compact = useThree((state) => state.size.width < 640);

    return (
        <Html
            transform
            occlude="blending"
            position={[SCREEN.center.x, SCREEN.center.y, SCREEN.center.z + 0.001]}
            distanceFactor={SCREEN_DISTANCE_FACTOR}
            zIndexRange={[50, 0]}
        >
            <div
                ref={screenRef}
                className={[
                    'crt-screen',
                    poweredOn ? 'crt-screen--on' : 'crt-screen--off',
                    compact ? 'crt-screen--compact' : ''
                ].join(' ')}
                style={{ width: SCREEN_PX.width, height: SCREEN_PX.height }}
            >
                {SCREEN_RAIN && poweredOn && <MatrixCodeRain className="crt-rain" />}
                <div className="crt-content">
                    <p className="crt-prompt">
                        root@zion:~$ ./wake_up --user=visitor<span className="crt-cursor">█</span>
                    </p>
                    {poweredOn && <PillsRender pills={pills} onSelect={onSelect} />}
                </div>
                <div className="crt-overlay" aria-hidden="true" />
            </div>
        </Html>
    );
}

function Floor() {
    return (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.054, 0]}>
            <planeGeometry args={[40, 40]} />
            <meshStandardMaterial color="#050806" roughness={0.92} metalness={0} />
        </mesh>
    );
}

function Lights() {
    return (
        <>
            <ambientLight intensity={0.17} />
            {/* key light, front right */}
            <spotLight position={[2.4, 3.6, 3.2]} angle={0.5} penumbra={0.85} intensity={21} color="#fff4e2" />
            {/* green rim from behind */}
            <directionalLight position={[-3, 2.5, -2.5]} intensity={0.7} color="#2bff88" />
            {/* light spilling from the screen onto the keyboard and floor */}
            <pointLight
                position={[SCREEN.center.x, SCREEN.center.y - 0.08, SCREEN.center.z + 0.45]}
                intensity={0.9}
                distance={1.8}
                decay={2}
                color={MATRIX_GREEN}
            />
            {/* soft reflections for the PBR materials (no network fetch, unlike presets) */}
            <Environment resolution={128} frames={1}>
                <Lightformer
                    form="rect"
                    intensity={1}
                    position={[0, 4, 3]}
                    scale={[6, 1.5, 1]}
                    onUpdate={(self) => self.lookAt(0, 0, 0)}
                />
                <Lightformer
                    form="rect"
                    intensity={0.2}
                    color={MATRIX_GREEN}
                    position={[-4, 1.5, 1]}
                    scale={[1.5, 4, 1]}
                    onUpdate={(self) => self.lookAt(0, 0, 0)}
                />
            </Environment>
        </>
    );
}

function Ready({ onReady }: { onReady: () => void }) {
    React.useEffect(onReady, [onReady]);
    return null;
}

/* ------------------------------------------------------------------ overlays (plain DOM) */

function LoadingOverlay({ done }: { done: boolean }) {
    const { progress } = useProgress();
    return (
        <div className={`computer-loader ${done ? 'is-done' : ''}`} role="status" aria-live="polite">
            <span className="computer-loader__label">BOOTING TERMINAL</span>
            <span className="computer-loader__value">{Math.round(progress)}%</span>
        </div>
    );
}

function Credit() {
    return (
        <p className="computer-credit">
            3D model:{' '}
            <a
                href="https://sketchfab.com/3d-models/computer-terminal-b3a26b00c5b04eedad0a1cdca884130f"
                target="_blank"
                rel="noopener noreferrer"
            >
                “Computer Terminal”
            </a>{' '}
            by{' '}
            <a href="https://sketchfab.com/ChrisSweetwood" target="_blank" rel="noopener noreferrer">
                Chris Sweetwood
            </a>
            ,{' '}
            <a href="http://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">
                CC BY-SA 4.0
            </a>
        </p>
    );
}

/* ------------------------------------------------------------------ main */

export default function ComputerCanvas({ pills }: { pills: any[] }) {
    const reducedMotion = usePrefersReducedMotion();
    const [loaded, setLoaded] = React.useState(false);
    const [poweredOn, setPoweredOn] = React.useState(false);
    const handleReady = React.useCallback(() => setLoaded(true), []);
    const handleArrive = React.useCallback(() => setPoweredOn(true), []);

    // Pill clicked: capture the screen, then dive into it. proceed() runs the usual navigation.
    const screenRef = React.useRef<HTMLDivElement>(null);
    const diveStarted = React.useRef(false);
    const [dive, setDive] = React.useState<{
        choice: PillChoice;
        proceed: () => void;
        texture: THREE.Texture;
        focus: THREE.Vector3;
    } | null>(null);
    const handleSelect = React.useCallback((choice: PillChoice, proceed: () => void) => {
        if (diveStarted.current) return;
        diveStarted.current = true;
        const screen = screenRef.current;
        const pill = screen
            ?.querySelectorAll<HTMLElement>('.pill-wrapper')
            [choice.index]?.querySelector<HTMLElement>('.pill');
        const focus = pointOnScreen(screen, pill ?? null, SCREEN_PLANE, SCREEN_PX);
        // Wait two frames so the "selected" state is painted before the capture.
        requestAnimationFrame(() =>
            requestAnimationFrame(async () => {
                const texture = await snapshotScreen(screen, SCREEN_PX.width, SCREEN_PX.height);
                setDive({ choice, proceed, texture, focus });
            })
        );
    }, []);

    return (
        <>
            <Canvas
                className="computer-canvas"
                dpr={[1, 2]}
                camera={{ fov: FOV, near: 0.05, far: 60, position: INTRO_FROM.toArray() }}
                gl={{ antialias: true }}
                flat
            >
                <color attach="background" args={[BACKGROUND]} />
                <fog attach="fog" args={[BACKGROUND, 4, 14]} />
                <Lights />
                <Floor />
                <MatrixRain3D intensity={RAIN_INTENSITY} paused={reducedMotion} />
                <React.Suspense fallback={null}>
                    <ComputerTerminal>
                        <Screen pills={pills} poweredOn={poweredOn} screenRef={screenRef} onSelect={handleSelect} />
                    </ComputerTerminal>
                    <CameraRig reducedMotion={reducedMotion} frozen={!!dive} onArrive={handleArrive} />
                    <Ready onReady={handleReady} />
                </React.Suspense>
                {dive && (
                    <>
                        <ScreenSnapshot
                            texture={dive.texture}
                            width={SCREEN_PLANE.width}
                            height={SCREEN_PLANE.height}
                        />
                        <DivePass
                            color={dive.choice.color}
                            focus={dive.focus}
                            reducedMotion={reducedMotion}
                            onDone={dive.proceed}
                        />
                    </>
                )}
            </Canvas>
            <LoadingOverlay done={loaded} />
            <Credit />
        </>
    );
}
