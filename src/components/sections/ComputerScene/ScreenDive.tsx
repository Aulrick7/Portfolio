/**
 * ScreenDive: the "stretch into the screen" transition after a pill is clicked.
 *
 * Reference: Tron: Legacy (2010), "Sam enters the Grid", 0:44 to 0:47. The light swells, the whole frame
 * breaks into blocky streaks that stretch outward from the centre, the colour shifts (warm to cyan),
 * it becomes a dark streaked tunnel and ends in black.
 *
 * How it is done here
 * 1. snapshotScreen() turns the HTML on the CRT into a texture (html-to-image), and <ScreenSnapshot>
 *    shows it on a plane over the glass. From then on the whole picture is WebGL, so it can be processed.
 * 2. <DivePass> takes over rendering for the transition: it flies the camera into the glass and renders
 *    the scene into a texture, then draws it through a full-screen shader that does the radial stretch,
 *    pixel blocks, flash, colour shift and fade to black. When it ends it calls onDone().
 *
 * Timing and look are in DIVE below.
 *
 * Tuning tip (development only): in the browser console set `window.__diveProgress = 0.5` before clicking
 * a pill to freeze the dive at that point (0 to 1), change the number to scrub through it, and
 * `delete window.__diveProgress` to let it finish.
 */

import { useFrame, useThree } from '@react-three/fiber';
import { toCanvas } from 'html-to-image';
import * as React from 'react';
import * as THREE from 'three';

import { SCREEN } from '@/components/three/ComputerTerminal';

/* ------------------------------------------------------------------ knobs */

export const DIVE = {
    /** Whole transition, click to black (seconds). The reference shot is about 3 s. */
    seconds: 3,
    /** Share of the transition spent flying into the glass. */
    cameraShare: 0.7,
    /** How far in front of the glass the camera stops (world units). */
    endDistance: 0.1,
    /** Field of view at the end of the fly-in (it starts at the scene's FOV). Wider = more "warp". */
    endFov: 48,
    /** Strongest radial stretch (0 to 1). */
    maxStretch: 0.92,
    /** Largest pixel block, in screen pixels. */
    maxBlock: 11,
    /** Number of angular "shards" the streaks are split into. */
    shards: 240,
    /** Brightness of the light streaks racing outward in the tunnel at the end. */
    warp: 1.5,
    /**
     * Look of the tunnel at the end:
     * - 'pixels': chunky pixel blocks streaming outward (the one Abhishek picked)
     * - 'lines': thin smooth light streaks
     */
    tunnel: 'pixels' as 'pixels' | 'lines',
    /** Colour each pill shifts the picture towards (the reference goes warm to cyan). */
    tint: { blue: '#33c8ff', red: '#ff3b3b' },
    /** With prefers-reduced-motion: a plain fade to black of this length instead. */
    reducedMotionSeconds: 0.5
};

/* ------------------------------------------------------------------ snapshot of the HTML screen */

/** Renders the CRT's HTML to a texture. Falls back to a blank screen if that fails or is slow. */
export async function snapshotScreen(element: HTMLElement | null, width: number, height: number) {
    const fallback = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, width, height);
        return canvas;
    };

    let canvas: HTMLCanvasElement;
    try {
        if (!element) throw new Error('no screen element');
        const capture = toCanvas(element, {
            width,
            height,
            pixelRatio: 2,
            skipFonts: true, // system monospace fonts only; avoids fetching Google Fonts CSS
            filter: (node) => !(node instanceof HTMLCanvasElement)
        });
        const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500));
        canvas = await Promise.race([capture, timeout]);
    } catch (error) {
        console.warn('[ScreenDive] Could not capture the screen, using a blank one.', error);
        canvas = fallback();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
}

/**
 * Where an element inside the screen's HTML sits on the glass, in world space.
 * Uses layout offsets (not getBoundingClientRect), because the HTML is in a CSS 3D transform.
 */
