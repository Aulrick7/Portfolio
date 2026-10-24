/**
 * Where everything sits in the grid world, the light cycle's routes, and the camera framings.
 *
 *                                   [ portal ]  (straight lane, optional: rides off to another page)
 *                                       |
 *        LEFT lane  <-------------- junction --------------> RIGHT lane
 *   (-x)  [P]   [P]   [P]  ====\  (0,0,0)  /====  [P]   [P]   [P]  (+x)
 *                               \    |    /
 *                                 trunk  |
 *                                        |  (0,0,+12) start
 *
 * Which lane holds what (game / software, work / education), their colours and labels are in worlds.ts.
 * Units are metres-ish; y is up. Everything here is plain math (no React), so it is easy to tweak.
 */

import * as THREE from 'three';

import type { MatrixProject } from '@/types';

/** The two side lanes that hold panels. */
export type Lane = 'left' | 'right';
/** Every route the light cycle can ride: the side lanes, and the straight lane past the junction. */
export type Route = Lane | 'straight';

export const SIDES: Record<Lane, { dir: -1 | 1 }> = {
    left: { dir: -1 },
    right: { dir: 1 }
};

export const WORLD = {
    /** Trunk runs from here (z) to the fork at z = 0. */
    trunkStart: 12,
    /** Radius of the turn from the trunk into each lane. */
    cornerRadius: 1.6,
    /** How far each lane runs past the turn. */
    laneLength: 34,
    /** Distance along the lane (after the turn) to the first panel, and between panels. */
    firstPanel: 6.5,
    panelSpacing: 7.5,
    /** Panels stand this far to the side of the lane, alternating sides. */
    panelSide: 3,
    /** The camera stops this far before a panel, measured along the lane. */
    panelLead: 2.4,
    /** Panel size (width, height) normally and when opened. */
    panelSize: [3.2, 2.05] as [number, number],
    panelOpenWidth: 3.7,
    /** Gap between the grid and the bottom of a panel. */
    panelLift: 0.42,
    /** Camera eye height while riding. */
    eye: 1.35,
    /** Fork signs (x offset, height, z). */
    gate: { x: 3.05, y: 1.95, z: -1.3 },
    /** The straight lane: its sign, the portal at its end, and where the bike stops (beyond the portal). */
    straightSign: { y: 3.75, z: -7 },
    portalZ: -13,
    exitZ: -16.5,
    colors: {
        trunk: '#8cf6ff',
        grid: '#14c8e6',
        rain: '#00ff41',
        background: '#010407'
    }
};

/* ------------------------------------------------------------------ routes */

const trunkEnd = new THREE.Vector3(0, 0, WORLD.cornerRadius);

/** The full path for a route: the trunk, then the turn and the lane out along x (or straight on along -z). */
export function laneRoute(route: Route) {
    const r = WORLD.cornerRadius;
    const path = new THREE.CurvePath<THREE.Vector3>();
    path.add(new THREE.LineCurve3(new THREE.Vector3(0, 0, WORLD.trunkStart), trunkEnd.clone()));
    if (route === 'straight') {
        path.add(new THREE.LineCurve3(trunkEnd.clone(), new THREE.Vector3(0, 0, WORLD.exitZ - 4)));
        return path;
    }
    const { dir } = SIDES[route];
    path.add(
        new THREE.QuadraticBezierCurve3(trunkEnd.clone(), new THREE.Vector3(0, 0, 0), new THREE.Vector3(dir * r, 0, 0))
    );
    path.add(
        new THREE.LineCurve3(new THREE.Vector3(dir * r, 0, 0), new THREE.Vector3(dir * (r + WORLD.laneLength), 0, 0))
    );
    return path;
}

const routes: Record<Route, THREE.CurvePath<THREE.Vector3>> = {
    left: laneRoute('left'),
    right: laneRoute('right'),
    straight: laneRoute('straight')
};
const routeLengths: Record<Route, number> = {
    left: routes.left.getLength(),
    right: routes.right.getLength(),
    straight: routes.straight.getLength()
};
const trunkLength = WORLD.trunkStart - WORLD.cornerRadius;
const cornerLength = routeLengths.left - trunkLength - WORLD.laneLength;

