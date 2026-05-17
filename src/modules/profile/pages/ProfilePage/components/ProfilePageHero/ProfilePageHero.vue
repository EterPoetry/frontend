<script setup lang="ts">
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import ProfileIdentity from '@/shared/components/ProfileIdentity/ProfileIdentity.vue';
import type { ProfileResponse } from '@/modules/profile/interfaces/profile-response.interface';
import type { PublicProfile } from '@/modules/profile/interfaces/public-profile.interface';
import pencilIconUrl from '@/shared/assets/icons/ui/pencil.svg';
import { uk } from '@/shared/locales/uk';
import './ProfilePageHero.css';

defineProps<{
    isPageLoading: boolean;
    currentProfile: ProfileResponse | PublicProfile | null;
    profileName: string;
    profileBio: string;
    profileLink: string;
    postsCount: number;
    followersCount: number;
    followingCount: number;
    violationsCount: number;
    maxViolationsBeforeBlock: number;
    isOwnProfile: boolean;
    isAuthenticated: boolean;
    isPublicSubscribed: boolean;
    isFollowButtonPending: boolean;
}>();

defineEmits<{
    (e: 'open-followers'): void;
    (e: 'open-following'): void;
    (e: 'open-violations'): void;
    (e: 'edit'): void;
    (e: 'toggle-subscription'): void;
    (e: 'login'): void;
}>();
</script>

<template>
  <section class="profile-page-hero">
    <div v-if="isPageLoading && !currentProfile" class="profile-page-hero__loading">
      {{ uk.common.labels.loading }}
    </div>

    <template v-else-if="currentProfile">
      <div class="profile-page-hero__card">
        <div class="profile-page-hero__identity">
          <div class="profile-page-hero__copy">
            <div class="profile-page-hero__title-row">
              <ProfileIdentity
                  :name="profileName"
                  :username="currentProfile.username"
                  :photo="currentProfile.photo"
                  :is-premium="currentProfile.isPremium"
                  :premium-label="uk.profile.premiumLabel"
                  size="hero"
                  align="start"
              />
            </div>

            <p v-if="profileBio" class="profile-page-hero__bio">{{ profileBio }}</p>
            <a
                v-if="profileLink"
                :href="profileLink"
                target="_blank"
                rel="noopener noreferrer"
                class="profile-page-hero__link"
            >
              {{ profileLink }}
            </a>

            <div class="profile-page-hero__stats">
              <div class="profile-page-hero__stat">
                <strong>{{ postsCount }}</strong>
                <span>{{ uk.profile.stats.posts }}</span>
              </div>

              <button
                  type="button"
                  class="profile-page-hero__stat profile-page-hero__stat--interactive stat-button"
                  @click="$emit('open-followers')"
              >
                <strong>{{ followersCount }}</strong>
                <span>{{ uk.profile.stats.followers }}</span>
              </button>

              <button
                  type="button"
                  class="profile-page-hero__stat profile-page-hero__stat--interactive stat-button"
                  @click="$emit('open-following')"
              >
                <strong>{{ followingCount }}</strong>
                <span>{{ uk.profile.stats.following }}</span>
              </button>

              <button
                  v-if="isOwnProfile"
                  type="button"
                  class="profile-page-hero__stat profile-page-hero__stat--interactive stat-button"
                  @click="$emit('open-violations')"
              >
                <strong>{{ violationsCount }} з {{ maxViolationsBeforeBlock }}</strong>
                <span>{{ uk.profile.stats.violations }}</span>
              </button>
            </div>
          </div>

          <div class="profile-page-hero__actions">
            <BaseButton
                v-if="isOwnProfile"
                :label="uk.profile.actions.edit"
                type="button"
                variant="secondary"
                :disabled="false"
                @click="$emit('edit')"
            >
              <template #icon>
                <img :src="pencilIconUrl" alt="" class="profile-page-hero__button-icon" />
              </template>
            </BaseButton>

            <BaseButton
                v-else-if="isAuthenticated"
                :label="isPublicSubscribed ? uk.profile.actions.following : uk.profile.actions.follow"
                type="button"
                :variant="isPublicSubscribed ? 'secondary' : 'primary'"
                :disabled="false"
                :is-loading="isFollowButtonPending"
                @click="$emit('toggle-subscription')"
            />

            <BaseButton
                v-else
                :label="uk.profile.actions.follow"
                type="button"
                variant="primary"
                :disabled="false"
                @click="$emit('login')"
            />
          </div>
        </div>
      </div>
    </template>
  </section>
</template>