export function pointOnScreen(
    screenElement: HTMLElement | null,
    element: HTMLElement | null,
    plane: { width: number; height: number },
    pixels: { width: number; height: number }
) {
    if (!screenElement || !element) return SCREEN.center.clone();
    let x = element.offsetWidth / 2;
    let y = element.offsetHeight / 2;
    let node: HTMLElement | null = element;
    while (node && node !== screenElement) {
        x += node.offsetLeft;
        y += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
    }
    if (node !== screenElement) return SCREEN.center.clone();
    return new THREE.Vector3(
        SCREEN.center.x + (x / pixels.width - 0.5) * plane.width,
        SCREEN.center.y + (0.5 - y / pixels.height) * plane.height,
        SCREEN.center.z
    );
}

/** The captured screen, drawn just in front of the glass (and of drei's HTML "hole"). */
export function ScreenSnapshot({ texture, width, height }: { texture: THREE.Texture; width: number; height: number }) {
    React.useEffect(() => () => texture.dispose(), [texture]);
    return (
        <mesh position={[SCREEN.center.x, SCREEN.center.y, SCREEN.center.z + 0.003]} renderOrder={2}>
            <planeGeometry args={[width, height]} />
            <meshBasicMaterial map={texture} transparent toneMapped={false} />
        </mesh>
    );
}

/* ------------------------------------------------------------------ the stretch shader */

const vertexShader = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
    }
`;

const fragmentShader = /* glsl */ `
    uniform sampler2D tScene;
    uniform vec2 uResolution;
    uniform vec2 uCenter;
    uniform float uStretch;
    uniform float uBlock;
    uniform float uShards;
    uniform vec3 uTint;
    uniform float uTintMix;
    uniform float uFlash;
    uniform float uDarken;
    uniform float uWarp;
    uniform float uTime;
    uniform float uPixelTunnel; // 1 = chunky pixel streaks, 0 = thin smooth lines
    varying vec2 vUv;

    float hash(float n) { return fract(sin(n) * 43758.5453123); }

    void main() {
        vec2 aspect = vec2(uResolution.x / uResolution.y, 1.0);

        // "Digitize": snap to square pixel blocks that grow during the transition.
        vec2 uv = vUv;
        if (uBlock > 1.0) uv = (floor(vUv * uResolution / uBlock) + 0.5) * uBlock / uResolution;

        vec2 dir = uv - uCenter;
        vec2 d = dir * aspect;
        float r = length(d);

        // Split the frame into angular shards; each shard streaks by its own amount (blocky extrusions).
        float angle = atan(d.y, d.x) / 6.2831853 + 0.5;
        float shard = floor(angle * uShards);
        float streak = uStretch * (0.3 + 0.7 * hash(shard * 1.618));

        // Pull samples from nearer the centre, so the picture is dragged outward along each ray.
        vec3 sum = vec3(0.0);
        vec3 brightest = vec3(0.0);
        float weights = 0.0;
        for (int i = 0; i < 24; i++) {
            float f = float(i) / 23.0;
            vec3 c = texture2D(tScene, uCenter + dir * (1.0 - streak * f)).rgb;
            float w = 1.0 - 0.75 * f;
            sum += c * w;
            weights += w;
            brightest = max(brightest, c * (1.0 - 0.45 * f));
        }
        vec3 color = mix(sum / weights, brightest, 0.6 * uStretch);

        // Colour shift towards the pill's colour, keeping the light and dark of the picture.
        float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
        color = mix(color, uTint * luma * 1.8, uTintMix);

        // The light swelling at the centre.
        color += uTint * uFlash * exp(-r * r * 14.0);
        color += vec3(1.0) * uFlash * 0.7 * exp(-r * r * 70.0);

        // Tunnel: the picture sinks into the dark, edges first...
        color *= mix(1.0, 0.35 * smoothstep(1.1, 0.0, r), uDarken);

        // ...while light streaks race outward from the centre.
        if (uPixelTunnel > 0.5) {
            // Chunky: worked out on the pixel-block grid, so the streaks break into bright square pixels.
            float line = floor(angle * 520.0);
            float pick = hash(line * 3.17);
            float speed = 0.5 + 1.2 * hash(line * 9.13);
            float phase = fract(log(r + 0.03) * 0.8 - uTime * speed + pick * 7.0);
            float dash = smoothstep(0.0, 0.06, phase) * (1.0 - smoothstep(0.18, 0.5, phase));
            color += uTint * step(0.8, pick) * dash * smoothstep(0.02, 0.3, r) * uWarp;
        } else {
            // Smooth: thin lines worked out per screen pixel.
            vec2 sd = (vUv - uCenter) * aspect;
            float sr = length(sd);
            float sAngle = atan(sd.y, sd.x) / 6.2831853 + 0.5;
            float line = floor(sAngle * 700.0);
            float pick = hash(line * 3.17);
            float speed = 0.45 + 1.1 * hash(line * 9.13);
            float phase = fract(log(sr + 0.03) * 2.2 - uTime * speed * 2.5 + pick * 7.0);
            float dash = smoothstep(0.0, 0.05, phase) * (1.0 - smoothstep(0.2, 0.45, phase));
            float edge = 1.0 - abs(fract(sAngle * 700.0) - 0.5) * 2.0; // soft profile across the line
            color += uTint * step(0.85, pick) * dash * smoothstep(0.2, 0.9, edge) * smoothstep(0.02, 0.3, sr) * uWarp * 0.8;
        }

        // ...and finally everything fades to black.
        color *= 1.0 - smoothstep(0.65, 1.0, uDarken);

        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
    }
