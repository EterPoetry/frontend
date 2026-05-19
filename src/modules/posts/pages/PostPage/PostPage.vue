<script setup lang="ts">
import { isAxiosError } from 'axios';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { updatePostSeoMeta, clearJsonLd } from '@/core/seo';
import { useAuthStore } from '@/modules/auth/auth.store';
import { AuthRouteNames } from '@/modules/auth/enums/auth-route-names.enum';
import CreatePostModal from '@/modules/posts/components/CreatePostModal/CreatePostModal.vue';
import PostCategoryTags from '@/modules/posts/components/PostCategoryTags/PostCategoryTags.vue';
import PostComplaintDialog from '@/modules/posts/components/PostComplaintDialog/PostComplaintDialog.vue';
import PostImmersiveMode from '@/modules/posts/components/PostImmersiveMode/PostImmersiveMode.vue';
import { usePostComplaint } from '@/modules/posts/composables/usePostComplaint';
import { usePostPageComments } from '@/modules/posts/composables/usePostPageComments';
import { usePostPageImmersiveMode } from '@/modules/posts/composables/usePostPageImmersiveMode';
import { usePostPlayer } from '@/modules/posts/composables/usePostPlayer';
import { usePostsAppShell } from '@/modules/posts/composables/usePostsAppShell';
import { CommentSortOrder } from '@/modules/posts/enums/comment-sort-order.enum';
import { PostRouteNames } from '@/modules/posts/enums/post-route-names.enum';
import { PostStatus } from '@/modules/posts/enums/post-status.enum';
import type { PostTextSynchronizationItem } from '@/modules/posts/interfaces/post-text-synchronization-item.interface';
import { usePostsStore } from '@/modules/posts/posts.store';
import { getAuthorInitial } from '@/modules/posts/utils/post-author.utils';
import { formatPostDuration } from '@/modules/posts/utils/post-formatting.utils';
import { useProfileStore } from '@/modules/profile/profile.store';
import { ProfileRouteNames } from '@/modules/profile/enums/profile-route-names.enum';
import heartActiveIconUrl from '@/shared/assets/icons/ui/heart-active.svg';
import heartIconUrl from '@/shared/assets/icons/ui/heart.svg';
import closeIconUrl from '@/shared/assets/icons/ui/close.svg';
import commentIconUrl from '@/shared/assets/icons/ui/comment.svg';
import flagIconUrl from '@/shared/assets/icons/ui/flag.svg';
import pauseLightIconUrl from '@/shared/assets/icons/ui/pause-light.svg';
import playIconUrl from '@/shared/assets/icons/ui/play.svg';
import playsIconUrl from '@/shared/assets/icons/ui/plays.svg';
import { MOBILE_BREAKPOINT_PX } from '@/shared/constants/breakpoints.constants';
import { SharedRouteNames } from '@/shared/enums/shared-route-names.enum';
import AppShell from '@/shared/components/AppShell/AppShell.vue';
import BaseBottomSheet from '@/shared/components/BaseBottomSheet/BaseBottomSheet.vue';
import BaseField from '@/shared/components/BaseField/BaseField.vue';
import ConfirmDialog from '@/shared/components/ConfirmDialog/ConfirmDialog.vue';
import ErrorAlert from '@/shared/components/ErrorAlert/ErrorAlert.vue';
import ProfileIdentity from '@/shared/components/ProfileIdentity/ProfileIdentity.vue';
import { uk } from '@/shared/locales/uk';
import { formatCompactNumber } from '@/shared/utils/number.utils';
import { extractPostId } from '@/shared/utils/post-slug.utils';
import './PostPage.css';

const postsStore = usePostsStore();
const authStore = useAuthStore();
const profileStore = useProfileStore();
const player = usePostPlayer();
const route = useRoute();
const router = useRouter();

