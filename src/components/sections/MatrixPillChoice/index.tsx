/**
 * Matrix Pill Choice Component - ENHANCED VERSION
 *
 * NEW FEATURES:
 * - Resets selection when navigating back to home
 * - Properly cleans up state on route changes
 * - Better UX with state management
 */

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import TronTransition from '../TronTransition';

export default function MatrixPillChoice(props) {
    const router = useRouter();
    const [showChoice, setShowChoice] = useState(false);
    const { elementId, pills = [] } = props;

    useEffect(() => {
        // Intro sequence timing
        const timer = setTimeout(() => setShowChoice(true), 1000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="matrix-container">
            {/* Matrix rain background effect */}
            <div className="matrix-rain">
                {[...Array(100)].map((_, i) => (
                    <div
                        key={i}
                        className="rain-column"
                        style={{
                            left: `${i}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${10 + Math.random() * 10}s`
                        }}
                    >
                        {String.fromCharCode(0x30a0 + Math.random() * 96)}
                    </div>
                ))}
            </div>

            {/* Scan line effect */}
            <div className="scanline"></div>

            {/* Main content */}
            <div className={`content-wrapper ${showChoice ? 'visible' : ''}`}>
                <div className="terminal-box">
                    <div className="terminal-header">
                        <span className="terminal-dot red"></span>
                        <span className="terminal-dot yellow"></span>
                        <span className="terminal-dot green"></span>
                    </div>
                    <PillsRender pills={pills} />
                </div>

                {/* Bottom navigation hint */}
                <div className="bottom-hint">
                    <p>Press ESC to explore the rest of the site</p>
                </div>
            </div>
        </div>
    );
}

function PillsRender({ pills }) {
    const router = useRouter();
    const [glitchText, setGlitchText] = useState(false);
    const [selectedPill, setSelectedPill] = useState<'red' | 'blue' | null>(null);
    const [showTronTransition, setShowTronTransition] = useState(false);
    const [tronDirection, setTronDirection] = useState<'left' | 'right' | 'down' | null>(null);
    const [tronColour, setTronColour] = useState<'green' | 'cyan' | 'pink' | 'red'>('green');

    // SOLUTION: Reset selection when user navigates back to home page
    useEffect(() => {
        const handleRouteChange = (url: string) => {
            // If navigating back to home, reset the selection
            setSelectedPill(null);
            setGlitchText(false);
            setShowTronTransition(false);
        };

        // Listen for route changes
        router.events.on('routeChangeComplete', handleRouteChange);

        // Cleanup listener on unmount
        return () => {
            router.events.off('routeChangeComplete', handleRouteChange);
        };
    }, [router]);

    // Handle if pills is empty or undefined
    if (!pills || pills.length === 0) {
        return (
            <div className="terminal-content">
                <div className="quote-section">
                    <p className="quote-text">No pills configured. Please check your content files.</p>
                </div>
            </div>
        );
    }

    const handlePillClick = (pillColor: 'red' | 'blue', url: string, pillIndex: number) => {
        setSelectedPill(pillColor);
        setGlitchText(true);

        // Determine Tron transition settings based on pill
        // Blue pill (index 0) = Projects = cyan/green
        // Red pill (index 1) = Work Experience = red
        if (pillIndex === 1) {
            // Work Experience pill
            setTronDirection('down');
            setTronColour('red');
        }

        // Start Tron transition after a brief delay
        setTimeout(() => {
            if (pillIndex === 1) {
                setShowTronTransition(true);
            } else {
                router.push(url);
            }
        }, 1000);

        // Navigate after Tron transition completes (~2000ms)
        setTimeout(() => {
            router.push(url);
        }, 3000);
    };

    const getPillColor = (index: number): 'blue' | 'red' => {
        return index % 2 === 0 ? 'blue' : 'red';
    };

    const getPillClass = (index: number): string => {
        return index % 2 === 0 ? 'blue-pill' : 'red-pill';
    };

    const getPillTextClass = (index: number): string => {
        return index % 2 === 0 ? 'blue-text' : 'red-text';
    };

    const getPillLabel = (index: number): string => {
        return index % 2 === 0 ? 'BLUE PILL' : 'RED PILL';
    };

    return (
        <div className="terminal-content">
            {/* Quote section */}
            <div className={`quote-section ${glitchText ? 'glitch' : ''}`}>
                <p className="quote-text">"This is your last chance. After this, there is no turning back."</p>
                <p className="quote-author">— Morpheus</p>
            </div>

            {/* Pills section */}
            <div className="pills-container">
                {pills.map((pill, index) => {
                    const pillColor = getPillColor(index);
                    const isSelected = selectedPill === pillColor;
                    const isFaded = selectedPill && selectedPill !== pillColor;

                    return (
                        <div
                            key={index}
                            className={`pill-wrapper ${isSelected ? 'selected' : ''} ${isFaded ? 'faded' : ''}`}
                            onClick={() => !selectedPill && handlePillClick(pillColor, pill.url, index)}
                        >
                            <div className={`pill ${getPillClass(index)}`}>
                                <div className="pill-shine"></div>
                            </div>
                            <div className="pill-label">
                                <span className={`pill-color-text ${getPillTextClass(index)}`}>
                                    {getPillLabel(index)}
                                </span>
                                <span className="pill-description">{pill.description || pill.title}</span>
                                <span className="pill-destination">→ {pill.title}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Loading state */}
            {selectedPill && (
                <div className="loading-matrix">
                    <div className="loading-text">LOADING</div>
                    <div className="loading-dots">
                        <span>.</span>
                        <span>.</span>
                        <span>.</span>
                    </div>
                </div>
            )}

            {/* Tron Transition - Rendered outside body using Portal */}
            {typeof window !== 'undefined' &&
                showTronTransition &&
                createPortal(
                    <TronTransition
                        isActive={showTronTransition}
                        direction={tronDirection}
                        colour={tronColour}
                        onComplete={() => setShowTronTransition(false)}
                    />,
                    document.body
                )}
        </div>
    );
}
