<script setup lang="ts">
import { computed, ref } from 'vue';
import CreatePostModal from '@/modules/posts/components/CreatePostModal/CreatePostModal.vue';
import NotificationPushSettingsDialog from '@/modules/notifications/components/NotificationPushSettingsDialog/NotificationPushSettingsDialog.vue';
import { usePostsAppShell } from '@/modules/posts/composables/usePostsAppShell';
import { useNotificationsPolling } from '@/modules/notifications/composables/useNotificationsPolling';
import { useNotificationsPage } from '@/modules/notifications/composables/useNotificationsPage';
import type { NotificationItem } from '@/modules/notifications/interfaces/notification-item.interface';
import AppShell from '@/shared/components/AppShell/AppShell.vue';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import BaseLoader from '@/shared/components/BaseLoader/BaseLoader.vue';
import ErrorAlert from '@/shared/components/ErrorAlert/ErrorAlert.vue';
import ProfileIdentity from '@/shared/components/ProfileIdentity/ProfileIdentity.vue';
import {
    formatNotificationTime,
    getNotificationActorOverflowLabel,
    getNotificationRelatedLabel,
    getNotificationTitle,
    isNotificationNavigable,
} from '@/modules/notifications/utils/notification-formatting.utils';
import { uk } from '@/shared/locales/uk';
import './NotificationsPage.css';

const {
    authStore,
    durationLimitMinutes,
    handleCreateClick,
    handleModalClose,
    handlePostCreated,
    isAuthenticated,
    isCreatePostModalOpen,
    openLogin,
    openRegister,
    search,
    sortBy,
    categoryId,
} = usePostsAppShell();

const {
    actionErrorMessage,
    activeFilter,
    canLoadMore,
    browserPushDescription,
    browserPushErrorMessage,
    browserPushStatusLabel,
    disableBrowserPush,
    enableBrowserPush,
    errorMessage,
    filteredItems,
    filters,
    isInitialLoading,
    isBrowserPushAvailable,
    isBrowserPushEnabled,
    isBrowserPushPending,
    isLoadingMore,
    isMarkAllReadPending,
    loadMoreTrigger,
    markAllAsRead,
    navigationPendingNotificationId,
    openNotification,
    retry,
    setFilter,
    unreadCount,
} = useNotificationsPage();
useNotificationsPolling({ fullFeed: true });

const isSettingsDialogOpen = ref(false);

const setLoadMoreTrigger = (element: Element | unknown): void => {
    loadMoreTrigger.value = element instanceof HTMLElement ? element : null;
};

const hasUnreadNotifications = computed(() => unreadCount.value > 0);
const isNotificationActionDisabled = (item: NotificationItem): boolean => (
    navigationPendingNotificationId.value === item.notificationId || (!isNotificationNavigable(item) && item.isRead)
);
</script>

