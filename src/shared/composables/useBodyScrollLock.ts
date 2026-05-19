import { onBeforeUnmount, toValue, watch, type MaybeRefOrGetter } from 'vue';

let lockCount = 0;
let previousHtmlOverflow = '';
let previousBodyOverflow = '';
let previousBodyPaddingRight = '';

const updateBodyScrollState = (): void => {
    if (typeof document === 'undefined') {
        return;
    }

    const html = document.documentElement;
    const body = document.body;

    if (lockCount > 0) {
        const scrollbarWidth = window.innerWidth - html.clientWidth;

        html.style.overflow = 'hidden';
        body.style.overflow = 'hidden';
        body.style.paddingRight = scrollbarWidth > 0
            ? `${scrollbarWidth}px`
            : previousBodyPaddingRight;
        return;
    }

    html.style.overflow = previousHtmlOverflow;
    body.style.overflow = previousBodyOverflow;
    body.style.paddingRight = previousBodyPaddingRight;
};

const lockBodyScroll = (): void => {
    if (typeof document === 'undefined') {
        return;
    }

    if (lockCount === 0) {
        previousHtmlOverflow = document.documentElement.style.overflow;
        previousBodyOverflow = document.body.style.overflow;
        previousBodyPaddingRight = document.body.style.paddingRight;
    }

    lockCount += 1;
    updateBodyScrollState();
};

const unlockBodyScroll = (): void => {
    if (typeof document === 'undefined' || lockCount === 0) {
        return;
    }

    lockCount -= 1;
    updateBodyScrollState();
};

export const useBodyScrollLock = (isLocked: MaybeRefOrGetter<boolean>): void => {
    let isActive = false;

    watch(
        () => toValue(isLocked),
        (nextValue) => {
            if (nextValue === isActive) {
                return;
            }

            isActive = nextValue;

            if (isActive) {
                lockBodyScroll();
                return;
            }

            unlockBodyScroll();
        },
        { immediate: true },
    );

    onBeforeUnmount(() => {
        if (!isActive) {
            return;
        }

        isActive = false;
        unlockBodyScroll();
    });
};
