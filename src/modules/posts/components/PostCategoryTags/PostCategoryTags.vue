<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { PostRouteNames } from '@/modules/posts/enums/post-route-names.enum';
import { PostCategory } from '@/modules/posts/interfaces/post-category.interface';
import { formatPostTag } from '@/modules/posts/utils/post-formatting.utils';
import './PostCategoryTags.css';

const props = withDefaults(defineProps<{
    categories: PostCategory[];
    compact?: boolean;
}>(), {
    compact: false,
});

const route = useRoute();
const router = useRouter();

const rootClassName = computed(() => ({
    'post-category-tags': true,
    'post-category-tags--compact': props.compact,
    'post-category-tags--empty': props.categories.length === 0,
}));

const openCategoryFeed = async (categoryId: number): Promise<void> => {
    if (route.meta.searchEnabled === true) {
        await router.push({
            name: typeof route.name === 'string' ? route.name : undefined,
            params: route.params,
            query: {
                ...route.query,
                categoryId: String(categoryId),
            },
        });
        return;
    }

    await router.push({
        name: PostRouteNames.HOME,
        query: { categoryId: String(categoryId) },
    });
};
</script>

<template>
  <div :class="rootClassName">
    <button
        v-for="category in categories"
        :key="category.categoryId"
        type="button"
        class="post-category-tags__item"
        @click="openCategoryFeed(category.categoryId)"
    >
      {{ formatPostTag(category.categoryName) }}
    </button>
  </div>
</template>
