/**
 * The world around the projects: the neon grid floor (with the reveal ring of the intro), a dark sky with
 * a faint glow at the horizon, and the lane lights (trunk, game lane, software lane) with pulses running
 * along them.
 */

import { useFrame } from '@react-three/fiber';
import * as React from 'react';
import * as THREE from 'three';

import { Lane, Route, routePoint, WORLD } from './layout';
import { useGridStore } from './store';
import { easeInOut, INTRO, useTimeline } from './timeline';

/* ------------------------------------------------------------------ grid floor */

const floorVertex = /* glsl */ `
    varying vec3 vWorld;
    void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
    }
`;

const floorFragment = /* glsl */ `
    uniform vec3 uColor;
    uniform vec3 uFogColor;
    uniform float uFogDensity;
    uniform vec2 uRevealCenter;
    uniform float uReveal;
    uniform float uRevealEnd;
    varying vec3 vWorld;

    float gridLine(vec2 p, float spacing, float width) {
        vec2 q = p / spacing;
        vec2 g = abs(fract(q - 0.5) - 0.5) / fwidth(q);
        return 1.0 - min(min(g.x, g.y) / width, 1.0);
    }

    void main() {
        vec2 p = vWorld.xz;
        float minor = gridLine(p, 1.0, 1.0);
        float major = gridLine(p, 5.0, 1.5);

        float d = distance(p, uRevealCenter);
        float revealed = 1.0 - smoothstep(uReveal - 4.0, uReveal, d);
        float ring = exp(-pow((d - uReveal) / 1.1, 2.0)) * step(0.01, uReveal) * (1.0 - smoothstep(uRevealEnd * 0.8, uRevealEnd, uReveal));

        vec3 color = vec3(0.003, 0.010, 0.016);
        color += uColor * (minor * 0.16 + major * 0.5) * revealed;
        color += mix(uColor, vec3(1.0), 0.5) * ring * (0.25 + minor + major) * 1.4;

        float dist = distance(vWorld, cameraPosition);
        float fog = 1.0 - exp(-pow(dist * uFogDensity, 2.0));
        gl_FragColor = vec4(mix(color, uFogColor, fog), 1.0);
    }
`;

export function GridFloor() {
    const timeline = useTimeline();
    const material = React.useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: floorVertex,
                fragmentShader: floorFragment,
                uniforms: {
                    uColor: { value: new THREE.Color(WORLD.colors.grid) },
                    uFogColor: { value: new THREE.Color(WORLD.colors.background) },
                    uFogDensity: { value: 0.022 },
                    uRevealCenter: { value: new THREE.Vector2(0, WORLD.trunkStart) },
                    uReveal: { value: 0 },
                    uRevealEnd: { value: INTRO.revealRadius }
                }
            }),
        []
    );
    React.useEffect(() => () => material.dispose(), [material]);

    useFrame(() => {
        material.uniforms.uReveal.value = easeInOut(timeline.reveal) * INTRO.revealRadius;
    });

    return (
        <mesh rotation-x={-Math.PI / 2} material={material}>
            <planeGeometry args={[260, 260]} />
        </mesh>
    );
}

/* ------------------------------------------------------------------ sky */

