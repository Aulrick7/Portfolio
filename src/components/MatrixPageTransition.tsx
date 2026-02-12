/**
 * Matrix Page Transition Component
 *
 * Adds Matrix-style digital wipe transitions between pages
 *
 * INSPIRED BY: The Matrix (1999) digital transitions
 * CREDITS: Wachowski Brothers
 *
 * EFFECTS INCLUDED:
 * - Digital code wipe effect
 * - Green matrix rain overlay during transition
 * - Page fade-in animation
 * - Smooth entry/exit animations
 * - Red Tron transition for WorkXP navigation
 */

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import TronTransition from '../components/sections/TronTransition';

export default function MatrixPageTransition({ children }) {
    const router = useRouter();
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [showPage, setShowPage] = useState(true);
    const [showTronTransition, setShowTronTransition] = useState(false);
    const [targetUrl, setTargetUrl] = useState<string | null>(null);

    useEffect(() => {
        const handleRouteChangeStart = (url: string) => {
            // Check if we're going to WorkXP
            const isGoingToWorkXP = url?.toLowerCase().includes('workxp');
            const currentlyOnWorkXP = router.asPath?.toLowerCase().includes('workxp');

            // Check if we're on home page (where MatrixPillChoice is)
            const isOnHomePage = router.asPath === '/';

            // Only show transition if:
            // 1. Going to WorkXP from home page (MatrixPillChoice) - show Matrix wipe
            // 2. Leaving/going to home page (but not to WorkXP) - show Matrix wipe
            const isLeavingHome = router.asPath === '/';
            const isGoingToHome = url === '/';

            if (isGoingToWorkXP && !currentlyOnWorkXP) {
                // Going to WorkXP - only show Matrix if coming from home page
                if (isOnHomePage) {
                    setTargetUrl(url);
                    setIsTransitioning(true);
                    setShowPage(false);
                } else {
                    // Coming from non-home page - skip Matrix, go straight to Tron
                    setTargetUrl(url);
                    setShowPage(false);
                    setShowTronTransition(true);
                }
            } else if (isLeavingHome && url !== router.asPath && !isGoingToWorkXP) {
                // Normal home navigation (not to WorkXP)
                setTargetUrl(url);
                setIsTransitioning(true);
                setShowPage(false);
            }
        };

        const handleRouteChangeComplete = () => {
            // Check if we're going to WorkXP
            const isGoingToWorkXP = targetUrl?.toLowerCase().includes('workxp');

            if (isGoingToWorkXP && isTransitioning) {
                // Coming from home page - Matrix wipe already played, now show Tron
                setTimeout(() => {
                    setIsTransitioning(false);
                    setShowTronTransition(true);
                }, 500);

                // After Tron transition completes (~2000ms more), show page
                setTimeout(() => {
                    setShowTronTransition(false);
                    setShowPage(true);
                    setTargetUrl(null);
                }, 2500);
            } else if (isGoingToWorkXP && !isTransitioning) {
                // Coming from non-home page - Tron is already showing, just wait for it to finish
                setTimeout(() => {
                    setShowTronTransition(false);
                    setShowPage(true);
                    setTargetUrl(null);
                }, 2000);
            } else {
                // For other routes, just do the normal matrix transition
                setTimeout(() => {
                    setIsTransitioning(false);
                    setShowPage(true);
                    setTargetUrl(null);
                }, 1000);
            }
        };

        // Subscribe to route change events
        router.events.on('routeChangeStart', handleRouteChangeStart);
        router.events.on('routeChangeComplete', handleRouteChangeComplete);
        router.events.on('routeChangeError', handleRouteChangeComplete);

        return () => {
            router.events.off('routeChangeStart', handleRouteChangeStart);
            router.events.off('routeChangeComplete', handleRouteChangeComplete);
            router.events.off('routeChangeError', handleRouteChangeComplete);
        };
    }, [router, targetUrl, isTransitioning]);

    return (
        <>
            {/* Digital Wipe Overlay */}
            {isTransitioning && (
                <div className="matrix-transition-overlay">
                    {/* Vertical wipe bars */}
                    <div className="wipe-container">
                        {[...Array(20)].map((_, i) => (
                            <div
                                key={i}
                                className="wipe-bar"
                                style={{
                                    animationDelay: `${i * 0.05}s`
                                }}
                            />
                        ))}
                    </div>

                    {/* Matrix rain during transition */}
                    <div className="transition-rain">
                        {[...Array(30)].map((_, i) => (
                            <div
                                key={i}
                                className="rain-code"
                                style={{
                                    left: `${(i * 100) / 30}%`,
                                    animationDuration: `${0.5 + Math.random() * 0.5}s`,
                                    animationDelay: `${Math.random() * 0.3}s`
                                }}
                            >
                                {String.fromCharCode(0x30a0 + Math.floor(Math.random() * 96))}
                            </div>
                        ))}
                    </div>

                    {/* Loading text */}
                    <div className="transition-text">
                        <span className="loading-word">ACCESSING</span>
                        <span className="loading-dots">
                            <span>.</span>
                            <span>.</span>
                            <span>.</span>
                        </span>
                    </div>
                </div>
            )}

            {/* Tron Transition for WorkXP */}
            {showTronTransition && (
                <TronTransition
                    isActive={showTronTransition}
                    direction="down"
                    colour="red"
                    onComplete={() => setShowTronTransition(false)}
                />
            )}

            {/* Page Content with fade-in */}
            <div className={`page-content ${showPage ? 'visible' : ''}`}>{children}</div>

            <style jsx global>{`
                /* Transition Overlay */
                .matrix-transition-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    z-index: 9999;
                    pointer-events: none;
                    background: #000;
                }

                /* Vertical Wipe Bars */
                .wipe-container {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                }

                .wipe-bar {
                    flex: 1;
                    height: 100%;
                    background: linear-gradient(to bottom, transparent 0%, #00ff41 50%, transparent 100%);
                    animation: wipeDown 0.8s ease-in-out forwards;
                    opacity: 0;
                }

                @keyframes wipeDown {
                    0% {
                        transform: translateY(-100%);
                        opacity: 0.8;
                    }
                    50% {
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100%);
                        opacity: 0;
                    }
                }

                /* Matrix Rain Effect During Transition */
                .transition-rain {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                }

                .rain-code {
                    position: absolute;
                    top: -10%;
                    font-size: 24px;
                    color: #00ff41;
                    font-family: 'Courier New', monospace;
                    animation: fallDown linear forwards;
                    text-shadow: 0 0 10px #00ff41;
                }

                @keyframes fallDown {
                    0% {
                        transform: translateY(0);
                        opacity: 0;
                    }
                    10% {
                        opacity: 1;
                    }
                    90% {
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(110vh);
                        opacity: 0;
                    }
                }

                /* Loading Text */
                .transition-text {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-family: 'Courier New', monospace;
                    color: #00ff41;
                    font-size: 24px;
                    letter-spacing: 4px;
                    text-shadow: 0 0 20px #00ff41;
                    animation: pulse 1.5s infinite;
                }

                .loading-word {
                    display: inline-block;
                }

                .loading-dots {
                    display: inline-block;
                    margin-left: 4px;
                }

                .loading-dots span {
                    animation: blink 1.4s infinite;
                }

                .loading-dots span:nth-child(2) {
                    animation-delay: 0.2s;
                }

                .loading-dots span:nth-child(3) {
                    animation-delay: 0.4s;
                }

                @keyframes pulse {
                    0%,
                    100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0.6;
                    }
                }

                @keyframes blink {
                    0%,
                    100% {
                        opacity: 1;
                    }
                    50% {
                        opacity: 0;
                    }
                }

                /* Page Content Fade In */
                .page-content {
                    opacity: 0;
                    transform: scale(0.98);
                    transition:
                        opacity 0.1s ease-out,
                        transform 0.1s ease-out;
                }

                .page-content.visible {
                    opacity: 1;
                    transform: scale(1);
                }
            `}</style>
        </>
    );
}
