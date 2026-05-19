<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/modules/auth/auth.store';
import { useNotificationsPolling } from '@/modules/notifications/composables/useNotificationsPolling';
import { useRoute } from 'vue-router';
import BaseLoader from '@/shared/components/BaseLoader/BaseLoader.vue';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import ErrorAlert from '@/shared/components/ErrorAlert/ErrorAlert.vue';
import ProfileIdentity from '@/shared/components/ProfileIdentity/ProfileIdentity.vue';
import searchIconUrl from '@/shared/assets/icons/ui/search.svg';
import gridIconUrl from '@/shared/assets/icons/ui/grid.svg';
import sortIconUrl from '@/shared/assets/icons/ui/sort.svg';
import moonIconUrl from '@/shared/assets/icons/ui/moon.svg';
import sunIconUrl from '@/shared/assets/icons/ui/sun.svg';
import bellIconUrl from '@/shared/assets/icons/ui/bell.svg';
import closeIconUrl from '@/shared/assets/icons/ui/close.svg';
import { useAppHeaderControls } from '@/shared/composables/useAppHeaderControls';
import { useAppHeaderNotifications } from '@/shared/composables/useAppHeaderNotifications';
import { useTheme } from '@/shared/composables/useTheme';
import {
    formatNotificationTime,
    getNotificationActorOverflowLabel,
    getNotificationRelatedLabel,
    getNotificationTitle,
} from '@/modules/notifications/utils/notification-formatting.utils';
import { uk } from '@/shared/locales/uk';
import './AppHeader.css';

const search = defineModel<string>('search', { default: '' });
const sortBy = defineModel<string>('sortBy', { default: 'newest' });
const categoryId = defineModel<number | null>('categoryId', { default: null });

const authStore = useAuthStore();
const { theme, toggleTheme } = useTheme();
const route = useRoute();
const {
    actionErrorMessage,
    badgeCount,
    badgeMax,
    hasUnseenNotifications,
    isDropdownOpen,
    isNotificationsRoute,
    isPreviewItemDisabled,
    isPreviewLoading,
    navigationPendingNotificationId,
    notificationsLabel,
    notificationsMenuRef,
    openNotificationsPage,
    openPreviewNotification,
    previewErrorMessage,
    previewItems,
    toggleDropdown,
    unreadSummaryLabel,
} = useAppHeaderNotifications();
const isSearchEnabled = computed(() => route.meta.searchEnabled === true);
const setNotificationsMenuRef = (element: Element | unknown): void => {
    notificationsMenuRef.value = element instanceof HTMLElement ? element : null;
};
const isSubscriptionDialogOpen = defineModel<boolean>('subscriptionDialogOpen', { default: false });
const subscriptionButtonLabel = computed(() => authStore.isPremium
    ? uk.payments.header.manageLabel
    : uk.home.subscribeLabel);
useNotificationsPolling();
const headerControls = useAppHeaderControls({
    search,
    categoryId,
    sortBy,
});
const {
    categoryMenuOpen,
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
    sortOptions,
    toggleCategoryMenu,
    toggleSortMenu,
} = headerControls;
</script>

