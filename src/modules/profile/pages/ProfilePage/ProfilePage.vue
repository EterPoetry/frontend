<script setup lang="ts">
import {isAxiosError} from 'axios';
import {computed, ref, watch} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import CreatePostModal from '@/modules/posts/components/CreatePostModal/CreatePostModal.vue';
import {usePostsFeedLikes} from '@/modules/posts/composables/usePostsFeedLikes';
import {usePostPlayer} from '@/modules/posts/composables/usePostPlayer';
import {usePostsAppShell} from '@/modules/posts/composables/usePostsAppShell';
import {usePostsStore} from '@/modules/posts/posts.store';
import AppShell from '@/shared/components/AppShell/AppShell.vue';
import ErrorAlert from '@/shared/components/ErrorAlert/ErrorAlert.vue';
import {ProfileRouteNames} from '@/modules/profile/enums/profile-route-names.enum';
import type {
  ActiveViolationResponse
} from '@/modules/profile/interfaces/active-violation-response.interface';
import type {ComplaintReasonItem} from '@/modules/profile/interfaces/complaint-reason-item.interface';
import type {ProfileResponse} from '@/modules/profile/interfaces/profile-response.interface';
import type {PublicProfile} from '@/modules/profile/interfaces/public-profile.interface';
import {useProfileFollowDialog} from '@/modules/profile/composables/useProfileFollowDialog';
import {useProfilePosts} from '@/modules/profile/composables/useProfilePosts';
import {useProfileStore} from '@/modules/profile/profile.store';
import {SharedRouteNames} from '@/shared/enums/shared-route-names.enum';
import {uk} from '@/shared/locales/uk';
import ProfileEditDialog from '@/modules/profile/components/ProfileEditDialog/ProfileEditDialog.vue';
import ProfileFollowDialog from '@/modules/profile/components/ProfileFollowDialog/ProfileFollowDialog.vue';
import ProfileViolationsDialog from '@/modules/profile/components/ProfileViolationsDialog/ProfileViolationsDialog.vue';
import ProfilePageHero from '@/modules/profile/pages/ProfilePage/components/ProfilePageHero/ProfilePageHero.vue';
import ProfilePublishedPostsSection
  from '@/modules/profile/pages/ProfilePage/components/ProfilePublishedPostsSection/ProfilePublishedPostsSection.vue';
import ProfileDraftPostsSection
  from '@/modules/profile/pages/ProfilePage/components/ProfileDraftPostsSection/ProfileDraftPostsSection.vue';
import './ProfilePage.css';

type ProfileViewTab = 'published' | 'drafts';

const route = useRoute();
const router = useRouter();
const profileStore = useProfileStore();
const postsStore = usePostsStore();
const player = usePostPlayer();

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
} = usePostsAppShell();

const isPageLoading = ref(false);
const pageErrorMessage = ref('');
const publicProfile = ref<PublicProfile | null>(null);
const isFollowButtonPending = ref(false);
const activeTab = ref<ProfileViewTab>('published');
const isEditDialogOpen = ref(false);
const isSavingProfile = ref(false);
const editProfileErrorMessage = ref('');
const editProfileUsernameError = ref('');
const isViolationsDialogOpen = ref(false);
const isViolationsLoading = ref(false);
const violationsErrorMessage = ref('');
const violations = ref<ActiveViolationResponse[]>([]);
const complaintReasons = ref<ComplaintReasonItem[]>([]);
let activeRequestId = 0;

const routeUserId = computed<number | null>(() => {
  const rawUserId = route.params.userId;
  const normalizedUserId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;

  if (!normalizedUserId) {
    return null;
  }

  const parsedUserId = Number(normalizedUserId);

  return Number.isInteger(parsedUserId) && parsedUserId > 0 ? parsedUserId : null;
});

const routeUsername = computed<string | null>(() => {
  const raw = route.params.username;
  const normalized = Array.isArray(raw) ? raw[0] : raw;
  return normalized || null;
});
const requestedTab = computed<ProfileViewTab>(() => route.query.tab === 'drafts' ? 'drafts' : 'published');

const currentUserId = computed<number | null>(() => authStore.user?.userId ?? null);

const isOwnProfile = computed(() => {
  if (routeUserId.value === null && routeUsername.value === null) {
    return true;
  }

  if (routeUsername.value !== null) {
    return authStore.user?.username === routeUsername.value;
  }

  return currentUserId.value !== null && routeUserId.value === currentUserId.value;
});

