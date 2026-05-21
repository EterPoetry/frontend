import type { RouteLocationNormalizedLoaded } from 'vue-router';

declare global {
    interface Window {
        dataLayer: Array<unknown>;
        gtag?: (...args: Array<unknown>) => void;
        __ETER_GA_MEASUREMENT_ID__?: string;
    }
}

const getAnalyticsMeasurementId = (): string => {
    return window.__ETER_GA_MEASUREMENT_ID__?.trim() || '';
};

export const trackPageView = (route: RouteLocationNormalizedLoaded): void => {
    const measurementId = getAnalyticsMeasurementId();

    if (!measurementId || typeof window.gtag !== 'function') {
        return;
    }

    window.gtag('event', 'page_view', {
        page_title: document.title,
        page_path: route.fullPath,
        page_location: new URL(route.fullPath, window.location.origin).toString(),
        send_to: measurementId,
    });
};
