import { ProjectLayout } from '@/types';
import dayjs from 'dayjs';
import React, { useEffect, useRef, useState } from 'react';

interface ProjectsTimelineProps {
    projects: ProjectLayout[];
}

interface TimelineProject {
    id: string;
    title: string;
    startdate: string;
    enddate: string;
    description: string;
    tech: string[];
    position: 'above' | 'below';
    url: string;
}

const ProjectsTimeline: React.FC<ProjectsTimelineProps> = ({ projects }) => {
    const [scrollProgress, setScrollProgress] = useState(0);
    const [expandedProject, setExpandedProject] = useState<string | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);

    // Detect mobile device
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

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

    const handleNodeClick = (projectId: string) => {
        setExpandedProject(expandedProject === projectId ? null : projectId);
    };

    const viewProjectClick = (url: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (url && url !== '#') {
            window.location.href = url;
        }
    };

    return (
        <div className="relative w-full h-screen overflow-hidden bg-black">
            {/* Grid Background */}
            <div className="absolute inset-0 opacity-20">
                <div
                    className="w-full h-full"
                    style={{
                        backgroundImage: `
                            linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
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
                        scrollbarWidth: 'none', /* Firefox */
                        msOverflowStyle: 'none'  /* IE and Edge */
                    }}
                >
                    {/* Spacer to enable scrolling */}
                    <div style={{ height: '500vh' }} />
                </div>
            )}

            {/* Timeline Container */}
            <div className={`absolute inset-0 flex items-center ${isMobile ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                <div
                    ref={timelineRef}
                    className={`flex items-center transition-transform ${isMobile ? 'overflow-x-scroll scrollbar-hide pointer-events-auto px-10' : 'duration-100 ease-linear pointer-events-auto'}`}
                    style={isMobile ? {
                        width: '100%',
                        scrollSnapType: 'x proximity',
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'none', /* Firefox */
                        msOverflowStyle: 'none'  /* IE and Edge */
                    } : {
                        width: `${timelineProjects.length * 600}px`,
                        willChange: 'transform'
                    }}
                >
                    {/* Start Node */}
                    <div className={`flex flex-col items-center ${isMobile ? 'mx-10' : 'mx-20'} flex-shrink-0`}>
                        <div className="w-6 h-6 rounded-full border-2 border-cyan-400 bg-black relative">
                            <div className="absolute inset-0 rounded-full bg-cyan-400 animate-pulse opacity-50" />
                        </div>
                        <div className="mt-4 text-cyan-400 font-mono text-sm">START</div>
                    </div>

                    {/* Projects */}
                    {timelineProjects.map((project, index) => (
                        <div key={project.id} className="flex items-center flex-shrink-0" style={isMobile ? { scrollSnapAlign: 'center' } : {}}>
                            {/* Connecting Line */}
                            <div className={`relative h-1 ${isMobile ? 'w-40 sm:w-60' : 'w-96'}`}>
                                {/* Gray base line */}
                                <div className="absolute inset-0 bg-gray-700" />

                                {/* Blue progress line */}
                                <div
                                    className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_10px_rgba(0,255,255,0.5)]"
                                    style={{
                                        width: `${Math.min(100, Math.max(0, (scrollProgress * timelineProjects.length - index) * 100))}%`
                                    }}
                                />

                                {/* Circuit trace details */}
                                <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-cyan-400 rounded-full transform -translate-y-1/2 opacity-30" />
                                <div className="absolute top-1/2 left-2/4 w-2 h-2 bg-cyan-400 rounded-full transform -translate-y-1/2 opacity-30" />
                                <div className="absolute top-1/2 left-3/4 w-2 h-2 bg-cyan-400 rounded-full transform -translate-y-1/2 opacity-30" />
                            </div>

                            {/* Project Node */}
                            <div
                                className={`flex flex-col items-center ${isMobile ? (project.position === 'above' ? '-mt-48 sm:-mt-64' : 'mt-48 sm:mt-64') : (project.position === 'above' ? '-mt-80' : 'mt-80')}`}
                            >
                                {project.position === 'below' && (
                                    <div
                                        className={`w-1 ${isMobile ? 'h-44 sm:h-60' : 'h-72'} mt-2 bg-gradient-to-b from-gray-1000 to-cyan-600 relative
                                        ${scrollProgress * timelineProjects.length > index ? 'opacity-100' : 'opacity-30'}`}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-cyan-600 opacity-50" />
                                    </div>
                                )}
                                {project.position === 'above' && (
                                    /* Project Label */
                                    <div
                                        className={`mb-4 flex flex-col text-center font-mono ${isMobile ? 'text-xs' : 'text-sm'} transition-colors duration-300
                                        ${scrollProgress * timelineProjects.length > index ? 'text-cyan-400' : 'text-gray-600'}`}
                                    >
                                        <div className={`font-bold ${isMobile ? 'w-20' : 'w-30'}`}>{project.title}</div>
                                        <div className="text-xs mt-1">
                                            {project.startdate} - {project.enddate}
                                        </div>
                                    </div>
                                )}

                                {/* Circuit Node */}
                                <div 
                                    className="group relative cursor-pointer"
                                    onClick={() => handleNodeClick(project.id)}
                                >
                                    {/* Glow effect */}
                                    <div
                                        className={`absolute inset-0 rounded-lg transition-all duration-300 
                                            ${
                                                scrollProgress * timelineProjects.length > index
                                                    ? `bg-cyan-400 blur-xl opacity-30 ${isMobile ? (expandedProject === project.id ? 'opacity-100' : '') : 'group-hover:opacity-100'}`
                                                    : 'bg-gray-600 blur-xl opacity-10'
                                            }`}
                                    />

                                    {/* Node Core */}
                                    <div
                                        className={`relative ${isMobile ? 'w-12 h-12' : 'w-16 h-16'} rounded-lg border-2 transition-all duration-300 ${isMobile ? (expandedProject === project.id ? 'border-cyan-400 scale-110' : '') : 'group-hover:border-cyan-400 group-hover:scale-110'}
                                            ${
                                                scrollProgress * timelineProjects.length > index
                                                    ? 'border-cyan-400 bg-black'
                                                    : 'border-gray-600 bg-black'
                                            }`}
                                    >
                                        {/* Circuit pattern */}
                                        <div className="absolute inset-2 border border-cyan-400/30 rounded" />
                                        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${isMobile ? 'w-2 h-2' : 'w-3 h-3'} bg-cyan-400 rounded-full animate-pulse`} />

                                        {/* Corner details */}
                                        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400" />
                                        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-400" />
                                        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyan-400" />
                                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-400" />
                                    </div>

                                    {/* Expanded Card - Mobile: on click, Desktop: on hover */}
                                    <div
                                        className={`absolute ${project.position === 'below' ? (isMobile ? 'bottom-16' : 'bottom-20') : (isMobile ? 'top-16' : 'top-20')} 
                                            left-1/2 transform -translate-x-1/2 ${isMobile ? 'w-72' : 'w-80'} bg-black border-2 border-cyan-400 
                                            rounded-lg ${isMobile ? 'p-4' : 'p-6'} transition-all duration-300 z-10
                                            shadow-[0_0_20px_rgba(0,255,255,0.3)]
                                            ${
                                                isMobile 
                                                    ? (expandedProject === project.id && scrollProgress * timelineProjects.length > index ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none')
                                                    : `opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto ${scrollProgress * timelineProjects.length > index ? '' : 'opacity-0'}`
                                            }`}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {/* Card glow */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 to-blue-500/10 rounded-lg" />

                                        <div className="relative">
                                            {/* Date */}
                                            <div className="text-cyan-400 font-mono text-xs mb-2 flex items-center gap-2">
                                                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                                                {project.startdate} - {project.enddate}
                                            </div>

                                            {/* Title */}
                                            <h3 className={`text-white font-bold ${isMobile ? 'text-lg' : 'text-xl'} mb-3 border-l-2 border-cyan-400 pl-3`}>
                                                {project.title}
                                            </h3>

                                            {/* Description */}
                                            <p className={`text-gray-300 ${isMobile ? 'text-xs' : 'text-sm'} mb-4 leading-relaxed`}>
                                                {project.description}
                                            </p>

                                            {/* Tech Stack */}
                                            {project.tech.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {project.tech.slice(0, isMobile ? 4 : 6).map((tech, i) => (
                                                        <span
                                                            key={i}
                                                            className="px-2 py-1 bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 text-xs font-mono rounded"
                                                        >
                                                            {tech}
                                                        </span>
                                                    ))}
                                                    {isMobile && project.tech.length > 4 && (
                                                        <span className="px-2 py-1 text-cyan-400 text-xs font-mono">
                                                            +{project.tech.length - 4} more
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* View Project Button */}
                                            <button
                                                onClick={(e) => viewProjectClick(project.url, e)}
                                                className={`w-full ${isMobile ? 'py-2' : 'py-2'} border border-cyan-400 text-cyan-400 font-mono ${isMobile ? 'text-xs' : 'text-sm'} rounded hover:bg-cyan-400/10 transition-colors`}
                                            >
                                                VIEW PROJECT →
                                            </button>

                                            {/* Circuit decoration */}
                                            <div className="absolute -top-3 -right-3 w-6 h-6 border-2 border-cyan-400 rounded-full bg-black flex items-center justify-center">
                                                <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {project.position === 'above' && (
                                    <div
                                        className={`w-1 rotate-180 ${isMobile ? 'h-44 sm:h-60' : 'h-72'} mb-2 bg-gradient-to-b from-gray-1000 to-cyan-600 relative
                                        ${scrollProgress * timelineProjects.length > index ? 'opacity-100' : 'opacity-30'}`}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-cyan-600 opacity-50" />
                                    </div>
                                )}
                                {project.position === 'below' && (
                                    /* Project Label */
                                    <div
                                        className={`mt-4 flex flex-col text-center font-mono ${isMobile ? 'text-xs' : 'text-sm'} transition-colors duration-300
                                        ${scrollProgress * timelineProjects.length > index ? 'text-cyan-400' : 'text-gray-600'}`}
                                    >
                                        <div className={`font-bold ${isMobile ? 'w-20' : 'w-30'}`}>{project.title}</div>
                                        <div className="text-xs mt-1">
                                            {project.startdate} - {project.enddate}
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
                                ${scrollProgress > 0.95 ? 'border-cyan-400 bg-black' : 'border-gray-600 bg-black'}`}
                        >
                            {scrollProgress > 0.95 && (
                                <div className="absolute inset-0 rounded-full bg-cyan-400 animate-pulse opacity-50" />
                            )}
                        </div>
                        <div
                            className={`mt-4 font-mono text-sm transition-colors duration-300
                                ${scrollProgress > 0.95 ? 'text-cyan-400' : 'text-gray-600'}`}
                        >
                            END
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll Instruction */}
            <div
                className={`absolute ${isMobile ? 'bottom-6' : 'bottom-10'} left-1/2 transform -translate-x-1/2 
                    text-cyan-400 font-mono ${isMobile ? 'text-xs px-4 py-2' : 'text-sm px-6 py-3'} flex items-center gap-3 
                    bg-black/80 border border-cyan-400/30 rounded-lg
                    animate-bounce`}
            >
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                {isMobile ? 'SWIPE TO NAVIGATE' : 'SCROLL DOWN TO NAVIGATE TIMELINE'}
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            </div>

            {/* Progress Indicator */}
            <div
                className={`absolute ${isMobile ? 'top-6' : 'top-10'} left-1/2 font-mono text-cyan-400 ${isMobile ? 'text-xs px-3 py-1.5' : 'text-sm px-4 py-2'} 
                    bg-black/80 border border-cyan-400/30 rounded transform -translate-x-1/2`}
            >
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full" />
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

export default ProjectsTimeline;