/** Point on a route at distance s (clamped), at height y. */
export function routePoint(route: Route, s: number, y = 0, target = new THREE.Vector3()) {
    const u = THREE.MathUtils.clamp(s / routeLengths[route], 0, 1);
    routes[route].getPointAt(u, target);
    target.y = y;
    return target;
}

/** Distance along the route for a point on the trunk at z. */
const trunkS = (z: number) => WORLD.trunkStart - z;

/** Distance along the route of the lane point beside panel i. */
const panelLaneS = (i: number) => trunkLength + cornerLength + WORLD.firstPanel + i * WORLD.panelSpacing;

/* ------------------------------------------------------------------ panels */

export type PanelPlacement = {
    lane: Lane;
    index: number;
    project: MatrixProject;
    /** Bottom-centre of the panel on the grid. */
    base: THREE.Vector3;
    /** Rotation around y so the panel faces the camera stop. */
    yaw: number;
    /** Unit vector the panel faces (horizontal). */
    normal: THREE.Vector3;
    /** Distance along the route of the camera's lane point for this panel. */
    s: number;
};

export function placePanels(lane: Lane, projects: MatrixProject[]): PanelPlacement[] {
    const { dir } = SIDES[lane];
    return projects.map((project, index) => {
        const s = panelLaneS(index);
        const lanePoint = routePoint(lane, s + WORLD.panelLead);
        const right = new THREE.Vector3(0, 0, dir); // right-hand side when riding this lane
        const side = index % 2 === 0 ? 1 : -1;
        const base = lanePoint.clone().addScaledVector(right, side * WORLD.panelSide);
        const viewPoint = routePoint(lane, s);
        const normal = viewPoint.sub(base).setY(0).normalize();
        return { lane, index, project, base, yaw: Math.atan2(normal.x, normal.z), normal, s };
    });
}

/* ------------------------------------------------------------------ camera poses */

export type Pose = {
    position: THREE.Vector3;
    look: THREE.Vector3;
    /** Where on the route this pose belongs (for planning rides between poses). */
    lane: Lane | null;
    s: number;
};

export function verticalFov(aspect: number) {
    return aspect < 1 ? 62 : 50;
}

/** Distance at which a w x h rectangle fills the view (with some margin). */
function fitDistance(w: number, h: number, aspect: number, margin = 1.18) {
    const vFov = THREE.MathUtils.degToRad(verticalFov(aspect));
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
    return Math.max(((w / 2) * margin) / Math.tan(hFov / 2), ((h / 2) * margin) / Math.tan(vFov / 2));
}

export function startPose(): Pose {
    const z = WORLD.trunkStart - 1.2;
    return {
        position: new THREE.Vector3(0, WORLD.eye, z),
        look: new THREE.Vector3(0, 1.0, 0),
        lane: null,
        s: trunkS(z)
    };
}

export function forkPose(aspect: number): Pose {
    // Back far enough to see both signs.
    const z = THREE.MathUtils.clamp(
        fitDistance((WORLD.gate.x + 2.1) * 2 + 0.9, 2.4, aspect, 1.04) + WORLD.gate.z,
        4.6,
        aspect < 1 ? 21 : 11
    );
    return {
        position: new THREE.Vector3(0, WORLD.eye + 0.45, z),
        look: new THREE.Vector3(0, 1.3, WORLD.gate.z + 0.4),
        lane: null,
        s: trunkS(z)
    };
}

/** Width of an opened panel: narrower on tall phone screens, so its text comes out bigger. */
export const openPanelWidth = (aspect: number) => (aspect < 1 ? 2.6 : WORLD.panelOpenWidth);

