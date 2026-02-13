import classNames from 'classnames';
import Markdown from 'markdown-to-jsx';
import * as React from 'react';

import { Annotated } from '@/components/Annotated';
import Link from '@/components/atoms/Link';
import { DynamicComponent } from '@/components/components-registry';
import ImageBlock from '@/components/molecules/ImageBlock';
import { PageComponentProps, ProjectLayout } from '@/types';
import HighlightedPreBlock from '@/utils/highlighted-markdown';
import BaseLayout from '../BaseLayout';

type ComponentProps = PageComponentProps &
    ProjectLayout & {
        prevProject?: ProjectLayout;
        nextProject?: ProjectLayout;
    };

const Component: React.FC<ComponentProps> = (props) => {
    const {
        title,
        startdate,
        enddate,
        client,
        description,
        markdownContent,
        media,
        prevProject,
        nextProject,
        bottomSections = []
    } = props;

    return (
        <BaseLayout {...props}>
            <article className="flex flex-col px-4 py-14 lg:py-20">
                <header className="flex flex-col w-full max-w-5xl mx-auto mb-10 sm:mb-14">
                    {client && <div className="text-lg uppercase md:mb-6">{client}</div>}
                    <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-end">
                        <h1 className="text-5xl sm:text-6xl md:max-w-2xl md:flex-1">{title}</h1>
                        <time className="text-lg md:flex-shrink-0" dateTime={startdate}>
                            {startdate} - {enddate}
                        </time>
                    </div>
                    {bottomSections?.map((section, index) => {
                        return <DynamicComponent key={index} {...section} />;
                    })}
                </header>
                {description && (
                    <div className="flex justify-center w-full mb-10 sm:mb-14">
                        <div className="w-full max-w-3xl text-lg uppercase sm:text-xl">{description}</div>
                    </div>
                )}
                {media && (
                    <figure className="flex justify-center w-full mb-10 sm:mb-14">
                        <div className="w-full max-w-5xl">
                            <ProjectMedia media={media} />
                        </div>
                    </figure>
                )}

                {markdownContent && (
                    <div className="flex justify-center w-full">
                        <Markdown
                            options={{ forceBlock: true, overrides: { pre: HighlightedPreBlock } }}
                            className="w-full max-w-3xl prose sm:prose-lg"
                        >
                            {markdownContent}
                        </Markdown>
                    </div>
                )}
            </article>

            {(prevProject || nextProject) && (
                <nav className="flex justify-center px-4 mt-12 mb-20">
                    <div className="flex flex-col w-full max-w-5xl gap-12 sm:flex-row sm:justify-between sm:items-start">
                        {nextProject && (
                            <div className="flex flex-1 w-full sm:w-auto">
                                <ProjectNavItem project={nextProject} className={undefined} />
                            </div>
                        )}
                        {prevProject && (
                            <div className="flex flex-1 w-full sm:w-auto sm:justify-end">
                                <ProjectNavItem project={prevProject} className="sm:items-end" />
                            </div>
                        )}
                    </div>
                </nav>
            )}
        </BaseLayout>
    );
};
export default Component;

function ProjectMedia({ media }) {
    return <DynamicComponent {...media} className={classNames({ 'w-full': media.type === 'ImageBlock' })} />;
}

function ProjectNavItem({ project, className }) {
    return (
        <Annotated content={project}>
            <Link className={classNames('group flex flex-col gap-6 items-start w-full', className)} href={project}>
                {project.featuredImage && (
                    <div className="w-full overflow-hidden aspect-3/2">
                        <ImageBlock
                            {...project.featuredImage}
                            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                        />
                    </div>
                )}
                <span className="text-lg leading-tight uppercase transition bottom-shadow-1 group-hover:bottom-shadow-5">
                    {project.title}
                </span>
            </Link>
        </Annotated>
    );
}
