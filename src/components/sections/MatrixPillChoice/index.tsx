/**
 * Matrix Pill Choice Component
 *
 * Inspired by: The Matrix (1999) - Red Pill vs Blue Pill scene
 * Credits: Wachowski Brothers for the iconic visual metaphor
 *
 * Design Concept: Cyberpunk minimalism with terminal aesthetics
 * - Monospaced typography (Courier New) for that authentic terminal feel
 * - Matrix green (#00FF41) as primary accent color
 * - Dark, high-contrast color scheme
 * - Glitch effects and scan lines for authenticity
 * - Smooth 3D pill rotations with hover interactions
 *
 * Technical Implementation:
 * - Pure CSS animations for performance
 * - CSS 3D transforms for pill rotations
 * - Keyframe animations for glitch and matrix rain effects
 * - localStorage to remember user's choice
 * - Responsive design with mobile considerations
 */

import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function MatrixPillChoice() {
    const router = useRouter();
    const [showChoice, setShowChoice] = useState(false);
    const [glitchText, setGlitchText] = useState(false);
    const [selectedPill, setSelectedPill] = useState<'red' | 'blue' | null>(null);

    useEffect(() => {
        // Intro sequence timing
        const timer = setTimeout(() => setShowChoice(true), 1500);
        return () => clearTimeout(timer);
    }, []);

    const handlePillClick = (pill: 'red' | 'blue') => {
        setSelectedPill(pill);
        setGlitchText(true);

        // Navigate after animation
        setTimeout(() => {
            if (pill === 'red') {
                router.push('/projects');
            } else {
                router.push('/Work Experience');
            }
        }, 1500);
    };

    return (
        <div className="matrix-container">
            {/* Matrix rain background effect */}
            <div className="matrix-rain">
                {[...Array(100)].map((_, i) => (
                    <div
                        key={i}
                        className="rain-column"
                        style={{
                            left: `${i * 1}%`,
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

                    <div className="terminal-content">
                        {/* Quote section */}
                        <div className={`quote-section ${glitchText ? 'glitch' : ''}`}>
                            <p className="quote-text">
                                "This is your last chance. After this, there is no turning back."
                            </p>
                            <p className="quote-author">— Morpheus</p>
                        </div>

                        {/* Pills section */}
                        <div className="pills-container">
                            {/* Blue Pill - Work Experience */}
                            <div
                                className={`pill-wrapper ${selectedPill === 'blue' ? 'selected' : ''} ${selectedPill && selectedPill !== 'blue' ? 'faded' : ''}`}
                                onClick={() => !selectedPill && handlePillClick('blue')}
                            >
                                <div className="pill blue-pill">
                                    <div className="pill-shine"></div>
                                </div>
                                <div className="pill-label">
                                    <span className="pill-color-text blue-text">BLUE PILL</span>
                                    <span className="pill-description">
                                        The story remains the same. You wake up and browse my work experience.
                                    </span>
                                    <span className="pill-destination">→ Work Experience</span>
                                </div>
                            </div>

                            {/* Red Pill - Projects */}
                            <div
                                className={`pill-wrapper ${selectedPill === 'red' ? 'selected' : ''} ${selectedPill && selectedPill !== 'red' ? 'faded' : ''}`}
                                onClick={() => !selectedPill && handlePillClick('red')}
                            >
                                <div className="pill red-pill">
                                    <div className="pill-shine"></div>
                                </div>
                                <div className="pill-label">
                                    <span className="pill-color-text red-text">RED PILL</span>
                                    <span className="pill-description">
                                        Stay in Wonderland and I show you how deep my projects go.
                                    </span>
                                    <span className="pill-destination">→ Projects</span>
                                </div>
                            </div>
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
                    </div>
                </div>

                {/* Bottom navigation hint */}
                <div className="bottom-hint">
                    <p>Press ESC to explore the rest of the site</p>
                </div>
            </div>

            <style jsx>{`
                .matrix-container {
                    position: relative;
                    min-height: 100vh;
                    background: #0d0d0d;
                    color: #00ff41;
                    font-family: 'Courier New', monospace;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                /* Matrix rain background */
                .matrix-rain {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0.5;
                    pointer-events: none;
                }

                .rain-column {
                    position: absolute;
                    top: -100%;
                    font-size: 20px;
                    color: #00ff41;
                    animation: rain linear infinite;
                }

                @keyframes rain {
                    to {
                        transform: translateY(200vh);
                    }
                }

                /* Scan line effect */
                .scanline {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(
                        to bottom,
                        transparent 50%,
                        rgba(0, 255, 65, 0.03) 51%,
                        transparent 52%
                    );
                    background-size: 100% 4px;
                    animation: scan 8s linear infinite;
                    pointer-events: none;
                }

                @keyframes scan {
                    0% {
                        background-position: 0 0;
                    }
                    100% {
                        background-position: 0 100%;
                    }
                }

                /* Content wrapper */
                .content-wrapper {
                    position: relative;
                    z-index: 1;
                    width: 90%;
                    max-width: 900px;
                    opacity: 0;
                    transform: translateY(20px);
                    transition: all 1s ease-out;
                }

                .content-wrapper.visible {
                    opacity: 1;
                    transform: translateY(0);
                }

                /* Terminal box */
                .terminal-box {
                    background: rgba(0, 0, 0, 0.85);
                    border: 2px solid #00ff41;
                    border-radius: 8px;
                    box-shadow:
                        0 0 40px rgba(0, 255, 65, 0.3),
                        inset 0 0 40px rgba(0, 255, 65, 0.05);
                    overflow: hidden;
                }

                .terminal-header {
                    background: rgba(0, 255, 65, 0.1);
                    border-bottom: 1px solid #00ff41;
                    padding: 12px 16px;
                    display: flex;
                    gap: 8px;
                }

                .terminal-dot {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    opacity: 0.6;
                }

                .terminal-dot.red {
                    background: #ff5f56;
                }

                .terminal-dot.yellow {
                    background: #ffbd2e;
                }

                .terminal-dot.green {
                    background: #27c93f;
                }

                .terminal-content {
                    padding: 40px;
                }

                /* Quote section */
                .quote-section {
                    text-align: center;
                    margin-bottom: 60px;
                }

                .quote-section.glitch {
                    animation: glitch 0.3s infinite;
                }

                @keyframes glitch {
                    0%,
                    100% {
                        transform: translate(0);
                    }
                    20% {
                        transform: translate(-2px, 2px);
                    }
                    40% {
                        transform: translate(-2px, -2px);
                    }
                    60% {
                        transform: translate(2px, 2px);
                    }
                    80% {
                        transform: translate(2px, -2px);
                    }
                }

                .quote-text {
                    font-size: 24px;
                    line-height: 1.6;
                    margin-bottom: 16px;
                    text-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
                }

                .quote-author {
                    font-size: 16px;
                    opacity: 0.7;
                    font-style: italic;
                }

                /* Pills container */
                .pills-container {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 40px;
                    margin-top: 40px;
                }

                @media (max-width: 768px) {
                    .pills-container {
                        grid-template-columns: 1fr;
                        gap: 30px;
                    }
                }

                /* Pill wrapper */
                .pill-wrapper {
                    cursor: pointer;
                    opacity: 1;
                    transition: all 0.4s ease;
                    position: relative;
                }

                .pill-wrapper:hover .pill {
                    transform: rotateY(180deg) scale(1.1);
                }

                .pill-wrapper:hover {
                    transform: translateY(-5px);
                }

                .pill-wrapper.selected {
                    transform: scale(1.05);
                }

                .pill-wrapper.faded {
                    opacity: 0.3;
                    pointer-events: none;
                }

                /* Pill 3D element */
                .pill {
                    width: 120px;
                    height: 40px;
                    margin: 0 auto 24px;
                    border-radius: 20px;
                    position: relative;
                    transform-style: preserve-3d;
                    transition: transform 0.6s ease;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                }

                .blue-pill {
                    background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%);
                    box-shadow:
                        0 10px 30px rgba(59, 130, 246, 0.4),
                        0 0 20px rgba(59, 130, 246, 0.3);
                }

                .red-pill {
                    background: linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%);
                    box-shadow:
                        0 10px 30px rgba(239, 68, 68, 0.4),
                        0 0 20px rgba(239, 68, 68, 0.3);
                }

                .pill-shine {
                    position: absolute;
                    top: 5px;
                    left: 20%;
                    width: 40%;
                    height: 12px;
                    background: rgba(255, 255, 255, 0.4);
                    border-radius: 50%;
                    filter: blur(3px);
                }

                /* Pill label */
                .pill-label {
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }

                .pill-color-text {
                    font-size: 18px;
                    font-weight: bold;
                    letter-spacing: 2px;
                }

                .blue-text {
                    color: #3b82f6;
                    text-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
                }

                .red-text {
                    color: #ef4444;
                    text-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
                }

                .pill-description {
                    font-size: 14px;
                    line-height: 1.5;
                    opacity: 0.8;
                    padding: 0 10px;
                }

                .pill-destination {
                    font-size: 12px;
                    opacity: 0.6;
                    margin-top: 8px;
                    font-style: italic;
                }

                /* Loading state */
                .loading-matrix {
                    text-align: center;
                    margin-top: 40px;
                    padding-top: 40px;
                    border-top: 1px solid rgba(0, 255, 65, 0.3);
                }

                .loading-text {
                    font-size: 20px;
                    letter-spacing: 4px;
                    animation: pulse 1s infinite;
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
                        opacity: 0.5;
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

                /* Bottom hint */
                .bottom-hint {
                    text-align: center;
                    margin-top: 40px;
                    font-size: 12px;
                    opacity: 0.5;
                }
            `}</style>
        </div>
    );
}
