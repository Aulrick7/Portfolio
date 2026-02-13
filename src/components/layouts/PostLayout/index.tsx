import classNames from 'classnames';
import dayjs from 'dayjs';
import Markdown from 'markdown-to-jsx';
import * as React from 'react';

import { DynamicComponent } from '@/components/components-registry';
import { PageComponentProps, PostLayout } from '@/types';
import HighlightedPreBlock from '@/utils/highlighted-markdown';
import BaseLayout from '../BaseLayout';

type ComponentProps = PageComponentProps & PostLayout;

const Component: React.FC<ComponentProps> = (props) => {
    const { title, date, author, markdownContent, media, bottomSections = [] } = props;
    const dateTimeAttr = dayjs(date).format('YYYY-MM-DD HH:mm:ss');
    const formattedDate = dayjs(date).format('YYYY-MM-DD');

    return (
        <BaseLayout {...props}>
            <article className="flex flex-col px-4 py-14 lg:py-20">
                <header className="flex flex-col w-full max-w-5xl mx-auto mb-10 sm:mb-14">
                    <div className="mb-6 uppercase">
                        <time dateTime={dateTimeAttr}>{formattedDate}</time>
                        {author && (
                            <>
                                {' | '}
                                {author.firstName} {author.lastName}
                            </>
                        )}
                    </div>
                    <h1 className="text-5xl sm:text-6xl">{title}</h1>
                </header>
                {media && (
                    <figure className="flex justify-center w-full mb-10 sm:mb-14">
                        <div className="w-full max-w-5xl">
                            <PostMedia media={media} />
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
            <div className="flex flex-col">
                {bottomSections?.map((section, index) => {
                    return <DynamicComponent key={index} {...section} />;
                })}
            </div>
        </BaseLayout>
    );
};
export default Component;

function PostMedia({ media }) {
    return <DynamicComponent {...media} className={classNames({ 'w-full': media.type === 'ImageBlock' })} />;
}