<template>
  <header class="app-header" :class="{ 'app-header--without-search': !isSearchEnabled }">
    <label v-if="isSearchEnabled" class="app-header__search">
      <img :src="searchIconUrl" alt="" class="app-header__icon-image" />
      <input
          v-model="search"
          type="text"
          :placeholder="uk.home.searchPlaceholder"
          class="app-header__search-input"
      />

      <button
          v-if="hasActiveFilters"
          type="button"
          class="app-header__search-reset"
          :aria-label="uk.home.resetFilters"
          @click.prevent="resetFilters"
      >
        <img :src="closeIconUrl" alt="" class="app-header__icon-image" />
      </button>
    </label>

    <div v-if="isSearchEnabled" class="app-header__tools">
      <div :ref="headerControls.categoryMenuRef" class="app-header__sort">
        <button
            type="button"
            class="app-header__icon-btn"
            :class="{ 'app-header__icon-btn--active': isCategoryActive }"
            :aria-label="uk.home.categories.filterLabel"
            @click="toggleCategoryMenu"
        >
          <img :src="gridIconUrl" alt="" class="app-header__icon-image" />
          <span v-if="isCategoryActive" class="app-header__active-dot" />
        </button>

        <div v-if="categoryMenuOpen" class="app-header__sort-menu app-header__category-menu">
          <label class="app-header__category-search">
            <img :src="searchIconUrl" alt="" class="app-header__category-search-icon" />
            <input
                v-model="categorySearch"
                type="text"
                :placeholder="uk.home.categories.searchPlaceholder"
                class="app-header__category-search-input"
                @click.stop
            />
          </label>

          <div class="app-header__category-list">
            <button
                v-if="isCategoryActive && !categorySearch"
                type="button"
                class="app-header__sort-option"
                @click="clearCategory"
            >
              <span class="app-header__sort-option-spacer" />
              {{ uk.home.categories.filterLabel }}
            </button>

            <div v-if="!filteredCategories.length" class="app-header__category-empty">
              {{ uk.home.categories.noResults }}
            </div>

            <button
                v-for="category in filteredCategories"
                :key="category.categoryId"
                type="button"
                class="app-header__sort-option"
                :class="{ 'app-header__sort-option--selected': categoryId === category.categoryId }"
                @click="selectCategory(category)"
            >
              <span
                  v-if="categoryId === category.categoryId"
                  class="app-header__sort-option-check"
                  aria-hidden="true"
              />
              <span v-else class="app-header__sort-option-spacer" />
              {{ category.categoryName }}
            </button>
          </div>
        </div>
      </div>

      <div :ref="headerControls.sortMenuRef" class="app-header__sort">
        <button
            type="button"
            class="app-header__icon-btn"
            :class="{ 'app-header__icon-btn--active': isSortActive }"
            :aria-label="uk.home.sort.ariaLabel"
            @click="toggleSortMenu"
        >
          <img :src="sortIconUrl" alt="" class="app-header__icon-image" />
          <span v-if="isSortActive" class="app-header__active-dot" />
        </button>

        <div v-if="sortMenuOpen" class="app-header__sort-menu">
          <button
              v-for="option in sortOptions"
              :key="option.value"
              type="button"
              class="app-header__sort-option"
              :class="{ 'app-header__sort-option--selected': sortBy === option.value }"
              @click="selectSortOption(option.value)"
          >
            <span
                v-if="sortBy === option.value"
                class="app-header__sort-option-check"
                aria-hidden="true"
            />
            <span v-else class="app-header__sort-option-spacer" />
            {{ option.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="app-header__actions">
      <BaseButton
          :label="subscriptionButtonLabel"
          type="button"
          variant="primary"
          :disabled="false"
          @click="isSubscriptionDialogOpen = true"
      />

      <div :ref="setNotificationsMenuRef" class="app-header__notifications">
        <button
            type="button"
            class="app-header__icon-btn"
            :class="{ 'app-header__icon-btn--active': isDropdownOpen || isNotificationsRoute }"
            :aria-label="notificationsLabel"
            :aria-expanded="isDropdownOpen"
            @click="toggleDropdown"
        >
          <img :src="bellIconUrl" alt="" class="app-header__icon-image app-header__icon-image--bell" />
          <span v-if="hasUnseenNotifications" class="app-header__badge">
            {{ badgeCount > badgeMax ? `${badgeMax}+` : badgeCount }}
          </span>
        </button>

        <div v-if="isDropdownOpen" class="app-header__notifications-dropdown">
          <div class="app-header__notifications-header">
            <div class="app-header__notifications-copy">
              <span class="app-header__notifications-title">{{ uk.notifications.title }}</span>
              <span class="app-header__notifications-summary">{{ unreadSummaryLabel }}</span>
            </div>

            <button
                type="button"
                class="app-header__notifications-link"
                @click="openNotificationsPage"
            >
              {{ uk.notifications.viewAll }}
            </button>
          </div>

          <ErrorAlert v-if="actionErrorMessage" :message="actionErrorMessage" />
          <ErrorAlert v-else-if="previewErrorMessage" :message="previewErrorMessage" />

          <div v-if="isPreviewLoading && !previewItems.length" class="app-header__notifications-loading">
            <BaseLoader :label="uk.notifications.loading" size="sm" tone="primary" variant="wave" centered />
          </div>

          <div v-else-if="!previewItems.length" class="app-header__notifications-empty">
            <p class="app-header__notifications-empty-title">{{ uk.notifications.emptyTitle }}</p>
            <p class="app-header__notifications-empty-text">{{ uk.notifications.dropdownEmptyDescription }}</p>
          </div>

          <div v-else class="app-header__notifications-list">
            <button
                v-for="item in previewItems"
                :key="item.notificationId"
                type="button"
                class="app-header__notification-item"
                :class="{
                  'app-header__notification-item--read': item.isRead,
                  'app-header__notification-item--disabled': isPreviewItemDisabled(item),
                }"
                :disabled="isPreviewItemDisabled(item)"
                :aria-busy="navigationPendingNotificationId === item.notificationId"
                @click="openPreviewNotification(item)"
            >
              <span v-if="!item.isRead" class="app-header__notification-dot" aria-hidden="true" />

              <div class="app-header__notification-main">
                <div class="app-header__notification-top">
                  <span class="app-header__notification-title">{{ getNotificationTitle(item.notificationType) }}</span>
                  <span class="app-header__notification-time">{{ formatNotificationTime(item.lastEventAt) }}</span>
                </div>

                <ProfileIdentity
                    v-if="item.lastActor"
                    :name="item.lastActor.name"
                    :username="item.lastActor.username"
                    :photo="item.lastActor.photo"
                    :is-premium="item.lastActor.isPremium"
                    :premium-label="uk.profile.premiumLabel"
                    size="xs"
                    align="start"
                />

                <div v-else class="app-header__notification-system">
                  {{ uk.notifications.actors.system }}
                </div>

                <p v-if="item.previewText" class="app-header__notification-preview">
                  {{ item.previewText }}
                </p>

                <div class="app-header__notification-meta">
                  <span>{{ getNotificationActorOverflowLabel(item.eventsCount) || uk.notifications.feedItemSingle }}</span>
                  <span class="app-header__notification-separator" aria-hidden="true">•</span>
                  <span>{{ getNotificationRelatedLabel(item) }}</span>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      <button type="button" class="app-header__icon-btn" :aria-label="uk.home.themeLabel" @click="toggleTheme">
        <img :src="theme === 'dark' ? sunIconUrl : moonIconUrl" alt="" class="app-header__icon-image" />
      </button>
    </div>
  </header>
</template>
