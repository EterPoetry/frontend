<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/modules/auth/auth.store';
import SyncPostLinesList from '@/modules/posts/components/SyncPostLinesList/SyncPostLinesList.vue';
import SyncPostMobileLinesSheet from '@/modules/posts/components/SyncPostMobileLinesSheet/SyncPostMobileLinesSheet.vue';
import SyncPostPlayerCard from '@/modules/posts/components/SyncPostPlayerCard/SyncPostPlayerCard.vue';
import SyncPostValidationBanner from '@/modules/posts/components/SyncPostValidationBanner/SyncPostValidationBanner.vue';
import { usePostsStore } from '@/modules/posts/posts.store';
import { usePostPlayer } from '@/modules/posts/composables/usePostPlayer';
import { usePostsAppShell } from '@/modules/posts/composables/usePostsAppShell';
import {
    SYNC_STAMP_FEEDBACK_DURATION_MS,
    SYNC_SWIPE_THRESHOLD_PX,
} from '@/modules/posts/constants/post-sync.constants';
import { PostRouteNames } from '@/modules/posts/enums/post-route-names.enum';
import { PostStatus } from '@/modules/posts/enums/post-status.enum';
import type { SyncLineErrorKind } from '@/modules/posts/interfaces/sync-line-error-kind.type';
import type { SyncValidation } from '@/modules/posts/interfaces/sync-validation.interface';
import type { PostTextSynchronizationItem } from '@/modules/posts/interfaces/post-text-synchronization-item.interface';
import {
    buildPostTextSynchronization,
    validatePostTextSynchronization,
} from '@/modules/posts/utils/post-text-synchronization.utils';
import AppShell from '@/shared/components/AppShell/AppShell.vue';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import ConfirmDialog from '@/shared/components/ConfirmDialog/ConfirmDialog.vue';
import CreatePostModal from '@/modules/posts/components/CreatePostModal/CreatePostModal.vue';
import ErrorAlert from '@/shared/components/ErrorAlert/ErrorAlert.vue';
import { MOBILE_BREAKPOINT_PX } from '@/shared/constants/breakpoints.constants';
import { uk } from '@/shared/locales/uk';
import { formatSecondsToClock } from '@/shared/utils/time.utils';
import './SyncPostPage.css';

const postsStore = usePostsStore();
const authStore = useAuthStore();
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

const isLoading = ref(true);
const loadError = ref('');
const isSaving = ref(false);
const saveError = ref('');
const isMobileViewport = ref(false);
const hasChanges = ref(false);
const hasAttemptedSave = ref(false);
const isLeaveConfirmOpen = ref(false);
const isClearConfirmOpen = ref(false);
const isMobileLinesSheetOpen = ref(false);
const stampFeedback = ref<string | null>(null);
const lineListRef = ref<{ rootElement: HTMLDivElement | null } | null>(null);

let stampFeedbackTimer: number | null = null;
let touchStartX = 0;
let touchStartY = 0;

const localSync = ref<Map<number, number>>(new Map());
const focusedPosition = ref(0);

const isFirstLineLocked = computed<boolean>(() => syncableIndices.value[0] === 0);
const routePostId = computed<number | null>(() => {
    const raw = route.params.postId;
    const normalized = Array.isArray(raw) ? raw[0] : raw;
    const parsed = Number(normalized);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
});

const post = computed(() => {
    if (!routePostId.value) return null;
    return postsStore.currentPost?.postId === routePostId.value ? postsStore.currentPost : null;
});

const textLines = computed(() => (post.value?.text ?? '').split('\n'));

const syncableIndices = computed<number[]>(() =>
    textLines.value
        .map((line, idx) => ({ line, idx }))
        .filter(({ line }) => line.trim() !== '')
        .map(({ idx }) => idx),
);

const focusedLineIndex = computed<number | null>(() =>
    syncableIndices.value[focusedPosition.value] ?? null,
);

const accessError = computed<string | null>(() => {
    if (!post.value) return null;
    const isOwn = authStore.user?.userId === post.value.authorId;
    if (!isOwn) return uk.posts.sync.accessDenied;
    if (!authStore.user?.isPremium) return uk.posts.sync.accessDenied;
    if (post.value.status === PostStatus.PROCESSING) return uk.posts.sync.processingPost;
    if (!post.value.text?.trim()) return uk.posts.sync.noText;
    if (!post.value.audioFileUrl) return uk.posts.sync.noAudio;
    return null;
});

