<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAdminStore } from '@/modules/admin/admin.store';
import { AdminRole } from '@/modules/admin/enums/admin-role.enum';
import { AdminRouteNames } from '@/modules/admin/enums/admin-route-names.enum';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import logoUrl from '@/shared/assets/icons/eter-logo.svg';
import moonIconUrl from '@/shared/assets/icons/ui/moon.svg';
import sunIconUrl from '@/shared/assets/icons/ui/sun.svg';
import { useTheme } from '@/shared/composables/useTheme';
import { uk } from '@/shared/locales/uk';
import '@/shared/components/AppSidebar/AppSidebar.css';
import '@/shared/components/AppBottomBar/AppBottomBar.css';
import './AdminShell.css';

interface AdminNavItem {
    label: string;
    routeName: AdminRouteNames;
    iconClass: string;
    globalOnly?: boolean;
}

const route = useRoute();
const router = useRouter();
const adminStore = useAdminStore();
const { theme, toggleTheme } = useTheme();

defineProps<{
    title: string;
    description?: string;
}>();

const navItems = computed<AdminNavItem[]>(() => [
    { label: uk.admin.nav.dashboard, routeName: AdminRouteNames.DASHBOARD, iconClass: 'admin-shell__nav-icon--dashboard' },
    { label: uk.admin.nav.complaints, routeName: AdminRouteNames.COMPLAINTS, iconClass: 'admin-shell__nav-icon--complaints' },
    { label: uk.admin.nav.users, routeName: AdminRouteNames.USERS, iconClass: 'admin-shell__nav-icon--users' },
    { label: uk.admin.nav.categories, routeName: AdminRouteNames.CATEGORIES, iconClass: 'admin-shell__nav-icon--categories' },
    { label: uk.admin.nav.admins, routeName: AdminRouteNames.ADMINS, iconClass: 'admin-shell__nav-icon--admins', globalOnly: true },
    { label: uk.admin.nav.profile, routeName: AdminRouteNames.PROFILE, iconClass: 'admin-shell__nav-icon--profile' },
].filter((item) => !item.globalOnly || adminStore.admin?.role === AdminRole.GLOBAL_ADMIN));

const isItemActive = (item: AdminNavItem): boolean => route.name === item.routeName;

const navigateTo = async (item: AdminNavItem): Promise<void> => {
    if (isItemActive(item)) {
        return;
    }

    await router.push({ name: item.routeName });
};
</script>

<template>
  <div class="admin-shell">
    <aside class="app-sidebar">
      <RouterLink class="app-sidebar__brand" :to="{ name: AdminRouteNames.DASHBOARD }">
        <img :src="logoUrl" :alt="uk.common.appName" class="admin-shell__brand-logo" />
        <div class="admin-shell__brand-copy">
          <strong>{{ uk.admin.title }}</strong>
          <span>{{ uk.admin.subtitle }}</span>
        </div>
      </RouterLink>

      <nav class="app-sidebar__nav" :aria-label="uk.admin.nav.ariaLabel">
        <button
            v-for="item in navItems"
            :key="item.routeName"
            type="button"
            class="app-sidebar__nav-item"
            :class="{ 'app-sidebar__nav-item--active': isItemActive(item) }"
            :disabled="isItemActive(item)"
            @click="navigateTo(item)"
        >
          <span class="admin-shell__nav-icon" :class="item.iconClass" :aria-hidden="true" />
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <div class="app-sidebar__footer app-sidebar__footer--auth">
        <button
            type="button"
            class="admin-shell__theme-toggle"
            :aria-label="uk.home.themeLabel"
            @click="toggleTheme"
        >
          <img
              :src="theme === 'dark' ? sunIconUrl : moonIconUrl"
              alt=""
              class="admin-shell__theme-icon"
          />
          <span>{{ theme === 'dark' ? uk.admin.actions.lightTheme : uk.admin.actions.darkTheme }}</span>
        </button>

        <div class="admin-shell__identity">
          <strong class="admin-shell__identity-name">{{ adminStore.admin?.name }}</strong>
          <span class="admin-shell__identity-email">{{ adminStore.admin?.email }}</span>
        </div>
        <BaseButton
            :label="uk.common.labels.logout"
            type="button"
            variant="secondary"
            :disabled="false"
            @click="adminStore.logout()"
        />
      </div>
    </aside>

    <div class="admin-shell__main">
      <div class="admin-shell__mobile-actions">
        <button
            type="button"
            class="admin-shell__theme-toggle admin-shell__theme-toggle--mobile"
            :aria-label="uk.home.themeLabel"
            @click="toggleTheme"
        >
          <img
              :src="theme === 'dark' ? sunIconUrl : moonIconUrl"
              alt=""
              class="admin-shell__theme-icon"
          />
        </button>
      </div>

      <main class="admin-shell__content">
        <header class="admin-shell__page-header">
          <div class="admin-shell__page-copy">
            <p class="admin-shell__page-eyebrow">{{ uk.admin.subtitle }}</p>
            <h1 class="admin-shell__page-title">{{ title }}</h1>
            <p v-if="description" class="admin-shell__page-description">{{ description }}</p>
          </div>
          <div v-if="$slots.actions" class="admin-shell__page-actions">
            <slot name="actions" />
          </div>
        </header>
        <slot />
      </main>
    </div>

    <nav class="app-bottom-bar admin-shell__bottom-bar" :aria-label="uk.admin.nav.ariaLabel">
      <button
          v-for="item in navItems"
          :key="`${item.routeName}-mobile`"
          type="button"
          class="app-bottom-bar__item"
          :class="{ 'app-bottom-bar__item--active': isItemActive(item) }"
          :disabled="isItemActive(item)"
          @click="navigateTo(item)"
      >
        <span class="admin-shell__nav-icon admin-shell__nav-icon--sm" :class="item.iconClass" :aria-hidden="true" />
        <span class="app-bottom-bar__label">{{ item.label }}</span>
      </button>
    </nav>
  </div>
</template>
