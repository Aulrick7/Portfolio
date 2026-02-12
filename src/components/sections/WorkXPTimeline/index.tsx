import { WorkXPLayout } from '@/types';
import dayjs from 'dayjs';
import React, { useEffect, useRef, useState } from 'react';

interface WorkXPTimelineProps {
    workExperiences: WorkXPLayout[];
    colour?: 'red';
}

interface TimelineWorkXP {
    id: string;
    title: string;
    startdate: string;
    enddate: string;
    filter: string;
    description: string;
    tech: string[];
    position: 'above' | 'below';
    url: string;
}

const WorkXPTimeline: React.FC<WorkXPTimelineProps> = ({ workExperiences, colour = 'red' }) => {
    const [scrollProgress, setScrollProgress] = useState(0);
    const [expandedWorkXP, setExpandedWorkXP] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);

    // Color configuration - using red for work experience
    const colorConfig = React.useMemo(() => {
        const configs = {
            red: {
                primary: 'rgb(239, 68, 68)', // red-500
                light: 'rgb(248, 113, 113)', // red-400
                shadowRgb: '239, 68, 68',
                border: 'border-red-400',
                bg: 'bg-red-400',
                text: 'text-red-400',
                bgOpacity: 'bg-red-400/10',
                borderOpacity: 'border-red-400/30'
            }
        };
        return configs[colour];
    }, [colour]);

    // Detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();

        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Extract tech stack from workXP's LabelsSection
    const extractTechStack = (workxp: WorkXPLayout): string[] => {
        const labelsSection = workxp.bottomSections?.find((section) => section.type === 'LabelsSection');

        if (labelsSection && 'items' in labelsSection && labelsSection.items) {
            return labelsSection.items.map((item) => ('label' in item ? item.label : '')).filter(Boolean);
        }

        return [];
    };

    // Transform WorkXPLayout data to timeline format
    const timelineWorkXPs: TimelineWorkXP[] = workExperiences
        .sort((a, b) => new Date(a.startdate).getTime() - new Date(b.startdate).getTime())
        .map((workxp, index) => ({
            id: workxp.__metadata?.id || `workxp-${index}`,
            title: workxp.title,
            startdate: dayjs(workxp.startdate).format('YYYY-MM'),
            enddate: workxp.enddate ? dayjs(workxp.enddate).format('YYYY-MM') : 'Present',
            filter: workxp.filter,
            description: workxp.description || 'Click to view work experience details',
            tech: extractTechStack(workxp),
            position: index % 2 === 0 ? 'above' : 'below',
            url: workxp.__metadata?.urlPath || '#'
        }));

    // Handle scroll for desktop (vertical scroll -> horizontal movement)
    useEffect(() => {
        if (isMobile) return;

        const handleScroll = () => {
            if (containerRef.current && timelineRef.current) {
                const container = containerRef.current;
                const scrollTop = container.scrollTop;
                const scrollHeight = container.scrollHeight - container.clientHeight;
                const progress = scrollTop / scrollHeight;

                setScrollProgress(progress);

                // Move timeline horizontally based on vertical scroll
                const timelineWidth = timelineRef.current.scrollWidth - window.innerWidth;
                timelineRef.current.style.transform = `translateX(-${progress * timelineWidth}px)`;
            }
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [isMobile]);

    // Handle scroll for mobile (horizontal scroll)
    useEffect(() => {
        if (!isMobile) return;

        const handleScroll = () => {
            if (timelineRef.current) {
                const scrollLeft = timelineRef.current.scrollLeft;
                const scrollWidth = timelineRef.current.scrollWidth - timelineRef.current.clientWidth;
                const progress = scrollLeft / scrollWidth;
                setScrollProgress(progress);
            }
        };

        const timeline = timelineRef.current;
        if (timeline) {
            timeline.addEventListener('scroll', handleScroll);
            return () => timeline.removeEventListener('scroll', handleScroll);
        }
    }, [isMobile]);

    const handleNodeClick = (workxpId: string) => {
        setExpandedWorkXP(expandedWorkXP === workxpId ? null : workxpId);
    };

    const viewWorkXPClick = (url: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (url && url !== '#') {
            window.location.href = url;
        }
    };

    // Reset scroll position when work experiences change (filter change)
    useEffect(() => {
        // Reset scroll progress
        setScrollProgress(0);
        setExpandedWorkXP(null);
        // Reset desktop scroll
        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }

        // Reset mobile scroll
        if (timelineRef.current) {
            timelineRef.current.scrollLeft = 0;
            timelineRef.current.style.transform = 'translateX(0px)';
        }
    }, [workExperiences]);

    return (
        <div className="relative w-full h-screen overflow-hidden bg-black">
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-20">
                <div
                    className="w-full h-full"
                    style={{
                        backgroundImage: `
                            linear-gradient(rgba(${colorConfig.shadowRgb}, 0.4) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(${colorConfig.shadowRgb}, 0.4) 1px, transparent 1px)
                        `,
                        backgroundSize: '50px 50px'
                    }}
                />
            </div>

            {/* Desktop: Scroll Container for vertical scrolling */}
            {!isMobile && (
                <div
                    ref={containerRef}
                    className="absolute inset-0 scrollbar-hide"
                    style={{
                        height: '100vh',
                        overflowY: 'scroll',
                        scrollbarWidth: 'none' /* Firefox */,
                        msOverflowStyle: 'none' /* IE and Edge */
                    }}
                >
                    {/* Spacer to enable scrolling */}
                    <div style={{ height: '500vh' }} />
                </div>
            )}

            {/* Timeline Container */}
            <div
                className={`absolute inset-0 flex items-center ${isMobile ? 'pointer-events-auto' : 'pointer-events-none'}`}
            >
                <div
                    ref={timelineRef}
                    className={`flex items-center transition-transform ${isMobile ? 'overflow-x-scroll scrollbar-hide pointer-events-auto px-10' : 'duration-100 ease-linear pointer-events-auto'}`}
                    style={
                        isMobile
                            ? {
                                  width: '100%',
                                  scrollSnapType: 'x proximity',
                                  WebkitOverflowScrolling: 'touch',
                                  scrollbarWidth: 'none' /* Firefox */,
                                  msOverflowStyle: 'none' /* IE and Edge */
                              }
                            : {
                                  width: `${timelineWorkXPs.length * 600}px`,
                                  willChange: 'transform'
                              }
                    }
                >
                    {/* Start Node */}
                    <div className={`flex flex-col items-center ${isMobile ? 'mx-10' : 'mx-20'} flex-shrink-0`}>
                        <div className={`w-6 h-6 rounded-full border-2 ${colorConfig.border} bg-black relative`}>
                            <div
                                className={`absolute inset-0 rounded-full ${colorConfig.bg} animate-pulse opacity-50`}
                            />
                        </div>
                        <div className={`mt-4 ${colorConfig.text} font-mono text-sm`}>START</div>
                    </div>

                    {/* Work Experiences */}
                    {timelineWorkXPs.map((workxp, index) => (
                        <div
                            key={workxp.id}
                            className="flex items-center flex-shrink-0"
                            style={isMobile ? { scrollSnapAlign: 'center' } : {}}
                        >
                            {/* Connecting Line */}
                            <div className={`relative h-1 ${isMobile ? 'w-40 sm:w-60' : 'w-96'}`}>
                                {/* Gray base line */}
                                <div className="absolute inset-0 bg-gray-700" />

                                {/* Progress line */}
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        width: `${Math.min(100, Math.max(0, (scrollProgress * timelineWorkXPs.length - index) * 100))}%`,
                                        background: `linear-gradient(to right, ${colorConfig.primary}, ${colorConfig.light})`,
                                        boxShadow: `0 0 10px rgba(${colorConfig.shadowRgb}, 0.5)`
                                    }}
                                />

                                {/* Circuit trace details */}
                                <div
                                    className={`absolute top-1/2 left-1/4 w-2 h-2 ${colorConfig.bg} rounded-full transform -translate-y-1/2 opacity-30`}
                                />
                                <div
                                    className={`absolute top-1/2 left-2/4 w-2 h-2 ${colorConfig.bg} rounded-full transform -translate-y-1/2 opacity-30`}
                                />
                                <div
                                    className={`absolute top-1/2 left-3/4 w-2 h-2 ${colorConfig.bg} rounded-full transform -translate-y-1/2 opacity-30`}
                                />
                            </div>

                            {/* WorkXP Node */}
                            <div
                                className={`flex flex-col items-center ${isMobile ? (workxp.position === 'above' ? '-mt-48 sm:-mt-64' : 'mt-48 sm:mt-64') : workxp.position === 'above' ? '-mt-80' : 'mt-80'}`}
                            >
                                {workxp.position === 'below' && (
                                    <div
                                        className={`w-1 ${isMobile ? 'h-44 sm:h-60' : 'h-72'} mt-2 relative
                                        ${scrollProgress * timelineWorkXPs.length > index ? 'opacity-100' : 'opacity-30'}`}
                                        style={{
                                            background: `linear-gradient(to bottom, rgb(3, 7, 18), ${colorConfig.light})`
                                        }}
                                    >
                                        <div
                                            className="absolute inset-0 opacity-50"
                                            style={{
                                                background: `linear-gradient(to bottom, transparent, ${colorConfig.light})`
                                            }}
                                        />
                                    </div>
                                )}
                                {workxp.position === 'above' && (
                                    /* WorkXP Label */
                                    <div
                                        className={`mb-4 flex flex-col text-center font-mono ${isMobile ? 'text-xs' : 'text-sm'} transition-colors duration-300
                                        ${scrollProgress * timelineWorkXPs.length > index ? colorConfig.text : 'text-gray-600'}`}
                                    >
                                        <div className={`font-bold ${isMobile ? 'w-20' : 'w-30'}`}>{workxp.title}</div>
                                        <div className="text-xs mt-1">
                                            {workxp.startdate} - {workxp.enddate}
                                        </div>
                                    </div>
                                )}

                                {/* Circuit Node */}
                                <div className="group relative" onClick={() => handleNodeClick(workxp.id)}>
                                    {/* Glow effect */}
                                    <div
                                        className={`absolute inset-0 rounded-lg transition-all duration-300 blur-xl
                                            ${
                                                scrollProgress * timelineWorkXPs.length > index
                                                    ? `${colorConfig.bg} opacity-30 ${isMobile ? (expandedWorkXP === workxp.id ? 'opacity-100' : '') : 'group-hover:opacity-100'}`
                                                    : 'bg-gray-600 opacity-10'
                                            }`}
                                    />

                                    {/* Node Core */}
                                    <div
                                        className={`cursor-pointer relative ${isMobile ? 'w-12 h-12' : 'w-16 h-16'} rounded-lg border-2 transition-all duration-300 ${isMobile ? (expandedWorkXP === workxp.id ? `${colorConfig.border} scale-110` : '') : `group-hover:${colorConfig.border} group-hover:scale-110`}
                                            ${
                                                scrollProgress * timelineWorkXPs.length > index
                                                    ? `${colorConfig.border} bg-black`
                                                    : 'border-gray-600 bg-black'
                                            }`}
                                    >
                                        {/* Circuit pattern */}
                                        <div
                                            className={`absolute inset-2 border ${colorConfig.borderOpacity} rounded`}
                                        />
                                        <div
                                            className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${isMobile ? 'w-2 h-2' : 'w-3 h-3'} ${colorConfig.bg} rounded-full animate-pulse`}
                                        />

                                        {/* Corner details */}
                                        <div
                                            className={`absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 ${colorConfig.border}`}
                                        />
                                        <div
                                            className={`absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 ${colorConfig.border}`}
                                        />
                                        <div
                                            className={`absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 ${colorConfig.border}`}
                                        />
                                        <div
                                            className={`absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 ${colorConfig.border}`}
                                        />
                                    </div>

                                    {/* Expanded Card - Mobile: on click, Desktop: on hover */}
                                    <div
                                        className={`absolute ${workxp.position === 'below' ? (isMobile ? 'bottom-16' : 'bottom-20') : isMobile ? 'top-16' : 'top-20'} 
                                            left-1/2 transform -translate-x-1/2 ${isMobile ? 'w-72' : 'w-80'} bg-black border-2 ${colorConfig.border} 
                                            rounded-lg ${isMobile ? 'p-4' : 'p-6'} transition-all duration-300 z-10
                                            ${
                                                isMobile
                                                    ? expandedWorkXP === workxp.id &&
                                                      scrollProgress * timelineWorkXPs.length > index
                                                        ? 'opacity-100 pointer-events-auto'
                                                        : 'opacity-0 pointer-events-none'
                                                    : `opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto ${scrollProgress * timelineWorkXPs.length > index ? 'opacity-100' : 'opacity-0 '}`
                                            }`}
                                        style={{
                                            boxShadow: `0 0 20px rgba(${colorConfig.shadowRgb}, 0.3)`
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {/* Card glow */}
                                        <div
                                            className="absolute inset-0 rounded-lg"
                                            style={{
                                                background: `linear-gradient(to bottom right, rgba(${colorConfig.shadowRgb}, 0.1), rgba(59, 130, 246, 0.1))`
                                            }}
                                        />

                                        <div className="relative">
                                            {/* Date */}
                                            <div
                                                className={`${colorConfig.text} font-mono text-xs mb-2 flex items-center gap-2`}
                                            >
                                                <div
                                                    className={`w-2 h-2 ${colorConfig.bg} rounded-full animate-pulse`}
                                                />
                                                {workxp.startdate} - {workxp.enddate}
                                            </div>

                                            {/* Title */}
                                            <h3
                                                className={`text-white font-bold ${isMobile ? 'text-lg' : 'text-xl'} mb-3 border-l-2 ${colorConfig.border} pl-3`}
                                            >
                                                {workxp.title}
                                            </h3>

                                            {/* Description */}
                                            <p
                                                className={`text-gray-300 ${isMobile ? 'text-xs' : 'text-sm'} mb-4 leading-relaxed`}
                                            >
                                                {workxp.description}
                                            </p>

                                            {/* Tech Stack */}
                                            {workxp.tech.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {workxp.tech.slice(0, isMobile ? 4 : 6).map((tech, i) => (
                                                        <span
                                                            key={i}
                                                            className={`px-2 py-1 ${colorConfig.bgOpacity} border ${colorConfig.borderOpacity} ${colorConfig.text} text-xs font-mono rounded`}
                                                        >
                                                            {tech}
                                                        </span>
                                                    ))}
                                                    {isMobile && workxp.tech.length > 4 && (
                                                        <span
                                                            className={`px-2 py-1 ${colorConfig.text} text-xs font-mono`}
                                                        >
                                                            +{workxp.tech.length - 4} more
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* View WorkXP Button */}
                                            <button
                                                onClick={(e) => viewWorkXPClick(workxp.url, e)}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = `rgba(${colorConfig.shadowRgb}, 0.1)`;
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                                className={`cursor-pointer w-full ${isMobile ? 'py-2' : 'py-2'} border ${colorConfig.border} ${colorConfig.text} font-mono ${isMobile ? 'text-xs' : 'text-sm'} rounded transition-colors`}
                                            >
                                                VIEW EXPERIENCE →
                                            </button>

                                            {/* Circuit decoration */}
                                            <div
                                                className={`absolute -top-3 -right-3 w-6 h-6 border-2 ${colorConfig.border} rounded-full bg-black flex items-center justify-center`}
                                            >
                                                <div className={`w-2 h-2 ${colorConfig.bg} rounded-full`} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {workxp.position === 'above' && (
                                    <div
                                        className={`w-1 rotate-180 ${isMobile ? 'h-44 sm:h-60' : 'h-72'} mb-2 relative
                                        ${scrollProgress * timelineWorkXPs.length > index ? 'opacity-100' : 'opacity-30'}`}
                                        style={{
                                            background: `linear-gradient(to bottom, rgb(3, 7, 18), ${colorConfig.primary})`
                                        }}
                                    >
                                        <div
                                            className="absolute inset-0 opacity-50"
                                            style={{
                                                background: `linear-gradient(to bottom, transparent, ${colorConfig.primary})`
                                            }}
                                        />
                                    </div>
                                )}
                                {workxp.position === 'below' && (
                                    /* WorkXP Label */
                                    <div
                                        className={`mt-4 flex flex-col text-center font-mono ${isMobile ? 'text-xs' : 'text-sm'} transition-colors duration-300
                                        ${scrollProgress * timelineWorkXPs.length > index ? colorConfig.text : 'text-gray-600'}`}
                                    >
                                        <div className={`font-bold ${isMobile ? 'w-20' : 'w-30'}`}>{workxp.title}</div>
                                        <div className="text-xs mt-1">
                                            {workxp.startdate} - {workxp.enddate}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* End Node */}
                    <div className={`flex flex-col items-center ${isMobile ? 'mx-10' : 'mx-20'} flex-shrink-0`}>
                        <div
                            className={`w-6 h-6 rounded-full border-2 transition-colors duration-300 relative
                                ${scrollProgress > 0.95 ? `${colorConfig.border} bg-black` : 'border-gray-600 bg-black'}`}
                        >
                            {scrollProgress > 0.95 && (
                                <div
                                    className={`absolute inset-0 rounded-full ${colorConfig.bg} animate-pulse opacity-50`}
                                />
                            )}
                        </div>
                        <div
                            className={`mt-4 font-mono text-sm transition-colors duration-300
                                ${scrollProgress > 0.95 ? colorConfig.text : 'text-gray-600'}`}
                        >
                            END
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll Instruction */}
            <div
                className={`absolute ${isMobile ? 'bottom-6' : 'bottom-10'} left-1/2 transform -translate-x-1/2 
                    ${colorConfig.text} font-mono ${isMobile ? 'text-xs px-4 py-2' : 'text-sm px-6 py-3'} flex items-center gap-3 
                    bg-black/80 border ${colorConfig.borderOpacity} rounded-lg
                    animate-bounce`}
            >
                <div className={`w-2 h-2 ${colorConfig.bg} rounded-full animate-pulse`} />
                {isMobile ? 'SWIPE TO NAVIGATE' : 'SCROLL DOWN TO NAVIGATE TIMELINE'}
                <div className={`w-2 h-2 ${colorConfig.bg} rounded-full animate-pulse`} />
            </div>

            {/* Progress Indicator */}
            <div
                className={`absolute ${isMobile ? 'top-6' : 'top-10'} left-1/2 font-mono ${colorConfig.text} ${isMobile ? 'text-xs px-3 py-1.5' : 'text-sm px-4 py-2'} 
                    bg-black/80 border ${colorConfig.borderOpacity} rounded transform -translate-x-1/2`}
            >
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 ${colorConfig.bg} rounded-full`} />
                    PROGRESS: {Math.round(scrollProgress * 100)}%
                </div>
            </div>

            {/* Global styles for hiding scrollbar */}
            <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
            `}</style>
        </div>
    );
};

export default WorkXPTimeline;