const syncedCount = computed(() => localSync.value.size);
const totalSyncable = computed(() => syncableIndices.value.length);
const syncProgressPercent = computed(() =>
    totalSyncable.value > 0 ? Math.round((syncedCount.value / totalSyncable.value) * 100) : 0,
);

const isThisPostActive = computed(() =>
    !!post.value && player.activePostId.value === post.value.postId,
);

const playerProgressValue = computed(() =>
    player.durationSeconds.value > 0
        ? (player.currentTimeSeconds.value / player.durationSeconds.value) * 100
        : 0,
);

const prevLineIndex = computed(() =>
    focusedPosition.value > 0 ? syncableIndices.value[focusedPosition.value - 1] ?? null : null,
);
const nextLineIndex = computed(() =>
    focusedPosition.value < syncableIndices.value.length - 1
        ? syncableIndices.value[focusedPosition.value + 1] ?? null
        : null,
);
const prevLineText = computed(() =>
    prevLineIndex.value !== null ? textLines.value[prevLineIndex.value] ?? '' : '',
);
const currentLineText = computed(() =>
    focusedLineIndex.value !== null ? textLines.value[focusedLineIndex.value] ?? '' : '',
);
const nextLineText = computed(() =>
    nextLineIndex.value !== null ? textLines.value[nextLineIndex.value] ?? '' : '',
);
const currentLineTime = computed<number | null>(() =>
    focusedLineIndex.value !== null ? localSync.value.get(focusedLineIndex.value) ?? null : null,
);

const syncMobileViewport = (): void => {
    isMobileViewport.value = window.innerWidth <= MOBILE_BREAKPOINT_PX;
};
const moveToNext = (): void => {
    if (focusedPosition.value < syncableIndices.value.length - 1) {
        focusedPosition.value += 1;
    }
};

const moveToPrev = (): void => {
    const minPosition = isFirstLineLocked.value ? 1 : 0;
    if (focusedPosition.value > minPosition) {
        focusedPosition.value -= 1;
    }
};

const setFocusedPosition = (lineIndex: number): void => {
    if (isFirstLineLocked.value && lineIndex === 0) return;
    const pos = syncableIndices.value.indexOf(lineIndex);
    if (pos !== -1) {
        focusedPosition.value = pos;
    }
};

const focusLine = (lineIndex: number): void => {
    setFocusedPosition(lineIndex);
    isMobileLinesSheetOpen.value = false;
};

const showFeedback = (lineNum: number, timeStr: string): void => {
    if (stampFeedbackTimer !== null) {
        clearTimeout(stampFeedbackTimer);
    }
    stampFeedback.value = uk.posts.sync.stampFeedback(lineNum, timeStr);
    stampFeedbackTimer = window.setTimeout(() => {
        stampFeedback.value = null;
        stampFeedbackTimer = null;
    }, SYNC_STAMP_FEEDBACK_DURATION_MS);
};

const stampCurrentLine = async (): Promise<void> => {
    const lineIndex = focusedLineIndex.value;
    if (lineIndex === null) return;
    if (isFirstLineLocked.value && lineIndex === 0) {
        moveToNext();
        return;
    }
    if (!isThisPostActive.value && post.value) {
        try {
            await player.playPost(post.value);
            await nextTick();
        } catch {
            // stamp at current position even if playback fails to start
        }
    }
    const currentMs = Math.floor(player.currentTimeSeconds.value * 1000);
    const next = new Map(localSync.value);
    next.set(lineIndex, currentMs);
    localSync.value = next;
    hasChanges.value = true;
    showFeedback(lineIndex + 1, formatSecondsToClock(currentMs / 1000));
    navigator.vibrate?.(30);
    moveToNext();
};

const clearLine = (lineIndex: number): void => {
    if (isFirstLineLocked.value && lineIndex === 0) return;
    const next = new Map(localSync.value);
    next.delete(lineIndex);
    localSync.value = next;
    hasChanges.value = true;
};

const clearFocusedLine = (): void => {
    if (focusedLineIndex.value === null) {
        return;
    }

    const next = new Map(localSync.value);
    next.delete(focusedLineIndex.value);
    localSync.value = next;
    hasChanges.value = true;
};

