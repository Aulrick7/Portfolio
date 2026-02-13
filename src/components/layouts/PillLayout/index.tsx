import * as React from 'react';

import { PageComponentProps, PillLayout } from '@/types';
import router from 'next/router';
import BaseLayout from '../BaseLayout';

type ComponentProps = PageComponentProps & PillLayout;

const Component: React.FC<ComponentProps> = (props) => {
    const { title, description, url } = props;
    const handlePillClick = (url) => {
        // Navigate after animation
        setTimeout(() => {
            router.push(url);
        }, 1500);
    };

    return (
        <BaseLayout {...props}>
            <div className="terminal-content">
                {/* Quote section */}
                <div className={`quote-section`}>
                    <p className="quote-text">
                        `&quot;`This is your last chance. After this, there is no turning back.`&quot;`
                    </p>
                    <p className="quote-author">— Morpheus</p>
                </div>

                {/* Pills section */}

                <div className="pills-container">
                    <div className={`pill-wrapper`} onClick={() => handlePillClick(url)}>
                        <div className="pill blue-pill">
                            <div className="pill-shine"></div>
                        </div>
                        <div className="pill-label">
                            <span className="pill-color-text blue-text">BLUE PILL</span>
                            <span className="pill-description">
                                The story remains the same. You wake up and browse my work experience.
                            </span>
                            <span className="pill-destination">→ {title}</span>
                        </div>
                    </div>

                    {/* Red Pill - Projects */}
                    {/* <div
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
                        <span className="pill-destination">→ {pills[1].title}</span>
                    </div>
                </div> */}
                </div>

                {/* Loading state */}
            </div>
            <style jsx>
                {`/* Quote section */
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
                    padding: 10px;
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
                `}
            </style>
        </BaseLayout>
    );
};
export default Component;
