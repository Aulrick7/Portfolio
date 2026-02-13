import classNames from 'classnames';

import { Annotated } from '@/components/Annotated';
import { Link } from '@/components/atoms';
import Section from '../Section';

export default function LabelsSection(props) {
    const { elementId, colors, title, subtitle, items = [], styles = {} } = props;
    const sectionAlign = styles.self?.textAlign ?? 'left';
    return (
        <Section elementId={elementId} colors={colors} styles={sectionAlign}>
            {items.length > 0 && (
                <div
                    className={classNames('flex flex-wrap gap-2', {
                        'inline-flex py-1 px-5 text-lg items-center': title || subtitle,
                        'justify-center': sectionAlign === 'center',
                        'justify-end': sectionAlign === 'right'
                    })}
                >
                    {title || subtitle}:
                    {items.map((item, index) => (
                        <LabelItem key={index} {...item} />
                    ))}
                </div>
            )}
        </Section>
    );
}

function LabelItem(props) {
    const { label, url } = props;
    if (!label) {
        return null;
    }

    return (
        <Annotated content={props}>
            {url ? (
                <Link
                    href={url}
                    className="inline-flex relative text-lg leading-tight no-underline transition rounded-full py-4 px-5 border-2 border-current hover:bottom-shadow-6 hover:-translate-y-1.5"
                >
                    {label}
                </Link>
            ) : (
                <div className="inline-flex px-2 py-1 text-lg leading-tight border-2 border-current rounded-full">
                    {label}
                </div>
            )}
        </Annotated>
    );
}