const ownProfile = computed<ProfileResponse | null>(() => isOwnProfile.value
    ? authStore.user as ProfileResponse | null
    : null);

const currentProfile = computed<ProfileResponse | PublicProfile | null>(() => isOwnProfile.value
    ? ownProfile.value
    : publicProfile.value);

const profileName = computed(() => currentProfile.value?.name || uk.home.profileLabel);
const profileBio = computed(() => currentProfile.value?.bio?.trim() || '');
const profileLink = computed(() => currentProfile.value?.link?.trim() || '');

const postsCount = computed(() => currentProfile.value?.postsCount ?? 0);
const followersCount = computed(() => currentProfile.value?.followersCount ?? 0);
const followingCount = computed(() => currentProfile.value?.followingCount ?? 0);
const violationsCount = computed(() => ownProfile.value?.currentViolationsCount ?? 0);
const maxViolationsBeforeBlock = computed(() => ownProfile.value?.maxViolationsBeforeBlock ?? 3);
const isPublicSubscribed = computed(() => !isOwnProfile.value && !!publicProfile.value?.isSubscribed);
const activeNavKey = computed(() => isOwnProfile.value ? 'profile' : undefined);
const canShowDrafts = computed(() => isOwnProfile.value);
const isUsernameRoute = computed(() => route.name === ProfileRouteNames.PROFILE_BY_USERNAME);
const {
  publishedSortBy,
  publishedSortOrder,
  publishedAuthorType,
  publishedPosts,
  isPublishedLoading,
  isPublishedLoadingMore,
  publishedErrorMessage,
  isDraftsLoading,
  isDraftsLoadingMore,
  draftsErrorMessage,
  canLoadMorePublished,
  draftPosts,
  canLoadMoreDrafts,
  activePublishedPostId,
  resetPublishedSortFilter,
  resetProfilePostsState,
  loadPublishedPosts,
  ensureDraftPostsVisible,
  loadMoreDraftPosts,
  handlePublishedActivate,
  setPublishedSort,
  setPublishedAuthorType,
} = useProfilePosts({
  authStore,
  postsStore,
  player,
  isOwnProfile,
  isUsernameRoute,
  routeUsername,
  currentProfile,
});

const {
  likePendingPostIds: publishedLikePendingPostIds,
  toggleLike: togglePublishedLike
} = usePostsFeedLikes(publishedPosts);

const {
  followDialogKind,
  followSearch,
  isFollowDialogLoading,
  isFollowDialogLoadingMore,
  followDialogErrorMessage,
  followTogglePendingUserIds,
  followDialogState,
  followDialogTitle,
  followDialogSubtitle,
  followDialogSearchPlaceholder,
  openFollowDialog,
  closeFollowDialog,
  handleFollowSearchChange,
  toggleFollowListSubscription,
  loadFollowDialog,
} = useProfileFollowDialog({
  profileStore,
  isOwnProfile,
  currentProfile,
  routeUserId,
});

const loadProfile = async (): Promise<void> => {
  const requestId = ++activeRequestId;
  isPageLoading.value = true;
  pageErrorMessage.value = '';
  publicProfile.value = null;
  resetPublishedSortFilter();
  resetProfilePostsState();

  try {
    if (isOwnProfile.value) {
      await authStore.getProfile();

      if (
          (route.name === ProfileRouteNames.PROFILE_PUBLIC || route.name === ProfileRouteNames.PROFILE_BY_USERNAME)
          && currentUserId.value
      ) {
        await router.replace({name: ProfileRouteNames.PROFILE_ME});
        return;
      }
    } else if (routeUsername.value) {
      publicProfile.value = await profileStore.getPublicProfileByUsername(routeUsername.value);
    } else if (routeUserId.value) {
      publicProfile.value = await profileStore.getPublicProfile(routeUserId.value);
    }

    if (requestId !== activeRequestId) {
      return;
    }

    if (isOwnProfile.value && currentUserId.value) {
      await loadPublishedPosts(false, currentUserId.value);
    } else if (routeUsername.value) {
      await loadPublishedPosts(false, undefined, publicProfile.value?.username ?? routeUsername.value);
    } else if (routeUserId.value) {
      await loadPublishedPosts(false, routeUserId.value);
    }
  } catch (error) {
    if (requestId !== activeRequestId) {
      return;
    }

    if (isAxiosError(error) && error.response?.status === 404) {
      await router.replace({name: SharedRouteNames.NOT_FOUND});
      return;
    }

    pageErrorMessage.value = uk.profile.loadFailed;
  } finally {
    if (requestId === activeRequestId) {
      isPageLoading.value = false;
    }
  }
};

