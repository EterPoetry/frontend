<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { AuthRouteNames } from '@/modules/auth/enums/auth-route-names.enum';
import { PostRouteNames } from '@/modules/posts/enums/post-route-names.enum';
import { ProfileRouteNames } from '@/modules/profile/enums/profile-route-names.enum';
import { createAppNavigationItems, resolveActiveAppNavigationKey, type AppNavigationItem } from '@/shared/constants/app-navigation';
import { uk } from '@/shared/locales/uk';
import './AppBottomBar.css';

const props = defineProps<{
    isAuthenticated: boolean;
    activeNavKey?: AppNavigationItem['key'];
}>();

const emit = defineEmits<{
    (e: 'create'): void;
}>();

const route = useRoute();
const router = useRouter();

const navItems = computed(() => createAppNavigationItems(uk.home.nav));

const activeNavKey = computed<AppNavigationItem['key'] | undefined>(
    () => resolveActiveAppNavigationKey(route.name, props.activeNavKey),
);

const isItemActive = (item: AppNavigationItem): boolean => item.key === activeNavKey.value;

const handleNavClick = async (item: AppNavigationItem): Promise<void> => {
    if (isItemActive(item)) {
        return;
    }

    if (item.requiresAuth && !props.isAuthenticated) {
        await router.push({ name: AuthRouteNames.LOGIN });
        return;
    }

    if (item.key === 'home') {
        await router.push({ name: PostRouteNames.HOME });
        return;
    }

    if (item.key === 'subscriptions') {
        await router.push({ name: PostRouteNames.SUBSCRIPTIONS });
        return;
    }

    if (item.key === 'favorites') {
        await router.push({ name: PostRouteNames.FAVORITES });
        return;
    }

    if (item.key === 'profile') {
        await router.push({ name: ProfileRouteNames.PROFILE_ME });
        return;
    }

    if (item.key === 'create') {
        emit('create');
    }
};
</script>

<template>
  <nav class="app-bottom-bar" :aria-label="uk.home.nav.ariaLabel">
    <button
        v-for="item in navItems"
        :key="item.key"
        type="button"
        class="app-bottom-bar__item"
        :class="{ 'app-bottom-bar__item--active': isItemActive(item) }"
        :disabled="isItemActive(item)"
        @click="handleNavClick(item)"
    >
      <img
          :src="isItemActive(item) ? item.activeIcon : item.icon"
          :alt="item.label"
          class="app-bottom-bar__icon"
      />
      <span class="app-bottom-bar__label">{{ item.label }}</span>
    </button>
  </nav>
</template>
