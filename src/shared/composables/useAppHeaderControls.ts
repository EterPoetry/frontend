import { computed, onBeforeUnmount, onMounted, Ref, ref, watch } from 'vue';
import { usePostsStore } from '@/modules/posts/posts.store';
import { PostCategory } from '@/modules/posts/interfaces/post-category.interface';
import { uk } from '@/shared/locales/uk';

export const useAppHeaderControls = (params: {
    search: Ref<string>;
    categoryId: Ref<number | null>;
    sortBy: Ref<string>;
}) => {
    const postsStore = usePostsStore();
    const sortMenuOpen = ref(false);
    const categoryMenuOpen = ref(false);
    const categorySearch = ref('');
    const categories = ref<PostCategory[]>([]);
    const sortMenuRef = ref<HTMLElement | null>(null);
    const categoryMenuRef = ref<HTMLElement | null>(null);

    const sortOptions = [
        { value: 'newest', label: uk.home.sort.latest },
        { value: 'oldest', label: uk.home.sort.oldest },
        { value: 'popular', label: uk.home.sort.popular },
    ];

    const filteredCategories = computed(() => {
        const query = categorySearch.value.trim().toLowerCase();

        if (!query) {
            return categories.value;
        }

        return categories.value.filter((category) => category.categoryName.toLowerCase().includes(query));
    });

    const isCategoryActive = computed(() => params.categoryId.value !== null);
    const isSortActive = computed(() => params.sortBy.value !== 'newest');
    const hasActiveFilters = computed(() => params.search.value.trim() !== ''
        || isCategoryActive.value
        || isSortActive.value);

    const toggleSortMenu = (): void => {
        sortMenuOpen.value = !sortMenuOpen.value;

        if (sortMenuOpen.value) {
            categoryMenuOpen.value = false;
        }
    };

    const toggleCategoryMenu = (): void => {
        categoryMenuOpen.value = !categoryMenuOpen.value;

        if (categoryMenuOpen.value) {
            sortMenuOpen.value = false;
            categorySearch.value = '';
        }
    };

    const selectSortOption = (value: string): void => {
        params.sortBy.value = value;
        sortMenuOpen.value = false;
    };

    const selectCategory = (category: PostCategory): void => {
        params.categoryId.value = params.categoryId.value === category.categoryId
            ? null
            : category.categoryId;
        categoryMenuOpen.value = false;
    };

    const clearCategory = (): void => {
        params.categoryId.value = null;
        categoryMenuOpen.value = false;
    };

    const resetFilters = (): void => {
        params.search.value = '';
        params.categoryId.value = null;
        params.sortBy.value = 'newest';
        categorySearch.value = '';
        sortMenuOpen.value = false;
        categoryMenuOpen.value = false;
    };

    const handleOutsideClick = (event: MouseEvent): void => {
        if (sortMenuRef.value && !sortMenuRef.value.contains(event.target as Node)) {
            sortMenuOpen.value = false;
        }

        if (categoryMenuRef.value && !categoryMenuRef.value.contains(event.target as Node)) {
            categoryMenuOpen.value = false;
        }
    };

    watch(
        () => sortMenuOpen.value || categoryMenuOpen.value,
        (hasOpenMenu) => {
            if (hasOpenMenu) {
                document.addEventListener('click', handleOutsideClick);
            } else {
                document.removeEventListener('click', handleOutsideClick);
            }
        },
    );

    onMounted(async () => {
        try {
            categories.value = await postsStore.getCategories();
        } catch (_error) {
            // Non-critical: category filter degrades gracefully without categories.
        }
    });

    onBeforeUnmount(() => {
        document.removeEventListener('click', handleOutsideClick);
    });

    return {
        categories,
        categoryMenuOpen,
        categoryMenuRef,
        categorySearch,
        clearCategory,
        filteredCategories,
        hasActiveFilters,
        isCategoryActive,
        isSortActive,
        resetFilters,
        selectCategory,
        selectSortOption,
        sortMenuOpen,
        sortMenuRef,
        sortOptions,
        toggleCategoryMenu,
        toggleSortMenu,
    };
};
