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
    updatedAt: string;
    audioDurationSeconds: number | null;
    audioFileUrl: string | null;
    audioFileName: string | null;
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

const removeTag = (selector: string): void => {
    document.head.querySelector(selector)?.remove();
};

const removeTags = (selector: string): void => {
    document.head.querySelectorAll(selector).forEach((element) => element.remove());
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
    removeTag('script[type="application/ld+json"][data-eter]');
};

const formatIsoDuration = (seconds: number | null): string | undefined => {
    if (!seconds || seconds <= 0) {
        return undefined;
    }

    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);

    return `PT${minutes}M${secs}S`;
};

const getAudioMimeType = (audioFileName: string | null, audioFileUrl: string | null): string | undefined => {
    const normalizedSource = (audioFileName || audioFileUrl || '').toLowerCase();

    if (!normalizedSource) {
        return undefined;
    }

    if (normalizedSource.endsWith('.mp3')) {
        return 'audio/mpeg';
    }

    if (normalizedSource.endsWith('.wav')) {
        return 'audio/wav';
    }

    if (normalizedSource.endsWith('.ogg')) {
        return 'audio/ogg';
    }

    if (normalizedSource.endsWith('.m4a')) {
        return 'audio/mp4';
    }

    if (normalizedSource.endsWith('.aac')) {
        return 'audio/aac';
    }

    return undefined;
};

const clearPostSeoMeta = (): void => {
    removeTags('meta[property="article:published_time"]');
    removeTags('meta[property="article:modified_time"]');
    removeTags('meta[property="article:author"]');
    removeTags('meta[property="article:section"]');
    removeTags('meta[property="article:tag"]');
    removeTags('meta[property="og:audio"]');
    removeTags('meta[property="og:audio:secure_url"]');
    removeTags('meta[property="og:audio:type"]');
    removeTags('meta[property="og:updated_time"]');
    clearJsonLd();
};

