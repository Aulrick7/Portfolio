/**
 * Bridge: the raised road the light cycle takes back to the fork from a lane (its path is layout.bridgePoints:
 * a loop past the lane's last panel, a straight run right above the lane, then down behind the start point).
 *
 * It rises out of the grid when the bike heads for it (store.bridge) and sinks back once the bike has landed.
 * The deck has glowing edges in the lane's colour and banks into its turns; gantries straddle the lane under it.
 * Look and timing knobs are the constants below; its size and shape are BRIDGE in layout.ts.
 */

import { useFrame } from '@react-three/fiber';
import * as React from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { BRIDGE, Lane } from './layout';
import { useGridStore } from './store';

/** Seconds to rise out of the grid, to wait after the bike has landed, and to sink back. */
const RISE_TIME = 0.5;
const SINK_DELAY = 0.6;
const SINK_TIME = 1.1;
/** How far the deck tilts into its turns (radians, at most). */
const MAX_BANK = 0.42;
/** A gantry every this many units, wherever the deck is higher than GANTRY_MIN_HEIGHT. */
const GANTRY_SPACING = 4.5;
const GANTRY_MIN_HEIGHT = 1.4;
/** Gantry legs stand this far out from the deck's centre line (clear of the lane under it). */
const GANTRY_HALF_SPAN = BRIDGE.width / 2 + 0.45;

const riseVertex = /* glsl */ `
    uniform float uRise;
    attribute float aAlong;
    varying vec2 vUv;
    varying float vAlong;
    void main() {
        vUv = uv;
        vAlong = aAlong;
        vec3 p = position;
        p.y *= uRise; // rising out of the grid
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
`;

const deckFragment = /* glsl */ `
    uniform vec3 uColor;
    uniform float uOpacity;
    varying vec2 vUv;
    varying float vAlong;
    void main() {
        float across = abs(vUv.x - 0.5) * 2.0; // 0 on the centre line, 1 at the edges
        float edge = smoothstep(0.8, 0.97, across);
        float tick = step(0.93, fract(vAlong / 2.0)) * (1.0 - edge);
        float centre = (1.0 - smoothstep(0.0, 0.04, across)) * 0.35;
        vec3 base = vec3(0.008, 0.035, 0.05);
        vec3 color = base * (1.0 - edge) + uColor * (edge * 1.7 + tick * 0.35 + centre);
        gl_FragColor = vec4(color, mix(0.86, 1.0, edge) * uOpacity);
    }
`;

const gantryFragment = /* glsl */ `
    uniform vec3 uColor;
    uniform float uOpacity;
    void main() {
        gl_FragColor = vec4(uColor * 1.25, 0.8 * uOpacity);
    }
`;

