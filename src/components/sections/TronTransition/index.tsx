import { useEffect, useState } from 'react';

interface TronTransitionProps {
    isActive: boolean;
    onComplete?: () => void;
    direction?: 'left' | 'right' | null;
}

export default function TronTransition({ isActive, onComplete, direction }: TronTransitionProps) {
    const [stage, setStage] = useState<'glitch' | 'disk' | 'complete'>('glitch');
    const [diskRotation, setDiskRotation] = useState(0);

    useEffect(() => {
        if (!isActive) return;

        // Glitch stage (1 second)
        const glitchTimer = setTimeout(() => {
            setStage('disk');
        }, 1000);

        // Disk loading stage (2 seconds)
        const diskTimer = setTimeout(() => {
            setStage('complete');
            onComplete?.();
        }, 3000);

        // Disk rotation animation
        const rotationInterval = setInterval(() => {
            setDiskRotation((prev) => (prev + 10) % 360);
        }, 16);

        return () => {
            clearTimeout(glitchTimer);
            clearTimeout(diskTimer);
            clearInterval(rotationInterval);
        };
    }, [isActive, onComplete]);

    if (!isActive) return null;

    return (
        <div className="fixed inset-0 z-50 pointer-events-none">
            {/* Glitch Effect */}
            {stage === 'glitch' && (
                <div className="absolute inset-0 bg-black">
                    <div className="glitch-container">
                        <div className="glitch glitch-1"></div>
                        <div className="glitch glitch-2"></div>
                        <div className="glitch glitch-3"></div>
                    </div>
                    <style jsx>{`
                        .glitch-container {
                            position: absolute;
                            inset: 0;
                            overflow: hidden;
                        }
                        .glitch {
                            position: absolute;
                            inset: 0;
                            background: linear-gradient(
                                to right,
                                transparent 0%,
                                rgba(0, 255, 255, 0.3) 50%,
                                transparent 100%
                            );
                            animation: glitchSlide 0.3s infinite;
                        }
                        .glitch-1 {
                            animation-delay: 0s;
                        }
                        .glitch-2 {
                            animation-delay: 0.1s;
                            background: linear-gradient(
                                to left,
                                transparent 0%,
                                rgba(255, 0, 255, 0.3) 50%,
                                transparent 100%
                            );
                        }
                        .glitch-3 {
                            animation-delay: 0.2s;
                        }
                        @keyframes glitchSlide {
                            0% {
                                transform: translateX(-100%);
                            }
                            100% {
                                transform: translateX(100%);
                            }
                        }
                    `}</style>
                </div>
            )}

            {/* Identity Disk Loading */}
            {stage === 'disk' && (
                <div className="absolute inset-0 bg-black flex items-center justify-center">
                    <div className="relative w-64 h-64">
                        {/* Outer ring */}
                        <div
                            className="absolute inset-0 border-4 border-cyan-400 rounded-full"
                            style={{
                                transform: `rotate(${diskRotation}deg)`,
                                boxShadow: '0 0 20px rgba(0, 255, 255, 0.5), inset 0 0 20px rgba(0, 255, 255, 0.3)'
                            }}
                        >
                            {/* Disk segments */}
                            <div className="absolute top-0 left-1/2 w-1 h-8 bg-cyan-400 -ml-0.5"></div>
                            <div className="absolute bottom-0 left-1/2 w-1 h-8 bg-cyan-400 -ml-0.5"></div>
                            <div className="absolute left-0 top-1/2 h-1 w-8 bg-cyan-400 -mt-0.5"></div>
                            <div className="absolute right-0 top-1/2 h-1 w-8 bg-cyan-400 -mt-0.5"></div>
                        </div>

                        {/* Inner ring */}
                        <div
                            className="absolute inset-8 border-2 border-cyan-300 rounded-full"
                            style={{
                                transform: `rotate(${-diskRotation * 1.5}deg)`,
                                boxShadow: '0 0 15px rgba(0, 255, 255, 0.4)'
                            }}
                        ></div>

                        {/* Center core */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div
                                className="w-16 h-16 bg-cyan-400 rounded-full"
                                style={{
                                    boxShadow: '0 0 30px rgba(0, 255, 255, 0.8)',
                                    animation: 'pulse 1s infinite'
                                }}
                            ></div>
                        </div>

                        {/* Energy lines */}
                        <div className="absolute inset-0" style={{ transform: `rotate(${diskRotation * 2}deg)` }}>
                            {[...Array(8)].map((_, i) => (
                                <div
                                    key={i}
                                    className="absolute top-1/2 left-1/2 w-0.5 bg-gradient-to-t from-cyan-400 to-transparent"
                                    style={{
                                        height: '120px',
                                        transform: `rotate(${i * 45}deg) translateY(-60px)`,
                                        opacity: 0.6
                                    }}
                                ></div>
                            ))}
                        </div>
                    </div>

                    <style jsx>{`
                        @keyframes pulse {
                            0%,
                            100% {
                                opacity: 1;
                            }
                            50% {
                                opacity: 0.5;
                            }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}
