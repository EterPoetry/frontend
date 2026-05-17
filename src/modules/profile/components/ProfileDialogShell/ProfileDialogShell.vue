<script setup lang="ts">
import closeIconUrl from '@/shared/assets/icons/ui/close.svg';
import { uk } from '@/shared/locales/uk';
import './ProfileDialogShell.css';

defineProps<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    size?: 'md' | 'lg';
}>();

const emit = defineEmits<{
    (e: 'close'): void;
}>();
</script>

<template>
    <div v-if="isOpen" class="profile-dialog-shell" @click.self="emit('close')">
    <div
        class="profile-dialog-shell__surface"
        :class="`profile-dialog-shell__surface--${size ?? 'md'}`"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
    >
      <button
          type="button"
          class="profile-dialog-shell__close"
          :aria-label="uk.common.labels.close"
          @click="emit('close')"
      >
        <img :src="closeIconUrl" alt="" class="profile-dialog-shell__close-icon" />
      </button>

      <header class="profile-dialog-shell__header">
        <h2 class="profile-dialog-shell__title">{{ title }}</h2>
        <p v-if="subtitle" class="profile-dialog-shell__subtitle">{{ subtitle }}</p>
      </header>

      <div class="profile-dialog-shell__body">
        <slot />
      </div>
    </div>
  </div>
</template>
