/**
 * MatrixGrid: the 3D grid pages (Step 2 of the three.js plan).
 *
 * After a pill's dive, the Matrix rain dissolves into a Tron grid with a fork, and a light cycle rides
 * between panels. One component, two grids (see worlds.ts):
 *
 *   world: projects    content/pages/projectChoice.md (blue pill)
 *                      Game projects left, Software projects right, Experience straight ahead
 *                      (rides into the experience grid).
 *   world: experience  content/pages/experienceChoice.md (red pill)
 *                      Work experience left, Education right, Projects straight ahead
 *                      (rides into the projects grid).
 *
 * Content:
 *   - type: MatrixGrid
 *     world: projects        # or: experience
 *     elementId: project-choice
 * The items come from content/pages/projects (projects) or content/pages/workXP (experience); their
 * `filter` field picks the lane (game / software, work / education).
 *
 * Without WebGL, or if the 3D world fails to load, the same items are shown as a flat list instead (lanes side by
 * side, each entry linking to its full page). The list is always in the page, hidden, for screen readers.
 */

import dynamic from 'next/dynamic';
import Link from 'next/link';
import * as React from 'react';

import type { MatrixProject } from '@/types';
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

const formatDate = (date?: string | null) => (date ? date.replace('-', '.') : '');

function dates(item: MatrixProject) {
    if (!item.startdate) return '';
    return `${formatDate(item.startdate)} — ${item.enddate ? formatDate(item.enddate) : 'now'}`;
}

/**
 * Every item of a grid as a list: the flat page when there is no 3D (`flat`), otherwise hidden for screen readers.
 */
function ItemList({
    world,
    items,
    flat = false,
    elementId
}: {
    world: WorldConfig;
    items: MatrixProject[];
    flat?: boolean;
    elementId?: string;
}) {
    const lanes = splitLanes(world, items);
    const title = world.id === 'projects' ? 'Projects' : 'Experience';
    if (!flat) {
        return (
            <div className="sr-only">
                <h1>{title}</h1>
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
    return (
        <section id={elementId || undefined} className="grid-flat">
            <h1 className="grid-flat__title">{title}</h1>
            <div className="grid-flat__lanes">
                {(['left', 'right'] as const).map((side) => (
                    <section
                        key={side}
                        className="grid-flat__lane"
                        style={{ '--lane': world.lanes[side].color } as React.CSSProperties}
                    >
                        <h2 className="grid-flat__lane-title">{world.lanes[side].name}</h2>
                        <ul className="grid-flat__items">
                            {lanes[side].map((item) => {
                                const body = (
                                    <>
                                        <span className="grid-flat__item-title">{item.title}</span>
                                        {dates(item) && <span className="grid-flat__item-dates">{dates(item)}</span>}
                                        {item.description && (
                                            <span className="grid-flat__item-text">{item.description}</span>
                                        )}
                                    </>
                                );
                                return (
                                    <li key={item.id}>
                                        {item.url ? (
                                            <Link href={item.url} className="grid-flat__item">
                                                {body}
                                            </Link>
                                        ) : (
                                            <div className="grid-flat__item">{body}</div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </section>
                ))}
            </div>
            {world.straight && (
                <Link
                    href={world.straight.href}
                    className="grid-flat__straight"
                    style={{ '--lane': world.straight.color } as React.CSSProperties}
                >
                    {world.straight.name} ›
                </Link>
            )}
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

    // Going from one grid page to the other reuses this section. Both grids share one store, which a new grid
    // resets as it starts, so the old grid is taken down first and the new one is built right after.
    const [shown, setShown] = React.useState(world.id);
    React.useLayoutEffect(() => setShown(world.id), [world.id]);

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

    const flat = <ItemList world={world} items={items} flat elementId={elementId} />;
    if (webgl === false) return flat;

    return (
        <section ref={sectionRef} id={elementId || undefined} className="grid-world-section">
            <ItemList world={world} items={items} />
            <WorldErrorBoundary key={world.id} fallback={flat}>
                {/* keyed by grid, so riding from one grid into the other starts the new one fresh */}
                {webgl && shown === world.id && <GridWorld key={world.id} world={world} items={items} />}
            </WorldErrorBoundary>
        </section>
    );
}
