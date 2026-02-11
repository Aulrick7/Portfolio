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
    const containerRef = useRef<HTMLDivElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const [selected, setSelected] = useState(false);

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

    // Handle scroll to move timeline horizontally
    useEffect(() => {
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
    }, []);

    const handleNodeClick = () => {};
    const viewProjectClick = (url: string) => {
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

            {/* Scroll Container */}
            <div
                ref={containerRef}
                className="absolute inset-0 overflow-y-scroll overflow-x-hidden"
                style={{ height: '100vh' }}
            >
                {/* Spacer to enable scrolling */}
                <div style={{ height: '500vh' }} />
            </div>

            {/* Timeline Container - Fixed position, moves via transform */}
            <div className="absolute inset-0 pointer-events-none flex items-center">
                <div
                    ref={timelineRef}
                    className="flex items-center transition-transform duration-100 ease-linear pointer-events-auto"
                    style={{
                        width: `${timelineProjects.length * 600}px`,
                        willChange: 'transform'
                    }}
                >
                    {/* Start Node */}
                    <div className="flex flex-col items-center mx-20">
                        <div className="w-6 h-6 rounded-full border-2 border-cyan-400 bg-black relative">
                            <div className="absolute inset-0 rounded-full bg-cyan-400 animate-pulse opacity-50" />
                        </div>
                        <div className="mt-4 text-cyan-400 font-mono text-sm">START</div>
                    </div>

                    {/* Projects */}
                    {timelineProjects.map((project, index) => (
                        <div key={project.id} className="flex items-center">
                            {/* Connecting Line */}
                            <div className="relative h-1 w-96">
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
                                className={`flex flex-col items-center ${project.position === 'above' ? '-mt-80' : 'mt-80'}`}
                            >
                                {project.position === 'below' && (
                                    <div
                                        className={`w-1 h-72 mt-2 bg-gradient-to-b from-gray-1000 to-cyan-600 relative
                                        ${scrollProgress * timelineProjects.length > index ? 'opacity-100' : 'opacity-30'}`}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-cyan-600 opacity-50" />
                                    </div>
                                )}
                                {project.position === 'above' && (
                                    /* Project Label */
                                    <div
                                        className={`mb-4 flex flex-col text-center font-mono text-sm transition-colors duration-300
                                        ${scrollProgress * timelineProjects.length > index ? 'text-cyan-400' : 'text-gray-600'}`}
                                    >
                                        <div className="font-bold w-30">{project.title}</div>
                                        <div className="text-xs mt-1">
                                            {project.startdate} - {project.enddate}
                                        </div>
                                    </div>
                                )}

                                {/* Circuit Node */}
                                <div className="group relative ">
                                    {/* Glow effect */}
                                    <div
                                        className={`absolute  inset-0 rounded-lg transition-all duration-300 
                                            ${
                                                scrollProgress * timelineProjects.length > index
                                                    ? 'bg-cyan-400 blur-xl opacity-30 group-hover:opacity-100'
                                                    : 'bg-gray-600 blur-xl opacity-10'
                                            }`}
                                    />

                                    {/* Node Core */}
                                    <div
                                        className={`relative w-16 h-16 rounded-lg border-2 transition-all duration-300 cursor-pointer group-hover:border-cyan-400
                                            ${
                                                scrollProgress * timelineProjects.length > index
                                                    ? 'border-cyan-400 bg-black group-hover:scale-110 '
                                                    : 'border-gray-600 bg-black'
                                            }`}
                                    >
                                        {/* Circuit pattern */}
                                        <div className="absolute inset-2 border border-cyan-400/30 rounded" />
                                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-cyan-400 rounded-full animate-pulse" />

                                        {/* Corner details */}
                                        <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400" />
                                        <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-400" />
                                        <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyan-400" />
                                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-400" />
                                    </div>
                                    {/* Expanded Card on Hover */}
                                    <div
                                        className={`absolute ${project.position === 'below' ? 'bottom-20' : 'top-20'} 
                                            left-1/2 transform -translate-x-1/2 w-80 bg-black border-2 border-cyan-400 
                                            rounded-lg p-6 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:pointer-events-auto z-10
                                            shadow-[0_0_20px_rgba(0,255,255,0.3)]
                                            ${
                                                scrollProgress * timelineProjects.length > index
                                                    ? 'opacity-100 '
                                                    : 'opacity-0'
                                            }`}
                                    >
                                        {/* Card glow */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 to-blue-500/10 rounded-lg" />

                                        <div className="relative">
                                            {/* startdate */}
                                            <div className="text-cyan-400 font-mono text-xs mb-2 flex items-center gap-2">
                                                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                                                {project.startdate} - {project.enddate}
                                            </div>

                                            {/* Title */}
                                            <h3 className="text-white font-bold text-xl mb-3 border-l-2 border-cyan-400 pl-3">
                                                {project.title}
                                            </h3>

                                            {/* Description */}
                                            <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                                                {project.description}
                                            </p>

                                            {/* Tech Stack */}
                                            {project.tech.length > 0 && (
                                                <div className="flex flex-wrap gap-2 mb-4">
                                                    {project.tech.map((tech, i) => (
                                                        <span
                                                            key={i}
                                                            className="px-3 py-1 bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 text-xs font-mono rounded"
                                                        >
                                                            {tech}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* View Project Button */}
                                            <button
                                                onClick={() => viewProjectClick(project.url)}
                                                className="w-full py-2 border border-cyan-400 text-cyan-400 font-mono text-sm rounded hover:bg-cyan-400/10 transition-colors"
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
                                        className={`w-1 rotate-180 h-72 mb-2 bg-gradient-to-b from-gray-1000 to-cyan-600 relative
                                        ${scrollProgress * timelineProjects.length > index ? 'opacity-100' : 'opacity-30'}`}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-cyan-600 opacity-50" />
                                    </div>
                                )}
                                {project.position === 'below' && (
                                    /* Project Label */
                                    <div
                                        className={`mt-4 flex flex-col text-center font-mono text-sm transition-colors duration-300
                                        ${scrollProgress * timelineProjects.length > index ? 'text-cyan-400' : 'text-gray-600'}`}
                                    >
                                        <div className="font-bold w-30">{project.title}</div>
                                        <div className="text-xs mt-1">
                                            {project.startdate} - {project.enddate}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* End Node */}
                    <div className="flex flex-col items-center mx-20">
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
                className="absolute bottom-10 left-1/2 transform -translate-x-1/2 
                    text-cyan-400 font-mono text-sm flex items-center gap-3 
                    bg-black/80 border border-cyan-400/30 px-6 py-3 rounded-lg
                    animate-bounce"
            >
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                SCROLL DOWN TO NAVIGATE TIMELINE
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            </div>

            {/* Progress Indicator */}
            <div
                className="absolute left-1/2 font-mono text-cyan-400 text-sm 
                    bg-black/80 border border-cyan-400/30 px-4 py-2 rounded transform -translate-x-1/2 "
            >
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                    PROGRESS: {Math.round(scrollProgress * 100)}%
                </div>
            </div>
        </div>
    );
};

export default ProjectsTimeline;
