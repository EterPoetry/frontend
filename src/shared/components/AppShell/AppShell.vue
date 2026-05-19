<script setup lang="ts">
import { computed } from 'vue';
import SubscriptionDialog from '@/modules/payments/components/SubscriptionDialog/SubscriptionDialog.vue';
import { useRoute } from 'vue-router';
import StickyPostPlayer from '@/modules/posts/components/StickyPostPlayer/StickyPostPlayer.vue';
import { usePostPlayer } from '@/modules/posts/composables/usePostPlayer';
import AppHeader from '@/shared/components/AppHeader/AppHeader.vue';
import AppBottomBar from '@/shared/components/AppBottomBar/AppBottomBar.vue';
import AppSidebar from '@/shared/components/AppSidebar/AppSidebar.vue';
import type { AppNavigationItem } from '@/shared/constants/app-navigation';
import './AppShell.css';

const props = defineProps<{
    isAuthenticated: boolean;
    activeNavKey?: AppNavigationItem['key'];
    likePendingPostIds?: number[];
    hideStickyPlayer?: boolean;
}>();

const search = defineModel<string>('search', { default: '' });
const sortBy = defineModel<string>('sortBy', { default: 'newest' });
const categoryId = defineModel<number | null>('categoryId', { default: null });
const subscriptionDialogOpen = defineModel<boolean>('subscriptionDialogOpen', { default: false });
const route = useRoute();
const player = usePostPlayer();
const shouldShowStickyPlayer = computed(() => player.hasActivePost.value && !props.hideStickyPlayer);
const hasCompactHeader = computed(() => route.meta.searchEnabled !== true);

defineEmits<{
    (e: 'create'): void;
    (e: 'login'): void;
    (e: 'register'): void;
    (e: 'logout'): void;
    (e: 'like-toggle', postId: number): void;
}>();
</script>

<template>
  <div
      class="app-shell"
      :class="{
        'app-shell--with-player': shouldShowStickyPlayer,
        'app-shell--compact-header': hasCompactHeader,
      }"
  >
    <AppSidebar
        :is-authenticated="isAuthenticated"
        :active-nav-key="activeNavKey"
        @create="$emit('create')"
        @login="$emit('login')"
        @register="$emit('register')"
        @logout="$emit('logout')"
    />

    <div class="app-shell__main">
      <AppHeader
          v-model:search="search"
          v-model:sort-by="sortBy"
          v-model:category-id="categoryId"
          v-model:subscription-dialog-open="subscriptionDialogOpen"
      />
      <main class="app-shell__content">
        <slot />
      </main>
    </div>

    <AppBottomBar
        :is-authenticated="isAuthenticated"
        :active-nav-key="activeNavKey"
        @create="$emit('create')"
    />

    <StickyPostPlayer
        v-if="shouldShowStickyPlayer"
        :like-pending-post-ids="likePendingPostIds"
        @like-toggle="$emit('like-toggle', $event)"
    />

    <SubscriptionDialog :is-open="subscriptionDialogOpen" @close="subscriptionDialogOpen = false" />
  </div>
</template>
