import { DynamicComponent } from '@/components/components-registry';
import ProjectsTimeline from '@/components/sections/ProjectsTimeline';
import { PageComponentProps, ProjectFeedLayout, ProjectLayout } from '@/types';
import { useRouter } from 'next/router';
import * as React from 'react';
import BaseLayout from '../BaseLayout';

type ComponentProps = PageComponentProps & ProjectFeedLayout & { items: ProjectLayout[] };

const Component: React.FC<ComponentProps> = (props) => {
    const { topSections = [], bottomSections = [], items } = props;
    const router = useRouter();
    const filterParam = router.query.filter as string | undefined;

    // Filter projects based on URL query parameter
    const filteredProjects = React.useMemo(() => {
        if (!filterParam || filterParam === 'all') {
            return items;
        }
        return items.filter((project) => project.filter === filterParam);
    }, [items, filterParam]);

    const handleFilterChange = (filter: string) => {
        if (filter === 'all') {
            router.push('/projects');
        } else {
            router.push(`/projects?filter=${filter}`);
        }
    };

    return (
        <BaseLayout {...props}>
            {topSections?.map((section, index) => {
                return <DynamicComponent key={index} {...section} />;
            })}

            {/* Filter Switcher */}
            <div className="fixed top-6 right-6 z-20 flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                    onClick={() => handleFilterChange('all')}
                    className={`px-4 sm:px-6 py-2 sm:py-3 font-mono text-xs sm:text-sm border-2 rounded-lg transition-all duration-300 ${
                        !filterParam || filterParam === 'all'
                            ? 'bg-cyan-400/20 border-cyan-400 text-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.3)]'
                            : 'bg-black/80 border-gray-600 text-gray-400 hover:border-cyan-400 hover:text-cyan-400'
                    }`}
                >
                    ALL
                </button>
                <button
                    onClick={() => handleFilterChange('game')}
                    className={`px-4 sm:px-6 py-2 sm:py-3 font-mono text-xs sm:text-sm border-2 rounded-lg transition-all duration-300 ${
                        filterParam === 'game'
                            ? 'bg-cyan-400/20 border-cyan-400 text-cyan-400 shadow-[0_0_20px_rgba(0,255,255,0.3)]'
                            : 'bg-black/80 border-gray-600 text-gray-400 hover:border-cyan-400 hover:text-cyan-400'
                    }`}
                >
                    🎮 GAME
                </button>
                <button
                    onClick={() => handleFilterChange('software')}
                    className={`px-4 sm:px-6 py-2 sm:py-3 font-mono text-xs sm:text-sm border-2 rounded-lg transition-all duration-300 ${
                        filterParam === 'software'
                            ? 'bg-pink-400/20 border-pink-400 text-pink-400 shadow-[0_0_20px_rgba(255,0,255,0.3)]'
                            : 'bg-black/80 border-gray-600 text-gray-400 hover:border-pink-400 hover:text-pink-400'
                    }`}
                >
                    💻 SOFTWARE
                </button>
            </div>

            {/* Replace the grid with timeline */}
            <ProjectsTimeline projects={filteredProjects} />
            {bottomSections?.map((section, index) => {
                return <DynamicComponent key={index} {...section} />;
            })}
        </BaseLayout>
    );
};
export default Component;
