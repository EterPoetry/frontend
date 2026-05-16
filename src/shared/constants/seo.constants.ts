export const SEO_DEFAULTS = {
    siteUrl: 'https://eter.pp.ua',
    imagePath: '/og-image.svg',
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
