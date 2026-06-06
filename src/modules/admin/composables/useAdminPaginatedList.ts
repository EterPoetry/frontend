import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref, type WatchSource } from 'vue';
import { ADMIN_DEFAULT_PAGE_LIMIT, ADMIN_FILTER_DEBOUNCE_MS } from '@/modules/admin/constants/admin.constants';
import type { OffsetPaginationResponse } from '@/modules/admin/interfaces/offset-pagination-response.interface';
import { uk } from '@/shared/locales/uk';

export interface AdminPaginatedListOptions<TItem, TQuery extends { offset?: number; limit?: number }> {
    fetchItems: (query: TQuery) => Promise<OffsetPaginationResponse<TItem>>;
    buildQuery: () => TQuery;
    filterSources: WatchSource[];
    limit?: number;
    loadOnMount?: boolean;
}

export interface AdminPaginatedListReturn<TItem> {
    items: Ref<TItem[]>;
    total: Ref<number>;
    offset: Ref<number>;
    limit: Ref<number>;
    isLoading: Ref<boolean>;
    errorMessage: Ref<string>;
    hasNextPage: Ref<boolean>;
    setLoadMoreTrigger: (element: Element | unknown) => void;
    loadItems: (append?: boolean) => Promise<void>;
    loadMore: () => Promise<void>;
    applyFilters: () => Promise<void>;
    handleItemDeleted: () => Promise<void>;
}

export function useAdminPaginatedList<TItem, TQuery extends { offset?: number; limit?: number }>(
    options: AdminPaginatedListOptions<TItem, TQuery>,
): AdminPaginatedListReturn<TItem> {
    const {
        fetchItems,
        buildQuery,
        filterSources,
        limit: initialLimit = ADMIN_DEFAULT_PAGE_LIMIT,
        loadOnMount = true,
    } = options;

    const items = ref<TItem[]>([]) as Ref<TItem[]>;
    const total = ref(0);
    const offset = ref(0);
    const limit = ref(initialLimit);
    const isLoading = ref(false);
    const errorMessage = ref('');
    const loadMoreTrigger = ref<HTMLElement | null>(null);
    let filtersDebounceId: number | undefined;
    let requestSequence = 0;
    let loadMoreObserver: IntersectionObserver | null = null;

    const hasNextPage = computed(() => items.value.length < total.value);

    const loadItems = async (append = false): Promise<void> => {
        if (isLoading.value) {
            return;
        }

        const currentRequestId = ++requestSequence;
        isLoading.value = true;
        errorMessage.value = '';

        try {
            const query = {
                ...buildQuery(),
                offset: offset.value,
                limit: limit.value,
            } as TQuery;
            const response = await fetchItems(query);

            if (currentRequestId !== requestSequence) {
                return;
            }

            items.value = append ? [...items.value, ...response.items] : response.items;
            total.value = response.total;
        } catch (_error) {
            if (currentRequestId !== requestSequence) {
                return;
            }

            errorMessage.value = uk.admin.loadFailed;
        } finally {
            if (currentRequestId === requestSequence) {
                isLoading.value = false;
            }
        }
    };

    const applyFilters = async (): Promise<void> => {
        offset.value = 0;
        await loadItems();
    };

    const scheduleFilters = (): void => {
        window.clearTimeout(filtersDebounceId);
        filtersDebounceId = window.setTimeout(() => {
            void applyFilters();
        }, ADMIN_FILTER_DEBOUNCE_MS);
    };

    const loadMore = async (): Promise<void> => {
        if (!hasNextPage.value || isLoading.value) {
            return;
        }

        offset.value = items.value.length;
        await loadItems(true);
    };

    const handleItemDeleted = async (): Promise<void> => {
        offset.value = 0;
        await loadItems();
    };

    if (loadOnMount) {
        onMounted(() => {
            void loadItems();
        });
    }

    const disconnectLoadMoreObserver = (): void => {
        loadMoreObserver?.disconnect();
        loadMoreObserver = null;
    };

    const setupLoadMoreObserver = (element: HTMLElement | null): void => {
        disconnectLoadMoreObserver();

        if (!element) {
            return;
        }

        loadMoreObserver = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                void loadMore();
            }
        }, {
            rootMargin: '240px 0px',
            threshold: 0,
        });
        loadMoreObserver.observe(element);
    };

    const setLoadMoreTrigger = (element: Element | unknown): void => {
        loadMoreTrigger.value = element instanceof HTMLElement ? element : null;
    };

    watch(filterSources, () => {
        scheduleFilters();
    });

    watch(loadMoreTrigger, (element) => {
        setupLoadMoreObserver(element);
    });

    onBeforeUnmount(() => {
        window.clearTimeout(filtersDebounceId);
        disconnectLoadMoreObserver();
    });

    return {
        items,
        total,
        offset,
        limit,
        isLoading,
        errorMessage,
        hasNextPage,
        setLoadMoreTrigger,
        loadItems,
        loadMore,
        applyFilters,
        handleItemDeleted,
    };
}
