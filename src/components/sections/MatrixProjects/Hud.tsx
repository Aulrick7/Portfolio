/**
 * The on-screen controls over the grid: where you are, and buttons for everything the keyboard,
 * mouse wheel and swipes can do (so it all works with a mouse, a keyboard, a screen reader or a thumb).
 */

import Router from 'next/router';
import * as React from 'react';

import { LANES } from './layout';
import { useGridStore } from './store';

export function Hud() {
    const phase = useGridStore((s) => s.phase);
    const target = useGridStore((s) => s.target);
    const moving = useGridStore((s) => s.moving);
    const lanes = useGridStore((s) => s.lanes);
    const store = useGridStore.getState;

    const station = target.kind === 'station' ? target : null;
    const lane = station ? LANES[station.lane] : null;
    const project = station ? lanes[station.lane][station.index] : null;
    const count = station ? lanes[station.lane].length : 0;
    const disabled = phase !== 'ready' || moving;

    let where = 'Entering the Grid';
    if (phase === 'ready' && target.kind === 'fork') where = 'Choose your path';
    if (station && lane) where = `${lane.label} projects · ${station.index + 1} / ${count}`;

    return (
        <div className={`grid-hud ${phase === 'ready' ? 'is-ready' : ''}`}>
            <div className="grid-hud__where" aria-live="polite">
                <span className="grid-hud__kicker">THE GRID</span>
                <span className="grid-hud__place" style={lane ? { color: lane.color } : undefined}>
                    {where}
                </span>
                {project && !moving && <span className="grid-hud__project">{project.title}</span>}
            </div>

            <nav className="grid-hud__controls" aria-label="Move around the projects">
                {target.kind === 'fork' && (
                    <>
                        <button
                            type="button"
                            className="grid-hud__button is-game"
                            disabled={disabled}
                            onClick={() => store().chooseLane('game')}
                        >
                            ‹ Game projects
                        </button>
                        <button
                            type="button"
                            className="grid-hud__button is-software"
                            disabled={disabled}
                            onClick={() => store().chooseLane('software')}
                        >
                            Software projects ›
                        </button>
                    </>
                )}
                {station && !station.open && (
                    <>
                        <button
                            type="button"
                            className="grid-hud__button"
                            disabled={disabled}
                            onClick={() => store().prev()}
                            aria-label={station.index === 0 ? 'Back to the fork' : 'Previous project'}
                        >
                            ‹ {station.index === 0 ? 'Fork' : 'Prev'}
                        </button>
                        <button
                            type="button"
                            className="grid-hud__button is-primary"
                            disabled={disabled}
                            onClick={() => store().open()}
                            style={{ borderColor: lane?.color, color: lane?.color }}
                        >
                            Open
                        </button>
                        <button
                            type="button"
                            className="grid-hud__button"
                            disabled={disabled || station.index + 1 >= count}
                            onClick={() => store().next()}
                            aria-label="Next project"
                        >
                            Next ›
                        </button>
                        <button
                            type="button"
                            className="grid-hud__button is-quiet"
                            disabled={disabled}
                            onClick={() => store().goFork()}
                        >
                            ⟲ Fork
                        </button>
                    </>
                )}
                {station && station.open && (
                    <>
                        <button
                            type="button"
                            className="grid-hud__button"
                            disabled={disabled}
                            onClick={() => store().close()}
                        >
                            × Close
                        </button>
                        <button
                            type="button"
                            className="grid-hud__button is-primary"
                            disabled={disabled || !project?.url}
                            onClick={() => project?.url && Router.push(project.url)}
                            style={{ borderColor: lane?.color, color: lane?.color }}
                        >
                            Full page ›
                        </button>
                    </>
                )}
            </nav>

            <p className="grid-hud__hint" aria-hidden="true">
                {target.kind === 'fork'
                    ? '← → or click a sign'
                    : station?.open
                      ? 'Esc to close'
                      : 'Scroll, swipe or ← → · Enter to open · Esc for the fork'}
            </p>

            <p className="grid-hud__credit">
                3D model:{' '}
                <a
                    href="https://sketchfab.com/3d-models/tron-uprising-argoncity-light-cycle-a4c0e652c9a443868c3551e12f4bffee"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    “TRON: Uprising - ArgonCity Light Cycle”
                </a>{' '}
                by{' '}
                <a href="https://sketchfab.com/simysimes" target="_blank" rel="noopener noreferrer">
                    TheTinDog
                </a>
                ,{' '}
                <a href="http://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">
                    CC BY 4.0
                </a>
            </p>
        </div>
    );
}
