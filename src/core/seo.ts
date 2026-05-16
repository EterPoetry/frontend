import { RouteLocationNormalizedLoaded } from 'vue-router';
import { uk } from '@/shared/locales/uk';
import { SEO_DEFAULTS, SEO_ROBOTS } from '@/shared/constants/seo.constants';

type SeoMetaValue = string | boolean | undefined;

export interface PostSeoData {
    postId: number;
    title: string | null;
    description: string | null;
    originAuthorName: string | null;
    categories: Array<{ categoryName: string }>;
    author: { name: string };
    createdAt: string;
    audioDurationSeconds: number | null;
}

const siteUrl = (import.meta.env.VITE_SITE_URL || SEO_DEFAULTS.siteUrl).replace(/\/$/, '');

const setMetaTag = (selector: string, attributes: Record<string, string>): void => {
    let element = document.head.querySelector<HTMLMetaElement>(selector);

    if (!element) {
        element = document.createElement('meta');
        document.head.appendChild(element);
    }

    Object.entries(attributes).forEach(([key, value]) => {
        element?.setAttribute(key, value);
    });
};

const setLinkTag = (selector: string, attributes: Record<string, string>): void => {
    let element = document.head.querySelector<HTMLLinkElement>(selector);

    if (!element) {
        element = document.createElement('link');
        document.head.appendChild(element);
    }

    Object.entries(attributes).forEach(([key, value]) => {
        element?.setAttribute(key, value);
    });
};

const setJsonLd = (data: Record<string, unknown>): void => {
    let element = document.head.querySelector<HTMLScriptElement>('script[type="application/ld+json"][data-eter]');

    if (!element) {
        element = document.createElement('script');
        element.setAttribute('type', 'application/ld+json');
        element.setAttribute('data-eter', '');
        document.head.appendChild(element);
    }

    element.textContent = JSON.stringify(data);
};

export const clearJsonLd = (): void => {
    document.head.querySelector('script[type="application/ld+json"][data-eter]')?.remove();
};

const formatIsoDuration = (seconds: number | null): string | undefined => {
    if (!seconds || seconds <= 0) {
        return undefined;
    }

    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);

    return `PT${minutes}M${secs}S`;
};

const getRouteMeta = (to: RouteLocationNormalizedLoaded, key: string): SeoMetaValue => {
    return to.meta[key] as SeoMetaValue;
};

export const buildCanonicalUrl = (path: string): string => {
    const normalizedPath = path === '/' ? '' : path.replace(/\/$/, '');
    return `${siteUrl}${normalizedPath}`;
};

export const updateSeoMeta = (to: RouteLocationNormalizedLoaded): void => {
    const routeTitle = getRouteMeta(to, 'title');
    const title = routeTitle ? SEO_DEFAULTS.titleTemplate(routeTitle as string) : SEO_DEFAULTS.title;
    const description = (getRouteMeta(to, 'description') as string) || SEO_DEFAULTS.description;
    const keywords = ((getRouteMeta(to, 'keywords') as string[] | undefined) || SEO_DEFAULTS.keywords).join(', ');
    const robots = (getRouteMeta(to, 'robots') as string) || SEO_ROBOTS.index;
    const canonicalPath = (getRouteMeta(to, 'canonicalPath') as string) || to.path;
    const canonicalUrl = buildCanonicalUrl(canonicalPath);
    const imageUrl = `${siteUrl}${SEO_DEFAULTS.imagePath}`;

    document.title = title;

    setMetaTag('meta[name="description"]', { name: 'description', content: description });
    setMetaTag('meta[name="keywords"]', { name: 'keywords', content: keywords });
    setMetaTag('meta[name="robots"]', { name: 'robots', content: robots });
    setMetaTag('meta[property="og:site_name"]', { property: 'og:site_name', content: uk.common.appName });
    setMetaTag('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    setMetaTag('meta[property="og:title"]', { property: 'og:title', content: title });
    setMetaTag('meta[property="og:description"]', { property: 'og:description', content: description });
    setMetaTag('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
    setMetaTag('meta[property="og:image"]', { property: 'og:image', content: imageUrl });
    setMetaTag('meta[property="og:locale"]', { property: 'og:locale', content: SEO_DEFAULTS.locale });
    setMetaTag('meta[name="twitter:card"]', { name: 'twitter:card', content: SEO_DEFAULTS.twitterCard });
    setMetaTag('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
    setMetaTag('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    setMetaTag('meta[name="twitter:image"]', { name: 'twitter:image', content: imageUrl });
    setLinkTag('link[rel="canonical"]', { rel: 'canonical', href: canonicalUrl });
};

export const updatePostSeoMeta = (post: PostSeoData, path: string): void => {
    const rawTitle = post.title;
    const title = rawTitle ? SEO_DEFAULTS.titleTemplate(rawTitle) : SEO_DEFAULTS.title;
    const description = post.description || SEO_DEFAULTS.description;
    const categoryKeywords = post.categories.map((c) => c.categoryName);
    const keywords = [...new Set([...categoryKeywords, ...SEO_DEFAULTS.keywords])].join(', ');
    const canonicalUrl = buildCanonicalUrl(path);
    const imageUrl = `${siteUrl}${SEO_DEFAULTS.imagePath}`;
    const authorName = post.originAuthorName || post.author.name;

    document.title = title;

    setMetaTag('meta[name="description"]', { name: 'description', content: description });
    setMetaTag('meta[name="keywords"]', { name: 'keywords', content: keywords });
    setMetaTag('meta[name="robots"]', { name: 'robots', content: SEO_ROBOTS.index });
    setMetaTag('meta[property="og:site_name"]', { property: 'og:site_name', content: uk.common.appName });
    setMetaTag('meta[property="og:type"]', { property: 'og:type', content: 'article' });
    setMetaTag('meta[property="og:title"]', { property: 'og:title', content: title });
    setMetaTag('meta[property="og:description"]', { property: 'og:description', content: description });
    setMetaTag('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
    setMetaTag('meta[property="og:image"]', { property: 'og:image', content: imageUrl });
    setMetaTag('meta[property="og:locale"]', { property: 'og:locale', content: SEO_DEFAULTS.locale });
    setMetaTag('meta[property="article:published_time"]', { property: 'article:published_time', content: post.createdAt });
    setMetaTag('meta[name="twitter:card"]', { name: 'twitter:card', content: SEO_DEFAULTS.twitterCard });
    setMetaTag('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
    setMetaTag('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    setMetaTag('meta[name="twitter:image"]', { name: 'twitter:image', content: imageUrl });
    setLinkTag('link[rel="canonical"]', { rel: 'canonical', href: canonicalUrl });

    const jsonLd: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'AudioObject',
        name: rawTitle || 'Аудіопоезія',
        description,
        author: {
            '@type': 'Person',
            name: authorName,
        },
        datePublished: post.createdAt,
        url: canonicalUrl,
        thumbnailUrl: imageUrl,
        publisher: {
            '@type': 'Organization',
            name: uk.common.appName,
            url: siteUrl,
        },
    };

    const isoDuration = formatIsoDuration(post.audioDurationSeconds);

    if (isoDuration) {
        jsonLd.duration = isoDuration;
    }

    setJsonLd(jsonLd);
};
