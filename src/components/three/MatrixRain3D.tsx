/**
 * MatrixRain3D: falling "digital rain" columns placed in 3D space (react-three-fiber).
 *
 * How it works
 * - A glyph atlas (half-width katakana, mirrored like the film, plus digits and symbols) is drawn once
 *   on a 2D canvas, with a soft glow baked in.
 * - Every glyph slot of every column is one instance of a small quad. All animation happens in the
 *   shader: a bright "head" runs down each column, leaving a fading trail, and glyphs keep changing.
 *   Nothing is updated per frame on the CPU apart from the time uniform.
 * - Additive blending + no tone mapping keeps the green saturated and bright.
 *
 * Columns are scattered around a "keep clear" box (the computer and the view in front of it), so the
 * rain never covers the screen. Tweak the props, or the defaults in DEFAULTS below.
 */

import { useFrame } from '@react-three/fiber';
import * as React from 'react';
import * as THREE from 'three';

type Box = { minX: number; maxX: number; minZ: number; maxZ: number };

export type MatrixRain3DProps = {
    /** Number of falling columns. */
    columns?: number;
    /** Area the columns are scattered over (world units). */
    area?: Box;
    /** No column is placed inside this box (keeps the computer and the screen view clear). */
    keepClear?: Box;
    /** Height of the floor the rain falls onto. */
    floorY?: number;
    /** Column heights (world units) are picked between these. */
    height?: [number, number];
    /** Glyph size (world units) for the nearest columns; far columns are drawn larger so they stay legible. */
    glyphSize?: [number, number];
    /** Fall speed in glyphs per second. */
    speed?: [number, number];
    /** Trail length in glyphs. */
    trail?: [number, number];
    /** Trail and head colours. */
    color?: THREE.ColorRepresentation;
    headColor?: THREE.ColorRepresentation;
    /** Overall brightness multiplier (1 = default, raise for more vibrant rain). */
    intensity?: number;
    /** Columns fade out between these camera distances. */
    fade?: [number, number];
    /** Freeze the rain (prefers-reduced-motion). */
    paused?: boolean;
    /** Seed for the layout, so the rain looks the same on every visit. */
    seed?: number;
};

const DEFAULTS = {
    columns: 340,
    area: { minX: -8, maxX: 8, minZ: -11, maxZ: 2.6 },
    keepClear: { minX: -1.25, maxX: 1.4, minZ: -0.75, maxZ: 6 },
    floorY: 0.054,
    height: [2.4, 5] as [number, number],
    glyphSize: [0.075, 0.11] as [number, number],
    speed: [5, 13] as [number, number],
    trail: [9, 26] as [number, number],
    color: '#00ff41',
    headColor: '#e4ffe9',
    intensity: 1.5,
    fade: [7, 20] as [number, number],
    seed: 7
};

const KATAKANA = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾜﾝ';
const OTHERS = '0123456789Z:.="*+-<>¦|ｸ';
const FALLBACK = 'ABCDEFHKLMNPRSTUVXZ0123456789:.="*+-<>¦|$#@%&';
const ATLAS_COLS = 8;
const ATLAS_CELL = 128;
const GLYPH_FONT = '"MS Gothic","Hiragino Kaku Gothic Pro","Yu Gothic","Noto Sans JP","Noto Sans CJK JP",monospace';

/** Small seeded random generator (mulberry32). */
function createRandom(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** True when the browser has a font for katakana (otherwise they would draw as empty boxes). */
function canDrawKatakana() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return false;
    const draw = (ch: string) => {
        ctx.clearRect(0, 0, 32, 32);
        ctx.font = `24px ${GLYPH_FONT}`;
        ctx.fillText(ch, 4, 26);
        return ctx.getImageData(0, 0, 32, 32).data.join(',');
    };
    const missing = draw(''); // private-use code point: renders as the "missing glyph" box
    return draw('ｱ') !== missing && draw('ﾐ') !== missing;
}

