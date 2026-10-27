/**
 * Bridge: the raised road the light cycle takes back to the fork from a lane (its path is layout.bridgePoints:
 * a ramp past the lane's last panel that curves round to run back beside the lane, then down behind the start point).
 *
 * Its look follows the light cycle arena in TRON: Legacy, whose levels and ramps are floating sheets of dark,
 * see-through glass carrying the same glowing grid as the floor: a clear glass deck with faint grid lines and bright lit
 * edges in the lane's colour, a thin glowing slab edge, no supports, banking into its turns. It is part of the world: it builds up
 * out of the grid with the panels while the grid forms, and stays. Look knobs are the constants below; its size and
 * shape are BRIDGE in layout.ts.
 */

import { useFrame } from '@react-three/fiber';
import * as React from 'react';
import * as THREE from 'three';

import { BRIDGE, WORLD } from './layout';
import { useTimeline } from './timeline';

/** How far the deck tilts into its turns (radians, at most). */
const MAX_BANK = 0.42;
/** Thickness of the glowing slab edge under each side of the deck. */
const EDGE_DEPTH = 0.14;
/** Grid cells across the deck (the cells are square, so this also sets their length). */
const CELLS_ACROSS = 6;
/** How see-through the glass is (0 clear, 1 solid) when looked at straight on, and how strong the inner grid lines are. */
const GLASS_OPACITY = 0.07;
const INNER_LINES = 0.22;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

const deckVertex = /* glsl */ `
    uniform float uRise;
    attribute float aAlong;
    attribute float aEdge;
    attribute float aAcross;
    varying vec2 vUv;
    varying float vAcross;
    varying float vAlong;
    varying float vEdge;
    varying vec3 vWorld;
    varying vec3 vNormal;
    void main() {
        vUv = uv;
        vAlong = aAlong;
        vEdge = aEdge;
        vAcross = aAcross;
        vec3 p = position;
        p.y *= uRise; // building up out of the grid during the intro
        vec4 world = modelMatrix * vec4(p, 1.0);
        vWorld = world.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
    }
`;

const deckFragment = /* glsl */ `
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uWidth;
    uniform float uGlass;
    uniform float uInner;
    uniform vec3 uFogColor;
    uniform float uFogDensity;
    varying vec2 vUv;
    varying float vAlong;
    varying float vEdge;
    varying float vAcross;
    varying vec3 vWorld;
    varying vec3 vNormal;

    float gridLine(float q, float width) {
        float g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
        return 1.0 - min(g / width, 1.0);
    }

    void main() {
        vec3 color;
        float alpha;
        if (vEdge > 0.5) {
            // the slab's lit edge
            color = uColor * 1.6;
            alpha = 1.0;
        } else {
            float cell = uWidth / ${CELLS_ACROSS.toFixed(1)};
            // grid lines measured from the centre line, so they keep their spacing where the deck narrows
            float lines = max(gridLine(vAcross / cell, 1.0), gridLine(vAlong / cell, 1.0)) * uInner;
            float major = gridLine(vAlong / (cell * 5.0), 1.6) * uInner;
            float edge = 1.0 - smoothstep(0.0, 0.025, min(vUv.x, 1.0 - vUv.x));
            vec3 view = normalize(cameraPosition - vWorld);
            float fresnel = pow(1.0 - abs(dot(normalize(vNormal), view)), 4.0);
            color = vec3(0.004, 0.02, 0.03) + uColor * (lines * 0.8 + major * 0.8 + edge * 1.8 + fresnel * 0.15);
            alpha = clamp(uGlass + fresnel * 0.2 + lines + major + edge, 0.0, 1.0);
        }
        float dist = distance(vWorld, cameraPosition);
        float fog = 1.0 - exp(-pow(dist * uFogDensity, 2.0));
        gl_FragColor = vec4(mix(color, uFogColor, fog), alpha * uOpacity);
    }
`;

