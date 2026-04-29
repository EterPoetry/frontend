import { RouteLocationNormalizedLoaded } from 'vue-router';
import { uk } from '@/shared/locales/uk';
import { SEO_DEFAULTS, SEO_ROBOTS } from '@/shared/constants/seo.constants';

type SeoMetaValue = string | boolean | undefined;

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
