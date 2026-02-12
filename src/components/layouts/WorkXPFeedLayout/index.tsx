import { DynamicComponent } from '@/components/components-registry';
import WorkXPTimeline from '@/components/sections/WorkXPTimeline';
import { PageComponentProps, WorkXPFeedLayout, WorkXPLayout } from '@/types';
import { useRouter } from 'next/router';
import * as React from 'react';
import BaseLayout from '../BaseLayout';

type ComponentProps = PageComponentProps & WorkXPFeedLayout & { items: WorkXPLayout[] };

const Component: React.FC<ComponentProps> = (props) => {
    const { topSections = [], bottomSections = [], items } = props;
    const router = useRouter();
    const filterParam = router.query.filter as string | undefined;

    // Determine color based on URL filter parameter - using red for work experience
    const colour = React.useMemo<'red'>(() => {
        return 'red';
    }, [filterParam]);

    // Filter work experiences based on URL query parameter
    const filteredWorkXP = React.useMemo(() => {
        if (!filterParam || filterParam === 'all') {
            return items;
        }
        return items.filter((workxp) => workxp.filter === filterParam);
    }, [items, filterParam]);

    const handleFilterChange = (filter: string) => {
        if (filter === 'all') {
            router.push('/workXP');
        } else {
            router.push(`/workXP?filter=${filter}`);
        }
    };

    return (
        <BaseLayout {...props}>
            {topSections?.map((section, index) => {
                return <DynamicComponent key={index} {...section} />;
            })}

            {/* Filter Switcher
            <div className="fixed top-20 z-20 flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                    onClick={() => handleFilterChange('all')}
                    className={`px-4 sm:px-6 py-2 sm:py-3 font-mono text-xs sm:text-sm border-2 rounded-lg transition-all duration-300 ${
                        !filterParam || filterParam === 'all'
                            ? 'bg-red-400/20 border-red-400 text-red-400 shadow-[0_0_20px_rgba(255,0,0,0.3)]'
                            : 'bg-black/80 border-gray-600 text-gray-400 hover:border-red-400 hover:text-red-400'
                    }`}
                >
                    ALL
                </button>
                <button
                    onClick={() => handleFilterChange('work')}
                    className={`px-4 sm:px-6 py-2 sm:py-3 font-mono text-xs sm:text-sm border-2 rounded-lg transition-all duration-300 ${
                        filterParam === 'work'
                            ? 'bg-red-400/20 border-red-400 text-red-400 shadow-[0_0_20px_rgba(255,0,0,0.3)]'
                            : 'bg-black/80 border-gray-600 text-gray-400 hover:border-red-400 hover:text-red-400'
                    }`}
                >
                    💼 WORK
                </button>
            </div> */}

            {/* Replace the grid with timeline */}
            <WorkXPTimeline workExperiences={filteredWorkXP} colour={colour} />
            {bottomSections?.map((section, index) => {
                return <DynamicComponent key={index} {...section} />;
            })}
        </BaseLayout>
    );
};
export default Component;
