<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import logoUrl from '@/shared/assets/icons/eter-logo.svg';
import { AuthRouteNames } from '@/modules/auth/enums/auth-route-names.enum';
import { PostRouteNames } from '@/modules/posts/enums/post-route-names.enum';
import { ProfileRouteNames } from '@/modules/profile/enums/profile-route-names.enum';
import { createAppNavigationItems, resolveActiveAppNavigationKey, type AppNavigationItem } from '@/shared/constants/app-navigation';
import { uk } from '@/shared/locales/uk';
import './AppSidebar.css';

const props = defineProps<{
    isAuthenticated: boolean;
    activeNavKey?: AppNavigationItem['key'];
}>();

const emit = defineEmits<{
    (e: 'create'): void;
    (e: 'login'): void;
    (e: 'register'): void;
    (e: 'logout'): void;
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
  <aside class="app-sidebar">
    <RouterLink class="app-sidebar__brand" to="/home">
      <img :src="logoUrl" :alt="uk.common.appName" class="app-sidebar__logo" />
    </RouterLink>

    <nav class="app-sidebar__nav" :aria-label="uk.home.nav.ariaLabel">
      <button
          v-for="item in navItems"
          :key="item.key"
          type="button"
          class="app-sidebar__nav-item"
          :class="{ 'app-sidebar__nav-item--active': isItemActive(item) }"
          :disabled="isItemActive(item)"
          @click="handleNavClick(item)"
      >
        <img :src="isItemActive(item) ? item.activeIcon : item.icon" :alt="item.label" class="app-sidebar__nav-icon" />
        <span>{{ item.label }}</span>
      </button>
    </nav>

    <div v-if="props.isAuthenticated" class="app-sidebar__footer app-sidebar__footer--auth">
      <BaseButton
          :label="uk.common.labels.logout"
          type="button"
          variant="secondary"
          :disabled="false"
          @click="emit('logout')"
      />
    </div>

    <div v-else class="app-sidebar__footer">
      <BaseButton
          :label="uk.home.actions.register"
          type="button"
          variant="primary"
          :disabled="false"
          @click="emit('register')"
      />
      <BaseButton
          :label="uk.home.actions.login"
          type="button"
          variant="secondary"
          :disabled="false"
          @click="emit('login')"
      />
    </div>
  </aside>
</template>
