import classNames from 'classnames';
import { useRouter } from 'next/router';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import TronTransition from '../TronTransition';

export default function ProjectChoiceSection(props) {
    const { elementId, colors, styles = {} } = props;
    const router = useRouter();
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [direction, setDirection] = useState<'left' | 'right' | null>(null);
    const [videoLoaded, setVideoLoaded] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [colourChoice, setColourChoice] = useState<'green' | 'cyan' | 'pink'>('green');

    const handleChoice = (choice: 'left' | 'right' | null, colourChoice: 'green' | 'cyan' | 'pink') => {
        setDirection(choice);
        setColourChoice(colourChoice);
        // Change to turn video
        if (choice) {
            const turnVideo = `/videos/tron-lightcycle-${choice}.mp4`;
            // setVideoSrc(turnVideo);
        }

        // Wait for turn video to play, then start transition
        setTimeout(() => {
            setIsTransitioning(true);
        }); // 2 second turn video duration
    };

    return (
        <>
            <div
                id={elementId || null}
                data-theme={colors}
                className="relative w-full h-screen overflow-hidden bg-black"
            >
                {/* Video Background */}
                <div className="absolute inset-0">
                    <video
                        ref={videoRef}
                        // key={videoSrc}
                        autoPlay
                        loop={!direction}
                        muted
                        playsInline
                        className={classNames(
                            'w-full h-full object-cover transition-opacity duration-1000',
                            videoLoaded ? 'opacity-100' : 'opacity-0'
                        )}
                        onLoadedData={() => setVideoLoaded(true)}
                    >
                        {/* <source src={videoSrc} type="video/mp4" /> */}
                    </video>

                    {/* Fallback animation if video doesn't load */}
                    {!videoLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="relative w-full h-full">
                                {/* Animated grid background */}
                                <div className="absolute inset-0 tron-grid"></div>
                                {/* Animated lightcycle path */}
                                <div className="lightcycle-path"></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80"></div>

                {/* Navigation UI */}
                <div className="relative z-10 h-full flex items-center justify-center px-4 py-8 md:px-0 md:py-0">
                    <div className="text-center">
                        {/* Title */}
                        <h1
                            className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-bold mb-8 sm:mb-12 md:mb-16 text-cyan-400"
                            style={{
                                textShadow: '0 0 20px rgba(0, 255, 255, 0.8), 0 0 40px rgba(0, 255, 255, 0.5)'
                            }}
                        >
                            CHOOSE YOUR PATH
                        </h1>

                        {/* Choice Buttons */}
                        {/* All Projects */}
                        <button
                            onClick={() => handleChoice(null, 'green')}
                            className="group relative mb-6 sm:mb-8 md:mb-0"
                            disabled={isTransitioning}
                        >
                            <div className="relative overflow-hidden">
                                {/* Hexagon shape */}
                                <div
                                    className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-active:scale-105"
                                    style={{
                                        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                                        background:
                                            'linear-gradient(135deg, rgba(0, 255, 0, 0.1) 0%, rgba(0, 255, 100, 0.1) 100%)',
                                        border: '2px solid rgba(0, 255, 0, 0.5)',
                                        boxShadow: '0 0 30px rgba(0, 255, 0, 0.3)'
                                    }}
                                >
                                    <div className="text-center">
                                        <div className="text-3xl sm:text-4xl md:text-5xl mb-2 md:mb-4"></div>
                                        <div className="text-lg sm:text-xl md:text-2xl font-bold text-green-300">All</div>
                                        <div className="text-sm sm:text-base md:text-lg text-green-400">PROJECTS</div>
                                    </div>
                                </div>

                                {/* Hover glow effect */}
                                <div
                                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                    style={{
                                        clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                                        background: 'radial-gradient(circle, rgba(0, 255, 0, 0.3) 0%, transparent 70%)',
                                        filter: 'blur(10px)'
                                    }}
                                ></div>

                                {/* Direction arrow - hidden on mobile */}
                                <div className="hidden md:block absolute -left-16 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:-translate-x-4">
                                    <div className="text-green-400 text-6xl">←</div>
                                </div>
                            </div>
                        </button>
                        <div className="flex flex-col md:flex-row gap-6 sm:gap-8 md:gap-12 justify-center items-center">
                            {/* Left Choice - Game Projects */}
                            <button
                                onClick={() => handleChoice('left', 'cyan')}
                                className="group relative"
                                disabled={isTransitioning}
                            >
                                <div className="relative overflow-hidden">
                                    {/* Hexagon shape */}
                                    <div
                                        className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-active:scale-105"
                                        style={{
                                            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                                            background:
                                                'linear-gradient(135deg, rgba(0, 255, 255, 0.1) 0%, rgba(0, 100, 255, 0.1) 100%)',
                                            border: '2px solid rgba(0, 255, 255, 0.5)',
                                            boxShadow: '0 0 30px rgba(0, 255, 255, 0.3)'
                                        }}
                                    >
                                        <div className="text-center">
                                            <div className="text-3xl sm:text-4xl md:text-5xl mb-2 md:mb-4">🎮</div>
                                            <div className="text-lg sm:text-xl md:text-2xl font-bold text-cyan-300">GAME</div>
                                            <div className="text-sm sm:text-base md:text-lg text-cyan-400">PROJECTS</div>
                                        </div>
                                    </div>

                                    {/* Hover glow effect */}
                                    <div
                                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                        style={{
                                            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                                            background:
                                                'radial-gradient(circle, rgba(0, 255, 255, 0.3) 0%, transparent 70%)',
                                            filter: 'blur(10px)'
                                        }}
                                    ></div>

                                    {/* Direction arrow - hidden on mobile */}
                                    <div className="hidden md:block absolute -left-16 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:-translate-x-4">
                                        <div className="text-cyan-400 text-6xl">←</div>
                                    </div>
                                </div>
                            </button>

                            {/* Divider - horizontal on mobile, vertical on desktop */}
                            <div className="w-40 h-0.5 md:w-0.5 md:h-40 lg:h-64 bg-gradient-to-r md:bg-gradient-to-b from-transparent via-cyan-400 to-transparent"></div>

                            {/* Right Choice - Software Projects */}
                            <button
                                onClick={() => handleChoice('right', 'pink')}
                                className="group relative"
                                disabled={isTransitioning}
                            >
                                <div className="relative overflow-hidden">
                                    {/* Hexagon shape */}
                                    <div
                                        className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-64 lg:h-64 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-active:scale-105"
                                        style={{
                                            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                                            background:
                                                'linear-gradient(135deg, rgba(255, 0, 255, 0.1) 0%, rgba(255, 0, 100, 0.1) 100%)',
                                            border: '2px solid rgba(255, 0, 255, 0.5)',
                                            boxShadow: '0 0 30px rgba(255, 0, 255, 0.3)'
                                        }}
                                    >
                                        <div className="text-center">
                                            <div className="text-3xl sm:text-4xl md:text-5xl mb-2 md:mb-4">💻</div>
                                            <div className="text-lg sm:text-xl md:text-2xl font-bold text-pink-300">SOFTWARE</div>
                                            <div className="text-sm sm:text-base md:text-lg text-pink-400">PROJECTS</div>
                                        </div>
                                    </div>

                                    {/* Hover glow effect */}
                                    <div
                                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                        style={{
                                            clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                                            background:
                                                'radial-gradient(circle, rgba(255, 0, 255, 0.3) 0%, transparent 70%)',
                                            filter: 'blur(10px)'
                                        }}
                                    ></div>

                                    {/* Direction arrow - hidden on mobile */}
                                    <div className="hidden md:block absolute -right-16 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-4">
                                        <div className="text-pink-400 text-6xl">→</div>
                                    </div>
                                </div>
                            </button>
                        </div>

                        {/* Instruction text */}
                        <p className="mt-6 sm:mt-8 md:mt-12 text-base sm:text-lg md:text-xl text-cyan-300 opacity-75">SELECT YOUR DESTINATION</p>
                    </div>
                </div>

                {/* Animated scan lines */}
                <div className="absolute inset-0 pointer-events-none opacity-10">
                    <div className="scan-lines"></div>
                </div>
            </div>

            {/* Tron Transition - Rendered outside body using Portal */}
            {typeof window !== 'undefined' &&
                createPortal(
                    <TronTransition isActive={isTransitioning} direction={direction} colour={colourChoice} />,
                    document.body
                )}

            <style jsx>{`
                .tron-grid {
                    background-image:
                        linear-gradient(rgba(0, 255, 255, 0.15) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0, 255, 255, 0.15) 1px, transparent 1px);
                    background-size: 50px 50px;
                    animation: gridMove 10s linear infinite;
                }

                @keyframes gridMove {
                    0% {
                        transform: translateY(0px);
                    }
                    100% {
                        transform: translateY(250px);
                    }
                }

                .lightcycle-path {
                    position: absolute;
                    bottom: 15%;
                    left: -20%;
                    width: 120%;
                    height: 4px;
                    background: linear-gradient(90deg, transparent 0%, rgba(0, 255, 255, 1) 100%, transparent 100%);
                    box-shadow: 0 0 20px rgba(0, 255, 255, 1);
                    animation: lightcycleMove 5s ease-in-out infinite;
                }

                @keyframes lightcycleMove {
                    0% {
                        transform: translateX(-100%) scaleX(0.5);
                        opacity: 0.5;
                    }
                    50% {
                        transform: translateX(0%) scaleX(1);
                        opacity: 1;
                    }
                    100% {
                        transform: translateX(100%) scaleX(0.5);
                        opacity: 0.5;
                    }
                }

                .scan-lines {
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(
                        to bottom,
                        transparent 50%,
                        rgba(0, 255, 255, 0.1) 51%,
                        transparent 52%
                    );
                    background-size: 100% 4px;
                    animation: scanAnimation 8s linear infinite;
                }

                @keyframes scanAnimation {
                    0% {
                        transform: translateY(0);
                    }
                    100% {
                        transform: translateY(4px);
                    }
                }
            `}</style>
        </>
    );
}
