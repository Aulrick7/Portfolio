import { ProjectLayout } from '@/types';
import dayjs from 'dayjs';
import React, { useEffect, useRef, useState } from 'react';

interface ProjectsTimelineProps {
    projects: ProjectLayout[];
    colour?: 'green' | 'cyan' | 'pink';
}

interface TimelineProject {
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

const ProjectsTimeline: React.FC<ProjectsTimelineProps> = ({ projects, colour = 'green' }) => {
    const [scrollProgress, setScrollProgress] = useState(0);
    const [expandedProject, setExpandedProject] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [scale, setScale] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);

    // Color configuration based on filter
    const colorConfig = React.useMemo(() => {
        const configs = {
            green: {
                primary: 'rgb(34, 197, 94)',
                light: 'rgb(74, 222, 128)',
                shadowRgb: '34, 197, 94',
                border: 'border-green-400',
                bg: 'bg-green-400',
                text: 'text-green-400',
                bgOpacity: 'bg-green-400/10',
                borderOpacity: 'border-green-400/30'
            },
            cyan: {
                primary: 'rgb(6, 182, 212)',
                light: 'rgb(34, 211, 238)',
                shadowRgb: '6, 182, 212',
                border: 'border-cyan-400',
                bg: 'bg-cyan-400',
                text: 'text-cyan-400',
                bgOpacity: 'bg-cyan-400/10',
                borderOpacity: 'border-cyan-400/30'
            },
            pink: {
                primary: 'rgb(236, 72, 153)',
                light: 'rgb(244, 114, 182)',
                shadowRgb: '236, 72, 153',
                border: 'border-pink-400',
                bg: 'bg-pink-400',
                text: 'text-pink-400',
                bgOpacity: 'bg-pink-400/10',
                borderOpacity: 'border-pink-400/30'
            }
        };
        return configs[colour];
    }, [colour]);

    // Detect mobile device - Mobile + Small Tablets (<768px)
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();

        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Calculate scale for desktop based on viewport height
    useEffect(() => {
        if (isMobile) {
            setScale(1);
            return;
        }

        const updateScale = () => {
            const viewportHeight = window.innerHeight;
            const idealHeight = 1000; // Ideal height for full-size timeline
            const calculatedScale = Math.min(1, viewportHeight / idealHeight);
            setScale(calculatedScale);
        };

        updateScale();
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, [isMobile]);

    // Extract tech stack from project's LabelsSection
    const extractTechStack = (project: ProjectLayout): string[] => {
        const labelsSection = project.bottomSections?.find((section) => section.type === 'LabelsSection');

        if (labelsSection && 'items' in labelsSection && labelsSection.items) {
            return labelsSection.items.map((item) => ('label' in item ? item.label : '')).filter(Boolean);
        }

        return [];
    };

    // Transform ProjectLayout data to timeline format
    const timelineProjects: TimelineProject[] = projects
        .sort((a, b) => new Date(a.startdate).getTime() - new Date(b.startdate).getTime())
        .map((project, index) => ({
            id: project.__metadata?.id || `project-${index}`,
            title: project.title,
            startdate: dayjs(project.startdate).format('YYYY-MM'),
            enddate: dayjs(project.enddate).format('YYYY-MM'),
            filter: project.filter,
            description: project.description || 'Click to view project details',
            tech: extractTechStack(project),
            position: index % 2 === 0 ? 'above' : 'below',
            url: project.__metadata?.urlPath || '#'
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
                timelineRef.current.style.transform = `translateX(-${progress * timelineWidth}px) scale(${scale})`;
            }
        };

        const container = containerRef.current;
        if (container) {
            container.addEventListener('scroll', handleScroll);
            // Trigger initial positioning
            handleScroll();
            return () => container.removeEventListener('scroll', handleScroll);
        }
    }, [isMobile, scale]);

    // Handle scroll for mobile (2D panning with bounds)
    useEffect(() => {
        if (!isMobile || !timelineRef.current) return;

        const timeline = timelineRef.current;

        const handleScroll = () => {
            const scrollLeft = timeline.scrollLeft;
            const scrollWidth = timeline.scrollWidth - timeline.clientWidth;
            const progress = scrollLeft / scrollWidth;
            setScrollProgress(progress);
        };

        timeline.addEventListener('scroll', handleScroll);
        return () => timeline.removeEventListener('scroll', handleScroll);
    }, [isMobile]);

