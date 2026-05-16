import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const indexPath = path.join(distDir, 'index.html');

const requireEnv = (name) => {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`${name} environment variable is required`);
    }

    return value;
};

const requireNumberEnv = (name) => {
    const value = Number(requireEnv(name));

    if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`${name} must be a positive number`);
    }

    return value;
};

const port = requireNumberEnv('PORT');
const siteUrl = requireEnv('SITE_URL').replace(/\/$/, '');
const apiBaseUrl = requireEnv('META_API_BASE_URL').replace(/\/$/, '');
const postMetaPathTemplate = requireEnv('META_POST_PATH');
const profileMetaPathTemplate = requireEnv('META_PROFILE_PATH');
const cacheTtlMs = requireNumberEnv('META_CACHE_TTL_MS');
const metaApiTimeoutMs = requireNumberEnv('META_API_TIMEOUT_MS');

const defaultMeta = {
    title: 'Eter — аудіопоезія українською',
    description: 'Eter — українська платформа аудіопоезії для публікації та прослуховування віршів голосом разом із текстом.',
    image: `${siteUrl}/og-image.svg`,
    imageAlt: 'Eter — українська платформа аудіопоезії',
    imageType: 'image/svg+xml',
    url: siteUrl,
    canonical: siteUrl,
    type: 'website',
    robots: 'index, follow',
};

const contentTypes = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.ttf': 'font/ttf',
    '.txt': 'text/plain; charset=utf-8',
    '.webp': 'image/webp',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
};

const metaCache = new Map();
let indexTemplatePromise;

const getIndexTemplate = () => {
    if (!indexTemplatePromise) {
        indexTemplatePromise = readFile(indexPath, 'utf8');
    }

    return indexTemplatePromise;
};

const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const getAbsoluteUrl = (req, value, fallback) => {
    const rawValue = typeof value === 'string' ? value.trim() : '';

    if (!rawValue) {
        return fallback;
    }

    try {
        const parsedUrl = new URL(rawValue, getRequestOrigin(req));

        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return fallback;
        }

        return parsedUrl.toString();
    } catch (_error) {
        return fallback;
    }
};

const getImageType = (imageUrl, explicitType) => {
    if (typeof explicitType === 'string' && explicitType.trim()) {
        return explicitType.trim();
    }

    const pathname = (() => {
        try {
            return new URL(imageUrl).pathname.toLowerCase();
        } catch (_error) {
            return '';
        }
    })();

    if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) {
        return 'image/jpeg';
    }

    if (pathname.endsWith('.png')) {
        return 'image/png';
    }

    if (pathname.endsWith('.webp')) {
        return 'image/webp';
    }

    if (pathname.endsWith('.svg')) {
        return 'image/svg+xml';
    }

    return defaultMeta.imageType;
};

const getAudioMimeType = (audioUrl, explicitType) => {
    if (typeof explicitType === 'string' && explicitType.trim()) {
        return explicitType.trim();
    }

    const pathname = (() => {
        try {
            return new URL(audioUrl).pathname.toLowerCase();
        } catch (_error) {
            return '';
        }
    })();

    if (pathname.endsWith('.mp3')) {
        return 'audio/mpeg';
    }

    if (pathname.endsWith('.wav')) {
        return 'audio/wav';
    }

    if (pathname.endsWith('.ogg')) {
        return 'audio/ogg';
    }

    if (pathname.endsWith('.m4a')) {
        return 'audio/mp4';
    }

    if (pathname.endsWith('.aac')) {
        return 'audio/aac';
    }

    return '';
};

const getRequestOrigin = (req) => {
    const forwardedProto = req.headers['x-forwarded-proto'];
    const proto = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto;
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const normalizedHost = Array.isArray(host) ? host[0] : host;

    if (normalizedHost) {
        return `${proto || 'http'}://${normalizedHost}`;
    }

    return siteUrl;
};

const getRequestUrl = (req) => new URL(req.url || '/', getRequestOrigin(req));

const normalizeMeta = (req, meta, routePath) => {
    const routeUrl = new URL(routePath, getRequestOrigin(req)).toString();
    const title = typeof meta?.title === 'string' && meta.title.trim() ? meta.title.trim() : defaultMeta.title;
    const description = typeof meta?.description === 'string' && meta.description.trim()
        ? meta.description.trim()
        : defaultMeta.description;
    const type = typeof meta?.type === 'string' && ['website', 'article', 'profile'].includes(meta.type)
        ? meta.type
        : defaultMeta.type;

    const image = getAbsoluteUrl(req, meta?.image, defaultMeta.image);
    const audioFileUrl = getAbsoluteUrl(req, meta?.audioFileUrl, '');

    return {
        title,
        description,
        type,
        image,
        imageAlt: typeof meta?.imageAlt === 'string' && meta.imageAlt.trim() ? meta.imageAlt.trim() : defaultMeta.imageAlt,
        imageType: getImageType(image, meta?.imageType),
        audioFileUrl,
        audioMimeType: audioFileUrl ? getAudioMimeType(audioFileUrl, meta?.audioMimeType) : '',
        url: getAbsoluteUrl(req, meta?.url, routeUrl),
        canonical: getAbsoluteUrl(req, meta?.canonical, routeUrl),
        robots: typeof meta?.robots === 'string' && meta.robots.trim() ? meta.robots.trim() : defaultMeta.robots,
    };
};

