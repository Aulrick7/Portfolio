/**
 * ComputerScene: home page section (Step 1 of the three.js plan).
 *
 * Shows the 3D "Computer Terminal" model with the Matrix pill choice running on its CRT screen.
 * The 3D part is loaded on the client only. If WebGL is unavailable, or the model fails to load,
 * the original flat MatrixPillChoice section is shown instead, so the home page always works.
 *
 * Content (content/pages/index.md):
 *   - type: ComputerScene
 *     elementId: computer-scene
 *     pills:
 *       - content/pages/pillOptions/projects.md
 *       - content/pages/pillOptions/work-experience.md
 */

import dynamic from 'next/dynamic';
import * as React from 'react';

import MatrixPillChoice from '../MatrixPillChoice';

const ComputerCanvas = dynamic(() => import('./ComputerCanvas'), { ssr: false });

function hasWebGL() {
    try {
        const canvas = document.createElement('canvas');
        return !!(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
    } catch {
        return false;
    }
}

class SceneErrorBoundary extends React.Component<
    React.PropsWithChildren<{ fallback: React.ReactNode }>,
    { failed: boolean }
> {
    state = { failed: false };
    static getDerivedStateFromError() {
        return { failed: true };
    }
    componentDidCatch(error: unknown) {
        console.error('[ComputerScene] 3D scene failed, showing the flat version instead.', error);
    }
    render() {
        return this.state.failed ? this.props.fallback : this.props.children;
    }
}

export default function ComputerScene(props) {
    const { elementId, pills = [] } = props;
    const [webgl, setWebgl] = React.useState<boolean | null>(null);
    const sectionRef = React.useRef<HTMLElement>(null);

    React.useEffect(() => setWebgl(hasWebGL()), []);

    // Fill the rest of the first screen under the site header, whatever its height.
    React.useLayoutEffect(() => {
        const section = sectionRef.current;
        if (!section) return;
        const update = () => {
            const top = section.getBoundingClientRect().top + window.scrollY;
            section.style.setProperty('--computer-scene-top', `${Math.round(top)}px`);
        };
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, [webgl]);

    const flat = <MatrixPillChoice {...props} />;
    if (webgl === false) return flat;

    return (
        <section ref={sectionRef} id={elementId || undefined} className="computer-scene">
            <SceneErrorBoundary fallback={flat}>{webgl && <ComputerCanvas pills={pills} />}</SceneErrorBoundary>
        </section>
    );
}