const applySharedSeoMeta = (title: string, description: string, canonicalUrl: string, imageUrl: string): void => {
    setMetaTag('meta[name="description"]', { name: 'description', content: description });
    setMetaTag('meta[property="og:site_name"]', { property: 'og:site_name', content: SEO_DEFAULTS.siteName });
    setMetaTag('meta[property="og:title"]', { property: 'og:title', content: title });
    setMetaTag('meta[property="og:description"]', { property: 'og:description', content: description });
    setMetaTag('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
    setMetaTag('meta[property="og:image"]', { property: 'og:image', content: imageUrl });
    setMetaTag('meta[property="og:image:secure_url"]', { property: 'og:image:secure_url', content: imageUrl });
    setMetaTag('meta[property="og:image:alt"]', { property: 'og:image:alt', content: SEO_DEFAULTS.imageAlt });
    setMetaTag('meta[property="og:image:width"]', { property: 'og:image:width', content: SEO_DEFAULTS.imageWidth });
    setMetaTag('meta[property="og:image:height"]', { property: 'og:image:height', content: SEO_DEFAULTS.imageHeight });
    setMetaTag('meta[property="og:image:type"]', { property: 'og:image:type', content: SEO_DEFAULTS.imageType });
    setMetaTag('meta[property="og:locale"]', { property: 'og:locale', content: SEO_DEFAULTS.locale });
    setMetaTag('meta[name="twitter:card"]', { name: 'twitter:card', content: SEO_DEFAULTS.twitterCard });
    setMetaTag('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
    setMetaTag('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
    setMetaTag('meta[name="twitter:image"]', { name: 'twitter:image', content: imageUrl });
    setMetaTag('meta[name="twitter:image:alt"]', { name: 'twitter:image:alt', content: SEO_DEFAULTS.imageAlt });
    setMetaTag('meta[name="twitter:url"]', { name: 'twitter:url', content: canonicalUrl });
    setMetaTag('meta[name="author"]', { name: 'author', content: SEO_DEFAULTS.siteName });
    setMetaTag('meta[name="application-name"]', { name: 'application-name', content: SEO_DEFAULTS.siteName });
    setMetaTag('meta[name="apple-mobile-web-app-title"]', { name: 'apple-mobile-web-app-title', content: SEO_DEFAULTS.siteName });
    setLinkTag('link[rel="canonical"]', { rel: 'canonical', href: canonicalUrl });
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
    clearPostSeoMeta();

    setMetaTag('meta[name="keywords"]', { name: 'keywords', content: keywords });
    setMetaTag('meta[name="robots"]', { name: 'robots', content: robots });
    setMetaTag('meta[property="og:type"]', { property: 'og:type', content: 'website' });
    applySharedSeoMeta(title, description, canonicalUrl, imageUrl);
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
    const articleSection = post.categories[0]?.categoryName;
    const audioMimeType = getAudioMimeType(post.audioFileName, post.audioFileUrl);

    document.title = title;
    clearPostSeoMeta();

    setMetaTag('meta[name="keywords"]', { name: 'keywords', content: keywords });
    setMetaTag('meta[name="robots"]', { name: 'robots', content: SEO_ROBOTS.index });
    setMetaTag('meta[property="og:type"]', { property: 'og:type', content: 'article' });
    applySharedSeoMeta(title, description, canonicalUrl, imageUrl);
    setMetaTag('meta[name="author"]', { name: 'author', content: authorName });
    setMetaTag('meta[property="article:published_time"]', { property: 'article:published_time', content: post.createdAt });
    setMetaTag('meta[property="article:modified_time"]', { property: 'article:modified_time', content: post.updatedAt });
    setMetaTag('meta[property="og:updated_time"]', { property: 'og:updated_time', content: post.updatedAt });
    setMetaTag('meta[property="article:author"]', { property: 'article:author', content: authorName });

    if (articleSection) {
        setMetaTag('meta[property="article:section"]', { property: 'article:section', content: articleSection });
    }

    post.categories.forEach((category, index) => {
        setMetaTag(`meta[property="article:tag"][data-eter-article-tag="${index}"]`, {
            property: 'article:tag',
            content: category.categoryName,
            'data-eter-article-tag': String(index),
        });
    });

    if (post.audioFileUrl) {
        setMetaTag('meta[property="og:audio"]', { property: 'og:audio', content: post.audioFileUrl });
        setMetaTag('meta[property="og:audio:secure_url"]', { property: 'og:audio:secure_url', content: post.audioFileUrl });
    }

    if (audioMimeType) {
        setMetaTag('meta[property="og:audio:type"]', { property: 'og:audio:type', content: audioMimeType });
    }

    const jsonLd: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'WebPage',
                '@id': `${canonicalUrl}#webpage`,
                url: canonicalUrl,
                name: rawTitle || SEO_DEFAULTS.siteName,
                description,
                inLanguage: 'uk-UA',
                primaryImageOfPage: {
                    '@type': 'ImageObject',
                    url: imageUrl,
                },
            },
            {
                '@type': 'Article',
                '@id': `${canonicalUrl}#article`,
                headline: rawTitle || 'Аудіопоезія',
                description,
                url: canonicalUrl,
                inLanguage: 'uk-UA',
                datePublished: post.createdAt,
                dateModified: post.updatedAt,
                image: [imageUrl],
                author: {
                    '@type': 'Person',
                    name: authorName,
                },
                publisher: {
                    '@type': 'Organization',
                    name: uk.common.appName,
                    url: siteUrl,
                },
                mainEntityOfPage: {
                    '@id': `${canonicalUrl}#webpage`,
                },
                keywords: [...new Set(categoryKeywords)].join(', '),
                articleSection,
            },
            {
                '@type': 'AudioObject',
                '@id': `${canonicalUrl}#audio`,
                name: rawTitle || 'Аудіопоезія',
                description,
                author: {
                    '@type': 'Person',
                    name: authorName,
                },
                datePublished: post.createdAt,
                dateModified: post.updatedAt,
                url: canonicalUrl,
                thumbnailUrl: imageUrl,
                uploadDate: post.createdAt,
                publisher: {
                    '@type': 'Organization',
                    name: uk.common.appName,
                    url: siteUrl,
                },
                ...(post.audioFileUrl ? { contentUrl: post.audioFileUrl } : {}),
                ...(audioMimeType ? { encodingFormat: audioMimeType } : {}),
            },
        ],
    };

    const isoDuration = formatIsoDuration(post.audioDurationSeconds);

    if (isoDuration) {
        const graph = jsonLd['@graph'] as Array<Record<string, unknown>>;
        graph[2].duration = isoDuration;
    }

    setJsonLd(jsonLd);
};
