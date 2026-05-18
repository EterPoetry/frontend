<script setup lang="ts">
import type { SyncLineErrorKind } from '@/modules/posts/interfaces/sync-line-error-kind.type';
import { uk } from '@/shared/locales/uk';

defineProps<{
    lineErrors: Map<number, SyncLineErrorKind>;
    firstErrorLineIndex: number | null;
    validationSummary: Array<{ lineIndex: number; message: string }>;
}>();

defineEmits<{
    (event: 'focus-first-error'): void;
}>();
</script>

<template>
  <div
      v-if="lineErrors.size > 0"
      class="sync-page__validation-banner"
      role="alert"
  >
    <svg class="sync-page__validation-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
    <div class="sync-page__validation-messages">
      <p class="sync-page__validation-msg">
        {{ uk.posts.sync.validation.hasErrors(lineErrors.size) }}
        <button
            v-if="firstErrorLineIndex !== null"
            type="button"
            class="sync-page__validation-fix"
            @click="$emit('focus-first-error')"
        >
          {{ uk.posts.sync.validation.goToFirstError }}
        </button>
      </p>
      <p
          v-for="summary in validationSummary"
          :key="summary.lineIndex"
          class="sync-page__validation-msg sync-page__validation-msg--compact"
      >
        {{ uk.posts.sync.validation.line(summary.lineIndex + 1) }}: {{ summary.message }}
      </p>
    </div>
  </div>
</template>
