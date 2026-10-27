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
    /** Radius of the turn from the trunk into each lane (a true circular arc). */
    cornerRadius: 2.6,
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
    // A quarter circle (as a cubic Bezier) from heading down the trunk to heading out along the lane.
    const k = 0.5523 * r;
    path.add(
        new THREE.CubicBezierCurve3(
            trunkEnd.clone(),
            new THREE.Vector3(0, 0, r - k),
            new THREE.Vector3(dir * (r - k), 0, 0),
            new THREE.Vector3(dir * r, 0, 0)
        )
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
    /** Speed limits on the grid (units per second, and per second squared): see motion.ts. */
    ride: { cruise: 11, grip: 18, accel: 13, brake: 15 },
    /** Riding back to the fork over a bridge: a little faster on the grid, and a boost on the bridge itself. */
    bridgeRide: {
        ground: { cruise: 22, grip: 40, accel: 24, brake: 28 },
        deck: { cruise: 46, grip: 170, accel: 42, brake: 44 }
    },
    /** Radius of the U-turn the bike carves when it has to go back the way it came (e.g. Previous project). */
    uTurnRadius: 1.7,
    /** Leaning into turns: lean = atan(speed * turn rate / leanGravity), at most maxLean (radians). */
    leanGravity: 20,
    maxLean: 0.55,
    /** Chase camera: distance behind, height above, and how far ahead it looks. */
    chase: { back: 4.6, up: 1.95, ahead: 4.5, lookUp: 0.85 },
    /** How quickly the glow changes colour when the bike enters a lane (seconds). */
    colorChange: 0.35
};

/**
 * The bridge the bike takes back to the fork from a lane. It is always there (one per lane). Past the lane's last
 * panel the bike rides up a ramp that curves round until it runs back beside the lane (on the start side, outside
 * the panels); near the fork it swings round and comes down behind the start point, facing the fork.
 *
 *   top view (left lane)
 *
 *      lane end   [P]        [P]        [P]       fork
 *    .--<--- bike rides out on the lane ---<------+
 *   (  ramp                                        |
 *    '======== bridge, raised beside the lane =====\
 *                                                  ||  start
 *                                                   '=> lands here, rides up to the fork
 */
