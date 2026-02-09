import router from 'next/router';
import { useEffect, useState } from 'react';

interface TronTransitionProps {
    isActive: boolean;
    onComplete?: () => void;
    direction?: 'left' | 'right' | null;
}

export default function TronTransition({ isActive, onComplete, direction }: TronTransitionProps) {
    const [stage, setStage] = useState<'disk' | 'complete'>('disk');
    const [diskRotation, setDiskRotation] = useState(0);
    const [loadingProgress, setLoadingProgress] = useState(0);

    useEffect(() => {
        if (!isActive) return;

        // Disk loading stage (2 seconds)
        const diskTimer = setTimeout(() => {
            handleTransitionComplete?.();
        }, 2000);

        // Disk rotation animation
        const rotationInterval = setInterval(() => {
            setDiskRotation((prev) => (prev + 10) % 360);
        }, 16);

        // Progress animation (0 to 100 over 2 seconds)
        let progressInterval: NodeJS.Timeout;
        if (stage === 'disk') {
            const progressDuration = 2000; // 2 seconds
            const progressSteps = 60; // 60 frames per second
            const progressIncrement = 100 / (progressDuration / (1000 / progressSteps));

            progressInterval = setInterval(() => {
                setLoadingProgress((prev) => {
                    const next = prev + progressIncrement;
                    return next >= 100 ? 100 : next;
                });
            }, 1000 / progressSteps);
        }
        const handleTransitionComplete = () => {
            if (direction === 'left') {
                router.push('/projects?filter=game');
            } else if (direction === 'right') {
                router.push('/projects?filter=software');
            }
        };
        return () => {
            clearTimeout(diskTimer);
            clearInterval(rotationInterval);
            if (progressInterval) clearInterval(progressInterval);
        };
    }, [isActive, onComplete, stage]);

    if (!isActive) return null;

    return (
        <div className="fixed inset-0 z-50 top-0 bottom-0 pointer-events-none">
            {/* Identity Disk Loading */}
            {stage === 'disk' && (
                <div className="absolute inset-0 bg-black flex items-center justify-center">
                    <div className="relative bottom-100 w-64 h-64">
                        {/* Progress Circle (SVG) */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 256 256">
                            {/* Background circle (dark) */}
                            <circle
                                cx="128"
                                cy="128"
                                r="120"
                                fill="none"
                                stroke="rgba(0, 255, 255, 0.1)"
                                strokeWidth="8"
                            />

                            {/* Progress circle (glowing cyan) */}
                            <circle
                                cx="128"
                                cy="128"
                                r="120"
                                fill="none"
                                stroke="url(#glowGradient)"
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 120}`}
                                strokeDashoffset={`${2 * Math.PI * 120 * (1 - loadingProgress / 100)}`}
                                style={{
                                    filter: 'drop-shadow(0 0 10px rgba(0, 255, 255, 0.8))',
                                    transition: 'stroke-dashoffset 0.016s linear'
                                }}
                            />

                            {/* Gradient definition */}
                            <defs>
                                <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#00FFFF" stopOpacity="1" />
                                    <stop offset="100%" stopColor="#00CCFF" stopOpacity="1" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* Inner rotating ring */}
                        <div
                            className="absolute inset-8 border-2 border-cyan-300 rounded-full opacity-60"
                            style={{
                                transform: `rotate(${-diskRotation * 1.5}deg)`,
                                boxShadow: `0 0 15px rgba(0, 255, 255, ${loadingProgress / 200})`
                            }}
                        ></div>

                        <svg
                            className="absolute inset-0 flex items-center justify-center w-full h-full -rotate-90"
                            viewBox="-256 -256 768 768 "
                        >
                            {/* Background circle (dark) */}
                            <circle
                                cx="128"
                                cy="128"
                                r="120"
                                fill="none"
                                stroke="rgba(0, 255, 255, 0.1)"
                                strokeWidth="15"
                            />

                            {/* Progress circle (glowing cyan) */}
                            <circle
                                cx="128"
                                cy="128"
                                r="120"
                                fill="none"
                                stroke="url(#glowGradient)"
                                strokeWidth="15"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 120}`}
                                strokeDashoffset={`${2 * Math.PI * 120 * (1 - loadingProgress / 100)}`}
                                style={{
                                    filter: 'drop-shadow(0 0 10px rgba(0, 255, 255, 0.8))',
                                    transition: 'stroke-dashoffset 0.016s linear'
                                }}
                            />

                            {/* Gradient definition */}
                            <defs>
                                <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#00FFFF" stopOpacity="1" />
                                    <stop offset="100%" stopColor="#00CCFF" stopOpacity="1" />
                                </linearGradient>
                            </defs>
                        </svg>
                        {/* Outer glow ring that intensifies with progress */}
                        <div
                            className="absolute inset-0 rounded-full"
                            style={{
                                boxShadow: `inset 0 0 ${40 * (loadingProgress / 100)}px rgba(0, 255, 255, ${loadingProgress / 150})`,
                                opacity: loadingProgress / 100
                            }}
                        ></div>
                    </div>

                    {/* Loading text */}
                    <div className="absolute bottom-225 left-205 text-cyan-400 text-xl tracking-widest font-mono">
                        INITIALIZING SYSTEM...
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