<template>
  <AppShell
      v-model:search="search"
      v-model:sort-by="sortBy"
      v-model:category-id="categoryId"
      :is-authenticated="isAuthenticated"
      @create="handleCreateClick"
      @login="openLogin"
      @register="openRegister"
      @logout="authStore.logout"
  >
    <section class="notifications-page" aria-labelledby="notifications-page-title">
      <header class="notifications-page__header">
        <div class="notifications-page__header-copy">
          <h1 id="notifications-page-title" class="notifications-page__title">
            {{ uk.notifications.title }}
          </h1>
          <p class="notifications-page__description">
            {{ uk.notifications.description }}
          </p>
        </div>

        <BaseButton
            v-if="hasUnreadNotifications"
            :label="uk.notifications.markAllRead"
            type="button"
            variant="secondary"
            class="notifications-page__mark-all-btn"
            :disabled="isMarkAllReadPending"
            :is-loading="isMarkAllReadPending"
            @click="markAllAsRead"
        />
      </header>

      <div class="notifications-page__filters" :aria-label="uk.notifications.filters.ariaLabel">
        <button
            v-for="filter in filters"
            :key="filter.value"
            type="button"
            class="notifications-page__filter-chip"
            :class="{ 'notifications-page__filter-chip--active': activeFilter === filter.value }"
            @click="setFilter(filter.value)"
        >
          {{ filter.label }}
        </button>
      </div>

      <section class="notifications-page__settings" :aria-labelledby="'notifications-browser-push-title'">
        <div class="notifications-page__settings-copy">
          <p class="notifications-page__settings-eyebrow">{{ uk.notifications.browserPush.eyebrow }}</p>
          <h2 id="notifications-browser-push-title" class="notifications-page__settings-title">
            {{ uk.notifications.browserPush.title }}
          </h2>
          <p class="notifications-page__settings-text">{{ browserPushDescription }}</p>
        </div>

        <div class="notifications-page__settings-actions">
          <span class="notifications-page__settings-status">{{ browserPushStatusLabel }}</span>

          <BaseButton
              v-if="isBrowserPushEnabled"
              :label="uk.notifications.browserPush.disable"
              type="button"
              variant="secondary"
              class="notifications-page__settings-button"
              :disabled="isBrowserPushPending"
              :is-loading="isBrowserPushPending"
              @click="disableBrowserPush"
          />

          <BaseButton
              v-if="isBrowserPushEnabled"
              :label="uk.notifications.browserPush.settingsButton"
              type="button"
              variant="secondary"
              class="notifications-page__settings-icon-button"
              :disabled="isBrowserPushPending"
              :icon-only="true"
              @click="isSettingsDialogOpen = true"
          >
            <template #icon>
              <span
                  class="notifications-page__settings-icon notifications-page__settings-icon--settings"
                  aria-hidden="true"
              />
            </template>
          </BaseButton>

          <BaseButton
              v-if="!isBrowserPushEnabled"
              :label="uk.notifications.browserPush.enable"
              type="button"
              variant="primary"
              class="notifications-page__settings-button"
              :disabled="!isBrowserPushAvailable || isBrowserPushPending"
              :is-loading="isBrowserPushPending"
              @click="enableBrowserPush"
          />
        </div>
      </section>

      <ErrorAlert v-if="browserPushErrorMessage" :message="browserPushErrorMessage" />

      <ErrorAlert v-if="actionErrorMessage" :message="actionErrorMessage" />
      <ErrorAlert v-if="errorMessage && !filteredItems.length" :message="errorMessage" />

      <div v-if="isInitialLoading" class="notifications-page__loading">
        <BaseLoader :label="uk.notifications.loading" size="md" tone="primary" variant="wave" centered />
      </div>

      <div v-else-if="!filteredItems.length && !errorMessage" class="notifications-page__empty">
        <p class="notifications-page__empty-title">
          {{ activeFilter === 'all' ? uk.notifications.emptyTitle : uk.notifications.emptyFilteredTitle }}
        </p>
        <p class="notifications-page__empty-text">
          {{ activeFilter === 'all' ? uk.notifications.emptyDescription : uk.notifications.emptyFilteredDescription }}
        </p>
      </div>

      <div v-else class="notifications-page__list">
        <button
            v-for="item in filteredItems"
            :key="item.notificationId"
            type="button"
            class="notifications-page__item"
            :class="{
              'notifications-page__item--read': item.isRead,
              'notifications-page__item--disabled': !isNotificationNavigable(item),
            }"
            :disabled="isNotificationActionDisabled(item)"
            :aria-busy="navigationPendingNotificationId === item.notificationId"
            @click="openNotification(item)"
        >
          <span v-if="!item.isRead" class="notifications-page__item-dot" aria-hidden="true" />

          <div class="notifications-page__item-main">
            <div class="notifications-page__item-header">
              <div class="notifications-page__item-copy">
                <span class="notifications-page__item-title">{{ getNotificationTitle(item.notificationType) }}</span>
                <span class="notifications-page__item-time">{{ formatNotificationTime(item.lastEventAt) }}</span>
              </div>

              <span v-if="item.eventsCount > 1" class="notifications-page__count">
                {{ item.eventsCount }}
              </span>
            </div>

            <ProfileIdentity
                v-if="item.lastActor"
                :name="item.lastActor.name"
                :username="item.lastActor.username"
                :photo="item.lastActor.photo"
                :is-premium="item.lastActor.isPremium"
                :premium-label="uk.profile.premiumLabel"
                size="sm"
                align="start"
            />

            <div v-else class="notifications-page__system">
              {{ uk.notifications.actors.system }}
            </div>

            <p v-if="item.previewText" class="notifications-page__item-preview">
              {{ item.previewText }}
            </p>

            <div class="notifications-page__meta">
              <span>{{ getNotificationActorOverflowLabel(item.eventsCount) || uk.notifications.feedItemSingle }}</span>
              <span class="notifications-page__meta-separator" aria-hidden="true">•</span>
              <span>{{ getNotificationRelatedLabel(item) }}</span>
            </div>
          </div>
        </button>

        <div v-if="errorMessage && filteredItems.length" class="notifications-page__footer">
          <p class="notifications-page__footer-text">{{ errorMessage }}</p>
          <BaseButton
              :label="uk.notifications.retry"
              type="button"
              variant="secondary"
              :disabled="false"
              @click="retry"
          />
        </div>

        <div v-if="isLoadingMore" class="notifications-page__loading notifications-page__loading--more">
          <BaseLoader :label="uk.notifications.loadingMore" size="sm" tone="primary" variant="wave" centered />
        </div>

        <div
            v-if="canLoadMore"
            :ref="setLoadMoreTrigger"
            class="notifications-page__sentinel"
            aria-hidden="true"
        />
      </div>
    </section>
  </AppShell>

  <CreatePostModal
      :is-open="isCreatePostModalOpen"
      :duration-limit-minutes="durationLimitMinutes"
      @close="handleModalClose"
      @created="handlePostCreated"
  />

  <NotificationPushSettingsDialog
      :is-open="isSettingsDialogOpen"
      @close="isSettingsDialogOpen = false"
  />
</template>