export const BRIDGE = {
    /** Height of the deck above the grid. */
    height: 4.2,
    /** Deck width. */
    width: 2.4,
    /** The ramp starts this far past the bike's stop at the lane's last panel. */
    leadIn: 3,
    /** How far beside the lane the bridge runs (on the start side, outside the panels). */
    offset: 7,
    /** Straight run up the ramp before it curves round. */
    rampRun: 4,
    /** The deck keeps climbing this far along the run beside the lane before it is at full height. */
    climbAfterTurn: 6,
    /** Coming down: the turn towards the start side, then the U-turn onto the trunk. */
    descentTurn: 3,
    descentUTurn: 2.5,
    /** Where it lands on the trunk (just behind the start point). */
    landZ: WORLD.trunkStart + 1
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

/**
 * A U-turn carved like a motorbike: swing out a little, a wide half circle the other way, then ease back onto the
 * line heading the opposite way. `side` is where the half circle goes: 1 to the right of `heading`, -1 to the left.
 */
function carvedUTurn(position: THREE.Vector3, heading: THREE.Vector3, side: 1 | -1, radius = BIKE.uTurnRadius) {
    const h = heading.clone().setY(0).normalize();
    const right = new THREE.Vector3(-h.z, 0, h.x).multiplyScalar(side);
    const at = (along: number, across: number) =>
        position.clone().setY(0).addScaledVector(h, along).addScaledVector(right, across);
    const swing = radius * 0.3;
    const entry = radius * 1.4;
    const exit = radius * 3;
    const points: THREE.Vector3[] = [];
    for (let k = 1; k <= 4; k++) points.push(at((entry * k) / 4, (-swing * (1 - Math.cos((Math.PI * k) / 4))) / 2));
    const centre = radius - swing;
    for (let k = 1; k <= 10; k++) {
        const a = (Math.PI * k) / 10;
        points.push(at(entry + Math.sin(a) * radius, centre - Math.cos(a) * radius));
    }
    const across = 2 * radius - swing;
    for (let k = 1; k <= 8; k++)
        points.push(at(entry - (exit * k) / 8, (across * (1 + Math.cos((Math.PI * k) / 8))) / 2));
    return points;
}

/** A "turtle" that draws arcs and straight lines on the grid, in a lane's own frame (a: out along the lane, b: across). */
function turtle(a: number, b: number, heading: number) {
    const points: { a: number; b: number }[] = [{ a, b }];
    const step = 0.4;
    return {
        points,
        /** Turn by `angle` (positive: towards +b when heading out along the lane) on a circle of `radius`. */
        arc(radius: number, angle: number) {
            const sign = Math.sign(angle);
            const ca = a + sign * radius * -Math.sin(heading);
            const cb = b + sign * radius * Math.cos(heading);
            const n = Math.max(2, Math.ceil((Math.abs(angle) * radius) / step));
            for (let k = 1; k <= n; k++) {
                const t = heading + (angle * k) / n;
                points.push({ a: ca - sign * radius * -Math.sin(t), b: cb - sign * radius * Math.cos(t) });
            }
            heading += angle;
            ({ a, b } = points[points.length - 1]);
        },
        line(distance: number) {
            const n = Math.max(1, Math.ceil(distance / step));
            const [da, db] = [Math.cos(heading), Math.sin(heading)];
            for (let k = 1; k <= n; k++)
                points.push({ a: a + (da * distance * k) / n, b: b + (db * distance * k) / n });
            a += da * distance;
            b += db * distance;
        }
    };
}

/**
 * Points along the bridge for a lane (on its deck, so y is the height), from the foot of its ramp (`entryS` along
 * the lane, on the grid) to where it lands behind the start point.
 */
export function bridgePoints(lane: Lane, entryS: number): THREE.Vector3[] {
    const { dir } = SIDES[lane];
    const aIn = Math.abs(routePoint(lane, entryS).x);
    const { height, offset, rampRun, climbAfterTurn, descentTurn: d1, descentUTurn: d2, landZ } = BRIDGE;
    const aDown = d1 + 2 * d2; // where it turns for the start point, so the U-turn ends on the trunk (a = 0)

    const path = turtle(aIn, 0, 0);
    // Up the ramp and round (a half circle) until it runs back beside the lane, on the start side.
    path.line(rampRun);
    path.arc(offset / 2, Math.PI);
    // Back beside the lane, towards the fork.
    path.line(Math.max(0, aIn + rampRun - aDown));
    const runEnd = path.points.length;
    // Turn towards the start side, U-turn onto the trunk behind the start point.
    path.arc(d1, -Math.PI / 2);
    path.line(Math.max(0, landZ - offset - d1));
    path.arc(d2, Math.PI);

    // Heights: climb up the ramp and round, stay up beside the lane, come down on the way to the start point.
    const pts = path.points;
    const lengths = [0];
    for (let i = 1; i < pts.length; i++)
        lengths.push(lengths[i - 1] + Math.hypot(pts[i].a - pts[i - 1].a, pts[i].b - pts[i - 1].b));
    const climbLength = rampRun + (Math.PI * offset) / 2 + climbAfterTurn;
    const descentStart = lengths[runEnd - 1];
    const descentLength = lengths[lengths.length - 1] - descentStart;
    return pts.map((p, i) => {
        const t = lengths[i];
        let y = height;
        if (t < climbLength) y = height * THREE.MathUtils.smootherstep(t / climbLength, 0, 1);
        if (i >= runEnd) y = height * (1 - THREE.MathUtils.smootherstep((t - descentStart) / descentLength, 0, 1));
        return new THREE.Vector3(dir * p.a, y, p.b);
    });
}

/** Distance along a lane to the foot of its bridge, given the bike's stop at the lane's last panel. */
export const bridgeEntryS = (lastStopS: number) => lastStopS + BRIDGE.leadIn;

/**
 * The bike's ride from where it is to a stop, as a curve (y is the height: 0 on the grid, above it on a bridge):
 * along the lines, straight across the junction when switching lanes, with a carved U-turn first if the way there is
 * behind it. Going back to the fork from a lane, pass that lane's `bridge` (bridgePoints): the bike rides on to the
 * end of the lane, over the bridge, and up the trunk to the fork, so it never has to turn round at the fork.
 */
export function bikeRide(
    from: BikeStop,
    fromPosition: THREE.Vector3,
    heading: THREE.Vector3,
    to: BikeStop,
    options: { bridge?: { points: THREE.Vector3[]; entryS: number }; turnSide?: 1 | -1 } = {}
) {
    const route: THREE.Vector3[] = [];
    const fromLane = from.lane;
    const toLane = to.lane;
    const { bridge } = options;
    if (bridge && (fromLane === 'left' || fromLane === 'right') && !toLane) {
        // out along the lane, over the bridge, then up the trunk to the stop
        walk(route, fromLane, from.s, bridge.entryS);
        route.push(...bridge.points.slice(1));
        const landZ = bridge.points[bridge.points.length - 1].z;
        const stopZ = WORLD.trunkStart - to.s;
        const n = Math.max(1, Math.round(landZ - stopZ));
        for (let k = 1; k <= n; k++) route.push(new THREE.Vector3(0, 0, landZ + ((stopZ - landZ) * k) / n));
    } else if (fromLane && toLane && fromLane !== toLane) {
        // lane to lane: back to the junction, straight across, out along the other lane
        walk(route, fromLane, from.s, junctionS(fromLane));
        route.push(new THREE.Vector3(0, 0, 0));
        walk(route, toLane, junctionS(toLane), to.s);
    } else {
        walk(route, toLane ?? fromLane ?? 'left', from.s, to.s);
    }

    const start = fromPosition.clone().setY(0);
    const points: THREE.Vector3[] = [start];
    let ahead = route;
    const first = route.find((p) => p.distanceTo(start) > 0.5);
    if (first) {
        const way = first.clone().sub(start).setY(0).normalize();
        if (way.dot(heading) < -0.2) {
            // The way there is behind: carve a U-turn, then pick the route up where the U-turn ends.
            points.push(...carvedUTurn(start, heading, options.turnSide ?? 1));
            const end = points[points.length - 1];
            const back = heading.clone().setY(0).normalize().negate();
            const index = route.findIndex((p) => p.clone().sub(end).dot(back) > 0.5);
            ahead = index < 0 ? route.slice(-1) : route.slice(index);
        }
    }
    const last = points[points.length - 1];
    points.push(...ahead.filter((p) => p.distanceTo(last) > 0.35));

    const cleaned = points.filter((p, i) => i === 0 || p.distanceTo(points[i - 1]) > 0.2);
    if (cleaned.length < 2) cleaned.push(cleaned[0].clone().add(new THREE.Vector3(0, 0, -0.01)));
    if (cleaned.length === 2) cleaned.splice(1, 0, cleaned[0].clone().lerp(cleaned[1], 0.5));
    return new THREE.CatmullRomCurve3(cleaned, false, 'centripetal');
}

/** Third-person camera behind the bike (and above it, wherever it is: on the grid or on a bridge). */
export function chasePose(bike: THREE.Vector3, heading: THREE.Vector3, aspect: number) {
    const portrait = aspect < 1 ? 1.45 : 1;
    const { back, up, ahead, lookUp } = BIKE.chase;
    return {
        position: bike
            .clone()
            .addScaledVector(heading, -back * portrait)
            .setY(bike.y + up * (aspect < 1 ? 1.25 : 1)),
        look: bike
            .clone()
            .addScaledVector(heading, ahead)
            .setY(bike.y + lookUp)
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
