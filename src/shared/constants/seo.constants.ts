export const SEO_DEFAULTS = {
    siteUrl: 'https://eter.pp.ua',
    imagePath: '/og-image.svg',
    imageAlt: 'Eter — українська платформа аудіопоезії',
    imageWidth: '1200',
    imageHeight: '630',
    imageType: 'image/svg+xml',
    siteName: 'Eter',
    title: 'Eter — аудіопоезія українською',
    titleTemplate: (title: string): string => `${title} | Eter`,
    description: 'Eter — українська платформа аудіопоезії для публікації та прослуховування віршів голосом разом із текстом.',
    keywords: [
        'етер',
        'етер поезія',
        'Eter',
        'аудіопоезія',
        'українська поезія',
        'поезія голосом',
        'слухати вірші',
        'читати вірші вголос',
        'начитування віршів',
        'сучасна українська поезія',
        'класична поезія українською',
    ],
    locale: 'uk_UA',
    twitterCard: 'summary_large_image',
    themeColorLight: '#f7f3ec',
    themeColorDark: '#1f1815',
};

export const SEO_ROBOTS = {
    index: 'index, follow',
    noIndex: 'noindex, follow',
};

export const SEO_ROUTES = {
    landing: {
        title: 'Українська аудіопоезія',
        description: 'Eter — платформа аудіопоезії українською: публікуйте власні начитування віршів, слухайте голоси авторів і відкривайте поезію у форматі аудіо з текстом.',
        canonicalPath: '/',
        robots: SEO_ROBOTS.index,
        keywords: SEO_DEFAULTS.keywords,
    },
    home: {
        title: 'Популярні вірші',
        description: 'Слухайте найпопулярніші вірші на Eter — українській платформі аудіопоезії. Голоси авторів, тексти та живе читання поезії українською.',
        canonicalPath: '/home',
        robots: SEO_ROBOTS.index,
        keywords: SEO_DEFAULTS.keywords,
    },
    post: {
        description: SEO_DEFAULTS.description,
        robots: SEO_ROBOTS.index,
        keywords: SEO_DEFAULTS.keywords,
    },
    notFound: {
        title: 'Сторінку не знайдено',
        description: 'Сторінку Eter не знайдено.',
        canonicalPath: '/404',
        robots: SEO_ROBOTS.noIndex,
        keywords: SEO_DEFAULTS.keywords,
    },
    noIndex: {
        robots: SEO_ROBOTS.noIndex,
    },
};
