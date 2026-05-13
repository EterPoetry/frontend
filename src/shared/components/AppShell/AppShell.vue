<script setup lang="ts">
import AppHeader from '@/shared/components/AppHeader/AppHeader.vue';
import AppBottomBar from '@/shared/components/AppBottomBar/AppBottomBar.vue';
import AppSidebar from '@/shared/components/AppSidebar/AppSidebar.vue';
import type { AppNavigationItem } from '@/shared/constants/app-navigation';
import './AppShell.css';

defineProps<{
    isAuthenticated: boolean;
    activeNavKey?: AppNavigationItem['key'];
}>();

const search = defineModel<string>('search', { default: '' });

defineEmits<{
    (e: 'create'): void;
    (e: 'login'): void;
    (e: 'register'): void;
    (e: 'logout'): void;
}>();
</script>

<template>
  <div class="app-shell">
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
  </div>
</template>
