<script setup lang="ts">
import { ref } from 'vue';
import type { SyncLineErrorKind } from '@/modules/posts/interfaces/sync-line-error-kind.type';
import { uk } from '@/shared/locales/uk';
import { formatSecondsToClock } from '@/shared/utils/time.utils';

defineProps<{
    syncedCount: number;
    syncableIndices: number[];
    focusedLineIndex: number | null;
    localSync: Map<number, number>;
    textLines: string[];
    lineErrors: Map<number, SyncLineErrorKind>;
    isFirstLineLocked: boolean;
    lineErrorMessage: (kind: SyncLineErrorKind) => string;
}>();

defineEmits<{
    (event: 'request-clear-all'): void;
    (event: 'focus-line', lineIndex: number): void;
    (event: 'jump-to-line', lineIndex: number): void;
    (event: 'clear-line', lineIndex: number): void;
}>();

const rootElement = ref<HTMLDivElement | null>(null);

defineExpose({
    rootElement,
});
</script>

<template>
  <div class="sync-page__card sync-page__lines-card">
    <div class="sync-page__lines-head">
      <span>{{ uk.posts.sync.linesHeader.lines }}</span>
      <div class="sync-page__lines-head-right">
        <span>{{ uk.posts.sync.linesHeader.time }}</span>
        <button
            v-if="syncedCount > 0"
            type="button"
            class="sync-page__clear-btn"
            @click="$emit('request-clear-all')"
        >
          {{ uk.posts.sync.clearAll }}
        </button>
      </div>
    </div>

    <div ref="rootElement" class="sync-page__lines-body">
      <div
          v-for="lineIdx in syncableIndices"
          :key="lineIdx"
          class="sync-page__line"
          :class="{
            'sync-page__line--focused': focusedLineIndex === lineIdx,
            'sync-page__line--synced': localSync.has(lineIdx) && !lineErrors.has(lineIdx),
            'sync-page__line--error': lineErrors.has(lineIdx),
            'sync-page__line--locked': isFirstLineLocked && lineIdx === 0,
          }"
          :title="lineErrors.has(lineIdx) ? lineErrorMessage(lineErrors.get(lineIdx)!) : undefined"
          @click="$emit('focus-line', lineIdx)"
          @dblclick="$emit('jump-to-line', lineIdx)"
      >
        <span class="sync-page__line-num">{{ lineIdx + 1 }}</span>
        <span class="sync-page__line-content">
          <span class="sync-page__line-text">{{ textLines[lineIdx] }}</span>
        </span>

        <span
            v-if="localSync.has(lineIdx)"
            class="sync-page__line-time"
            :class="{ 'sync-page__line-time--error': lineErrors.has(lineIdx) }"
        >
          {{ formatSecondsToClock(localSync.get(lineIdx)! / 1000) }}
        </span>
        <span v-else class="sync-page__line-dash">—</span>

        <template v-if="isFirstLineLocked && lineIdx === 0">
          <span class="sync-page__line-lock" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.6"/>
              <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            </svg>
          </span>
        </template>
        <template v-else>
          <button
              v-if="localSync.has(lineIdx)"
              type="button"
              class="sync-page__line-action"
              :title="uk.posts.sync.reset"
              :aria-label="uk.posts.sync.reset"
              @click.stop="$emit('clear-line', lineIdx)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <span v-else />
        </template>
      </div>
    </div>
  </div>
</template>