const handleToggleProfileSubscription = async (): Promise<void> => {
  if (!publicProfile.value || isFollowButtonPending.value) {
    return;
  }

  isFollowButtonPending.value = true;

  try {
    publicProfile.value = publicProfile.value.isSubscribed
        ? await profileStore.unfollowUser(publicProfile.value.userId)
        : await profileStore.followUser(publicProfile.value.userId);
  } catch (error) {
    pageErrorMessage.value = uk.common.errors.serverError;
  } finally {
    isFollowButtonPending.value = false;
  }
};

const openViolationsDialog = async (): Promise<void> => {
  if (!isOwnProfile.value) {
    return;
  }

  isViolationsDialogOpen.value = true;
  isViolationsLoading.value = true;
  violationsErrorMessage.value = '';

  try {
    const [violationsData, reasonsData] = await Promise.all([
      profileStore.getOwnViolations(),
      complaintReasons.value.length ? Promise.resolve(complaintReasons.value) : profileStore.getComplaintReasons(),
    ]);

    violations.value = violationsData;
    complaintReasons.value = reasonsData;
  } catch (error) {
    violationsErrorMessage.value = uk.common.errors.serverError;
  } finally {
    isViolationsLoading.value = false;
  }
};

const openEditDialog = (): void => {
  editProfileErrorMessage.value = '';
  editProfileUsernameError.value = '';
  isEditDialogOpen.value = true;
};

const saveProfile = async (payload: {
  name: string;
  username: string;
  bio: string | null;
  link: string | null;
  photoFile: File | null;
  photoRemoved: boolean;
}): Promise<void> => {
  isSavingProfile.value = true;
  editProfileErrorMessage.value = '';

  editProfileUsernameError.value = '';

  try {
    await authStore.updateProfile({
      name: payload.name,
      username: payload.username,
      bio: payload.bio,
      link: payload.link,
    });

    if (payload.photoFile) {
      await authStore.uploadAvatar(payload.photoFile);
    } else if (payload.photoRemoved) {
      await authStore.removeAvatar();
    }

    isEditDialogOpen.value = false;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 409) {
      const errors: { code: string }[] = error.response.data?.errors ?? [];
      const hasUsernameConflict = errors.some((e) => e.code === 'USERNAME_NOT_UNIQUE');

      if (hasUsernameConflict) {
        editProfileUsernameError.value = uk.auth.register.errors.usernameAlreadyTaken;
        return;
      }
    }

    editProfileErrorMessage.value = uk.common.errors.serverError;
  } finally {
    isSavingProfile.value = false;
  }
};

const getReasonTitle = (reason: string): string =>
    complaintReasons.value.find((r) => r.key === reason)?.label ?? reason;

const getRemainingViolationLabel = (expiresAt: string | null): string | null => {
  if (!expiresAt) {
    return null;
  }

  const expiresDate = new Date(expiresAt);
  const diffMs = expiresDate.getTime() - Date.now();

  if (Number.isNaN(expiresDate.getTime()) || diffMs <= 0) {
    return null;
  }

  return uk.profile.notices.violationsRemainingDays(Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
};

const formatDate = (value: string): string => new Intl.DateTimeFormat('uk-UA', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
}).format(new Date(value));

watch([routeUserId, routeUsername, requestedTab], () => {
  activeTab.value = requestedTab.value;
  void loadProfile().then(() => {
    if (activeTab.value === 'drafts') {
      void ensureDraftPostsVisible();
    }
  });
}, {immediate: true});

watch(activeTab, (tab) => {
  if (tab === 'drafts') {
    void ensureDraftPostsVisible();
  }
});
</script>

