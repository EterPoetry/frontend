<script setup lang="ts">
import { computed } from 'vue';
import StickyPostPlayer from '@/modules/posts/components/StickyPostPlayer/StickyPostPlayer.vue';
import { usePostPlayer } from '@/modules/posts/composables/usePostPlayer';
import AppHeader from '@/shared/components/AppHeader/AppHeader.vue';
import AppBottomBar from '@/shared/components/AppBottomBar/AppBottomBar.vue';
import AppSidebar from '@/shared/components/AppSidebar/AppSidebar.vue';
import type { AppNavigationItem } from '@/shared/constants/app-navigation';
import './AppShell.css';

defineProps<{
    isAuthenticated: boolean;
    activeNavKey?: AppNavigationItem['key'];
    likePendingPostIds?: number[];
}>();

const search = defineModel<string>('search', { default: '' });
const player = usePostPlayer();
const hasPlayer = computed(() => player.hasActivePost.value);

defineEmits<{
    (e: 'create'): void;
    (e: 'login'): void;
    (e: 'register'): void;
    (e: 'logout'): void;
    (e: 'like-toggle', postId: number): void;
}>();
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--with-player': hasPlayer }">
    <AppSidebar
        :is-authenticated="isAuthenticated"
        :active-nav-key="activeNavKey"
        @create="$emit('create')"
        @login="$emit('login')"
        @register="$emit('register')"
        @logout="$emit('logout')"
    />

    <div class="app-shell__main">
      <AppHeader v-model:search="search" />
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
        :like-pending-post-ids="likePendingPostIds"
        @like-toggle="$emit('like-toggle', $event)"
    />
  </div>
</template>