const clearAll = (): void => {
    const next = new Map<number, number>();
    if (isFirstLineLocked.value) next.set(0, 0);
    localSync.value = next;
    hasChanges.value = true;
    isClearConfirmOpen.value = false;
};

const closeSyncPlayer = async (): Promise<void> => {
    if (!player.hasActivePost.value) {
        return;
    }

    await player.closePlayer();
};

const jumpToLine = async (lineIndex: number): Promise<void> => {
    const ms = localSync.value.get(lineIndex);
    if (ms === undefined || !post.value) return;

    if (!isThisPostActive.value) {
        await player.playPost(post.value);
        await nextTick();
    }

    const dur = player.durationSeconds.value || post.value.audioDurationSeconds || 0;
    if (!dur) return;
    const percent = (ms / (dur * 1000)) * 100;
    await player.seekToPercent(percent);
};

const togglePlayback = async (): Promise<void> => {
    if (!post.value) return;
    if (isThisPostActive.value) {
        if (player.isPlaying.value) {
            await player.pausePlayback();
        } else {
            await player.resumePlayback();
        }
    } else {
        await player.playPost(post.value);
    }
};

const seekPlayer = async (percent: number): Promise<void> => {
    if (!isThisPostActive.value && post.value) {
        await player.playPost(post.value);
        await nextTick();
    }
    await player.seekToPercent(percent);
};

const skipSeconds = async (delta: number): Promise<void> => {
    const dur = player.durationSeconds.value;
    if (!dur) return;
    const nextSec = Math.min(dur, Math.max(0, player.currentTimeSeconds.value + delta));
    const percent = (nextSec / dur) * 100;
    await seekPlayer(percent);
};

const scrollFocusedIntoView = (): void => {
    const el = lineListRef.value?.rootElement?.querySelector<HTMLElement>('.sync-page__line--focused');
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
};

watch(focusedPosition, () => {
    void nextTick(scrollFocusedIntoView);
});

watch(isMobileViewport, (isMobile) => {
    if (!isMobile) {
        isMobileLinesSheetOpen.value = false;
    }
});

const buildSyncArray = (): PostTextSynchronizationItem[] => buildPostTextSynchronization(localSync.value);

const syncValidation = computed<SyncValidation>(() => {
    return validatePostTextSynchronization(
        localSync.value,
        syncableIndices.value,
        post.value?.audioDurationSeconds,
        hasAttemptedSave.value,
    );
});

const isSyncComplete = computed<boolean>(() => syncedCount.value === totalSyncable.value && totalSyncable.value > 0);
const visibleLineErrors = computed<Map<number, SyncLineErrorKind>>(() => {
    return hasAttemptedSave.value ? syncValidation.value.lineErrors : new Map<number, SyncLineErrorKind>();
});

const firstErrorLineIndex = computed<number | null>(() => {
    const firstError = visibleLineErrors.value.keys().next().value;
    return typeof firstError === 'number' ? firstError : null;
});

const validationSummary = computed<Array<{ lineIndex: number; message: string }>>(() => {
    const summaries: Array<{ lineIndex: number; message: string }> = [];

    for (const [lineIndex, kind] of visibleLineErrors.value.entries()) {
        summaries.push({
            lineIndex,
            message: lineErrorMessage(kind),
        });
    }

    return summaries.slice(0, 3);
});

const currentLineErrorKind = computed<SyncLineErrorKind | null>(() => {
    if (focusedLineIndex.value === null) {
        return null;
    }

    return visibleLineErrors.value.get(focusedLineIndex.value) ?? null;
});

const lineErrorMessage = (kind: SyncLineErrorKind): string => {
    if (kind === 'missing') return uk.posts.sync.validation.missing;
    if (kind === 'out-of-order') return uk.posts.sync.validation.outOfOrder;
    return uk.posts.sync.validation.exceedsDuration;
};

const currentLineStatus = computed(() => {
    if (focusedLineIndex.value === null) {
        return {
            tone: 'muted',
            label: uk.posts.sync.status.idle,
            message: '',
        };
    }

    if (currentLineErrorKind.value) {
        return {
            tone: 'error',
            label: uk.posts.sync.status.error,
            message: lineErrorMessage(currentLineErrorKind.value),
        };
    }

    if (currentLineTime.value !== null) {
        return {
            tone: 'synced',
            label: uk.posts.sync.status.synced,
            message: uk.posts.sync.status.syncedAt(formatSecondsToClock(currentLineTime.value / 1000)),
        };
    }

    return {
        tone: 'pending',
        label: uk.posts.sync.status.pending,
        message: uk.posts.sync.status.pendingHint,
    };
});