/** Height of a panel when opened, from how much text it has to show. */
export function openPanelHeight(project: MatrixProject, aspect = 16 / 9) {
    const charsPerLine = Math.floor((openPanelWidth(aspect) - 0.4) / (0.1 * 0.6));
    const lines = Math.ceil((project.description?.length ?? 0) / charsPerLine) + 1;
    const skillLines = Math.ceil((project.skills.join('  ·  ').length * 0.085 * 0.6) / (openPanelWidth(aspect) - 0.4));
    return THREE.MathUtils.clamp(1.25 + lines * 0.1 * 1.45 + skillLines * 0.11 + 0.45, WORLD.panelSize[1], 5.2);
}

export function stationPose(panel: PanelPlacement, aspect: number, open: boolean): Pose {
    const [w, h] = open ? [openPanelWidth(aspect), openPanelHeight(panel.project, aspect)] : WORLD.panelSize;
    const centre = panel.base.clone().setY(WORLD.panelLift + h / 2);
    const portrait = aspect < 1;
    const margin = open ? (portrait ? 1.14 : 1.32) : portrait ? 1.08 : 1.3;
    const distance = Math.max(open ? 2.9 : 3.4, fitDistance(w, h, aspect, margin));
    const position = centre.clone().addScaledVector(panel.normal, distance);
    position.y = open ? centre.y : Math.max(WORLD.eye, centre.y - 0.05);
    // Aim a little below the centre so the panel sits above the on-screen buttons.
    const look = centre.clone();
    look.y -= h * (open ? (portrait ? 0.03 : 0.12) : 0.08);
    return { position, look, lane: panel.lane, s: panel.s };
}

/* ------------------------------------------------------------------ the light cycle */

/**
 * Where the light cycle can stop. `s` is the distance along a route (the trunk is shared by every route, so
 * on the trunk the route does not matter: `lane` is null there).
 */
export type BikeStop = { lane: Route | null; s: number };

/** Where the bike waits at the fork, facing the junction. */
export const FORK_WAIT_Z = 3.2;

export const BIKE = {
    /** Cruise speed (units per second) and the shortest a ride may take. */
    speed: 9,
    minRide: 1.1,
    /** Radius of the U-turn the bike makes when it has to go back the way it came. */
    uTurnRadius: 1.15,
    /** Chase camera: distance behind, height above, and how far ahead it looks. */
    chase: { back: 4.6, up: 1.95, ahead: 4.5, lookUp: 0.85 },
    /** How quickly the glow changes colour when the bike enters a lane (seconds). */
    colorChange: 0.35
};

export const startStop = (): BikeStop => ({ lane: null, s: trunkS(WORLD.trunkStart - 1.4) });
export const forkStop = (): BikeStop => ({ lane: null, s: trunkS(FORK_WAIT_Z) });
/** End of the straight lane, just past its portal. */
export const exitStop = (): BikeStop => ({ lane: 'straight', s: trunkS(WORLD.exitZ) });
/** The bike parks on the lane right beside its panel. */
export const panelStop = (panel: PanelPlacement): BikeStop => ({ lane: panel.lane, s: panel.s + WORLD.panelLead });

export const stopPoint = (stop: BikeStop, target = new THREE.Vector3()) =>
    routePoint(stop.lane ?? 'left', stop.s, 0, target);

/** Distance along a route where it leaves the junction (just past the turn, or the junction centre). */
const junctionS = (route: Route) => (route === 'straight' ? WORLD.trunkStart : trunkLength + cornerLength);

function walk(points: THREE.Vector3[], lane: Route, s0: number, s1: number, step = 1) {
    const n = Math.max(1, Math.round(Math.abs(s1 - s0) / step));
    for (let k = 1; k <= n; k++) points.push(routePoint(lane, s0 + ((s1 - s0) * k) / n));
}