const {
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

const {
    isComplaintDialogOpen,
    complaintReasons,
    isLoadingComplaintReasons,
    isSubmittingComplaint,
    isComplaintSubmitted,
    complaintErrorMessage,
    openComplaintDialog,
    closeComplaintDialog,
    submitComplaint,
} = usePostComplaint();

const isLoadingPost = ref(false);
const isDeletingPost = ref(false);
const isDeletePostDialogOpen = ref(false);
const isSubscriptionDialogOpen = ref(false);
const postErrorMessage = ref('');
const likePendingPostIds = ref<number[]>([]);
const isProfileLoading = ref(false);
const isFollowPending = ref(false);
const isMobileViewport = ref(false);
const lineElements: Record<number, HTMLElement | null> = {};
const textContentRef = ref<HTMLElement | null>(null);
const leadingSilenceToleranceMs = 120;
const trailingSilenceToleranceMs = 160;
let activePostRequestId = 0;
let activeProfileRequestId = 0;

const routeSlug = computed<string | null>(() => {
    const raw = route.params.slug;
    const normalized = Array.isArray(raw) ? raw[0] : raw;
    return normalized || null;
});

const routePostId = computed<number | null>(() => routeSlug.value ? extractPostId(routeSlug.value) : null);

const activePost = computed(() => routePostId.value && postsStore.currentPost?.postId === routePostId.value
    ? postsStore.currentPost
    : null);

const isOwnPost = computed(() => {
    const userId = authStore.user?.userId;

    return !!userId && userId === activePost.value?.authorId;
});

const isPublishedPost = computed(() => activePost.value?.status === PostStatus.PUBLISHED);
const isCommentsAvailable = computed(() => !!activePost.value && isPublishedPost.value);
const canLoadAuthenticatedPostState = computed(() => authStore.isInitialized || !authStore.token);
const authorProfile = computed(() => {
    const authorUserId = activePost.value?.author.userId;

    return authorUserId ? profileStore.getProfileById(authorUserId) : null;
});
const isAuthorSubscribed = computed(() => authorProfile.value?.isSubscribed ?? false);
const textLines = computed(() => (activePost.value?.text ?? '').split('\n'));
const formattedPublishedDate = computed(() => {
    const sourceDate = activePost.value?.createdAt;

    if (!sourceDate) {
        return '';
    }

    const parsedDate = new Date(sourceDate);

    if (Number.isNaN(parsedDate.getTime())) {
        return '';
    }

    return new Intl.DateTimeFormat('uk-UA', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(parsedDate);
});
const synchronizationMap = computed<Map<number, PostTextSynchronizationItem>>(() => new Map(
    (activePost.value?.textSynchronization ?? []).map((item) => [item.lineIndex, item]),
));
const firstSynchronizedLineIndex = computed<number | null>(() => {
    const synchronization = activePost.value?.textSynchronization ?? [];

    if (!synchronization.length) {
        return null;
    }

    return synchronization[0]?.lineIndex ?? null;
});
const lastSynchronizedLineIndex = computed<number | null>(() => {
    const synchronization = activePost.value?.textSynchronization ?? [];

    if (!synchronization.length) {
        return null;
    }

    return synchronization[synchronization.length - 1]?.lineIndex ?? null;
});
const leadingSilenceEndMs = computed(() => {
    const silences = activePost.value?.audioAnalysis?.silences ?? [];

    const leadingSilence = silences.find(([startMs, endMs]) => (
        startMs <= leadingSilenceToleranceMs && endMs > leadingSilenceToleranceMs
    ));

    return leadingSilence?.[1] ?? 0;
});
const trailingSilenceStartMs = computed<number | null>(() => {
    const analysis = activePost.value?.audioAnalysis;
    const silences = analysis?.silences ?? [];
    const durationMs = analysis?.durationMs ?? Math.round((activePost.value?.audioDurationSeconds ?? 0) * 1000);

    if (!durationMs) {
        return null;
    }

    const trailingSilence = [...silences].reverse().find(([startMs, endMs]) => (
        endMs >= durationMs - trailingSilenceToleranceMs && startMs < durationMs - trailingSilenceToleranceMs
    ));

    return trailingSilence?.[0] ?? null;
});
const canManageSynchronization = computed(() => !!activePost.value
    && isOwnPost.value
    && activePost.value.status !== PostStatus.PROCESSING
    && !!activePost.value.text?.trim());

const activeLineIndex = computed<number | null>(() => {
    if (!activePost.value || player.activePostId.value !== activePost.value.postId) {
        return null;
    }

    const synchronization = activePost.value.textSynchronization;

    if (!synchronization.length) {
        return null;
    }

    const currentMomentMs = Math.floor(player.currentTimeSeconds.value * 1000);

    if (currentMomentMs < leadingSilenceEndMs.value) {
        return null;
    }

    let matchedLineIndex: number | null = null;

    for (const item of synchronization) {
        if (item.audioStartMomentMs <= currentMomentMs) {
            matchedLineIndex = item.lineIndex;
            continue;
        }

        break;
    }

    if (
        matchedLineIndex !== null
        && matchedLineIndex === lastSynchronizedLineIndex.value
        && trailingSilenceStartMs.value !== null
        && currentMomentMs >= trailingSilenceStartMs.value
    ) {
        return null;
    }

    return matchedLineIndex;
});

const isPostLikePending = computed(() => activePost.value
    ? likePendingPostIds.value.includes(activePost.value.postId)
    : false);

const comments = computed(() => postsStore.comments);
const displayedCommentsCount = computed(() => {
    const postCommentsCount = activePost.value?.commentsCount ?? 0;

    if (!isCommentsAvailable.value) {
        return postCommentsCount;
    }

    return Math.max(postCommentsCount, postsStore.commentsTotal);
});

const syncMobileViewport = (): void => {
    isMobileViewport.value = window.innerWidth <= MOBILE_BREAKPOINT_PX;
};

const setLineElement = (lineIndex: number, element: unknown): void => {
    lineElements[lineIndex] = element instanceof HTMLElement ? element : null;
};

const setCommentsSectionElement = (element: Element | unknown): void => {
    commentsController.commentsSectionElement.value = element instanceof HTMLElement ? element : null;
};

const setRootCommentInputElement = (element: unknown): void => {
    commentsController.rootCommentInputElement.value = element as typeof commentsController.rootCommentInputElement.value;
};

const syncPlayerPostState = (): void => {
    if (activePost.value) {
        player.syncActivePost(activePost.value);
    }
};

const syncSpecificPostToPlayer = (postId: number, isLiked: boolean, likesCount?: number): void => {
    const playerPost = player.activePost.value;

    if (!playerPost || playerPost.postId !== postId) {
        return;
    }

    player.syncActivePost({
        ...playerPost,
        isLiked,
        likesCount: likesCount ?? Math.max(0, playerPost.likesCount + (isLiked ? 1 : -1)),
    });
};

const ensureAuthenticated = async (): Promise<boolean> => {
    if (authStore.isAuthenticated) {
        return true;
    }

    await router.push({ name: AuthRouteNames.LOGIN });

    return false;
};

const commentsController = usePostPageComments({
    activePost,
    routePostId,
    isCommentsAvailable,
    isOwnPost,
    isLoadingPost,
    isMobileViewport,
    ensureAuthenticated,
    syncPlayerPostState,
});

const {
    isLoadingComments,
    commentsSort,
    pendingDeleteComment,
    isSubmittingComment,
    commentsErrorMessage,
    rootCommentDraft,
    replyDrafts,
    openCommentsSheet,
    closeCommentsSheet,
    resolvePendingCommentsFocus,
    formatCommentTime,
    canDeleteComment,
    loadComments,
    changeCommentsSort,
    getCommentReplies,
    isReplyFormOpen,
    isRepliesExpanded,
    isRepliesLoading,
    isCommentDeleting,
    isCommentLikePending,
    isLikedByPostAuthor,
    toggleCommentLike,
    submitComment,
    toggleReplyForm,
    toggleReplies,
    loadMoreReplies,
    requestDeleteComment,
    closeDeleteCommentDialog,
    confirmDeleteComment,
    isMobileCommentsSheetOpen,
} = commentsController;

const {
    isImmersiveModeOpen,
    hasImmersiveMode,
    openImmersiveMode,
    closeImmersiveMode,
    toggleImmersivePlayback,
    seekImmersiveProgress,
} = usePostPageImmersiveMode({
    activePost,
    player,
});

const loadAuthorProfile = async (userId: number): Promise<void> => {
    const requestId = ++activeProfileRequestId;

    if (!profileStore.getProfileById(userId)) {
        isProfileLoading.value = true;
    }

    try {
        await profileStore.getPublicProfile(userId);
    } catch {
        if (requestId !== activeProfileRequestId) {
            return;
        }

        postErrorMessage.value = uk.posts.details.profileLoadFailed;
    } finally {
        if (requestId === activeProfileRequestId) {
            isProfileLoading.value = false;
        }
    }
};

const loadPost = async (postId: number): Promise<void> => {
    if (!canLoadAuthenticatedPostState.value) {
        return;
    }

    const requestId = ++activePostRequestId;

    isLoadingPost.value = true;
    postErrorMessage.value = '';
    commentsErrorMessage.value = '';
    commentsSort.value = CommentSortOrder.NEWEST;
    postsStore.clearPostComments();

    try {
        const fetchedPost = await postsStore.fetchPost(postId);

        if (requestId !== activePostRequestId) {
            return;
        }

        postsStore.currentPost = fetchedPost;

        if (routeSlug.value && fetchedPost.slug !== routeSlug.value) {
            await router.replace({ name: PostRouteNames.POST, params: { slug: fetchedPost.slug }, query: route.query, hash: route.hash });
        }

        if (requestId !== activePostRequestId) {
            return;
        }

        updatePostSeoMeta(fetchedPost, `/posts/${fetchedPost.slug}`);
        syncPlayerPostState();
        await loadAuthorProfile(fetchedPost.author.userId);

        if (requestId !== activePostRequestId) {
            return;
        }

        await loadComments(true);

        if (requestId !== activePostRequestId) {
            return;
        }

        await resolvePendingCommentsFocus();
    } catch (error) {
        if (isAxiosError(error) && error.response?.status === 404) {
            await router.replace({ name: SharedRouteNames.NOT_FOUND });
            return;
        }

        postErrorMessage.value = uk.common.errors.serverError;
    } finally {
        if (requestId === activePostRequestId) {
            isLoadingPost.value = false;
        }
    }
};

const togglePlayback = async (): Promise<void> => {
    if (!activePost.value?.audioFileUrl) {
        return;
    }

    try {
        const freshPost = await postsStore.getPost(activePost.value.postId);

        if (!freshPost.audioFileUrl) {
            return;
        }

        await player.togglePostPlayback(freshPost);
    } catch {
        await player.togglePostPlayback(activePost.value);
    }
};

const togglePostLike = async (requestedPostId?: number): Promise<void> => {
    const targetPost = requestedPostId
        ? (
            activePost.value?.postId === requestedPostId
                ? activePost.value
                : player.activePost.value?.postId === requestedPostId
                    ? player.activePost.value
                    : null
        )
        : activePost.value;

    if (!targetPost || likePendingPostIds.value.includes(targetPost.postId)) {
        return;
    }

    if (!await ensureAuthenticated()) {
        return;
    }

    const postId = targetPost.postId;
    const nextIsLiked = !targetPost.isLiked;
    const previousIsLiked = targetPost.isLiked;
    const previousLikesCount = targetPost.likesCount;
    const syncCurrentLikeState = (isLiked: boolean, likesCount?: number): void => {
        if (postsStore.currentPost?.postId === postId) {
            player.syncActivePost(postsStore.currentPost);
            return;
        }

        syncSpecificPostToPlayer(postId, isLiked, likesCount);
    };

    likePendingPostIds.value = [...likePendingPostIds.value, postId];
    postsStore.applyPostLikeState(postId, nextIsLiked, previousLikesCount);
    syncCurrentLikeState(nextIsLiked, previousLikesCount);

    try {
        const result = nextIsLiked
            ? await postsStore.likePost(postId)
            : await postsStore.unlikePost(postId);

        postsStore.applyPostLikeState(postId, nextIsLiked, result.likesCount);
        syncCurrentLikeState(nextIsLiked, result.likesCount);
    } catch {
        postsStore.applyPostLikeState(postId, previousIsLiked, previousLikesCount);
        syncCurrentLikeState(previousIsLiked, previousLikesCount);
    } finally {
        likePendingPostIds.value = likePendingPostIds.value.filter((pendingPostId) => pendingPostId !== postId);
    }
};

const toggleAuthorFollow = async (): Promise<void> => {
    const authorUserId = activePost.value?.author.userId;

    if (!authorUserId || isOwnPost.value || isFollowPending.value || isProfileLoading.value) {
        return;
    }

    if (!await ensureAuthenticated()) {
        return;
    }

    const currentProfile = profileStore.getProfileById(authorUserId);

    if (!currentProfile) {
        await loadAuthorProfile(authorUserId);
    }

    const nextProfile = profileStore.getProfileById(authorUserId);

    if (!nextProfile) {
        return;
    }

    const nextIsSubscribed = !nextProfile.isSubscribed;
    const previousIsSubscribed = nextProfile.isSubscribed;
    const previousFollowersCount = nextProfile.followersCount;

    isFollowPending.value = true;
    postErrorMessage.value = '';
    profileStore.applyProfileSubscriptionState(authorUserId, nextIsSubscribed, previousFollowersCount);

    try {
        const updatedProfile = nextIsSubscribed
            ? await profileStore.followUser(authorUserId)
            : await profileStore.unfollowUser(authorUserId);

        profileStore.applyProfileSubscriptionState(
            authorUserId,
            updatedProfile.isSubscribed,
            updatedProfile.followersCount,
        );
    } catch {
        profileStore.applyProfileSubscriptionState(
            authorUserId,
            previousIsSubscribed,
            previousFollowersCount,
        );
        postErrorMessage.value = uk.posts.details.followActionFailed;
    } finally {
        isFollowPending.value = false;
    }
};

const deletePost = async (): Promise<void> => {
    if (!activePost.value || isDeletingPost.value) {
        return;
    }

    const deletedPostId = activePost.value.postId;

    isDeletingPost.value = true;

    try {
        const isDeleted = await postsStore.deletePost(deletedPostId);

        if (isDeleted) {
            if (player.activePostId.value === deletedPostId) {
                await player.closePlayer();
            }

            await router.replace({ name: ProfileRouteNames.PROFILE_ME });
            return;
        }
    } catch {
        postErrorMessage.value = uk.common.errors.serverError;
    } finally {
        isDeletingPost.value = false;
        isDeletePostDialogOpen.value = false;
    }
};

const openSynchronizationManager = async (): Promise<void> => {
    if (!activePost.value) {
        return;
    }

    if (!authStore.isPremium) {
        isSubscriptionDialogOpen.value = true;
        return;
    }

    await router.push({
        name: PostRouteNames.SYNC_POST,
        params: { postId: activePost.value.postId },
    });
};

const openPostEditor = async (): Promise<void> => {
    if (!activePost.value) {
        return;
    }

    await router.push({
        name: PostRouteNames.EDIT_POST,
        params: { postId: activePost.value.postId },
    });
};

const jumpToLine = async (lineIndex: number): Promise<void> => {
    if (!activePost.value?.audioFileUrl) {
        return;
    }

    const synchronizationItem = synchronizationMap.value.get(lineIndex);

    if (!synchronizationItem) {
        return;
    }

    const post = activePost.value;

    await player.playPost(post);

    if (!post.audioDurationSeconds) {
        return;
    }

    const targetMomentMs = lineIndex === firstSynchronizedLineIndex.value
        ? Math.max(synchronizationItem.audioStartMomentMs, leadingSilenceEndMs.value)
        : synchronizationItem.audioStartMomentMs;
    const seekPercent = (targetMomentMs / (post.audioDurationSeconds * 1000)) * 100;
    await player.seekToPercent(seekPercent);
};

watch(routeSlug, () => {
    const postId = routePostId.value;

    if (!postId) {
        postErrorMessage.value = uk.common.errors.serverError;
        return;
    }

    void loadPost(postId);
}, { immediate: true });

watch(
    [() => authStore.isInitialized, () => authStore.token, routeSlug],
    ([isInitialized, token], [prevIsInitialized, prevToken]) => {
        if (!isInitialized || !routePostId.value || (prevIsInitialized === isInitialized && prevToken === token)) {
            return;
        }

        void loadPost(routePostId.value);
    },
);

watch(activeLineIndex, (lineIndex) => {
    if (lineIndex === null || isImmersiveModeOpen.value) {
        return;
    }

    const container = textContentRef.value;
    const el = lineElements[lineIndex];
    if (!container || !el) return;

    const containerHeight = container.clientHeight;
    const elTop = el.getBoundingClientRect().top - container.getBoundingClientRect().top;
    const elHeight = el.offsetHeight;

    container.scrollTo({
        top: container.scrollTop + elTop - containerHeight / 2 + elHeight / 2,
        behavior: 'smooth',
    });
});

onMounted(() => {
    syncMobileViewport();
    window.addEventListener('resize', syncMobileViewport);
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', syncMobileViewport);
    document.body.style.overflow = '';
    clearJsonLd();
});

watch([isMobileCommentsSheetOpen, isImmersiveModeOpen, isMobileViewport], ([isCommentsOpen, isImmersiveOpen, isMobile]) => {
    document.body.style.overflow = isImmersiveOpen || (isCommentsOpen && isMobile) ? 'hidden' : '';
});
</script>

<template>
  <AppShell
      v-model:search="search"
      v-model:subscription-dialog-open="isSubscriptionDialogOpen"
      :is-authenticated="isAuthenticated"
      :like-pending-post-ids="likePendingPostIds"
      @create="handleCreateClick"
      @login="openLogin"
      @register="openRegister"
      @logout="authStore.logout"
      @like-toggle="togglePostLike"
  >
    <div class="post-page">
      <ErrorAlert v-if="postErrorMessage" :message="postErrorMessage" />

      <div v-else-if="isLoadingPost && !activePost" class="post-page__skeleton" aria-hidden="true">
        <div class="post-page__skeleton-layout">
          <div class="post-page__skeleton-main">
            <div class="post-page__skeleton-card post-page__skeleton-card--summary">
              <div class="post-page__skeleton-head">
                <div class="post-page__skeleton-copy">
                  <div class="post-page__skeleton-title post-page__sk" />
                  <div class="post-page__skeleton-title post-page__skeleton-title--short post-page__sk" />
                  <div class="post-page__skeleton-meta post-page__sk" />
                  <div class="post-page__skeleton-row">
                    <div class="post-page__skeleton-btn post-page__sk" />
                    <div class="post-page__skeleton-btn post-page__sk" />
                  </div>
                </div>
                <div class="post-page__skeleton-aside">
                  <div class="post-page__skeleton-stats post-page__sk" />
                  <div class="post-page__skeleton-play post-page__sk" />
                </div>
              </div>
            </div>
          </div>
          <div class="post-page__skeleton-text-col">
            <div class="post-page__skeleton-card">
              <div class="post-page__skeleton-section-label post-page__sk" />
              <div class="post-page__skeleton-lines">
                <div class="post-page__skeleton-line post-page__skeleton-line--90 post-page__sk" />
                <div class="post-page__skeleton-line post-page__skeleton-line--70 post-page__sk" />
                <div class="post-page__skeleton-line post-page__skeleton-line--80 post-page__sk" />
                <div class="post-page__skeleton-line post-page__skeleton-line--65 post-page__sk" />
                <div class="post-page__skeleton-line post-page__skeleton-line--85 post-page__sk" />
                <div class="post-page__skeleton-line post-page__skeleton-line--75 post-page__sk" />
                <div class="post-page__skeleton-line post-page__skeleton-line--60 post-page__sk" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="activePost" class="post-page__layout">
        <section class="post-page__column post-page__column--main">
          <article class="post-page__card post-page__card--summary">
            <div class="post-page__summary-head">
              <div class="post-page__summary-copy">
                <h1 class="post-page__title">{{ activePost.title || uk.posts.details.untitled }}</h1>

                <div class="post-page__meta-row">
                  <span class="post-page__origin-author">
                    {{ activePost.originAuthorName || uk.posts.details.originalWork }}
                  </span>
                  <span class="post-page__dot" aria-hidden="true">•</span>

                  <RouterLink
                      :to="{ name: ProfileRouteNames.PROFILE_BY_USERNAME, params: { username: activePost.author.username } }"
                      class="post-page__author"
                  >
                    <ProfileIdentity
                        :name="activePost.author.name"
                        :username="activePost.author.username"
                        :photo="activePost.author.photo"
                        size="sm"
                    />
                  </RouterLink>

                  <span class="post-page__dot" aria-hidden="true">•</span>

                  <span class="post-page__duration">{{ formatPostDuration(activePost.audioDurationSeconds) }}</span>

                  <template v-if="formattedPublishedDate">
                    <span class="post-page__dot" aria-hidden="true">•</span>
                    <span class="post-page__published-date">{{ formattedPublishedDate }}</span>
                  </template>
                </div>

                <div class="post-page__summary-actions">
                  <button
                      v-if="hasImmersiveMode"
                      type="button"
                      class="post-page__action-btn post-page__action-btn--immersive"
                      @click="openImmersiveMode"
                  >
                    {{ uk.posts.details.immersiveMode }}
                  </button>

                  <template v-if="!isOwnPost">
                    <button
                        type="button"
                        class="post-page__action-btn post-page__action-btn--primary"
                        :class="{
                          'post-page__action-btn--secondary': isAuthorSubscribed,
                          'post-page__action-btn--ghost': isProfileLoading,
                        }"
                        :disabled="isFollowPending || isProfileLoading"
                        @click="toggleAuthorFollow"
                    >
                      {{ isAuthorSubscribed ? uk.posts.details.following : uk.posts.details.follow }}
                    </button>
                  </template>

                  <template v-else>
                    <div class="post-page__owner-actions">
                      <button
                          type="button"
                          class="post-page__action-btn post-page__action-btn--secondary"
                          @click="openPostEditor"
                      >
                        {{ uk.posts.details.edit }}
                      </button>

                      <button
                          type="button"
                          class="post-page__action-btn post-page__action-btn--danger"
                          :disabled="isDeletingPost"
                          @click="isDeletePostDialogOpen = true"
                      >
                        {{ uk.posts.details.delete }}
                      </button>
                    </div>
                  </template>
                </div>

                <PostCategoryTags :categories="activePost.categories" class="post-page__tags" />
              </div>

              <div class="post-page__summary-side">
                <div class="post-page__summary-stats">
                  <button
                      type="button"
                      class="post-page__stat-btn stat-button"
                      :class="{ 'post-page__stat-btn--active stat-button--active': activePost.isLiked }"
                      :disabled="isPostLikePending"
                      @click="() => togglePostLike()"
                  >
                    <img
                        :src="activePost.isLiked ? heartActiveIconUrl : heartIconUrl"
                        alt=""
                        class="post-page__summary-stat-icon post-page__summary-stat-icon--heart"
                    />
                    <span>{{ formatCompactNumber(activePost.likesCount) }}</span>
                  </button>
                  <span class="post-page__stat-dot" aria-hidden="true">•</span>
                  <span class="post-page__summary-stat">
                    <img
                        :src="playsIconUrl"
                        :alt="uk.home.popularFeed.listens"
                        class="post-page__summary-stat-icon post-page__summary-stat-icon--eye"
                    />
                    <span>{{ formatCompactNumber(activePost.listens) }}</span>
                  </span>
                  <template v-if="isAuthenticated && !isOwnPost">
                    <span class="post-page__stat-dot" aria-hidden="true">•</span>
                    <button
                        type="button"
                        class="post-page__report-btn"
                        :aria-label="uk.posts.details.reportPost"
                        @click="openComplaintDialog(activePost.postId)"
                    >
                      <img :src="flagIconUrl" alt="" class="post-page__report-icon" />
                    </button>
                  </template>
                </div>

                <button
                    type="button"
                    class="post-page__play-btn audio-play-button"
                    :class="{ 'audio-play-button--active': player.activePostId.value === activePost.postId }"
                    :aria-label="player.isPlaying.value && player.activePostId.value === activePost.postId ? uk.posts.audio.pause : uk.posts.audio.play"
                    @click="togglePlayback"
                >
                  <img
                      v-if="player.isPlaying.value && player.activePostId.value === activePost.postId"
                      :src="pauseLightIconUrl"
                      alt=""
                      class="audio-play-button__pause-icon"
                  />
                  <img
                      v-else
                      :src="playIconUrl"
                      :alt="uk.posts.audio.play"
                      class="audio-play-button__play-icon"
                  />
                </button>

              </div>
            </div>

            <p v-if="activePost.description" class="post-page__description">
              {{ activePost.description }}
            </p>

            <button
                v-if="isCommentsAvailable && isMobileViewport"
                type="button"
                class="post-page__mobile-comments-trigger"
                @click="openCommentsSheet"
            >
              <span class="post-page__mobile-comments-trigger-copy">
                <img
                    :src="commentIconUrl"
                    :alt="uk.home.popularFeed.comments"
                    class="post-page__mobile-comments-trigger-icon"
                />
                <span>{{ uk.posts.details.commentsTitle }}</span>
              </span>
              <span class="post-page__mobile-comments-trigger-count">{{ formatCompactNumber(displayedCommentsCount) }}</span>
            </button>
          </article>

          <BaseBottomSheet
              :enabled="isMobileViewport"
              :is-open="isMobileCommentsSheetOpen"
              :close-aria-label="uk.common.labels.cancel"
              @close="closeCommentsSheet"
          >
            <section
                id="comments"
                :ref="setCommentsSectionElement"
                class="post-page__card post-page__comments"
                :class="{ 'post-page__comments--in-sheet': isMobileViewport }"
            >
            <div class="post-page__comments-head">
              <h2 class="post-page__section-title">{{ uk.posts.details.commentsTitle }}</h2>
              <div class="post-page__comments-head-side">
                <span class="post-page__comments-total">
                  <img
                      :src="commentIconUrl"
                      :alt="uk.home.popularFeed.comments"
                      class="post-page__comments-total-icon"
                  />
                  <span>{{ formatCompactNumber(displayedCommentsCount) }}</span>
                </span>

                <button
                    type="button"
                class="post-page__comments-close"
                :aria-label="uk.common.labels.cancel"
                @click="closeCommentsSheet"
                >
                  <img :src="closeIconUrl" alt="" class="post-page__comments-close-icon" />
                </button>
              </div>
            </div>

            <div class="post-page__comments-body">
            <div v-if="isCommentsAvailable" class="post-page__comments-sort">
              <button
                  v-for="option in ([CommentSortOrder.NEWEST, CommentSortOrder.POPULAR] as const)"
                  :key="option"
                  type="button"
                  class="post-page__sort-btn"
                  :class="{ 'post-page__sort-btn--active': commentsSort === option }"
                  @click="changeCommentsSort(option)"
              >
                {{ option === CommentSortOrder.NEWEST ? uk.posts.details.commentsSortNewest : uk.posts.details.commentsSortPopular }}
              </button>
            </div>

            <p v-if="!isCommentsAvailable" class="post-page__comments-note">
              {{ uk.posts.details.commentsClosed }}
            </p>

            <ErrorAlert v-if="commentsErrorMessage" :message="commentsErrorMessage" />

            <div v-if="isLoadingComments" class="post-page__state">
              {{ uk.common.labels.loading }}
            </div>

            <div v-else-if="!comments.length" class="post-page__empty">
              {{ uk.posts.details.commentsEmpty }}
            </div>

            <div v-else class="post-page__comment-list">
              <article
                  v-for="comment in comments"
                  :key="comment.commentId"
                  class="post-page__comment-thread"
              >
                <div class="post-page__comment">
                  <div class="post-page__comment-head">
                    <ProfileIdentity
                        :name="comment.author.name"
                        :username="comment.author.username"
                        :photo="comment.author.photo ?? null"
                        :to="{ name: ProfileRouteNames.PROFILE_BY_USERNAME, params: { username: comment.author.username } }"
                        size="sm"
                    />
                    <span v-if="isLikedByPostAuthor(comment)" class="post-page__comment-author-like">
                      <img :src="heartActiveIconUrl" alt="" class="post-page__comment-author-like-icon" />
                      <img
                          v-if="activePost?.author.photo"
                          :src="activePost.author.photo"
                          :alt="activePost.author.name"
                          class="post-page__comment-author-like-avatar"
                      />
                      <span v-else class="post-page__comment-author-like-avatar post-page__comment-author-like-avatar--fallback">
                        {{ getAuthorInitial(activePost?.author.name ?? '') }}
                      </span>
                    </span>
                    <span v-if="formatCommentTime(comment.createdAt)" class="post-page__comment-time">
                      · {{ formatCommentTime(comment.createdAt) }}
                    </span>
                  </div>

                  <div class="post-page__comment-body">
                    <p class="post-page__comment-text">{{ comment.commentText }}</p>

                    <div class="post-page__comment-actions">
                      <button
                          type="button"
                          class="post-page__comment-action post-page__comment-action--like"
                          :class="{ 'post-page__comment-action--like-active': comment.isLiked }"
                          :disabled="isCommentLikePending(comment.commentId)"
                          @click="toggleCommentLike(comment)"
                      >
                        <img :src="comment.isLiked ? heartActiveIconUrl : heartIconUrl" alt="" class="post-page__comment-action-icon" />
                        <span class="post-page__comment-action-count">{{ formatCompactNumber(comment.likesCount) }}</span>
                      </button>

                      <button type="button" class="post-page__comment-action" @click="toggleReplyForm(comment.commentId)">
                        {{ uk.posts.details.reply }}
                      </button>

                      <button
                          v-if="canDeleteComment(comment)"
                          type="button"
                          class="post-page__comment-action"
                          :disabled="isCommentDeleting(comment.commentId)"
                          @click="requestDeleteComment(comment)"
                      >
                        {{ uk.posts.details.deleteComment }}
                      </button>
                    </div>

                    <div v-if="isReplyFormOpen(comment.commentId)" class="post-page__reply-box">
                      <BaseField
                          v-model="replyDrafts[comment.commentId]"
                          :id="`post-comment-reply-${comment.commentId}`"
                          class="post-page__comment-field post-page__comment-field--reply"
                          label=""
                          :placeholder="uk.posts.details.replyPlaceholder"
                          :maxlength="5000"
                          :disabled="isSubmittingComment"
                          multiline
                          auto-resize
                          :auto-resize-max-height="132"
                          :rows="2"
                      />
                      <button
                          type="button"
                          class="post-page__send-btn post-page__send-btn--reply"
                          :disabled="isSubmittingComment || !(replyDrafts[comment.commentId] ?? '').trim()"
                          :aria-label="uk.posts.details.send"
                          @click="submitComment(comment.commentId)"
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M21 3 10 14" />
                          <path d="m21 3-7 18-4-7-7-4Z" />
                        </svg>
                      </button>
                    </div>

                    <button
                        v-if="comment.repliesCount && !isRepliesExpanded(comment.commentId)"
                        type="button"
                        class="post-page__toggle-replies"
                        @click="toggleReplies(comment)"
                    >
                      <span>{{ uk.posts.details.showReplies(comment.repliesCount) }}</span>
                      <span class="post-page__toggle-replies-arrow" aria-hidden="true" />
                    </button>

                    <div v-if="isRepliesExpanded(comment.commentId)" class="post-page__replies">
                      <div v-if="isRepliesLoading(comment.commentId) && !getCommentReplies(comment.commentId).length" class="post-page__reply-loading">
                        {{ uk.common.labels.loading }}
                      </div>

                      <article
                          v-for="reply in getCommentReplies(comment.commentId)"
                          :key="reply.commentId"
                          class="post-page__comment post-page__comment--reply"
                      >
                        <div class="post-page__comment-head">
                          <ProfileIdentity
                              :name="reply.author.name"
                              :username="reply.author.username"
                              :photo="reply.author.photo ?? null"
                              :to="{ name: ProfileRouteNames.PROFILE_BY_USERNAME, params: { username: reply.author.username } }"
                              size="sm"
                          />
                          <span v-if="isLikedByPostAuthor(reply)" class="post-page__comment-author-like">
                            <img :src="heartActiveIconUrl" alt="" class="post-page__comment-author-like-icon" />
                            <img
                                v-if="activePost?.author.photo"
                                :src="activePost.author.photo"
                                :alt="activePost.author.name"
                                class="post-page__comment-author-like-avatar"
                            />
                            <span v-else class="post-page__comment-author-like-avatar post-page__comment-author-like-avatar--fallback">
                              {{ getAuthorInitial(activePost?.author.name ?? '') }}
                            </span>
                          </span>
                          <span v-if="formatCommentTime(reply.createdAt)" class="post-page__comment-time">
                            · {{ formatCommentTime(reply.createdAt) }}
                          </span>
                        </div>

                        <div class="post-page__comment-body">
                          <p class="post-page__comment-text">{{ reply.commentText }}</p>

                          <div class="post-page__comment-actions">
                            <button
                                type="button"
                                class="post-page__comment-action post-page__comment-action--like"
                                :class="{ 'post-page__comment-action--like-active': reply.isLiked }"
                                :disabled="isCommentLikePending(reply.commentId)"
                                @click="toggleCommentLike(reply)"
                            >
                              <img :src="reply.isLiked ? heartActiveIconUrl : heartIconUrl" alt="" class="post-page__comment-action-icon" />
                              <span class="post-page__comment-action-count">{{ formatCompactNumber(reply.likesCount) }}</span>
                            </button>

                            <button
                                v-if="canDeleteComment(reply)"
                                type="button"
                                class="post-page__comment-action"
                                :disabled="isCommentDeleting(reply.commentId)"
                                @click="requestDeleteComment(reply)"
                            >
                              {{ uk.posts.details.deleteComment }}
                            </button>
                          </div>
                        </div>
                      </article>

                      <button
                          v-if="postsStore.commentRepliesHasMore[comment.commentId]"
                          type="button"
                          class="post-page__load-more"
                          :disabled="isRepliesLoading(comment.commentId)"
                          @click="loadMoreReplies(comment.commentId)"
                      >
                        {{ uk.posts.details.loadMoreReplies }}
                      </button>
                    </div>

                    <button
                        v-if="comment.repliesCount && isRepliesExpanded(comment.commentId)"
                        type="button"
                        class="post-page__toggle-replies"
                        @click="toggleReplies(comment)"
                    >
                      <span>{{ uk.posts.details.hideReplies }}</span>
                      <span class="post-page__toggle-replies-arrow post-page__toggle-replies-arrow--expanded" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            </div>

            <button
                v-if="postsStore.commentsHasMore"
                type="button"
                class="post-page__load-more"
                @click="loadComments(false)"
            >
              {{ uk.home.popularFeed.loadingMore }}
            </button>
            </div>

            <div v-if="isCommentsAvailable" class="post-page__comment-composer">
              <BaseField
                  :ref="setRootCommentInputElement"
                  v-model="rootCommentDraft"
                  id="post-comment-root"
                  class="post-page__comment-field"
                  label=""
                  :placeholder="uk.posts.details.commentPlaceholder"
                  :maxlength="5000"
                  :disabled="isSubmittingComment"
                  multiline
                  auto-resize
                  :auto-resize-max-height="132"
                  :rows="2"
              />

              <button
                  type="button"
                  class="post-page__send-btn"
                  :disabled="isSubmittingComment || !rootCommentDraft.trim()"
                  :aria-label="uk.posts.details.send"
                  @click="submitComment()"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M21 3 10 14" />
                  <path d="m21 3-7 18-4-7-7-4Z" />
                </svg>
              </button>
            </div>
            </section>
          </BaseBottomSheet>
        </section>

        <aside class="post-page__column post-page__column--text">
          <section ref="textContentRef" class="post-page__card post-page__text-card">
            <div class="post-page__text-head">
              <h2 class="post-page__section-title">{{ uk.posts.details.textTitle }}</h2>

              <button
                  v-if="activePost.text && isOwnPost"
                  type="button"
                  class="post-page__sync-btn"
                  :disabled="!canManageSynchronization"
                  @click="openSynchronizationManager"
              >
                {{ uk.posts.details.manageSynchronization }}
              </button>
            </div>

            <div v-if="activePost.text" class="post-page__text-content">
              <template v-for="(line, index) in textLines" :key="`${index}-${line}`">
                <button
                    v-if="synchronizationMap.has(index)"
                    :ref="(element) => setLineElement(index, element)"
                    type="button"
                    class="post-page__text-line post-page__text-line--interactive"
                    :class="{ 'post-page__text-line--active': activeLineIndex === index }"
                    :aria-label="uk.posts.details.playFromLine"
                    @click="jumpToLine(index)"
                >
                  {{ line || ' ' }}
                </button>

                <p
                    v-else
                    :ref="(element) => setLineElement(index, element)"
                    class="post-page__text-line"
                >
                  {{ line || ' ' }}
                </p>
              </template>
            </div>

            <p v-else class="post-page__empty">
              {{ uk.posts.details.noText }}
            </p>
          </section>
        </aside>
      </div>

      <PostImmersiveMode
          v-if="activePost"
          :is-open="isImmersiveModeOpen"
          :post="activePost"
          :current-time-seconds="player.currentTimeSeconds.value"
          :progress-percent="player.progressPercent.value"
          :is-playing="player.isPlaying.value && player.activePostId.value === activePost.postId"
          :volume="player.volume.value"
          :is-muted="player.isMuted.value"
          :audio-element="player.audioElement"
          @close="closeImmersiveMode"
          @toggle-playback="toggleImmersivePlayback"
          @seek="seekImmersiveProgress"
          @set-volume="player.setVolume"
          @toggle-mute="player.toggleMute"
      />

      <ConfirmDialog
          v-if="isDeletePostDialogOpen"
          :title="uk.posts.details.deletePostTitle"
          :message="uk.posts.details.deletePostMessage"
          :confirm-label="uk.posts.details.delete"
          :cancel-label="uk.common.labels.cancel"
          @close="isDeletePostDialogOpen = false"
          @confirm="deletePost"
      />

      <ConfirmDialog
          v-if="pendingDeleteComment"
          :title="uk.posts.details.deleteCommentTitle"
          :message="uk.posts.details.deleteCommentMessage"
          :confirm-label="uk.posts.details.deleteComment"
          :cancel-label="uk.common.labels.cancel"
          @close="closeDeleteCommentDialog"
          @confirm="confirmDeleteComment"
      />
    </div>
  </AppShell>

  <CreatePostModal
      :is-open="isCreatePostModalOpen"
      :duration-limit-minutes="durationLimitMinutes"
      @close="handleModalClose"
      @created="handlePostCreated"
  />

  <PostComplaintDialog
      :is-open="isComplaintDialogOpen"
      :reasons="complaintReasons"
      :is-loading-reasons="isLoadingComplaintReasons"
      :is-submitting="isSubmittingComplaint"
      :is-submitted="isComplaintSubmitted"
      :error-message="complaintErrorMessage"
      @close="closeComplaintDialog"
      @submit="submitComplaint"
  />
</template>
