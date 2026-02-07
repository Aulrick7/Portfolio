import { ContentObject, PageModelType } from '@/types';
import NextLink, { LinkProps as NextLinkProps } from 'next/link';
import { useRouter } from 'next/router';
import * as React from 'react';

import { Annotated } from '@/components/Annotated';

type RegularLinkProps = React.PropsWithChildren & NextLinkProps & React.AnchorHTMLAttributes<HTMLAnchorElement>;

type LinkProps = RegularLinkProps | (Omit<RegularLinkProps, 'href'> & { href: PageModelType });

const Link: React.FC<LinkProps> = (props) => {
    const { children, href: hrefArgument, onClick, ...other } = props;
    const router = useRouter();
    let hrefString: string = null;
    let hrefContent: ContentObject = null;

    if (typeof hrefArgument === 'string') {
        hrefString = hrefArgument;
    } else {
        hrefContent = hrefArgument;
        hrefString = hrefArgument.__metadata.urlPath;
    }

    // Check if this is a link to the projects page
    const isProjectsLink = hrefString === '/projects';

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        if (isProjectsLink) {
            e.preventDefault();
            // Navigate to projectChoice page with Tron transition
            router.push('/projectChoice');
        }
        onClick?.(e);
    };

    // Pass Any internal link to Next.js Link, for anything else, use <a> tag
    const internal = /^\/(?!\/)/.test(hrefString);
    const linkTag = internal ? (
        <NextLink href={hrefString} onClick={handleClick} {...other}>
            {children}
        </NextLink>
    ) : (
        <a href={hrefString} onClick={handleClick} {...other}>
            {children}
        </a>
    );

    return hrefContent ? <Annotated content={hrefContent}>{linkTag}</Annotated> : linkTag;
};

export default Link;