/** Points of a U-turn starting at `position` heading along `heading`, turning to the right. */
function uTurn(position: THREE.Vector3, heading: THREE.Vector3, radius: number) {
    const right = new THREE.Vector3(-heading.z, 0, heading.x); // heading rotated -90 degrees around y
    const centre = position
        .clone()
        .addScaledVector(heading, radius * 0.6)
        .addScaledVector(right, radius);
    const points: THREE.Vector3[] = [position.clone().addScaledVector(heading, radius * 0.6)];
    for (let k = 1; k <= 6; k++) {
        const a = (Math.PI * k) / 6;
        // start on the left of the centre (where we are) and sweep round to the far side
        points.push(
            centre
                .clone()
                .addScaledVector(right, -Math.cos(a) * radius)
                .addScaledVector(heading, Math.sin(a) * radius)
        );
    }
    return points;
}

/**
 * The bike's ride from where it is to a stop, on the grid (y = 0): along the lines, straight across the
 * junction when switching lanes, with a U-turn first if the way there is behind it, and a loop at the end
 * when it comes back to the fork so it waits facing the junction again.
 */
export function bikeRide(from: BikeStop, fromPosition: THREE.Vector3, heading: THREE.Vector3, to: BikeStop) {
    const route: THREE.Vector3[] = [];
    const fromLane = from.lane;
    const toLane = to.lane;
    if (fromLane && toLane && fromLane !== toLane) {
        // lane to lane: back to the junction, straight across, out along the other lane
        walk(route, fromLane, from.s, junctionS(fromLane));
        route.push(new THREE.Vector3(0, 0, 0));
        walk(route, toLane, junctionS(toLane), to.s);
    } else {
        walk(route, toLane ?? fromLane ?? 'left', from.s, to.s);
    }

    const points: THREE.Vector3[] = [fromPosition.clone().setY(0)];
    const first = route.find((p) => p.distanceTo(fromPosition) > 0.5);
    if (first) {
        const way = first.clone().sub(fromPosition).setY(0).normalize();
        if (way.dot(heading) < -0.2) points.push(...uTurn(points[0], heading, BIKE.uTurnRadius));
    }
    points.push(...route.filter((p) => p.distanceTo(points[points.length - 1]) > 0.35));

    if (!toLane) {
        // Arriving at the fork from a lane means travelling away from the junction: loop round to face it.
        const end = points[points.length - 1];
        const before = points[points.length - 2] ?? end;
        if (end.z > before.z + 0.01 && to.s === forkStop().s) {
            const loopHeading = new THREE.Vector3(0, 0, 1);
            const loop = uTurn(end, loopHeading, BIKE.uTurnRadius);
            points.push(...loop, end.clone().add(new THREE.Vector3(BIKE.uTurnRadius * 0.9, 0, -0.6)));
        }
    }

    const cleaned = points.filter((p, i) => i === 0 || p.distanceTo(points[i - 1]) > 0.2);
    if (cleaned.length < 2) cleaned.push(cleaned[0].clone().add(new THREE.Vector3(0, 0, -0.01)));
    if (cleaned.length === 2) cleaned.splice(1, 0, cleaned[0].clone().lerp(cleaned[1], 0.5));
    return new THREE.CatmullRomCurve3(cleaned, false, 'centripetal');
}

/** Third-person camera behind the bike. */
export function chasePose(bike: THREE.Vector3, heading: THREE.Vector3, aspect: number) {
    const portrait = aspect < 1 ? 1.45 : 1;
    const { back, up, ahead, lookUp } = BIKE.chase;
    return {
        position: bike
            .clone()
            .addScaledVector(heading, -back * portrait)
            .setY(up * (aspect < 1 ? 1.25 : 1)),
        look: bike.clone().addScaledVector(heading, ahead).setY(lookUp)
    };
}

/** At the fork: behind the waiting bike, far enough back to see both signs. */
export function forkCameraPose(aspect: number) {
    const fit = forkPose(aspect);
    // Close behind the waiting bike (so it sits above the on-screen buttons), but far enough to see both signs.
    const z = Math.max(fit.position.z - 0.8, FORK_WAIT_Z + 3.6);
    return {
        position: new THREE.Vector3(0.45, WORLD.eye + (aspect < 1 ? 0.9 : 0.35), z),
        look: new THREE.Vector3(0, aspect < 1 ? 0.5 : 0.35, aspect < 1 ? 0 : 0.6)
    };
}
