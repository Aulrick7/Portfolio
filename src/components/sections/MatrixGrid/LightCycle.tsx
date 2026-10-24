/*
3D model: "TRON: Uprising - ArgonCity Light Cycle" by TheTinDog (https://sketchfab.com/simysimes)
Source: https://sketchfab.com/3d-models/tron-uprising-argoncity-light-cycle-a4c0e652c9a443868c3551e12f4bffee
License: CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)

Changes for this portfolio (also in CREDITS.md): re-packed as public/models/light-cycle/light-cycle.glb
(WebP texture, quantised geometry: 1.9 MB -> 0.87 MB); the red-orange glow is recoloured to the cyan of a
lane colour at runtime: it glows white on the trunk and takes the colour of each lane it rides into
(colours in worlds.ts).

The bike is driven from outside: the parent moves and turns the group passed as `bikeRef`. This component
handles how it looks: the glow colour, rezzing in from the floor up, the spinning rear engine (the model's
own animation), wheels turning with the distance travelled, and leaning into turns.
*/

import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as React from 'react';
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

import { dampFactor, useTimeline } from './timeline';

export const LIGHT_CYCLE_URL = '/models/light-cycle/light-cycle.glb';

/** Corrects the model's own orientation so it points along +z with its wheels on y = 0. */
const MODEL_FIX = { rotation: [0, 0, 0] as [number, number, number], position: [0, 0, 0] as [number, number, number] };
const WHEEL_RADIUS = 0.38;

export function LightCycle({
    bikeRef,
    lean,
    color
}: {
    bikeRef: React.RefObject<THREE.Group>;
    lean: React.MutableRefObject<number>;
    /** Current glow colour (the rider changes it as the bike enters a lane). */
    color: React.MutableRefObject<THREE.Color>;
}) {
    const timeline = useTimeline();
    const { scene, animations } = useGLTF(LIGHT_CYCLE_URL);
    // Everything the bike needs is built together from a fresh copy of the model, so it is safe for React to
    // run this more than once (it does in development): each run gets its own copy, materials and clip plane.
    const { model, parts, clip } = React.useMemo(() => {
        const model = cloneSkinned(scene) as THREE.Group;
        // One clipping plane shared by every material: the bike is drawn up to this height (rez-in effect).
        const clip = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
        const wheels: THREE.Bone[] = [];
        const glows: THREE.MeshStandardMaterial[] = [];
        model.traverse((object) => {
            const mesh = object as THREE.Mesh;
            if ((object as THREE.Bone).isBone && /Tire_0\d$/.test(object.name)) wheels.push(object as THREE.Bone);
            if (!mesh.isMesh) return;
            mesh.frustumCulled = false; // skinned meshes have unreliable bounds
            const materials = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
                const material = (m as THREE.MeshStandardMaterial).clone();
                material.clippingPlanes = [clip];
                if (material.name === 'Glow') {
                    material.emissive = new THREE.Color(1, 1, 1);
                    material.emissiveIntensity = 1.15; // low enough that lane colours stay saturated
                    material.toneMapped = false;
                    glows.push(material);
                }
                if (material.name === 'Headlights') material.toneMapped = false;
                return material;
            });
            mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
        });
        return { model, parts: { wheels, glows }, clip };
    }, [scene]);
    const leanGroup = React.useRef<THREE.Group>(null);
    const light = React.useRef<THREE.PointLight>(null);
    const { actions } = useAnimations(animations, model);

    React.useEffect(() => {
        const action = actions && Object.values(actions)[0];
        action?.reset().play();
        return () => {
            action?.stop();
        };
    }, [actions]);

    const last = React.useMemo(() => new THREE.Vector3(), []);
    const first = React.useRef(true);

    useFrame((_, delta) => {
        const bike = bikeRef.current;
        if (!bike) return;
        // Rez in: the visible part grows from the floor to the top of the bike.
        const rez = timeline.bike;
        clip.constant = rez >= 1 ? 100 : rez * 1.15;
        bike.visible = rez > 0;

        // Wheels turn with the distance travelled.
        if (first.current) {
            last.copy(bike.position);
            first.current = false;
        }
        const travelled = last.distanceTo(bike.position);
        last.copy(bike.position);
        for (const wheel of parts.wheels) wheel.rotation.x += travelled / WHEEL_RADIUS;

        if (leanGroup.current) {
            leanGroup.current.rotation.z += (lean.current - leanGroup.current.rotation.z) * dampFactor(0.12, delta);
        }

        for (const glow of parts.glows) glow.emissive.copy(color.current);
        light.current?.color.copy(color.current);
    });

    return (
        <group ref={bikeRef}>
            <group ref={leanGroup}>
                <primitive object={model} rotation={MODEL_FIX.rotation} position={MODEL_FIX.position} />
                {/* soft pool of light under the bike, in its current colour */}
                <pointLight ref={light} intensity={3} distance={4} decay={2} position={[0, 0.5, 0]} />
            </group>
        </group>
    );
}