const renderAudioTags = (meta) => {
    if (!meta.audioFileUrl) {
        return '';
    }

    const tags = [
        `<meta property="og:audio" content="${escapeHtml(meta.audioFileUrl)}" />`,
    ];

    if (meta.audioMimeType) {
        tags.push(`<meta property="og:audio:type" content="${escapeHtml(meta.audioMimeType)}" />`);
    }

    return tags.join('\n    ');
};

const renderIndexWithMeta = async (meta) => {
    const template = await getIndexTemplate();
    const replacements = {
        __META_TITLE__: meta.title,
        __META_DESCRIPTION__: meta.description,
        __META_TYPE__: meta.type,
        __META_IMAGE__: meta.image,
        __META_IMAGE_ALT__: meta.imageAlt,
        __META_IMAGE_TYPE__: meta.imageType,
        __META_AUDIO_TAGS__: renderAudioTags(meta),
        __META_URL__: meta.url,
        __META_CANONICAL__: meta.canonical,
        __META_ROBOTS__: meta.robots,
    };

    return Object.entries(replacements).reduce(
        (html, [token, value]) => html.replaceAll(token, token === '__META_AUDIO_TAGS__' ? value : escapeHtml(value)),
        template,
    );
};

const getCachedMeta = (key) => {
    const cached = metaCache.get(key);

    if (!cached || cached.expiresAt <= Date.now()) {
        metaCache.delete(key);
        return null;
    }

    return cached.value;
};

const setCachedMeta = (key, value) => {
    metaCache.set(key, {
        value,
        expiresAt: Date.now() + cacheTtlMs,
    });
};

const fetchJson = async (url) => {
    const response = await fetch(url, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(metaApiTimeoutMs),
    });

    if (!response.ok) {
        throw new Error(`Meta API responded with ${response.status}`);
    }

    return response.json();
};

const fetchPageMeta = async (pathTemplate, id) => {
    const endpointPath = pathTemplate.replace(':id', encodeURIComponent(id));
    return fetchJson(`${apiBaseUrl}${endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`}`);
};

const getPageMeta = async (req, cacheNamespace, id, routePath, pathTemplate) => {
    const cacheKey = `${cacheNamespace}:${id}`;
    const cached = getCachedMeta(cacheKey);

    if (cached) {
        return cached;
    }

    const apiMeta = await fetchPageMeta(pathTemplate, id);
    const meta = normalizeMeta(req, apiMeta, routePath);
    setCachedMeta(cacheKey, meta);

    return meta;
};

const getPostMeta = (req, postId, routePath) => getPageMeta(req, 'post', postId, routePath, postMetaPathTemplate);

const getProfileMeta = (req, userId, routePath) => getPageMeta(req, 'profile', userId, routePath, profileMetaPathTemplate);

const sendHtml = async (res, html, statusCode = 200) => {
    res.writeHead(statusCode, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
    });
    res.end(html);
};

const sendFallbackHtml = async (req, res, routePath = '/') => {
    const html = await renderIndexWithMeta(normalizeMeta(req, defaultMeta, routePath));
    await sendHtml(res, html);
};

const sendStaticFile = (req, res, pathname) => {
    let decodedPath;

    try {
        decodedPath = decodeURIComponent(pathname);
    } catch (_error) {
        res.writeHead(400);
        res.end('Bad request');
        return true;
    }

    const filePath = path.resolve(distDir, `.${decodedPath}`);

    if (!filePath.startsWith(`${distDir}${path.sep}`) || !existsSync(filePath) || !statSync(filePath).isFile()) {
        return false;
    }

    const extension = path.extname(filePath);
    const headers = {
        'content-type': contentTypes[extension] || 'application/octet-stream',
    };

    if (decodedPath.startsWith('/assets/')) {
        headers['cache-control'] = 'public, max-age=31536000, immutable';
    }

    res.writeHead(200, headers);

    if (req.method === 'HEAD') {
        res.end();
        return true;
    }

    createReadStream(filePath).pipe(res);
    return true;
};

const handleRequest = async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { allow: 'GET, HEAD' });
        res.end('Method not allowed');
        return;
    }

    const requestUrl = getRequestUrl(req);
    const pathname = requestUrl.pathname;

    if (sendStaticFile(req, res, pathname)) {
        return;
    }

    const postMatch = pathname.match(/^\/posts\/(\d+)\/?$/);

    if (postMatch) {
        const routePath = `/posts/${postMatch[1]}`;

        try {
            const meta = await getPostMeta(req, postMatch[1], routePath);
            const html = await renderIndexWithMeta(meta);
            await sendHtml(res, html);
        } catch (error) {
            console.error(`[meta] Failed to render post ${postMatch[1]}:`, error);
            await sendFallbackHtml(req, res, routePath);
        }

        return;
    }

    const profileMatch = pathname.match(/^\/profile\/(\d+)\/?$/);

    if (profileMatch) {
        const routePath = `/profile/${profileMatch[1]}`;

        try {
            const meta = await getProfileMeta(req, profileMatch[1], routePath);
            const html = await renderIndexWithMeta(meta);
            await sendHtml(res, html);
        } catch (error) {
            console.error(`[meta] Failed to render profile ${profileMatch[1]}:`, error);
            await sendFallbackHtml(req, res, routePath);
        }

        return;
    }

    await sendFallbackHtml(req, res, pathname);
};

createServer((req, res) => {
    handleRequest(req, res).catch((error) => {
        console.error('[server] Unhandled request error:', error);
        res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('Internal server error');
    });
}).listen(port, () => {
    console.log(`Frontend meta server listening on ${port}`);
});