const focusFirstError = (): void => {
    if (firstErrorLineIndex.value === null) {
        return;
    }

    setFocusedPosition(firstErrorLineIndex.value);
    isMobileLinesSheetOpen.value = false;
};

const saveSync = async (): Promise<void> => {
    if (!post.value) return;
    hasAttemptedSave.value = true;
    if (!isSyncComplete.value || !syncValidation.value.isValid) return;
    isSaving.value = true;
    saveError.value = '';
    try {
        await postsStore.updatePostTextSynchronization(post.value.postId, {
            textSynchronization: buildSyncArray(),
        });
        await closeSyncPlayer();
        hasChanges.value = false;
        await router.push({
            name: PostRouteNames.POST,
            params: { slug: post.value.slug },
        });
    } catch (_err) {
        saveError.value = uk.posts.sync.saveFailed;
    } finally {
        isSaving.value = false;
    }
};

const exitWithoutSaving = (): void => {
    isLeaveConfirmOpen.value = true;
};

const confirmExit = async (): Promise<void> => {
    isLeaveConfirmOpen.value = false;
    await closeSyncPlayer();
    if (post.value) {
        await router.push({
            name: PostRouteNames.POST,
            params: { slug: post.value.slug },
        });
    } else {
        await router.back();
    }
};

const loadPost = async (postId: number): Promise<void> => {
    isLoading.value = true;
    loadError.value = '';
    try {
        const loaded = await postsStore.getPost(postId);
        const map = new Map(
            loaded.textSynchronization.map((item) => [item.lineIndex, item.audioStartMomentMs]),
        );
        // Line 0 is always pre-locked at 0:00 when the first non-empty line is line 0
        if (syncableIndices.value[0] === 0) map.set(0, 0);
        localSync.value = map;
        hasChanges.value = false;
        hasAttemptedSave.value = false;
        // Start focused on the first stampable line (skip the locked line 0)
        focusedPosition.value = syncableIndices.value[0] === 0 && syncableIndices.value.length > 1 ? 1 : 0;
    } catch (_err) {
        loadError.value = uk.posts.sync.loadFailed;
    } finally {
        isLoading.value = false;
    }
};

const handleKeydown = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.key === ' ' || event.code === 'Space') {
        event.preventDefault();
        stampCurrentLine();
    } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        moveToNext();
    } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        moveToPrev();
    }
};

const handleTouchStart = (event: TouchEvent): void => {
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
};

const handleTouchEnd = (event: TouchEvent): void => {
    const dx = event.changedTouches[0].clientX - touchStartX;
    const dy = event.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < SYNC_SWIPE_THRESHOLD_PX || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) {
        moveToNext();
    } else {
        moveToPrev();
    }
};

const beforeUnloadHandler = (event: BeforeUnloadEvent): void => {
    if (hasChanges.value) {
        event.preventDefault();
        event.returnValue = '';
    }
};

onMounted(() => {
    syncMobileViewport();
    window.addEventListener('resize', syncMobileViewport);
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('beforeunload', beforeUnloadHandler);
    void closeSyncPlayer();
});

onBeforeUnmount(() => {
    void closeSyncPlayer();
    window.removeEventListener('resize', syncMobileViewport);
    window.removeEventListener('keydown', handleKeydown);
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    if (stampFeedbackTimer !== null) clearTimeout(stampFeedbackTimer);
});

watch(
    routePostId,
    (postId) => {
        if (postId) void loadPost(postId);
        else loadError.value = uk.posts.sync.notFound;
    },
    { immediate: true },
);
</script>

