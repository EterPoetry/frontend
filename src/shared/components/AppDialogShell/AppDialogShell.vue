<script setup lang="ts">
import closeIconUrl from '@/shared/assets/icons/ui/close.svg';
import { useBodyScrollLock } from '@/shared/composables/useBodyScrollLock';
import { uk } from '@/shared/locales/uk';
import './AppDialogShell.css';

const props = defineProps<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    size?: 'md' | 'lg';
}>();

useBodyScrollLock(() => props.isOpen);

const emit = defineEmits<{
    (e: 'close'): void;
}>();
</script>

<template>
    <div v-if="isOpen" class="app-dialog-shell" @click.self="emit('close')">
    <div
        class="app-dialog-shell__surface"
        :class="`app-dialog-shell__surface--${size ?? 'md'}`"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
    >
      <button
          type="button"
          class="app-dialog-shell__close"
          :aria-label="uk.common.labels.close"
          @click="emit('close')"
      >
        <img :src="closeIconUrl" alt="" class="app-dialog-shell__close-icon" />
      </button>

      <header class="app-dialog-shell__header">
        <h2 class="app-dialog-shell__title">{{ title }}</h2>
        <p v-if="subtitle" class="app-dialog-shell__subtitle">{{ subtitle }}</p>
      </header>

      <div class="app-dialog-shell__body">
        <slot />
      </div>
    </div>
  </div>
</template>