`;

/* ------------------------------------------------------------------ the pass */

const smoothstep = THREE.MathUtils.smoothstep;
const easeInCubic = (t: number) => t * t * t;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

type DivePassProps = {
    color: 'red' | 'blue';
    /** Point on the glass to dive into (world space), e.g. the clicked pill. Defaults to the screen centre. */
    focus?: THREE.Vector3;
    reducedMotion: boolean;
    onDone: () => void;
};

export function DivePass({ color, focus = SCREEN.center, reducedMotion, onDone }: DivePassProps) {
    const { gl, scene, camera, size } = useThree();
    const perspective = camera as THREE.PerspectiveCamera;

    const target = React.useMemo(() => {
        const canHalfFloat =
            gl.capabilities.isWebGL2 &&
            (gl.extensions.has('EXT_color_buffer_float') || gl.extensions.has('EXT_color_buffer_half_float'));
        const rt = new THREE.WebGLRenderTarget(1, 1, {
            type: canHalfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType,
            samples: gl.capabilities.isWebGL2 ? 4 : 0
        });
        if (!canHalfFloat) rt.texture.colorSpace = THREE.SRGBColorSpace; // 8-bit: store sRGB to avoid banding
        return rt;
    }, [gl]);

    const material = React.useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader,
                fragmentShader,
                uniforms: {
                    tScene: { value: target.texture },
                    uResolution: { value: new THREE.Vector2(1, 1) },
                    uCenter: { value: new THREE.Vector2(0.5, 0.5) },
                    uStretch: { value: 0 },
                    uBlock: { value: 1 },
                    uShards: { value: DIVE.shards },
                    uTint: { value: new THREE.Color(DIVE.tint[color]) },
                    uTintMix: { value: 0 },
                    uFlash: { value: 0 },
                    uDarken: { value: 0 },
                    uWarp: { value: 0 },
                    uTime: { value: 0 },
                    uPixelTunnel: { value: DIVE.tunnel === 'pixels' ? 1 : 0 }
                },
                depthTest: false,
                depthWrite: false
            }),
        [target, color]
    );

    const quad = React.useMemo(() => {
        const quadScene = new THREE.Scene();
        quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
        return { scene: quadScene, camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1) };
    }, [material]);

    // Size the offscreen target (capped resolution: the effect is blurry by nature).
    React.useEffect(() => {
        const dpr = Math.min(gl.getPixelRatio(), size.width < 640 ? 1.25 : 1.5);
        const width = Math.max(1, Math.floor(size.width * dpr));
        const height = Math.max(1, Math.floor(size.height * dpr));
        target.setSize(width, height);
        material.uniforms.uResolution.value.set(width, height);
    }, [gl, size, target, material]);

    React.useEffect(
        () => () => {
            target.dispose();
            material.dispose();
            quad.scene.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
        },
        [target, material, quad]
    );

    // Where the camera starts, and what it was looking at.
    const start = React.useRef<{
        time: number;
        position: THREE.Vector3;
        look: THREE.Vector3;
        fov: number;
        near: number;
    } | null>(null);
    const done = React.useRef(false);
    const tmp = React.useMemo(
        () => ({ look: new THREE.Vector3(), end: new THREE.Vector3(), center: new THREE.Vector3() }),
        []
    );

    useFrame((state) => {
        const now = state.clock.elapsedTime;
        if (!start.current) {
            const forward = perspective.getWorldDirection(new THREE.Vector3());
            const distance = perspective.position.distanceTo(focus);
            start.current = {
                time: now,
                position: perspective.position.clone(),
                look: perspective.position.clone().addScaledVector(forward, distance),
                fov: perspective.fov,
                near: perspective.near
            };
            perspective.near = 0.005; // let the camera get right up to the glass
        }
        const s = start.current;
        const duration = reducedMotion ? DIVE.reducedMotionSeconds : DIVE.seconds;
        const scrub = process.env.NODE_ENV !== 'production' ? (window as any).__diveProgress : undefined;
        const p =
            typeof scrub === 'number' ? THREE.MathUtils.clamp(scrub, 0, 1) : Math.min(1, (now - s.time) / duration);
        const u = material.uniforms;

        if (reducedMotion) {
            u.uDarken.value = p;
        } else {
            // Camera: line up with the screen quickly, then accelerate into the glass.
            const cp = Math.min(1, p / DIVE.cameraShare);
            tmp.end.copy(focus).setZ(focus.z + DIVE.endDistance);
            perspective.position.lerpVectors(s.position, tmp.end, easeInCubic(cp));
            tmp.look.lerpVectors(s.look, focus, easeOutCubic(Math.min(1, cp * 1.8)));
            perspective.lookAt(tmp.look);
            perspective.fov = THREE.MathUtils.lerp(s.fov, DIVE.endFov, easeInCubic(smoothstep(cp, 0.35, 1)));

            // Picture: stretch, pixel blocks, flash, colour shift, tunnel and black.
            u.uStretch.value =
                DIVE.maxStretch * smoothstep(p, 0.12, 0.6) + (1 - DIVE.maxStretch) * smoothstep(p, 0.6, 1);
            // Pixel blocks grow and stay big through a pixel tunnel; for the smooth tunnel they shrink back.
            const shrink = DIVE.tunnel === 'pixels' ? 0 : 0.7 * smoothstep(p, 0.7, 0.9);
            u.uBlock.value = 1 + (DIVE.maxBlock - 1) * smoothstep(p, 0.22, 0.7) * (1 - shrink);
            u.uFlash.value = 1.4 * Math.exp(-Math.pow((p - 0.47) / 0.12, 2));
            u.uTintMix.value = 0.85 * smoothstep(p, 0.36, 0.72);
            u.uDarken.value = smoothstep(p, 0.56, 1);
            u.uWarp.value = DIVE.warp * smoothstep(p, 0.45, 0.7) * (1 - smoothstep(p, 0.9, 1));
            u.uTime.value = p * DIVE.seconds;
        }
        perspective.updateProjectionMatrix();
        perspective.updateMatrixWorld();

        // Keep the stretch centred on the focus point as it moves in the frame.
        tmp.center.copy(focus).project(perspective);
        u.uCenter.value.set(
            THREE.MathUtils.clamp(tmp.center.x * 0.5 + 0.5, 0, 1),
            THREE.MathUtils.clamp(tmp.center.y * 0.5 + 0.5, 0, 1)
        );

        state.gl.setRenderTarget(target);
        state.gl.render(scene, perspective);
        state.gl.setRenderTarget(null);
        state.gl.render(quad.scene, quad.camera);

        if (p >= 1 && !done.current && typeof scrub !== 'number') {
            done.current = true;
            onDone();
        }
    }, 1); // a positive priority makes this component do the rendering while it is mounted

    return null;
}