/** Deck (with a short glowing skirt under each edge) and gantries, built from the bridge's path. */
function buildBridge(points: THREE.Vector3[]) {
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const length = curve.getLength();
    const n = Math.max(2, Math.ceil(length / 0.25));
    const samples = curve.getSpacedPoints(n);
    const ds = length / n;

    // Horizontal direction and how sharply it turns (signed: positive = turning left) at each sample.
    const dirs = samples.map((p, i) => {
        const a = samples[Math.max(0, i - 1)];
        const b = samples[Math.min(n, i + 1)];
        return b.clone().sub(a).setY(0).normalize();
    });
    const turn = dirs.map((d, i) => {
        const a = dirs[Math.max(0, i - 2)];
        const b = dirs[Math.min(n, i + 2)];
        return (a.z * b.x - a.x * b.z) / (4 * ds);
    });
    // Bank into turns (smoothed), flattening out near the grid.
    const bank = turn.map((_, i) => {
        let sum = 0;
        let count = 0;
        for (let j = Math.max(0, i - 6); j <= Math.min(n, i + 6); j++) {
            sum += turn[j];
            count++;
        }
        const lift = THREE.MathUtils.smoothstep(samples[i].y, 0.2, 1.5);
        return THREE.MathUtils.clamp((sum / count) * 2.2, -MAX_BANK, MAX_BANK) * lift;
    });

    const half = BRIDGE.width / 2;
    const skirt = 0.2;
    const positions: number[] = [];
    const uvs: number[] = [];
    const along: number[] = [];
    const index: number[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    samples.forEach((p, i) => {
        const right = new THREE.Vector3(-dirs[i].z, 0, dirs[i].x);
        const side = right.clone().multiplyScalar(Math.cos(bank[i])).addScaledVector(up, Math.sin(bank[i]));
        const l = p.clone().addScaledVector(side, -half);
        const r = p.clone().addScaledVector(side, half);
        // four vertices per sample: left skirt, left edge, right edge, right skirt
        positions.push(
            l.x,
            Math.max(0, l.y - skirt),
            l.z,
            l.x,
            l.y,
            l.z,
            r.x,
            r.y,
            r.z,
            r.x,
            Math.max(0, r.y - skirt),
            r.z
        );
        uvs.push(0, 0, 0, 1, 1, 1, 1, 0);
        const d = i * ds;
        along.push(d, d, d, d);
        if (i > 0) {
            const k = (i - 1) * 4;
            for (const [a, b] of [
                [0, 1],
                [1, 2],
                [2, 3]
            ]) {
                index.push(k + a, k + b, k + 4 + a, k + b, k + 4 + b, k + 4 + a);
            }
        }
    });
    const deck = new THREE.BufferGeometry();
    deck.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    deck.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    deck.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
    deck.setIndex(index);

    // Gantries: two legs and a crossbar under the deck.
    const parts: THREE.BufferGeometry[] = [];
    const thickness = 0.08;
    let next = GANTRY_SPACING / 2;
    samples.forEach((p, i) => {
        if (i * ds < next) return;
        next += GANTRY_SPACING;
        if (p.y < GANTRY_MIN_HEIGHT) return;
        const yaw = Math.atan2(dirs[i].x, dirs[i].z);
        const right = new THREE.Vector3(-dirs[i].z, 0, dirs[i].x);
        const top = p.y - 0.12;
        for (const s of [-1, 1]) {
            const leg = new THREE.BoxGeometry(thickness, top, thickness);
            leg.rotateY(yaw);
            const foot = p.clone().addScaledVector(right, s * GANTRY_HALF_SPAN);
            leg.translate(foot.x, top / 2, foot.z);
            parts.push(leg);
        }
        const bar = new THREE.BoxGeometry(GANTRY_HALF_SPAN * 2, thickness, thickness);
        bar.rotateY(yaw + Math.PI / 2);
        bar.translate(p.x, top - thickness, p.z);
        parts.push(bar);
    });
    const gantries = parts.length ? mergeGeometries(parts.map((g) => g.toNonIndexed())) : new THREE.BufferGeometry();
    parts.forEach((g) => g.dispose());
    // the rise shader reads aAlong on every geometry
    const count = gantries.getAttribute('position')?.count ?? 0;
    gantries.setAttribute('aAlong', new THREE.Float32BufferAttribute(new Float32Array(count), 1));
    return { deck, gantries };
}

export function Bridge({ lane, points, color }: { lane: Lane; points: THREE.Vector3[]; color: string }) {
    const { deck, gantries } = React.useMemo(() => buildBridge(points), [points]);
    const materials = React.useMemo(() => {
        const uniforms = () => ({
            uColor: { value: new THREE.Color(color) },
            uOpacity: { value: 0 },
            uRise: { value: 0 }
        });
        return {
            deck: new THREE.ShaderMaterial({
                vertexShader: riseVertex,
                fragmentShader: deckFragment,
                uniforms: uniforms(),
                transparent: true,
                side: THREE.DoubleSide,
                toneMapped: false
            }),
            gantries: new THREE.ShaderMaterial({
                vertexShader: riseVertex,
                fragmentShader: gantryFragment,
                uniforms: uniforms(),
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                toneMapped: false
            })
        };
    }, [color]);
    React.useEffect(
        () => () => {
            deck.dispose();
            gantries.dispose();
            materials.deck.dispose();
            materials.gantries.dispose();
        },
        [deck, gantries, materials]
    );

    const group = React.useRef<THREE.Group>(null);
    const rise = React.useRef(0);
    const lastActive = React.useRef(-Infinity);

    useFrame((state, delta) => {
        const now = state.clock.elapsedTime;
        const active = useGridStore.getState().bridge === lane;
        if (active) {
            lastActive.current = now;
            rise.current = Math.min(1, rise.current + delta / RISE_TIME);
        } else if (now - lastActive.current > SINK_DELAY) {
            rise.current = Math.max(0, rise.current - delta / SINK_TIME);
        }
        const r = THREE.MathUtils.smootherstep(rise.current, 0, 1);
        for (const material of [materials.deck, materials.gantries]) {
            material.uniforms.uRise.value = r;
            material.uniforms.uOpacity.value = THREE.MathUtils.smoothstep(r, 0, 0.35);
        }
        if (group.current) group.current.visible = r > 0.001;
    });

    return (
        <group ref={group} visible={false}>
            <mesh geometry={deck} material={materials.deck} frustumCulled={false} raycast={() => null} />
            <mesh geometry={gantries} material={materials.gantries} frustumCulled={false} raycast={() => null} />
        </group>
    );
}