export function Sky() {
    const material = React.useMemo(
        () =>
            new THREE.ShaderMaterial({
                side: THREE.BackSide,
                depthWrite: false,
                uniforms: {
                    uTop: { value: new THREE.Color('#000000') },
                    uHorizon: { value: new THREE.Color('#06303a') }
                },
                vertexShader: /* glsl */ `
                    varying vec3 vDir;
                    void main() {
                        vDir = normalize(position);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: /* glsl */ `
                    uniform vec3 uTop;
                    uniform vec3 uHorizon;
                    varying vec3 vDir;
                    void main() {
                        float h = max(vDir.y, 0.0);
                        vec3 color = mix(uHorizon, uTop, pow(h, 0.35));
                        gl_FragColor = vec4(color, 1.0);
                    }
                `
            }),
        []
    );
    React.useEffect(() => () => material.dispose(), [material]);
    return (
        <mesh material={material} renderOrder={-10}>
            <sphereGeometry args={[150, 32, 16]} />
        </mesh>
    );
}

/* ------------------------------------------------------------------ lane lights */

const laneVertex = /* glsl */ `
    attribute float aDistance;
    varying float vDistance;
    varying float vAcross;
    void main() {
        vDistance = aDistance;
        vAcross = uv.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const laneFragment = /* glsl */ `
    uniform vec3 uColor;
    uniform float uDraw;     // world units drawn so far
    uniform float uLength;
    uniform float uTime;
    uniform float uFadeEnd;  // fade out over the last few units
    varying float vDistance;
    varying float vAcross;

    void main() {
        if (vDistance > uDraw) discard;
        float across = abs(vAcross - 0.5) * 2.0;
        float core = smoothstep(0.22, 0.0, across);
        float glow = pow(1.0 - across, 3.0) * 0.45;
        float pulse = smoothstep(0.93, 1.0, fract(vDistance / 7.0 - uTime * 0.32));
        float head = exp(-pow((uDraw - vDistance) / 0.8, 2.0)) * step(uDraw, uLength - 0.5);
        float fade = 1.0 - smoothstep(uLength - uFadeEnd, uLength, vDistance);
        vec3 color = uColor * (core * (1.0 + pulse * 2.0) + glow) + vec3(1.0) * head * core;
        gl_FragColor = vec4(color * fade, 1.0);
    }
`;

/** A flat glowing ribbon along a list of points on the grid. */
function ribbonGeometry(points: THREE.Vector3[], width: number) {
    const positions: number[] = [];
    const uvs: number[] = [];
    const distances: number[] = [];
    const indices: number[] = [];
    let travelled = 0;
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (i > 0) travelled += p.distanceTo(points[i - 1]);
        const a = points[Math.max(0, i - 1)];
        const b = points[Math.min(points.length - 1, i + 1)];
        const tangent = b.clone().sub(a).setY(0).normalize();
        const side = new THREE.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(width / 2);
        positions.push(p.x + side.x, 0.006, p.z + side.z, p.x - side.x, 0.006, p.z - side.z);
        uvs.push(0, 0, 0, 1);
        distances.push(travelled, travelled);
        if (i > 0) {
            const k = (i - 1) * 2;
            indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
        }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('aDistance', new THREE.Float32BufferAttribute(distances, 1));
    geometry.setIndex(indices);
    return { geometry, length: travelled };
}

function LaneRibbon({
    points,
    color,
    width = 0.7,
    delay = 0,
    fadeEnd = 0
}: {
    points: THREE.Vector3[];
    color: string;
    width?: number;
    /** 0..1 share of the lane intro to wait before drawing. */
    delay?: number;
    fadeEnd?: number;
}) {
    const timeline = useTimeline();
    const { geometry, length } = React.useMemo(() => ribbonGeometry(points, width), [points, width]);
    const material = React.useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: laneVertex,
                fragmentShader: laneFragment,
                uniforms: {
                    uColor: { value: new THREE.Color(color) },
                    uDraw: { value: 0 },
                    uLength: { value: length },
                    uTime: { value: 0 },
                    uFadeEnd: { value: fadeEnd }
                },
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                toneMapped: false
            }),
        [color, length, fadeEnd]
    );
    React.useEffect(
        () => () => {
            geometry.dispose();
            material.dispose();
        },
        [geometry, material]
    );
    useFrame((state) => {
        const t = THREE.MathUtils.clamp((timeline.lanes - delay) / (1 - delay), 0, 1);
        material.uniforms.uDraw.value = easeInOut(t) * (length + 1);
        material.uniforms.uTime.value = state.clock.elapsedTime;
    });
    return <mesh geometry={geometry} material={material} renderOrder={1} />;
}

function sample(lane: Route, s0: number, s1: number, step = 0.25) {
    const points: THREE.Vector3[] = [];
    const n = Math.max(2, Math.ceil(Math.abs(s1 - s0) / step));
    for (let k = 0; k <= n; k++) points.push(routePoint(lane, s0 + ((s1 - s0) * k) / n));
    return points;
}

export function LaneLights({ connectors }: { connectors: { from: THREE.Vector3; to: THREE.Vector3; lane: Lane }[] }) {
    const trunkLength = WORLD.trunkStart - WORLD.cornerRadius;
    const routeEnd = trunkLength + Math.PI * WORLD.cornerRadius * 0.5 + WORLD.laneLength + 2;
    const world = useGridStore((s) => s.world);
    const trunk = React.useMemo(() => sample('left', 0, trunkLength), [trunkLength]);
    const left = React.useMemo(() => sample('left', trunkLength, routeEnd), [trunkLength, routeEnd]);
    const right = React.useMemo(() => sample('right', trunkLength, routeEnd), [trunkLength, routeEnd]);
    const straight = React.useMemo(
        () => sample('straight', trunkLength, WORLD.trunkStart - WORLD.exitZ + 3),
        [trunkLength]
    );
    const links = React.useMemo(
        () =>
            connectors.map((c) => ({
                lane: c.lane,
                points: Array.from({ length: 12 }, (_, k) => c.from.clone().lerp(c.to, k / 11))
            })),
        [connectors]
    );
    return (
        <group>
            <LaneRibbon points={trunk} color={WORLD.colors.trunk} />
            <LaneRibbon points={left} color={world.lanes.left.color} delay={0.35} fadeEnd={8} />
            <LaneRibbon points={right} color={world.lanes.right.color} delay={0.35} fadeEnd={8} />
            {world.straight && <LaneRibbon points={straight} color={world.straight.color} delay={0.35} fadeEnd={3} />}
            {links.map((link, i) => (
                <LaneRibbon
                    key={i}
                    points={link.points}
                    color={world.lanes[link.lane].color}
                    width={0.32}
                    delay={0.6}
                />
            ))}
        </group>
    );
}
