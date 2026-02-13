import router from 'next/router';
import React, { useEffect, useState } from 'react';

interface TronTransitionProps {
    isActive: boolean;
    onComplete?: () => void;
    direction?: 'left' | 'right' | 'down' | null;
    colour?: 'green' | 'cyan' | 'pink' | 'red';
}

export default function TronTransition({ isActive, onComplete, direction, colour = 'green' }: TronTransitionProps) {
    const [stage, setStage] = useState<'disk' | 'complete'>('disk');
    const [diskRotation, setDiskRotation] = useState(0);
    const [loadingProgress, setLoadingProgress] = useState(0);
    // Color configuration based on direction
    const colorConfig = React.useMemo(() => {
        const configs = {
            green: {
                primary: 'rgb(34, 197, 94)', // green-500
                light: 'rgb(74, 222, 128)', // green-400
                rgb: '0, 255, 0',
                hex1: '#22C55E', // green-500
                hex2: '#4ADE80', // green-400
                border: 'border-green-400',
                bg: 'bg-green-400',
                text: 'text-green-400',
                bgOpacity: 'bg-green-400/10',
                borderOpacity: 'border-green-400/30'
            },
            cyan: {
                primary: 'rgb(6, 182, 212)', // cyan-500
                light: 'rgb(34, 211, 238)', // cyan-400
                rgb: '0, 255, 255',
                hex1: '#06B6D4', // cyan-500
                hex2: '#22D3EE', // cyan-400
                border: 'border-cyan-400',
                bg: 'bg-cyan-400',
                text: 'text-cyan-400',
                bgOpacity: 'bg-cyan-400/10',
                borderOpacity: 'border-cyan-400/30'
            },
            pink: {
                primary: 'rgb(236, 72, 153)', // pink-500
                light: 'rgb(244, 114, 182)', // pink-400
                rgb: '255, 0, 255',
                hex1: '#EC4899', // pink-500
                hex2: '#F472B6', // pink-400
                border: 'border-pink-400',
                bg: 'bg-pink-400',
                text: 'text-pink-400',
                bgOpacity: 'bg-pink-400/10',
                borderOpacity: 'border-pink-400/30'
            },
            red: {
                primary: 'rgb(239, 68, 68)', // red-500
                light: 'rgb(248, 113, 113)', // red-400
                rgb: '255, 0, 0',
                hex1: '#EF4444', // red-500
                hex2: '#F87171', // red-400
                border: 'border-red-400',
                bg: 'bg-red-400',
                text: 'text-red-400',
                bgOpacity: 'bg-red-400/10',
                borderOpacity: 'border-red-400/30'
            }
        };
        return configs[colour];
    }, [colour]);
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
            } else if (direction === 'down') {
                router.push('/workXP');
            } else {
                router.push('/projects');
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
        <div className="fixed inset-0 z-[9999] pointer-events-none ">
            {/* Identity Disk Loading */}
            {stage === 'disk' && (
                <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-12">
                    <div className="relative w-64 h-64">
                        {/* Progress Circle (SVG) */}
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 256 256">
                            {/* Background circle (dark) */}
                            <circle
                                cx="128"
                                cy="128"
                                r="120"
                                fill="none"
                                stroke={`rgba(${colorConfig.rgb}, 0.1)`}
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
                                    filter: `drop-shadow(0 0 10px rgba(${colorConfig.rgb}, 0.8))`,
                                    transition: 'stroke-dashoffset 0.016s linear'
                                }}
                            />

                            {/* Gradient definition */}
                            <defs>
                                <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor={colorConfig.hex1} stopOpacity="1" />
                                    <stop offset="100%" stopColor={colorConfig.hex2} stopOpacity="1" />
                                </linearGradient>
                            </defs>
                        </svg>

                        {/* Inner rotating ring */}
                        <div
                            className={`absolute inset-8 border-2 ${colorConfig.border} rounded-full opacity-60`}
                            style={{
                                transform: `rotate(${-diskRotation * 1.5}deg)`,
                                boxShadow: `0 0 15px rgba(${colorConfig.rgb}, ${loadingProgress / 200})`
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
                                stroke={`rgba(${colorConfig.rgb}, 0.1)`}
                                strokeWidth="15"
                            />

                            {/* Progress circle (glowing) */}
                            <circle
                                cx="128"
                                cy="128"
                                r="120"
                                fill="none"
                                stroke="url(#glowGradient2)"
                                strokeWidth="15"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 120}`}
                                strokeDashoffset={`${2 * Math.PI * 120 * (1 - loadingProgress / 100)}`}
                                style={{
                                    filter: `drop-shadow(0 0 10px rgba(${colorConfig.rgb}, 0.8))`,
                                    transition: 'stroke-dashoffset 0.016s linear'
                                }}
                            />

                            {/* Gradient definition */}
                            <defs>
                                <linearGradient id="glowGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor={colorConfig.hex1} stopOpacity="1" />
                                    <stop offset="100%" stopColor={colorConfig.hex2} stopOpacity="1" />
                                </linearGradient>
                            </defs>
                        </svg>
                        {/* Outer glow ring that intensifies with progress */}
                        <div
                            className="absolute inset-0 rounded-full"
                            style={{
                                boxShadow: `inset 0 0 ${40 * (loadingProgress / 100)}px rgba(${colorConfig.rgb}, ${loadingProgress / 150})`,
                                opacity: loadingProgress / 100
                            }}
                        ></div>
                    </div>

                    {/* Loading text */}
                    <div className={`${colorConfig.text} text-xl tracking-widest font-mono`}>
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
