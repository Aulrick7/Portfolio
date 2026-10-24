/**
 * MatrixProjects: the projects page in 3D (Step 2 of the three.js plan).
 *
 * After the blue pill's dive, the Matrix rain dissolves into a Tron grid. At the fork, game projects go left
 * and software projects go right; a light cycle rides between the project panels.
 *
 * Content (content/pages/projectChoice.md):
 *   - type: MatrixProjects
 *     elementId: project-choice
 * The projects themselves come from content/pages/projects (their `filter: game | software` picks the lane).
 *
 * Without WebGL, or if the 3D world fails to load, the old flat ProjectChoiceSection is shown instead.
 * A plain list of the projects is always in the page for screen readers.
 */

import dynamic from 'next/dynamic';
import * as React from 'react';

import type { MatrixProject } from '@/types';
import ProjectChoiceSection from '../ProjectChoiceSection';

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
        console.error('[MatrixProjects] 3D world failed, showing the flat page instead.', error);
    }
    render() {
        return this.state.failed ? this.props.fallback : this.props.children;
    }
}

function ProjectList({ projects }: { projects: MatrixProject[] }) {
    return (
        <div className="sr-only">
            <h1>Projects</h1>
            {(['game', 'software'] as const).map((lane) => (
                <section key={lane}>
                    <h2>{lane === 'game' ? 'Game projects' : 'Software projects'}</h2>
                    <ul>
                        {projects
                            .filter((p) => (lane === 'game' ? p.filter === 'game' : p.filter !== 'game'))
                            .map((p) => (
                                <li key={p.id}>
                                    {p.url ? <a href={p.url}>{p.title}</a> : p.title}
                                    {p.description ? ` — ${p.description}` : ''}
                                </li>
                            ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}

export default function MatrixProjects(props) {
    const { elementId, items = [] } = props as { elementId?: string; items?: MatrixProject[] };
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

    const flat = <ProjectChoiceSection elementId={elementId} colors="colors-f" />;
    if (webgl === false) return flat;

    return (
        <section ref={sectionRef} id={elementId || undefined} className="grid-world-section">
            <ProjectList projects={items} />
            <WorldErrorBoundary fallback={flat}>{webgl && <GridWorld projects={items} />}</WorldErrorBoundary>
        </section>
    );
}
