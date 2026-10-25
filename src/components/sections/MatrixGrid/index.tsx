/**
 * MatrixGrid: the 3D grid pages (Step 2 of the three.js plan).
 *
 * After a pill's dive, the Matrix rain dissolves into a Tron grid with a fork, and a light cycle rides
 * between panels. One component, two grids (see worlds.ts):
 *
 *   world: projects    content/pages/projectChoice.md (blue pill)
 *                      Game projects left, Software projects right, Experience straight ahead.
 *   world: experience  content/pages/experienceChoice.md (red pill)
 *                      Work experience left, Education right, Projects straight ahead.
 *
 * Content:
 *   - type: MatrixGrid
 *     world: projects        # or: experience
 *     elementId: project-choice
 * The items come from content/pages/projects (projects) or content/pages/workXP (experience); their
 * `filter` field picks the lane (game / software, work / education).
 *
 * Without WebGL, or if the 3D world fails to load, a flat page is shown instead. A plain list of the items
 * is always in the page for screen readers.
 */

import dynamic from 'next/dynamic';
import Link from 'next/link';
import * as React from 'react';

import type { MatrixProject } from '@/types';
import ProjectChoiceSection from '../ProjectChoiceSection';
import { WorldConfig, WorldId, WORLDS } from './worlds';

const GridWorld = dynamic(() => import('./GridWorld'), { ssr: false });

function hasWebGL() {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
    } catch {
        return false;
    }
}

class WorldErrorBoundary extends React.Component<
    React.PropsWithChildren<{ fallback: React.ReactNode }>,
    { failed: boolean }
> {
    state = { failed: false };
    static getDerivedStateFromError() {
        return { failed: true };
    }
    componentDidCatch(error: unknown) {
        console.error('[MatrixGrid] 3D world failed, showing the flat page instead.', error);
    }
    render() {
        return this.state.failed ? this.props.fallback : this.props.children;
    }
}

function splitLanes(world: WorldConfig, items: MatrixProject[]) {
    const left = items.filter((item) => world.lanes.left.match(item));
    const right = items.filter((item) => !world.lanes.left.match(item) && world.lanes.right.match(item));
    return { left, right };
}

function ItemList({ world, items }: { world: WorldConfig; items: MatrixProject[] }) {
    const lanes = splitLanes(world, items);
    return (
        <div className="sr-only">
            <h1>{world.id === 'projects' ? 'Projects' : 'Work experience and education'}</h1>
            {(['left', 'right'] as const).map((side) => (
                <section key={side}>
                    <h2>{world.lanes[side].name}</h2>
                    <ul>
                        {lanes[side].map((item) => (
                            <li key={item.id}>
                                {item.url ? <a href={item.url}>{item.title}</a> : item.title}
                                {item.description ? ` — ${item.description}` : ''}
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
            {world.straight && <a href={world.straight.href}>{world.straight.name}</a>}
        </div>
    );
}

/** Flat version of the Work / Education choice, for browsers without WebGL. */
function FlatExperienceChoice({ world, elementId }: { world: WorldConfig; elementId?: string }) {
    return (
        <section id={elementId || undefined} className="grid-flat-choice">
            <h1 className="grid-flat-choice__title">Choose your path</h1>
            <div className="grid-flat-choice__options">
                {(['left', 'right'] as const).map((side) => (
                    <Link
                        key={side}
                        href={`/workXP?filter=${world.lanes[side].key}`}
                        className="grid-flat-choice__option"
                        style={{ borderColor: world.lanes[side].color, color: world.lanes[side].color }}
                    >
                        {world.lanes[side].name}
                    </Link>
                ))}
                {world.straight && (
                    <Link
                        href={world.straight.href}
                        className="grid-flat-choice__option"
                        style={{ borderColor: world.straight.color, color: world.straight.color }}
                    >
                        {world.straight.name}
                    </Link>
                )}
            </div>
        </section>
    );
}

export default function MatrixGrid(props) {
    const {
        elementId,
        world: worldId = 'projects',
        items = []
    } = props as { elementId?: string; world?: WorldId; items?: MatrixProject[] };
    const world = WORLDS[worldId] ?? WORLDS.projects;
    const [webgl, setWebgl] = React.useState<boolean | null>(null);
    const sectionRef = React.useRef<HTMLElement>(null);

    React.useEffect(() => setWebgl(hasWebGL()), []);

    // Fill the rest of the first screen under the site header.
    React.useLayoutEffect(() => {
        const section = sectionRef.current;
        if (!section) return;
        const update = () => {
            const top = section.getBoundingClientRect().top + window.scrollY;
            section.style.setProperty('--grid-world-top', `${Math.round(top)}px`);
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, [webgl]);

    const flat =
        world.id === 'projects' ? (
            <ProjectChoiceSection elementId={elementId} colors="colors-f" />
        ) : (
            <FlatExperienceChoice world={world} elementId={elementId} />
        );
    if (webgl === false) return flat;

    return (
        <section ref={sectionRef} id={elementId || undefined} className="grid-world-section">
            <ItemList world={world} items={items} />
            <WorldErrorBoundary fallback={flat}>
                {webgl && <GridWorld world={world} items={items} />}
            </WorldErrorBoundary>
        </section>
    );
}
