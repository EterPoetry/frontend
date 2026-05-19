<script setup lang="ts">
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import ProfileIdentity from '@/shared/components/ProfileIdentity/ProfileIdentity.vue';
import searchIconUrl from '@/shared/assets/icons/ui/search.svg';
import { ProfileRouteNames } from '@/modules/profile/enums/profile-route-names.enum';
import type { ProfileFollowListItem } from '@/modules/profile/interfaces/profile-follow-list-item.interface';
import { uk } from '@/shared/locales/uk';
import AppDialogShell from '@/shared/components/AppDialogShell/AppDialogShell.vue';
import './ProfileFollowDialog.css';

const props = defineProps<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    searchValue: string;
    isLoading: boolean;
    errorMessage: string;
    items: ProfileFollowListItem[];
    hasMore: boolean;
    isLoadingMore: boolean;
    pendingUserIds: number[];
    currentUserId: number | null;
}>();

defineEmits<{
    (e: 'close'): void;
    (e: 'update:search', value: string): void;
    (e: 'toggle-subscription', userId: number): void;
    (e: 'load-more'): void;
}>();

const isPending = (userId: number): boolean => props.pendingUserIds.includes(userId);
</script>

<template>
  <AppDialogShell :is-open="isOpen" :title="title" :subtitle="subtitle" size="lg" @close="$emit('close')">
    <div class="profile-follow-dialog">
      <label class="profile-follow-dialog__search">
        <img :src="searchIconUrl" alt="" class="profile-follow-dialog__search-icon" />
        <input
            :value="searchValue"
            type="text"
            :placeholder="searchPlaceholder"
            class="profile-follow-dialog__search-input"
            @input="$emit('update:search', ($event.target as HTMLInputElement).value)"
        />
      </label>

      <div v-if="errorMessage" class="profile-follow-dialog__state profile-follow-dialog__state--error">
        {{ errorMessage }}
      </div>

      <div v-else-if="isLoading" class="profile-follow-dialog__skeleton-list" aria-hidden="true">
        <article
            v-for="index in 5"
            :key="index"
            class="profile-follow-dialog__item profile-follow-dialog__item--skeleton"
        >
          <div class="profile-follow-dialog__person">
            <div class="profile-follow-dialog__avatar-skeleton sk" />
            <div class="profile-follow-dialog__person-copy">
              <div class="profile-follow-dialog__line profile-follow-dialog__line--name sk" />
              <div class="profile-follow-dialog__line profile-follow-dialog__line--meta sk" />
            </div>
          </div>

          <div class="profile-follow-dialog__button-skeleton sk" />
        </article>
      </div>

      <div v-else-if="!items.length" class="profile-follow-dialog__state">
        {{ uk.profile.emptyStates.followList }}
      </div>

      <div v-else class="profile-follow-dialog__list">
        <article
            v-for="item in items"
            :key="item.userId"
            class="profile-follow-dialog__item"
        >
          <RouterLink
              :to="{ name: ProfileRouteNames.PROFILE_BY_USERNAME, params: { username: item.username } }"
              class="profile-follow-dialog__person"
          >
            <ProfileIdentity
                :name="item.name"
                :username="item.username"
                :photo="item.photo"
                :is-premium="item.isPremium"
                :premium-label="uk.profile.premiumLabel"
                size="lg"
            />
          </RouterLink>

          <span v-if="item.userId === currentUserId" class="profile-follow-dialog__self">{{ uk.common.labels.you }}</span>

          <BaseButton
              v-else
              :label="item.isSubscribed ? uk.profile.actions.following : uk.profile.actions.follow"
              type="button"
              :variant="item.isSubscribed ? 'secondary' : 'primary'"
              :disabled="false"
              :is-loading="isPending(item.userId)"
              @click="$emit('toggle-subscription', item.userId)"
          />
        </article>

        <div v-if="hasMore" class="profile-follow-dialog__more">
          <BaseButton
              :label="uk.profile.actions.loadMore"
              type="button"
              variant="secondary"
              :disabled="false"
              :is-loading="isLoadingMore"
              @click="$emit('load-more')"
          />
        </div>
      </div>
    </div>
  </AppDialogShell>
</template>