<template>
  <AppShell
      v-model:search="search"
      :is-authenticated="isAuthenticated"
      :like-pending-post-ids="publishedLikePendingPostIds"
      :active-nav-key="activeNavKey"
      @create="handleCreateClick"
      @login="openLogin"
      @register="openRegister"
      @logout="authStore.logout"
      @like-toggle="togglePublishedLike"
  >
    <div class="profile-page">
      <ErrorAlert v-if="pageErrorMessage" :message="pageErrorMessage"/>

      <ProfilePageHero
          :is-page-loading="isPageLoading"
          :current-profile="currentProfile"
          :profile-name="profileName"
          :profile-bio="profileBio"
          :profile-link="profileLink"
          :posts-count="postsCount"
          :followers-count="followersCount"
          :following-count="followingCount"
          :violations-count="violationsCount"
          :max-violations-before-block="maxViolationsBeforeBlock"
          :is-own-profile="isOwnProfile"
          :is-authenticated="isAuthenticated"
          :is-public-subscribed="isPublicSubscribed"
          :is-follow-button-pending="isFollowButtonPending"
          @open-followers="openFollowDialog('followers')"
          @open-following="openFollowDialog('following')"
          @open-violations="openViolationsDialog"
          @edit="openEditDialog"
          @toggle-subscription="handleToggleProfileSubscription"
          @login="openLogin"
      />

      <section class="profile-page__content">
        <div class="profile-page__tabs" v-if="canShowDrafts">
          <button
              type="button"
              class="profile-page__tab"
              :class="{ 'profile-page__tab--active': activeTab === 'published' }"
              @click="activeTab = 'published'"
          >
            {{ uk.profile.sections.published }}
          </button>

          <button
              type="button"
              class="profile-page__tab"
              :class="{ 'profile-page__tab--active': activeTab === 'drafts' }"
              @click="activeTab = 'drafts'"
          >
            {{ uk.profile.sections.drafts }}
          </button>
        </div>

        <ProfilePublishedPostsSection
            v-if="activeTab === 'published'"
            :is-page-loading="isPageLoading"
            :is-published-loading="isPublishedLoading"
            :published-posts="publishedPosts"
            :active-published-post-id="activePublishedPostId"
            :is-player-playing="player.isPlaying.value"
            :published-like-pending-post-ids="publishedLikePendingPostIds"
            :published-error-message="publishedErrorMessage"
            :can-load-more-published="canLoadMorePublished"
            :is-published-loading-more="isPublishedLoadingMore"
            :published-sort-by="publishedSortBy"
            :published-sort-order="publishedSortOrder"
            :published-author-type="publishedAuthorType"
            @set-author-type="setPublishedAuthorType"
            @set-sort="setPublishedSort"
            @activate="handlePublishedActivate"
            @like-toggle="togglePublishedLike"
            @load-more="loadPublishedPosts(true)"
        />

        <ProfileDraftPostsSection
            v-else
            :drafts-error-message="draftsErrorMessage"
            :draft-posts="draftPosts"
            :is-drafts-loading="isDraftsLoading"
            :can-load-more-drafts="canLoadMoreDrafts"
            :is-drafts-loading-more="isDraftsLoadingMore"
            @load-more="loadMoreDraftPosts"
        />
      </section>
    </div>
  </AppShell>

  <CreatePostModal
      :is-open="isCreatePostModalOpen"
      :duration-limit-minutes="durationLimitMinutes"
      @close="handleModalClose"
      @created="handlePostCreated"
  />

  <ProfileEditDialog
      :is-open="isEditDialogOpen"
      :profile="ownProfile"
      :is-saving="isSavingProfile"
      :error-message="editProfileErrorMessage"
      :username-error="editProfileUsernameError"
      @close="isEditDialogOpen = false"
      @save="saveProfile"
  />

  <ProfileFollowDialog
      :is-open="followDialogKind !== null"
      :title="followDialogTitle"
      :subtitle="followDialogSubtitle"
      :search-placeholder="followDialogSearchPlaceholder"
      :search-value="followSearch"
      :is-loading="isFollowDialogLoading"
      :error-message="followDialogErrorMessage"
      :items="followDialogState.items"
      :has-more="followDialogState.hasMore"
      :is-loading-more="isFollowDialogLoadingMore"
      :pending-user-ids="followTogglePendingUserIds"
      :current-user-id="currentUserId"
      @close="closeFollowDialog"
      @update:search="handleFollowSearchChange"
      @toggle-subscription="toggleFollowListSubscription"
      @load-more="loadFollowDialog(true)"
  />

  <ProfileViolationsDialog
      :is-open="isViolationsDialogOpen"
      :title="uk.profile.dialogs.violationsTitle"
      :subtitle="uk.profile.dialogs.violationsSubtitle"
      :is-loading="isViolationsLoading"
      :error-message="violationsErrorMessage"
      :violations="violations"
      :current-violations-count="violationsCount"
      :max-violations-before-block="maxViolationsBeforeBlock"
      :get-reason-title="getReasonTitle"
      :get-remaining-label="getRemainingViolationLabel"
      :format-date="formatDate"
      @close="isViolationsDialogOpen = false"
  />
</template>
