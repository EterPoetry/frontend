import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref, type WatchSource } from 'vue';
import { ADMIN_DEFAULT_PAGE_LIMIT, ADMIN_FILTER_DEBOUNCE_MS } from '@/modules/admin/constants/admin.constants';
import type { OffsetPaginationResponse } from '@/modules/admin/interfaces/offset-pagination-response.interface';
import { uk } from '@/shared/locales/uk';

export interface AdminPaginatedListOptions<TItem, TQuery> {
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
    feedbackMessage: Ref<string>;
    hasNextPage: Ref<boolean>;
    loadItems: (append?: boolean) => Promise<void>;
    loadMore: () => Promise<void>;
    applyFilters: () => Promise<void>;
    handleItemDeleted: () => Promise<void>;
}

export function useAdminPaginatedList<TItem, TQuery>(
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
    const feedbackMessage = ref('');
    let filtersDebounceId: number | undefined;
    let requestSequence = 0;

    const hasNextPage = computed(() => offset.value + items.value.length < total.value);

    const loadItems = async (append = false): Promise<void> => {
        const currentRequestId = ++requestSequence;
        isLoading.value = true;
        errorMessage.value = '';

        try {
            const query = buildQuery();
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
        offset.value += limit.value;
        await loadItems(true);
    };

    const handleItemDeleted = async (): Promise<void> => {
        if (offset.value > 0 && items.value.length === 1) {
            offset.value = Math.max(0, offset.value - limit.value);
        }

        await loadItems();
    };

    if (loadOnMount) {
        onMounted(() => {
            void loadItems();
        });
    }

    watch(filterSources, () => {
        scheduleFilters();
    });

    onBeforeUnmount(() => {
        window.clearTimeout(filtersDebounceId);
    });

    return {
        items,
        total,
        offset,
        limit,
        isLoading,
        errorMessage,
        feedbackMessage,
        hasNextPage,
        loadItems,
        loadMore,
        applyFilters,
        handleItemDeleted,
    };
}