useGLTF.preload(LIGHT_CYCLE_URL);

/* ------------------------------------------------------------------ light trail */

const TRAIL_POINTS = 240;
const TRAIL_LENGTH = 16; // world units of trail kept behind the bike
const TRAIL_HEIGHT = 0.78;

const trailVertex = /* glsl */ `
    attribute float aAge;   // 0 at the bike, 1 at the far end
    attribute float aSide;  // 0 bottom edge, 1 top edge
    varying float vAge;
    varying float vSide;
    void main() {
        vAge = aAge;
        vSide = aSide;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const trailFragment = /* glsl */ `
    uniform vec3 uColor;
    uniform float uOpacity;
    varying float vAge;
    varying float vSide;
    void main() {
        float along = pow(1.0 - vAge, 1.6);
        float edges = 0.45 + 1.4 * pow(vSide, 8.0) + 0.7 * pow(1.0 - vSide, 10.0);
        gl_FragColor = vec4(uColor * along * edges * uOpacity * 1.3, 1.0);
    }
`;

/**
 * The wall of light the cycle leaves behind (a Tron "jetwall"). It follows the bike while it rides and
 * shrinks away into the bike once it stops.
 */
export function LightTrail({
    bikeRef,
    moving,
    color
}: {
    bikeRef: React.RefObject<THREE.Group>;
    moving: React.MutableRefObject<boolean>;
    color: React.MutableRefObject<THREE.Color>;
}) {
    const { geometry, positions, ages } = React.useMemo(() => {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(TRAIL_POINTS * 2 * 3);
        const ages = new Float32Array(TRAIL_POINTS * 2);
        const sides = new Float32Array(TRAIL_POINTS * 2);
        const indices: number[] = [];
        for (let i = 0; i < TRAIL_POINTS; i++) {
            sides[i * 2] = 0;
            sides[i * 2 + 1] = 1;
            if (i > 0) {
                const k = (i - 1) * 2;
                indices.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
            }
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
        geometry.setAttribute('aAge', new THREE.BufferAttribute(ages, 1).setUsage(THREE.DynamicDrawUsage));
        geometry.setAttribute('aSide', new THREE.BufferAttribute(sides, 1));
        geometry.setIndex(indices);
        geometry.setDrawRange(0, 0);
        return { geometry, positions, ages };
    }, []);
    const material = React.useMemo(
        () =>
            new THREE.ShaderMaterial({
                vertexShader: trailVertex,
                fragmentShader: trailFragment,
                uniforms: { uColor: { value: new THREE.Color() }, uOpacity: { value: 1 } },
                transparent: true,
                depthWrite: false,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                toneMapped: false
            }),
        []
    );
    React.useEffect(
        () => () => {
            geometry.dispose();
            material.dispose();
        },
        [geometry, material]
    );

    const points = React.useRef<THREE.Vector3[]>([]);
    const back = React.useMemo(() => new THREE.Vector3(), []);
    const forward = React.useMemo(() => new THREE.Vector3(), []);

    useFrame((_, delta) => {
        const bike = bikeRef.current;
        if (!bike) return;
        material.uniforms.uColor.value.copy(color.current);
        // The trail starts at the back wheel.
        forward.set(0, 0, 1).applyQuaternion(bike.quaternion);
        back.copy(bike.position).addScaledVector(forward, -1.05).setY(0);
        const list = points.current;
        if (moving.current) {
            if (!list.length || list[0].distanceTo(back) > 0.12) list.unshift(back.clone());
            else list[0].copy(back);
        } else if (list.length) {
            // Stopped: reel the trail in from the far end.
            const reel = delta * 14;
            let remaining = reel;
            while (list.length > 1 && remaining > 0) {
                const end = list[list.length - 1];
                const prev = list[list.length - 2];
                const d = end.distanceTo(prev);
                if (d <= remaining) {
                    list.pop();
                    remaining -= d;
                } else {
                    end.lerp(prev, remaining / d);
                    remaining = 0;
                }
            }
            if (list.length === 1) list.pop();
        }

        // Keep at most TRAIL_LENGTH of trail.
        let total = 0;
        for (let i = 1; i < list.length; i++) {
            total += list[i].distanceTo(list[i - 1]);
            if (total > TRAIL_LENGTH || i >= TRAIL_POINTS) {
                list.length = i;
                break;
            }
        }

        let travelled = 0;
        const length = Math.max(total, 1e-3);
        for (let i = 0; i < list.length; i++) {
            if (i > 0) travelled += list[i].distanceTo(list[i - 1]);
            const p = list[i];
            positions.set([p.x, 0.02, p.z, p.x, TRAIL_HEIGHT, p.z], i * 6);
            const age = Math.min(1, travelled / Math.max(length, TRAIL_LENGTH * 0.6));
            ages[i * 2] = age;
            ages[i * 2 + 1] = age;
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.aAge.needsUpdate = true;
        geometry.setDrawRange(0, Math.max(0, list.length - 1) * 6);
    });

    return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={1} />;
}