    const handleNodeClick = (projectId: string) => {
        setExpandedProject(expandedProject === projectId ? null : projectId);
    };

    const viewProjectClick = (url: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (url && url !== '#') {
            window.location.href = url;
        }
    };

    // Reset scroll position when projects change (filter change)
    useEffect(() => {
        setScrollProgress(0);
        setExpandedProject(null);

        if (containerRef.current) {
            containerRef.current.scrollTop = 0;
        }

        if (timelineRef.current) {
            timelineRef.current.scrollLeft = 0;
            timelineRef.current.scrollTop = 0;
            timelineRef.current.style.transform = isMobile ? 'none' : `translateX(0px) scale(${scale})`;
        }
    }, [projects, isMobile, scale]);

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
                    className="absolute inset-0 timeline-desktop-scroll"
                    style={{
                        height: '100vh',
                        overflowY: 'scroll',
                        overflowX: 'hidden',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                    }}
                >
                    {/* Spacer to enable scrolling */}
                    <div style={{ height: '500vh' }} />
                </div>
            )}

            {/* Timeline Container */}
            <div
                className={`absolute inset-0 flex items-center justify-center ${isMobile ? 'pointer-events-auto' : 'pointer-events-none'}`}
            >
                <div
                    ref={timelineRef}
                    className={`timeline-container flex items-center ${isMobile ? 'pointer-events-auto' : 'transition-transform duration-100 ease-linear pointer-events-auto'}`}
                    style={
                        isMobile
                            ? {
                                  width: 'max-content',
                                  height: 'max-content',
                                  minWidth: '100%',
                                  minHeight: '100vh',
                                  padding: '2em',
                                  touchAction: 'pan-x pan-y',
                                  overflowX: 'scroll',
                                  overflowY: 'scroll',
                                  scrollbarWidth: 'none',
                                  msOverflowStyle: 'none',
                                  cursor: 'grab'
                              }
                            : {
                                  width: 'max-content',
                                  minWidth: '100%',
                                  willChange: 'transform',
                                  transform: `scale(${scale})`,
                                  transformOrigin: 'center center'
                              }
                    }
                    onMouseDown={(e) => {
                        if (isMobile && timelineRef.current) {
                            timelineRef.current.style.cursor = 'grabbing';
                        }
                    }}
                    onMouseUp={(e) => {
                        if (isMobile && timelineRef.current) {
                            timelineRef.current.style.cursor = 'grab';
                        }
                    }}
                >
                    {/* Start Node */}
                    <div
                        className={`flex flex-col items-center ${isMobile ? 'mx-8' : 'mx-12 md:mx-16 lg:mx-20'} flex-shrink-0`}
                    >
                        <div
                            className={`${isMobile ? 'w-5 h-5' : 'w-5 h-5 md:w-6 md:h-6'} rounded-full border-2 ${colorConfig.border} bg-black relative`}
                        >
                            <div
                                className={`absolute inset-0 rounded-full ${colorConfig.bg} animate-pulse opacity-50`}
                            />
                        </div>
                        <div className={`mt-3 md:mt-4 ${colorConfig.text} font-mono text-xs md:text-sm`}>START</div>
                    </div>

                    {/* Projects */}
                    {timelineProjects.map((project, index) => (
                        <div key={project.id} className="flex items-center flex-shrink-0">
                            {/* Connecting Line */}
                            <div className={`relative h-1 ${isMobile ? 'w-32 sm:w-48' : 'w-64 md:w-80 lg:w-96'}`}>
                                {/* Gray base line */}
                                <div className="absolute inset-0 bg-gray-700" />

                                {/* Progress line */}
                                <div
                                    className="absolute inset-0"
                                    style={{
                                        width: `${Math.min(100, Math.max(0, (scrollProgress * timelineProjects.length - index) * 100))}%`,
                                        background: `linear-gradient(to right, ${colorConfig.primary}, ${colorConfig.light})`,
                                        boxShadow: `0 0 10px rgba(${colorConfig.shadowRgb}, 0.5)`
                                    }}
                                />

                                {/* Circuit trace details */}
                                <div
                                    className={`absolute top-1/2 left-1/4 w-1.5 h-1.5 md:w-2 md:h-2 ${colorConfig.bg} rounded-full transform -translate-y-1/2 opacity-30`}
                                />
                                <div
                                    className={`absolute top-1/2 left-2/4 w-1.5 h-1.5 md:w-2 md:h-2 ${colorConfig.bg} rounded-full transform -translate-y-1/2 opacity-30`}
                                />
                                <div
                                    className={`absolute top-1/2 left-3/4 w-1.5 h-1.5 md:w-2 md:h-2 ${colorConfig.bg} rounded-full transform -translate-y-1/2 opacity-30`}
                                />
                            </div>

                            {/* Project Node */}
                            <div
                                className={`flex flex-col items-center ${isMobile ? (project.position === 'above' ? '-mt-[25vh] sm:-mt-[28vh]' : 'mt-[25vh] sm:mt-[28vh]') : project.position === 'above' ? '-mt-[30vh] md:-mt-[32vh] lg:-mt-[35vh]' : 'mt-[30vh] md:mt-[32vh] lg:mt-[35vh]'}`}
                            >
                                {project.position === 'below' && (
                                    <div
                                        className={`w-1 ${isMobile ? 'h-[25vh] sm:h-[28vh]' : 'h-[30vh] md:h-[32vh] lg:h-[35vh]'} mt-2 relative
                                        ${scrollProgress * timelineProjects.length > index ? 'opacity-100' : 'opacity-30'}`}
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
                                {project.position === 'above' && (
                                    /* Project Label - centered with text wrapping */
                                    <div
                                        className={`mb-3 md:mb-4 flex flex-col items-center w-full text-center font-mono ${isMobile ? 'text-xs' : 'text-xs md:text-sm'} transition-colors duration-300
                                        ${scrollProgress * timelineProjects.length > index ? colorConfig.text : 'text-gray-600'}`}
                                    >
                                        <div
                                            className={`font-bold ${isMobile ? 'max-w-[5rem] sm:max-w-[6rem]' : 'max-w-[6rem] md:max-w-[7rem] lg:max-w-[8rem]'} break-words`}
                                        >
                                            {project.title}
                                        </div>
                                        <div className="text-xs mt-1 whitespace-nowrap">
                                            {project.startdate} - {project.enddate}
                                        </div>
                                    </div>
                                )}

                                {/* Circuit Node */}
                                <div className="group relative" onClick={() => handleNodeClick(project.id)}>
                                    {/* Glow effect */}
                                    <div
                                        className={`absolute inset-0 rounded-lg transition-all duration-300 blur-xl
                                            ${
                                                scrollProgress * timelineProjects.length > index
                                                    ? `${colorConfig.bg} opacity-30 ${isMobile ? (expandedProject === project.id ? 'opacity-100' : '') : 'group-hover:opacity-100'}`
                                                    : 'bg-gray-600 opacity-10'
                                            }`}
                                    />

                                    {/* Node Core */}
                                    <div
                                        className={`cursor-pointer relative ${isMobile ? 'w-10 h-10 sm:w-12 sm:h-12' : 'w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16'} rounded-lg border-2 transition-all duration-300 ${isMobile ? (expandedProject === project.id ? `${colorConfig.border} scale-110` : '') : `group-hover:${colorConfig.border} group-hover:scale-110`}
                                            ${
                                                scrollProgress * timelineProjects.length > index
                                                    ? `${colorConfig.border} bg-black`
                                                    : 'border-gray-600 bg-black'
                                            }`}
                                    >
                                        {/* Circuit pattern */}
                                        <div
                                            className={`absolute inset-2 border ${colorConfig.borderOpacity} rounded`}
                                        />
                                        <div
                                            className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${isMobile ? 'w-2 h-2' : 'w-2 h-2 md:w-2.5 md:h-2.5 lg:w-3 lg:h-3'} ${colorConfig.bg} rounded-full animate-pulse`}
                                        />

                                        {/* Corner details */}
                                        <div
                                            className={`absolute top-0 left-0 w-1.5 h-1.5 md:w-2 md:h-2 border-t-2 border-l-2 ${colorConfig.border}`}
                                        />
                                        <div
                                            className={`absolute top-0 right-0 w-1.5 h-1.5 md:w-2 md:h-2 border-t-2 border-r-2 ${colorConfig.border}`}
                                        />
                                        <div
                                            className={`absolute bottom-0 left-0 w-1.5 h-1.5 md:w-2 md:h-2 border-b-2 border-l-2 ${colorConfig.border}`}
                                        />
                                        <div
                                            className={`absolute bottom-0 right-0 w-1.5 h-1.5 md:w-2 md:h-2 border-b-2 border-r-2 ${colorConfig.border}`}
                                        />
                                    </div>

                                    {/* Expanded Card - moves with timeline */}
                                    <div
                                        className={`absolute ${project.position === 'below' ? 'bottom-16 sm:bottom-18 md:bottom-20' : 'top-16 sm:top-18 md:top-20'} 
                                            left-1/2 transform -translate-x-1/2 ${isMobile ? 'w-64 sm:w-72' : 'w-72 md:w-80'} 
                                            max-h-[70vh] overflow-y-auto
                                            bg-black border-2 ${colorConfig.border} 
                                            rounded-lg ${isMobile ? 'p-3 sm:p-4' : 'p-4 md:p-6'} transition-all duration-300 z-10
                                            ${
                                                isMobile
                                                    ? expandedProject === project.id &&
                                                      scrollProgress * timelineProjects.length > index
                                                        ? 'opacity-100 pointer-events-auto'
                                                        : 'opacity-0 pointer-events-none'
                                                    : `opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto ${scrollProgress * timelineProjects.length > index ? 'opacity-100' : 'opacity-0'}`
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
                                                {project.startdate} - {project.enddate}
                                            </div>

                                            {/* Title - with text wrapping */}
                                            <h3
                                                className={`text-white font-bold ${isMobile ? 'text-base sm:text-lg' : 'text-lg md:text-xl'} mb-3 border-l-2 ${colorConfig.border} pl-3 break-words`}
                                            >
                                                {project.title}
                                            </h3>

                                            {/* Description */}
                                            <p
                                                className={`text-gray-300 ${isMobile ? 'text-xs' : 'text-xs md:text-sm'} mb-4 leading-relaxed`}
                                            >
                                                {project.description}
                                            </p>

                                            {/* Tech Stack */}
                                            {project.tech.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 md:gap-2 mb-4">
                                                    {project.tech.slice(0, isMobile ? 4 : 6).map((tech, i) => (
                                                        <span
                                                            key={i}
                                                            className={`px-2 py-1 ${colorConfig.bgOpacity} border ${colorConfig.borderOpacity} ${colorConfig.text} text-xs font-mono rounded`}
                                                        >
                                                            {tech}
                                                        </span>
                                                    ))}
                                                    {isMobile && project.tech.length > 4 && (
                                                        <span
                                                            className={`px-2 py-1 ${colorConfig.text} text-xs font-mono`}
                                                        >
                                                            +{project.tech.length - 4} more
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* View Project Button */}
                                            <button
                                                onClick={(e) => viewProjectClick(project.url, e)}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = `rgba(${colorConfig.shadowRgb}, 0.1)`;
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                                className={`cursor-pointer w-full py-2 border ${colorConfig.border} ${colorConfig.text} font-mono ${isMobile ? 'text-xs' : 'text-xs md:text-sm'} rounded transition-colors`}
                                            >
                                                VIEW PROJECT →
                                            </button>

                                            {/* Circuit decoration */}
                                            <div
                                                className={`absolute -top-3 -right-3 w-5 h-5 md:w-6 md:h-6 border-2 ${colorConfig.border} rounded-full bg-black flex items-center justify-center`}
                                            >
                                                <div
                                                    className={`w-1.5 h-1.5 md:w-2 md:h-2 ${colorConfig.bg} rounded-full`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {project.position === 'above' && (
                                    <div
                                        className={`w-1 rotate-180 ${isMobile ? 'h-[25vh] sm:h-[28vh]' : 'h-[30vh] md:h-[32vh] lg:h-[35vh]'} mb-2 relative
                                        ${scrollProgress * timelineProjects.length > index ? 'opacity-100' : 'opacity-30'}`}
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
                                {project.position === 'below' && (
                                    /* Project Label - centered with text wrapping */
                                    <div
                                        className={`mt-3 md:mt-4 flex flex-col items-center w-full text-center font-mono ${isMobile ? 'text-xs' : 'text-xs md:text-sm'} transition-colors duration-300
                                        ${scrollProgress * timelineProjects.length > index ? colorConfig.text : 'text-gray-600'}`}
                                    >
                                        <div
                                            className={`font-bold ${isMobile ? 'max-w-[5rem] sm:max-w-[6rem]' : 'max-w-[6rem] md:max-w-[7rem] lg:max-w-[8rem]'} break-words`}
                                        >
                                            {project.title}
                                        </div>
                                        <div className="text-xs mt-1 whitespace-nowrap">
                                            {project.startdate} - {project.enddate}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* End Node */}
                    <div
                        className={`flex flex-col items-center ${isMobile ? 'mx-8' : 'mx-12 md:mx-16 lg:mx-20'} flex-shrink-0`}
                    >
                        <div
                            className={`${isMobile ? 'w-5 h-5' : 'w-5 h-5 md:w-6 md:h-6'} rounded-full border-2 transition-colors duration-300 relative
                                ${scrollProgress > 0.95 ? `${colorConfig.border} bg-black` : 'border-gray-600 bg-black'}`}
                        >
                            {scrollProgress > 0.95 && (
                                <div
                                    className={`absolute inset-0 rounded-full ${colorConfig.bg} animate-pulse opacity-50`}
                                />
                            )}
                        </div>
                        <div
                            className={`mt-3 md:mt-4 font-mono text-xs md:text-sm transition-colors duration-300
                                ${scrollProgress > 0.95 ? colorConfig.text : 'text-gray-600'}`}
                        >
                            END
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll Instruction */}
            <div
                className={`absolute ${isMobile ? 'bottom-4 sm:bottom-6' : 'bottom-8 md:bottom-10'} left-1/2 transform -translate-x-1/2 
                    ${colorConfig.text} font-mono ${isMobile ? 'text-xs px-3 py-2' : 'text-xs md:text-sm px-4 md:px-6 py-2 md:py-3'} flex items-center gap-2 md:gap-3 
                    bg-black/80 border ${colorConfig.borderOpacity} rounded-lg
                    animate-bounce z-40`}
            >
                <div className={`w-1.5 h-1.5 md:w-2 md:h-2 ${colorConfig.bg} rounded-full animate-pulse`} />
                {isMobile ? 'DRAG TO NAVIGATE' : 'SCROLL DOWN TO NAVIGATE TIMELINE'}
                <div className={`w-1.5 h-1.5 md:w-2 md:h-2 ${colorConfig.bg} rounded-full animate-pulse`} />
            </div>

            {/* Progress Indicator */}
            <div
                className={`absolute ${isMobile ? 'top-4 sm:top-6' : 'top-8 md:top-10'} left-1/2 font-mono ${colorConfig.text} ${isMobile ? 'text-xs px-2.5 py-1.5' : 'text-xs md:text-sm px-3 md:px-4 py-1.5 md:py-2'} 
                    bg-black/80 border ${colorConfig.borderOpacity} rounded transform -translate-x-1/2 z-40`}
            >
                <div className="flex items-center gap-1.5 md:gap-2">
                    <div className={`w-1.5 h-1.5 md:w-2 md:h-2 ${colorConfig.bg} rounded-full`} />
                    PROGRESS: {Math.round(scrollProgress * 100)}%
                </div>
            </div>

            {/* Global styles for hiding scrollbar and ensuring smooth scrolling */}
            <style jsx>{`
                /* Hide scrollbar while maintaining scroll functionality */
                .timeline-container::-webkit-scrollbar {
                    display: none;
                    width: 0;
                    height: 0;
                }

                .timeline-desktop-scroll::-webkit-scrollbar {
                    display: none;
                    width: 0;
                    height: 0;
                }

                /* Ensure smooth touch scrolling on iOS */
                .timeline-container {
                    -webkit-overflow-scrolling: touch;
                }

                /* Smooth cursor transition */
                .timeline-container {
                    transition: cursor 0.15s ease;
                }
            `}</style>
        </div>
    );
};

export default ProjectsTimeline;