/** The deck (glass top and a glowing edge under each side), built from the bridge's path. */
function buildDeck(points: THREE.Vector3[]) {
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const length = curve.getLength();
    const n = Math.max(2, Math.ceil(length / 0.25));
    const samples = curve.getSpacedPoints(n);
    const ds = length / n;

    // Horizontal direction and how sharply it turns (signed: positive = turning left) at each sample.
    const dirs = samples.map((_, i) => {
        const a = samples[Math.max(0, i - 1)];
        const b = samples[Math.min(n, i + 1)];
        return b.clone().sub(a).setY(0).normalize();
    });
    const turn = dirs.map((_, i) => {
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

    // Full width, narrowing over the landing (where the two lanes' bridges meet behind the start point).
    const halfWidth = (i: number) =>
        THREE.MathUtils.lerp(
            BRIDGE.landingWidth,
            BRIDGE.width,
            THREE.MathUtils.smoothstep((n - i) * ds, 0, BRIDGE.landingTaper)
        ) / 2;
    const positions: number[] = [];
    const uvs: number[] = [];
    const along: number[] = [];
    const edges: number[] = [];
    const across: number[] = [];
    const index: number[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    samples.forEach((p, i) => {
        const right = new THREE.Vector3(-dirs[i].z, 0, dirs[i].x);
        const side = right.clone().multiplyScalar(Math.cos(bank[i])).addScaledVector(up, Math.sin(bank[i]));
        const half = halfWidth(i);
        const l = p.clone().addScaledVector(side, -half);
        const r = p.clone().addScaledVector(side, half);
        const below = (v: THREE.Vector3) => [v.x, Math.max(0, v.y - EDGE_DEPTH), v.z];
        // six vertices per sample: left edge (bottom, top), deck (left, right), right edge (top, bottom)
        positions.push(...below(l), l.x, l.y, l.z, l.x, l.y, l.z, r.x, r.y, r.z, r.x, r.y, r.z, ...below(r));
        uvs.push(0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0);
        const d = i * ds;
        along.push(d, d, d, d, d, d);
        edges.push(1, 1, 0, 0, 1, 1);
        across.push(-half, -half, -half, half, half, half);
        if (i > 0) {
            const k = (i - 1) * 6;
            for (const a of [0, 2, 4]) index.push(k + a, k + a + 1, k + 6 + a, k + a + 1, k + 7 + a, k + 6 + a);
        }
    });
    const deck = new THREE.BufferGeometry();
    deck.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    deck.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    deck.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
    deck.setAttribute('aEdge', new THREE.Float32BufferAttribute(edges, 1));
    deck.setAttribute('aAcross', new THREE.Float32BufferAttribute(across, 1));
    deck.setIndex(index);
    deck.computeVertexNormals();
    return deck;
}

export function Bridge({ points, color }: { points: THREE.Vector3[]; color: string }) {
    const timeline = useTimeline();
    const deck = React.useMemo(() => buildDeck(points), [points]);
    const material = React.useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: deckVertex,
                fragmentShader: deckFragment,
                uniforms: {
                    uColor: { value: new THREE.Color(color) },
                    uOpacity: { value: 0 },
                    uRise: { value: 0 },
                    uWidth: { value: BRIDGE.width },
                    uGlass: { value: GLASS_OPACITY },
                    uInner: { value: INNER_LINES },
                    uFogColor: { value: new THREE.Color(WORLD.colors.background) },
                    uFogDensity: { value: 0.022 }
                },
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide,
                toneMapped: false
            }),
        [color]
    );
    React.useEffect(
        () => () => {
            deck.dispose();
            material.dispose();
        },
        [deck, material]
    );

    const mesh = React.useRef<THREE.Mesh>(null);
    useFrame(() => {
        // Builds up out of the grid with the panels during the intro.
        const r = easeOut(THREE.MathUtils.clamp((timeline.panels - 0.1) / 0.8, 0, 1));
        material.uniforms.uRise.value = r;
        material.uniforms.uOpacity.value = THREE.MathUtils.smoothstep(r, 0, 0.35);
        if (mesh.current) mesh.current.visible = r > 0.001;
    });

    return (
        <mesh
            ref={mesh}
            geometry={deck}
            material={material}
            visible={false}
            frustumCulled={false}
            raycast={() => null}
        />
    );
}
