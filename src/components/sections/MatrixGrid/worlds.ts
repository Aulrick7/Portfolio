/**
 * The two grids and what their lanes hold. Change labels, colours or which items go where here.
 *
 * - projects   (/projectChoice, blue pill): Game projects left, Software projects right,
 *              and a straight lane that rides off to the Experience page.
 * - experience (/experienceChoice, red pill): Work experience left, Education right,
 *              and a straight lane that rides off to the Projects page.
 *
 * Lane colours are also the light cycle's colour while it rides that lane. On the trunk (before choosing)
 * the cycle glows `neutral`.
 */

import type { MatrixProject } from '@/types';
import type { Lane } from './layout';

export type WorldId = 'projects' | 'experience';

export type LaneConfig = {
    /** Used in the address bar (?lane=...). */
    key: string;
    /** On the fork sign (big) and under it (small). */
    label: string;
    sublabel: string;
    /** Small label on each panel ("GAME PROJECT · 01"). */
    itemLabel: string;
    /** For screen readers and the buttons ("Game projects"). */
    name: string;
    color: string;
    /** Which items ride in this lane. */
    match: (item: MatrixProject) => boolean;
};

export type WorldConfig = {
    id: WorldId;
    neutral: string;
    lanes: Record<Lane, LaneConfig>;
    /** Optional lane straight ahead that leads to another page. */
    straight?: { key: string; label: string; sublabel: string; name: string; color: string; href: string };
};

export const COLORS = {
    neutral: '#dff7ff',
    game: '#3b9eff', // blue
    software: '#39ff7a', // green
    crossover: '#ffffff', // white: the straight lanes that lead to the other side of the site
    work: '#ff3b3b', // red
    education: '#ffd23f' // yellow
};

export const WORLDS: Record<WorldId, WorldConfig> = {
    projects: {
        id: 'projects',
        neutral: COLORS.neutral,
        lanes: {
            left: {
                key: 'game',
                label: 'GAME',
                sublabel: 'PROJECTS',
                itemLabel: 'GAME PROJECT',
                name: 'Game projects',
                color: COLORS.game,
                match: (item) => item.filter === 'game'
            },
            right: {
                key: 'software',
                label: 'SOFTWARE',
                sublabel: 'PROJECTS',
                itemLabel: 'SOFTWARE PROJECT',
                name: 'Software projects',
                color: COLORS.software,
                match: (item) => item.filter !== 'game'
            }
        },
        straight: {
            key: 'experience',
            label: 'EXPERIENCE',
            sublabel: 'STRAIGHT AHEAD',
            name: 'Experience',
            color: COLORS.crossover,
            href: '/workXP'
        }
    },
    experience: {
        id: 'experience',
        neutral: COLORS.neutral,
        lanes: {
            left: {
                key: 'work',
                label: 'WORK',
                sublabel: 'EXPERIENCE',
                itemLabel: 'WORK EXPERIENCE',
                name: 'Work experience',
                color: COLORS.work,
                match: (item) => item.filter !== 'education'
            },
            right: {
                key: 'education',
                label: 'EDUCATION',
                sublabel: 'STUDIES',
                itemLabel: 'EDUCATION',
                name: 'Education',
                color: COLORS.education,
                match: (item) => item.filter === 'education'
            }
        },
        straight: {
            key: 'projects',
            label: 'PROJECTS',
            sublabel: 'STRAIGHT AHEAD',
            name: 'Projects',
            color: COLORS.crossover,
            href: '/projects'
        }
    }
};

/** Which side holds a lane key from the address bar (?lane=game). */
export function sideForKey(world: WorldConfig, key: string | null): Lane | null {
    if (!key) return null;
    if (world.lanes.left.key === key) return 'left';
    if (world.lanes.right.key === key) return 'right';
    return null;
}
