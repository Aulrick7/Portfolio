/**
 * The project panels standing beside the lanes, and the two signs at the fork.
 *
 * A panel is a glowing glass frame with 3D text (troika, via drei <Text>). Clicking it rides the bike
 * there, or opens it if the bike is already parked beside it. Opened, it grows to show the whole
 * description, the skills, a "Full page" button and a "Close" button.
 */

import { Text } from '@react-three/drei';
import { ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import * as React from 'react';
import * as THREE from 'three';

import { Lane, LANES, openPanelHeight, openPanelWidth, PanelPlacement, WORLD } from './layout';
import { useGridStore } from './store';
import { dampFactor, easeOut, useTimeline } from './timeline';

export const FONTS = {
    title: '/fonts/orbitron-latin-700-normal.woff',
    titleMedium: '/fonts/orbitron-latin-500-normal.woff',
    body: '/fonts/share-tech-mono-latin-400-normal.woff'
};

/* ------------------------------------------------------------------ glowing frame */

const frameVertex = /* glsl */ `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const frameFragment = /* glsl */ `
    uniform vec2 uSize;
    uniform float uMargin;
    uniform vec3 uColor;
    uniform float uGlow;
    uniform float uOpacity;
    uniform float uGlass;
    varying vec2 vUv;

    float roundBox(vec2 p, vec2 b, float r) {
        vec2 q = abs(p) - b + r;
        return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
    }

    void main() {
        vec2 full = uSize + 2.0 * uMargin;
        vec2 p = (vUv - 0.5) * full;
        float d = roundBox(p, uSize * 0.5, 0.07);
        float inside = 1.0 - step(0.0, d);
        float border = 1.0 - smoothstep(0.0, 0.014, abs(d) - 0.006);
        float halo = exp(-max(d, 0.0) * 10.0) * step(0.0, d);
        float scan = 0.82 + 0.18 * step(0.5, fract(p.y * 28.0));
        vec3 glass = mix(vec3(0.003, 0.016, 0.024), uColor * 0.08, 0.35) * scan;
        vec3 color = glass * inside * uGlass + uColor * (border * (1.3 + uGlow * 1.2) + halo * (0.3 + uGlow * 0.7));
        float alpha = inside * 0.86 * uGlass + border + halo * 0.85;
        gl_FragColor = vec4(color, clamp(alpha, 0.0, 1.0) * uOpacity);
    }
`;

function useFrameMaterial(color: string, glass = 1) {
    const material = React.useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: frameVertex,
                fragmentShader: frameFragment,
                uniforms: {
                    uSize: { value: new THREE.Vector2(1, 1) },
                    uMargin: { value: 0.35 },
                    uColor: { value: new THREE.Color(color) },
                    uGlow: { value: 0 },
                    uOpacity: { value: 0 },
                    uGlass: { value: glass }
                },
                transparent: true,
                depthWrite: false,
                toneMapped: false
            }),
        [color, glass]
    );
    React.useEffect(() => () => material.dispose(), [material]);
    return material;
}

const setCursor = (pointer: boolean) => {
    document.body.style.cursor = pointer ? 'pointer' : '';
};

/* ------------------------------------------------------------------ text helpers */

const BODY_SIZE = 0.1;
const BODY_ADVANCE = 0.6; // Share Tech Mono glyph width, in ems (a little generous, so text never overflows)

function truncate(text: string, width: number, lines: number) {
    const perLine = Math.floor(width / (BODY_SIZE * BODY_ADVANCE));
    const max = Math.max(20, perLine * lines - 2);
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    return `${cut.slice(0, cut.lastIndexOf(' ') > max * 0.6 ? cut.lastIndexOf(' ') : max).trimEnd()}…`;
}

const formatDate = (date: string | null) => (date ? date.replace('-', '.') : '');

type TextHandle = THREE.Mesh & { fillOpacity: number };

/** Fades every Text inside a group via its fillOpacity (no re-layout needed). */
function fadeTexts(group: THREE.Group | null, opacity: number) {
    group?.traverse((object) => {
        const text = object as TextHandle;
        if (typeof text.fillOpacity === 'number') text.fillOpacity = opacity;
    });
}

/* ------------------------------------------------------------------ project panel */

export function ProjectPanel({ panel, stagger }: { panel: PanelPlacement; stagger: number }) {
    const timeline = useTimeline();
    const { project, lane, index } = panel;
    const color = LANES[lane].color;
    const id = `${lane}-${index}`;

    const isCurrent = useGridStore(
        (s) => s.target.kind === 'station' && s.target.lane === lane && s.target.index === index
    );
    const isOpen = useGridStore(
        (s) => s.target.kind === 'station' && s.target.lane === lane && s.target.index === index && s.target.open
    );
    const moving = useGridStore((s) => s.moving);
    const hovered = useGridStore((s) => s.hovered === id);
    const ready = useGridStore((s) => s.phase === 'ready');
    const open = isOpen && !moving;

    const aspect = useThree((s) => s.size.width / s.size.height);
    const [width, height] = open ? [openPanelWidth(aspect), openPanelHeight(project, aspect)] : WORLD.panelSize;
    const size = React.useRef(new THREE.Vector2(...WORLD.panelSize));
    const frame = useFrameMaterial(color);
    const group = React.useRef<THREE.Group>(null);
    const frameMesh = React.useRef<THREE.Mesh>(null);
    const texts = React.useRef<THREE.Group>(null);
    const goalSize = React.useMemo(() => new THREE.Vector2(), []);
    const [titleHeight, setTitleHeight] = React.useState(0.25);
    const textOpacity = React.useRef(0);
    const layoutKey = open ? 'open' : 'closed';
    const lastKey = React.useRef(layoutKey);

    useFrame((_, delta) => {
        const rise = easeOut(THREE.MathUtils.clamp((timeline.panels - stagger) / 0.55, 0, 1));
        if (group.current) group.current.position.y = WORLD.panelLift + size.current.y / 2 - (1 - rise) * 3;
        size.current.lerp(goalSize.set(width, height), dampFactor(0.18, delta));
        frame.uniforms.uSize.value.copy(size.current);
        frameMesh.current?.scale.set(size.current.x + 0.7, size.current.y + 0.7, 1);
        frame.uniforms.uOpacity.value = rise;
        const glow = open ? 1 : hovered ? 0.8 : isCurrent ? 0.55 : 0;
        frame.uniforms.uGlow.value += (glow - frame.uniforms.uGlow.value) * dampFactor(0.15, delta);

        // Text fades out while the panel resizes, then back in with the new layout.
        if (lastKey.current !== layoutKey) {
            textOpacity.current = 0;
            lastKey.current = layoutKey;
        }
        const settled = Math.abs(size.current.y - height) < 0.05 && Math.abs(size.current.x - width) < 0.05;
        const goal = settled ? rise : 0;
        textOpacity.current += (goal - textOpacity.current) * dampFactor(0.12, delta);
        fadeTexts(texts.current, textOpacity.current);
    });

    const onClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        const store = useGridStore.getState();
        if (store.phase !== 'ready' || store.moving) return;
        if (isCurrent) {
            if (!isOpen) store.open();
        } else {
            store.chooseLane(lane, index);
        }
    };
    const onOver = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        if (!ready) return;
        useGridStore.getState().setHovered(id);
        setCursor(true);
    };
    const onOut = () => {
        if (useGridStore.getState().hovered === id) useGridStore.getState().setHovered(null);
        setCursor(false);
    };

    // Layout (local units, origin at the panel centre, text 1 cm in front of the glass).
    const pad = 0.2;
    const left = -width / 2 + pad;
    const top = height / 2 - 0.17;
    const textWidth = width - pad * 2;
    const titleY = top - 0.17;
    const datesY = titleY - titleHeight - 0.07;
    const descY = datesY - 0.17;
    const skills = project.skills.map((s) => s.toUpperCase()).join('  ·  ');
    const skillLines = Math.max(1, Math.ceil((skills.length * 0.085 * BODY_ADVANCE) / textWidth));
    const skillsY = -height / 2 + (open ? 0.24 : 0.4);
    const bottomReserve = (open ? 0.24 : 0.4) + skillLines * 0.085 * 1.3 + 0.16;
    const descLines = Math.max(2, Math.floor((descY - (-height / 2 + bottomReserve)) / (BODY_SIZE * 1.45)));
    const description = open ? project.description : truncate(project.description, textWidth, descLines);
    const dates = [formatDate(project.startdate), formatDate(project.enddate)].filter(Boolean).join(' — ');
    const label = `${LANES[lane].label} PROJECT · ${String(index + 1).padStart(2, '0')}`;

    const common = {
        anchorX: 'left' as const,
        anchorY: 'top' as const,
        'material-toneMapped': false,
        'material-depthWrite': false
    };

    return (
        <group position={[panel.base.x, 0, panel.base.z]} rotation-y={panel.yaw}>
            <group ref={group}>
                <mesh
                    ref={frameMesh}
                    material={frame}
                    renderOrder={2}
                    onClick={onClick}
                    onPointerOver={onOver}
                    onPointerOut={onOut}
                >
                    <planeGeometry args={[1, 1]} />
                </mesh>
                <group ref={texts} position-z={0.01} key={layoutKey}>
                    <Text
                        {...common}
                        font={FONTS.body}
                        fontSize={0.085}
                        letterSpacing={0.12}
                        color={color}
                        position={[left, top, 0]}
                        renderOrder={3}
                    >
                        {label}
                    </Text>
                    <Text
                        {...common}
                        font={FONTS.title}
                        fontSize={0.2}
                        lineHeight={1.15}
                        maxWidth={textWidth}
                        color="#e8fcff"
                        position={[left, titleY, 0]}
                        renderOrder={3}
                        onSync={(t: any) => {
                            const b = t.textRenderInfo?.blockBounds;
                            if (b) setTitleHeight((h) => (Math.abs(h - (b[3] - b[1])) > 0.01 ? b[3] - b[1] : h));
                        }}
                    >
                        {project.title.toUpperCase()}
                    </Text>
                    <Text
                        {...common}
                        font={FONTS.body}
                        fontSize={0.085}
                        color="#6fb6c4"
                        position={[left, datesY, 0]}
                        renderOrder={3}
                    >
                        {dates}
                    </Text>
                    <Text
                        {...common}
                        font={FONTS.body}
                        fontSize={BODY_SIZE}
                        lineHeight={1.45}
                        maxWidth={textWidth}
                        color="#bfe9f1"
                        position={[left, descY, 0]}
                        renderOrder={3}
                    >
                        {description}
                    </Text>
                    {skills && (
                        <Text
                            {...common}
                            anchorY="bottom"
                            font={FONTS.body}
                            fontSize={0.085}
                            maxWidth={textWidth}
                            letterSpacing={0.06}
                            color={color}
                            lineHeight={1.3}
                            position={[left, skillsY, 0]}
                            renderOrder={3}
                        >
                            {skills}
                        </Text>
                    )}
                    {!open && isCurrent && !moving && (
                        <Text
                            {...common}
                            anchorY="bottom"
                            font={FONTS.body}
                            fontSize={0.09}
                            letterSpacing={0.18}
                            color="#ffffff"
                            position={[left, -height / 2 + 0.16, 0]}
                            renderOrder={3}
                        >
                            OPEN ›
                        </Text>
                    )}
                </group>
            </group>
        </group>
    );
}

/* ------------------------------------------------------------------ fork signs */

export function ForkSign({ lane }: { lane: Lane }) {
    const timeline = useTimeline();
    const { color, label, dir } = LANES[lane];
    const id = `sign-${lane}`;
    const frame = useFrameMaterial(color, 0.7);
    const group = React.useRef<THREE.Group>(null);
    const texts = React.useRef<THREE.Group>(null);
    const hovered = useGridStore((s) => s.hovered === id);
    const atFork = useGridStore((s) => s.target.kind === 'fork' && !s.moving && s.phase === 'ready');
    // Wide enough for the label plus its arrow.
    const [w, h] = [Math.max(2.5, label.length * 0.33 + 1.0), 1.05];

    useFrame((state, delta) => {
        const rise = easeOut(THREE.MathUtils.clamp((timeline.panels - 0.15) / 0.6, 0, 1));
        if (group.current) {
            group.current.position.y =
                WORLD.gate.y - (1 - rise) * 3 + Math.sin(state.clock.elapsedTime * 1.4 + dir) * 0.04;
        }
        frame.uniforms.uSize.value.set(w, h);
        frame.uniforms.uOpacity.value = rise;
        const glow = hovered ? 1 : atFork ? 0.45 + 0.25 * Math.sin(state.clock.elapsedTime * 3) : 0.2;
        frame.uniforms.uGlow.value += (glow - frame.uniforms.uGlow.value) * dampFactor(0.12, delta);
        fadeTexts(texts.current, rise);
    });

    const choose = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        const store = useGridStore.getState();
        if (store.phase === 'ready' && !store.moving) store.chooseLane(lane);
    };

    return (
        <group ref={group} position={[dir * WORLD.gate.x, WORLD.gate.y, WORLD.gate.z]} rotation-y={-dir * 0.28}>
            <mesh
                material={frame}
                renderOrder={2}
                scale={[w + 0.7, h + 0.7, 1]}
                onClick={choose}
                onPointerOver={(e) => {
                    e.stopPropagation();
                    useGridStore.getState().setHovered(id);
                    setCursor(true);
                }}
                onPointerOut={() => {
                    if (useGridStore.getState().hovered === id) useGridStore.getState().setHovered(null);
                    setCursor(false);
                }}
            >
                <planeGeometry args={[1, 1]} />
            </mesh>
            <group ref={texts} position-z={0.01}>
                <Text
                    font={FONTS.title}
                    fontSize={0.36}
                    letterSpacing={0.08}
                    color="#ffffff"
                    anchorX="center"
                    anchorY="middle"
                    position={[0.12 * -dir, 0.12, 0]}
                    material-toneMapped={false}
                    material-depthWrite={false}
                    renderOrder={3}
                >
                    {label}
                </Text>
                {/* Orbitron has no arrow characters, so the arrow uses the monospace font */}
                <Text
                    font={FONTS.body}
                    fontSize={0.42}
                    color={color}
                    anchorX="center"
                    anchorY="middle"
                    position={[dir * (w / 2 - 0.22), 0.12, 0]}
                    material-toneMapped={false}
                    material-depthWrite={false}
                    renderOrder={3}
                >
                    {dir < 0 ? '‹' : '›'}
                </Text>
                <Text
                    font={FONTS.body}
                    fontSize={0.11}
                    letterSpacing={0.4}
                    color={color}
                    anchorX="center"
                    anchorY="middle"
                    position={[0, -0.26, 0]}
                    material-toneMapped={false}
                    material-depthWrite={false}
                    renderOrder={3}
                >
                    PROJECTS
                </Text>
            </group>
        </group>
    );
}
