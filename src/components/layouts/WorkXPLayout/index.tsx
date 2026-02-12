import classNames from 'classnames';
import Markdown from 'markdown-to-jsx';
import * as React from 'react';

import { Annotated } from '@/components/Annotated';
import Link from '@/components/atoms/Link';
import { DynamicComponent } from '@/components/components-registry';
import ImageBlock from '@/components/molecules/ImageBlock';
import { PageComponentProps, WorkXPLayout } from '@/types';
import HighlightedPreBlock from '@/utils/highlighted-markdown';
import BaseLayout from '../BaseLayout';

type ComponentProps = PageComponentProps &
    WorkXPLayout & {
        prevWorkXP?: WorkXPLayout;
        nextWorkXP?: WorkXPLayout;
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
        prevWorkXP,
        nextWorkXP,
        bottomSections = []
    } = props;

    return (
        <BaseLayout {...props}>
            <article className="px-4 py-14 lg:py-20">
                <header className="max-w-5xl mx-auto mb-10 sm:mb-14">
                    {client && <div className="text-lg uppercase md:mb-6">{client}</div>}
                    <div className="flex flex-col md:flex-row md:justify-between">
                        <time className="text-lg md:order-last" dateTime={startdate}>
                            {startdate} - {enddate || 'Present'}
                        </time>
                        <h1 className="text-5xl sm:text-6xl md:max-w-2xl md:grow">{title}</h1>
                    </div>
                    {bottomSections?.map((section, index) => {
                        return <DynamicComponent key={index} {...section} />;
                    })}
                </header>
                {description && (
                    <div className="max-w-3xl mx-auto mb-10 text-lg uppercase sm:text-xl sm:mb-14">{description}</div>
                )}
                {media && (
                    <figure className="max-w-5xl mx-auto mb-10 sm:mb-14">
                        <WorkXPMedia media={media} />
                    </figure>
                )}

                {markdownContent && (
                    <Markdown
                        options={{ forceBlock: true, overrides: { pre: HighlightedPreBlock } }}
                        className="max-w-3xl mx-auto prose sm:prose-lg"
                    >
                        {markdownContent}
                    </Markdown>
                )}
            </article>

            {(prevWorkXP || nextWorkXP) && (
                <nav className="px-4 mt-12 mb-20">
                    <div className="grid max-w-5xl mx-auto gap-x-6 gap-y-12 sm:grid-cols-2 lg:gap-x-8">
                        {nextWorkXP && <WorkXPNavItem workxp={nextWorkXP} className={undefined} />}
                        {prevWorkXP && <WorkXPNavItem workxp={prevWorkXP} className="sm:items-end sm:col-start-2" />}
                    </div>
                </nav>
            )}
        </BaseLayout>
    );
};
export default Component;

function WorkXPMedia({ media }) {
    return <DynamicComponent {...media} className={classNames({ 'w-full': media.type === 'ImageBlock' })} />;
}

function WorkXPNavItem({ workxp, className }) {
    return (
        <Annotated content={workxp}>
            <Link className={classNames('group flex flex-col gap-6 items-start', className)} href={workxp}>
                {workxp.featuredImage && (
                    <div className="w-full overflow-hidden aspect-3/2">
                        <ImageBlock
                            {...workxp.featuredImage}
                            className="object-cover w-full h-full transition-transform duration-500 group-hover:scale-105"
                        />
                    </div>
                )}
                <span className="text-lg leading-tight uppercase transition bottom-shadow-1 group-hover:bottom-shadow-5">
                    {workxp.title}
                </span>
            </Link>
        </Annotated>
    );
}
