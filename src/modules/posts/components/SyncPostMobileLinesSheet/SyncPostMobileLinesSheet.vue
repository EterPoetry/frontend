<script setup lang="ts">
import BaseBottomSheet from '@/shared/components/BaseBottomSheet/BaseBottomSheet.vue';
import type { SyncLineErrorKind } from '@/modules/posts/interfaces/sync-line-error-kind.type';
import { uk } from '@/shared/locales/uk';
import { formatSecondsToClock } from '@/shared/utils/time.utils';

defineProps<{
    enabled: boolean;
    isOpen: boolean;
    syncedCount: number;
    totalSyncable: number;
    focusedLineIndex: number | null;
    syncableIndices: number[];
    textLines: string[];
    localSync: Map<number, number>;
    lineErrors: Map<number, SyncLineErrorKind>;
    lineErrorMessage: (kind: SyncLineErrorKind) => string;
}>();

defineEmits<{
    (event: 'close'): void;
    (event: 'focus-line', lineIndex: number): void;
}>();
</script>

<template>
  <BaseBottomSheet
      v-if="enabled"
      :enabled="enabled"
      :is-open="isOpen"
      :close-aria-label="uk.common.labels.close"
      @close="$emit('close')"
  >
    <div class="sync-page__sheet">
      <div class="sync-page__sheet-head">
        <div>
          <h2 class="sync-page__sheet-title">{{ uk.posts.sync.mobileAllLinesTitle }}</h2>
          <p class="sync-page__sheet-subtitle">
            {{ uk.posts.sync.statsCard.synced(syncedCount, totalSyncable) }}
          </p>
        </div>
        <button
            type="button"
            class="sync-page__sheet-close"
            :aria-label="uk.common.labels.close"
            @click="$emit('close')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div class="sync-page__sheet-list">
        <button
            v-for="lineIdx in syncableIndices"
            :key="lineIdx"
            type="button"
            class="sync-page__sheet-line"
            :class="{
              'sync-page__sheet-line--focused': focusedLineIndex === lineIdx,
              'sync-page__sheet-line--synced': localSync.has(lineIdx) && !lineErrors.has(lineIdx),
              'sync-page__sheet-line--error': lineErrors.has(lineIdx),
            }"
            @click="$emit('focus-line', lineIdx)"
        >
          <span class="sync-page__sheet-line-num">{{ lineIdx + 1 }}</span>
          <span class="sync-page__sheet-line-main">
            <span class="sync-page__sheet-line-text">{{ textLines[lineIdx] }}</span>
            <span
                v-if="lineErrors.has(lineIdx)"
                class="sync-page__sheet-line-note sync-page__sheet-line-note--error"
            >
              {{ lineErrorMessage(lineErrors.get(lineIdx)!) }}
            </span>
          </span>
          <span
              v-if="localSync.has(lineIdx)"
              class="sync-page__sheet-line-time"
          >
            {{ formatSecondsToClock(localSync.get(lineIdx)! / 1000) }}
          </span>
          <span v-else class="sync-page__sheet-line-time sync-page__sheet-line-time--pending">
            {{ uk.posts.sync.status.pendingShort }}
          </span>
        </button>
      </div>
    </div>
  </BaseBottomSheet>
</template>