<template>
  <AppShell
      v-model:search="search"
      :hide-sticky-player="!isMobileViewport"
      :is-authenticated="isAuthenticated"
      :like-pending-post-ids="[]"
      @create="handleCreateClick"
      @login="openLogin"
      @register="openRegister"
      @logout="authStore.logout"
  >
    <div class="sync-page">

      <!-- Loading -->
      <div v-if="isLoading" class="sync-page__skeleton" aria-hidden="true">
        <div class="sync-page__skeleton-header">
          <div class="sync-page__skeleton-title sync-page__sk" />
          <div class="sync-page__skeleton-subtitle sync-page__sk" />
        </div>

        <div class="sync-page__skeleton-layout">
          <div class="sync-page__skeleton-left">
            <div class="sync-page__skeleton-card sync-page__skeleton-card--player">
              <div class="sync-page__skeleton-player-head">
                <div class="sync-page__skeleton-player-title sync-page__sk" />
                <div class="sync-page__skeleton-player-meta sync-page__sk" />
              </div>
              <div class="sync-page__skeleton-waveform sync-page__sk" />
              <div class="sync-page__skeleton-time-row">
                <div class="sync-page__skeleton-time sync-page__sk" />
                <div class="sync-page__skeleton-time sync-page__sk" />
              </div>
              <div class="sync-page__skeleton-controls">
                <div class="sync-page__skeleton-control sync-page__skeleton-control--small sync-page__sk" />
                <div class="sync-page__skeleton-control sync-page__skeleton-control--primary sync-page__sk" />
                <div class="sync-page__skeleton-control sync-page__skeleton-control--small sync-page__sk" />
              </div>
            </div>

            <div class="sync-page__skeleton-card sync-page__skeleton-card--hints">
              <div class="sync-page__skeleton-hint sync-page__sk" />
              <div class="sync-page__skeleton-hint sync-page__skeleton-hint--short sync-page__sk" />
              <div class="sync-page__skeleton-hint sync-page__skeleton-hint--wide sync-page__sk" />
            </div>
          </div>

          <div class="sync-page__skeleton-card sync-page__skeleton-card--lines">
            <div class="sync-page__skeleton-lines-head">
              <div class="sync-page__skeleton-lines-title sync-page__sk" />
              <div class="sync-page__skeleton-lines-badge sync-page__sk" />
            </div>
            <div class="sync-page__skeleton-lines-list">
              <div class="sync-page__skeleton-line sync-page__skeleton-line--92 sync-page__sk" />
              <div class="sync-page__skeleton-line sync-page__skeleton-line--74 sync-page__sk" />
              <div class="sync-page__skeleton-line sync-page__skeleton-line--88 sync-page__sk" />
              <div class="sync-page__skeleton-line sync-page__skeleton-line--68 sync-page__sk" />
              <div class="sync-page__skeleton-line sync-page__skeleton-line--84 sync-page__sk" />
              <div class="sync-page__skeleton-line sync-page__skeleton-line--72 sync-page__sk" />
              <div class="sync-page__skeleton-line sync-page__skeleton-line--90 sync-page__sk" />
              <div class="sync-page__skeleton-line sync-page__skeleton-line--64 sync-page__sk" />
            </div>
          </div>
        </div>
      </div>

      <!-- Load error -->
      <div v-else-if="loadError" class="sync-page__state">
        <ErrorAlert :message="loadError" />
        <button type="button" class="sync-page__retry-btn" @click="routePostId && loadPost(routePostId)">
          {{ uk.profile.actions.retry }}
        </button>
      </div>

      <div v-else-if="accessError" class="sync-page__state">
        <ErrorAlert :message="accessError" />
      </div>

      <template v-else-if="post">
        <header class="sync-page__header">
          <div class="sync-page__title-block">
            <h1 class="sync-page__title">{{ uk.posts.sync.title }}</h1>
          </div>

          <div class="sync-page__header-actions">
            <span
                v-if="hasChanges"
                class="sync-page__unsaved-badge sync-page__desktop-only"
            >
              {{ uk.posts.sync.unsavedChanges }}
            </span>
            <BaseButton
                class="sync-page__exit-btn"
                :label="uk.posts.sync.exitWithoutSaving"
                type="button"
                variant="secondary"
                :disabled="false"
                @click="exitWithoutSaving"
            />
            <BaseButton
                class="sync-page__save-btn"
                :label="isSaving ? uk.posts.sync.saving : uk.posts.sync.saveChanges"
                type="button"
                variant="primary"
                :disabled="false"
                :is-loading="isSaving"
                @click="saveSync"
            />
          </div>
        </header>

        <SyncPostValidationBanner
            :line-errors="visibleLineErrors"
            :first-error-line-index="firstErrorLineIndex"
            :validation-summary="validationSummary"
            @focus-first-error="focusFirstError"
        />

        <ErrorAlert v-if="saveError" :message="saveError" />
        <div class="sync-page__layout">
          <div class="sync-page__left">
            <SyncPostPlayerCard
                :progress-value="playerProgressValue"
                :current-time-seconds="player.currentTimeSeconds.value"
                :duration-seconds="player.durationSeconds.value || post.audioDurationSeconds || 0"
                :is-this-post-active="isThisPostActive"
                :is-playing="player.isPlaying.value"
                :is-seek-disabled="!post.audioDurationSeconds"
                :audio-analysis="post.audioAnalysis"
                :audio-energy="player.audioEnergy.value"
                :volume="player.volume.value"
                :is-muted="player.isMuted.value"
                @seek-player="seekPlayer"
                @toggle-playback="togglePlayback"
                @skip-seconds="skipSeconds"
                @set-volume="player.setVolume"
                @toggle-mute="player.toggleMute"
            />

            <div
                class="sync-page__focus-view"
                @touchstart.passive="handleTouchStart"
                @touchend.passive="handleTouchEnd"
            >
              <div v-if="prevLineText" class="sync-page__focus-prev">{{ prevLineText }}</div>
              <div v-else class="sync-page__focus-prev sync-page__focus-adjacent--placeholder">·</div>

              <div
                  class="sync-page__focus-current"
                  :class="{ 'sync-page__focus-current--error': focusedLineIndex !== null && visibleLineErrors.has(focusedLineIndex) }"
              >
                {{ currentLineText }}
              </div>

              <div class="sync-page__focus-meta">
                <span
                    class="sync-page__focus-status"
                    :class="`sync-page__focus-status--${currentLineStatus.tone}`"
                >
                  {{ currentLineStatus.label }}
                </span>
                <span
                    v-if="currentLineTime !== null"
                    class="sync-page__focus-time-badge"
                    :class="{ 'sync-page__focus-time-badge--error': currentLineErrorKind !== null }"
                >
                  {{ formatSecondsToClock(currentLineTime / 1000) }}
                </span>
                <span v-if="focusedLineIndex !== null">
                  {{ focusedPosition + 1 }} / {{ syncableIndices.length }}
                </span>
              </div>

              <p
                  v-if="currentLineStatus.message"
                  class="sync-page__focus-status-message"
                  :class="{ 'sync-page__focus-status-message--error': currentLineErrorKind !== null }"
              >
                {{ currentLineStatus.message }}
              </p>

              <div class="sync-page__focus-actions">
                <button
                    type="button"
                    class="sync-page__focus-secondary-btn"
                    @click="isMobileLinesSheetOpen = true"
                >
                  {{ uk.posts.sync.mobileAllLinesTitle }}
                </button>
                <button
                    v-if="focusedLineIndex !== null && currentLineTime !== null && !(isFirstLineLocked && focusedLineIndex === 0)"
                    type="button"
                    class="sync-page__focus-secondary-btn"
                    @click="clearFocusedLine"
                >
                  {{ uk.posts.sync.resetCurrentLine }}
                </button>
              </div>

              <div v-if="nextLineText" class="sync-page__focus-next">{{ nextLineText }}</div>
              <div v-else class="sync-page__focus-next sync-page__focus-adjacent--placeholder">·</div>
            </div>

            <div class="sync-page__card sync-page__mobile-summary sync-page__mobile-only">
              <div class="sync-page__mobile-summary-top">
                <div>
                  <p class="sync-page__mobile-summary-label">{{ uk.posts.sync.mobileSummaryTitle }}</p>
                  <p class="sync-page__mobile-summary-value">
                    {{ uk.posts.sync.statsCard.synced(syncedCount, totalSyncable) }}
                  </p>
                </div>
                <button
                    type="button"
                    class="sync-page__mobile-summary-btn"
                    @click="isMobileLinesSheetOpen = true"
                >
                  {{ uk.posts.sync.mobileAllLinesTitle }}
                </button>
              </div>
            </div>

            <div class="sync-page__card sync-page__stats-card">
              <h2 class="sync-page__card-title">{{ uk.posts.sync.statsCard.title }}</h2>

              <div class="sync-page__stats-body">
                <div class="sync-page__stats-text">
                  <p class="sync-page__stats-count">
                    {{ uk.posts.sync.statsCard.synced(syncedCount, totalSyncable) }}
                  </p>
                  <p class="sync-page__stats-label">{{ uk.posts.sync.statsCard.syncedLabel }}</p>
                </div>
                <p class="sync-page__stats-progress">{{ syncProgressPercent }}%</p>
              </div>

              <p class="sync-page__stats-hint">{{ uk.posts.sync.playerHelp }}</p>

              <div class="sync-page__shortcut-list">
                <div class="sync-page__shortcut-item">
                  <kbd class="sync-page__hint-key">Пробіл</kbd>
                  <span>{{ uk.posts.sync.hintsCard.stamp }}</span>
                </div>
                <div class="sync-page__shortcut-item">
                  <kbd class="sync-page__hint-key">→</kbd>
                  <span>{{ uk.posts.sync.hintsCard.next }}</span>
                </div>
                <div class="sync-page__shortcut-item">
                  <kbd class="sync-page__hint-key">←</kbd>
                  <span>{{ uk.posts.sync.hintsCard.prev }}</span>
                </div>
                <div class="sync-page__shortcut-item">
                  <kbd class="sync-page__hint-key sync-page__hint-key--wide">2× клік</kbd>
                  <span>{{ uk.posts.sync.hintsCard.jump }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="sync-page__right sync-page__desktop-only">
            <SyncPostLinesList
                ref="lineListRef"
                :synced-count="syncedCount"
                :syncable-indices="syncableIndices"
                :focused-line-index="focusedLineIndex"
                :local-sync="localSync"
                :text-lines="textLines"
                :line-errors="visibleLineErrors"
                :is-first-line-locked="isFirstLineLocked"
                :line-error-message="lineErrorMessage"
                @request-clear-all="isClearConfirmOpen = true"
                @focus-line="setFocusedPosition"
                @jump-to-line="jumpToLine"
                @clear-line="clearLine"
            />
          </div>
        </div>

        <div class="sync-page__mobile-bar">
          <button
              type="button"
              class="sync-page__bar-nav"
              :disabled="focusedPosition <= 0"
              :aria-label="uk.posts.sync.prevLine"
              @click="moveToPrev"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Назад
          </button>

          <button
              type="button"
              class="sync-page__bar-stamp"
              :disabled="focusedLineIndex === null"
              @click="stampCurrentLine"
          >
            {{ uk.posts.sync.stampBtn }}
          </button>

          <button
              type="button"
              class="sync-page__bar-nav"
              :disabled="focusedPosition >= syncableIndices.length - 1"
              :aria-label="uk.posts.sync.nextLine"
              @click="moveToNext"
          >
            Далі
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>


      </template>
    </div>
  </AppShell>

  <SyncPostMobileLinesSheet
      :enabled="isMobileViewport"
      :is-open="isMobileLinesSheetOpen"
      :synced-count="syncedCount"
      :total-syncable="totalSyncable"
      :focused-line-index="focusedLineIndex"
      :syncable-indices="syncableIndices"
      :text-lines="textLines"
      :local-sync="localSync"
      :line-errors="visibleLineErrors"
      :line-error-message="lineErrorMessage"
      @close="isMobileLinesSheetOpen = false"
      @focus-line="focusLine"
  />
  <Transition name="sync-page__feedback">
    <div v-if="stampFeedback" class="sync-page__feedback" role="status" aria-live="polite">
      {{ stampFeedback }}
    </div>
  </Transition>

  <ConfirmDialog
      v-if="isLeaveConfirmOpen"
      :title="uk.posts.sync.exitWithoutSaving"
      :message="uk.posts.sync.leaveConfirm"
      :confirm-label="uk.posts.sync.exitWithoutSaving"
      :cancel-label="uk.common.labels.cancel"
      @confirm="confirmExit"
      @close="isLeaveConfirmOpen = false"
  />

  <ConfirmDialog
      v-if="isClearConfirmOpen"
      :title="uk.posts.sync.clearAll"
      :message="uk.posts.sync.clearAllConfirm"
      :confirm-label="uk.posts.sync.clearAll"
      :cancel-label="uk.common.labels.cancel"
      @confirm="clearAll"
      @close="isClearConfirmOpen = false"
  />

  <CreatePostModal
      :is-open="isCreatePostModalOpen"
      :duration-limit-minutes="durationLimitMinutes"
      @close="handleModalClose"
      @created="handlePostCreated"
  />
</template>