function createGlyphAtlas() {
    const useKatakana = canDrawKatakana();
    const glyphs = useKatakana ? Array.from(KATAKANA + OTHERS) : Array.from(FALLBACK);
    const rows = Math.ceil(glyphs.length / ATLAS_COLS);
    const canvas = document.createElement('canvas');
    canvas.width = ATLAS_COLS * ATLAS_CELL;
    canvas.height = rows * ATLAS_CELL;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `bold ${Math.round(ATLAS_CELL * 0.7)}px ${GLYPH_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';

    glyphs.forEach((glyph, i) => {
        const x = (i % ATLAS_COLS) + 0.5;
        const y = Math.floor(i / ATLAS_COLS) + 0.5;
        ctx.save();
        ctx.translate(x * ATLAS_CELL, y * ATLAS_CELL);
        if (KATAKANA.includes(glyph)) ctx.scale(-1, 1); // mirrored, like the film
        // two passes: a soft glow, then the crisp glyph on top
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = ATLAS_CELL * 0.14;
        ctx.fillText(glyph, 0, 0);
        ctx.shadowBlur = 0;
        ctx.fillText(glyph, 0, 0);
        ctx.restore();
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 4;
    texture.needsUpdate = true;
    return { texture, count: glyphs.length, rows };
}

const vertexShader = /* glsl */ `
    attribute vec4 aColumn;   // x, top y, z, speed (glyphs per second)
    attribute vec4 aParams;   // phase, trail length, glyph size, seed
    attribute vec2 aSlot;     // slot index from the top, slots in this column

    uniform float uTime;
    uniform float uGlyphCount;
    uniform vec2 uFade;

    varying vec2 vUv;
    varying float vGlyph;
    varying float vTrail;
    varying float vHead;
    varying float vFade;

    float hash(float n) { return fract(sin(n) * 43758.5453123); }

    void main() {
        float size = aParams.z;
        float slot = aSlot.x;
        float slots = aSlot.y;
        float trail = aParams.y;

        // The head travels the column, then a short gap before it comes round again.
        float cycle = slots + trail + 6.0;
        float head = mod(uTime * aColumn.w + aParams.x, cycle);
        float behind = head - slot;                     // > 0: this slot is in the trail
        vTrail = behind >= 0.0 && behind < trail ? 1.0 - behind / trail : 0.0;
        vHead = behind >= 0.0 && behind < 1.0 ? 1.0 : 0.0;

        // Glyphs flicker to new characters at their own pace.
        float rate = 1.5 + 7.0 * hash(aParams.w * 3.1 + slot * 1.7);
        float tick = floor(uTime * rate + hash(slot + aParams.w) * 10.0);
        vGlyph = floor(hash(slot * 12.9898 + aParams.w * 78.233 + tick * 4.123) * uGlyphCount);

        vec3 center = vec3(aColumn.x, aColumn.y - (slot + 0.5) * size, aColumn.z);
        vec4 mv = modelViewMatrix * vec4(center, 1.0);
        mv.xy += position.xy * size;                  // quad always faces the camera
        gl_Position = projectionMatrix * mv;

        float dist = -mv.z;
        vFade = 1.0 - smoothstep(uFade.x, uFade.y, dist);
        // fade the very top of each column in, so columns don't start with a hard edge
        vFade *= smoothstep(0.0, 4.0, slot);
        vUv = uv;
    }
`;

const fragmentShader = /* glsl */ `
    uniform sampler2D uAtlas;
    uniform vec2 uAtlasGrid;  // columns, rows
    uniform vec3 uColor;
    uniform vec3 uHeadColor;
    uniform float uIntensity;

    varying vec2 vUv;
    varying float vGlyph;
    varying float vTrail;
    varying float vHead;
    varying float vFade;

    void main() {
        if (vTrail <= 0.0 || vFade <= 0.0) discard;
        vec2 cell = vec2(mod(vGlyph, uAtlasGrid.x), floor(vGlyph / uAtlasGrid.x));
        vec2 uv = vec2((cell.x + vUv.x) / uAtlasGrid.x, 1.0 - (cell.y + 1.0 - vUv.y) / uAtlasGrid.y);
        float glyph = texture2D(uAtlas, uv).r;

        float trail = pow(vTrail, 1.5);
        vec3 color = mix(uColor * trail, uHeadColor * 1.6, vHead);
        gl_FragColor = vec4(color * glyph * uIntensity * vFade, 1.0);
    }
`;

export default function MatrixRain3D(props: MatrixRain3DProps) {
    const {
        columns = DEFAULTS.columns,
        area = DEFAULTS.area,
        keepClear = DEFAULTS.keepClear,
        floorY = DEFAULTS.floorY,
        height = DEFAULTS.height,
        glyphSize = DEFAULTS.glyphSize,
        speed = DEFAULTS.speed,
        trail = DEFAULTS.trail,
        color = DEFAULTS.color,
        headColor = DEFAULTS.headColor,
        intensity = DEFAULTS.intensity,
        fade = DEFAULTS.fade,
        paused = false,
        seed = DEFAULTS.seed
    } = props;

    const atlas = React.useMemo(() => createGlyphAtlas(), []);

    const geometry = React.useMemo(() => {
        const random = createRandom(seed);
        const between = ([min, max]: [number, number]) => min + (max - min) * random();
        const columnData: number[] = [];
        const paramData: number[] = [];
        const slotData: number[] = [];

        for (let c = 0; c < columns; c++) {
            let x = 0;
            let z = 0;
            for (let attempt = 0; attempt < 50; attempt++) {
                x = between([area.minX, area.maxX]);
                z = between([area.minZ, area.maxZ]);
                const blocked = x > keepClear.minX && x < keepClear.maxX && z > keepClear.minZ && z < keepClear.maxZ;
                if (!blocked) break;
            }
            // Far columns get bigger glyphs so they still read as characters.
            const depth = Math.max(0, -z) / Math.max(1, -area.minZ);
            const size = between(glyphSize) * (1 + depth * 0.9);
            const slots = Math.min(64, Math.ceil(between(height) / size));
            const top = floorY + slots * size;
            const columnTrail = Math.min(slots, between(trail));
            const phase = random() * (slots + columnTrail + 6);
            const columnSpeed = between(speed);
            const columnSeed = random() * 1000;

            for (let s = 0; s < slots; s++) {
                columnData.push(x, top, z, columnSpeed);
                paramData.push(phase, columnTrail, size, columnSeed);
                slotData.push(s, slots);
            }
        }

        const quad = new THREE.PlaneGeometry(1, 1);
        const instanced = new THREE.InstancedBufferGeometry();
        instanced.index = quad.index;
        instanced.setAttribute('position', quad.getAttribute('position'));
        instanced.setAttribute('uv', quad.getAttribute('uv'));
        instanced.setAttribute('aColumn', new THREE.InstancedBufferAttribute(new Float32Array(columnData), 4));
        instanced.setAttribute('aParams', new THREE.InstancedBufferAttribute(new Float32Array(paramData), 4));
        instanced.setAttribute('aSlot', new THREE.InstancedBufferAttribute(new Float32Array(slotData), 2));
        instanced.instanceCount = slotData.length / 2;
        return instanced;
    }, [columns, area, keepClear, floorY, height, glyphSize, speed, trail, seed]);

    const material = React.useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader,
                fragmentShader,
                uniforms: {
                    uTime: { value: 0 },
                    uAtlas: { value: atlas.texture },
                    uAtlasGrid: { value: new THREE.Vector2(ATLAS_COLS, atlas.rows) },
                    uGlyphCount: { value: atlas.count },
                    uColor: { value: new THREE.Color() },
                    uHeadColor: { value: new THREE.Color() },
                    uIntensity: { value: 1 },
                    uFade: { value: new THREE.Vector2() }
                },
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                toneMapped: false
            }),
        [atlas]
    );

    // Keep uniforms in sync with props without rebuilding the material.
    material.uniforms.uColor.value.set(color);
    material.uniforms.uHeadColor.value.set(headColor);
    material.uniforms.uIntensity.value = intensity;
    material.uniforms.uFade.value.set(fade[0], fade[1]);

    React.useEffect(() => () => geometry.dispose(), [geometry]);
    React.useEffect(
        () => () => {
            material.dispose();
            atlas.texture.dispose();
        },
        [material, atlas]
    );

    useFrame((_, delta) => {
        if (!paused) material.uniforms.uTime.value += Math.min(delta, 0.1);
    });

    return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={1} />;
}
