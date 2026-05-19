<script setup lang="ts">
import { useBodyScrollLock } from '@/shared/composables/useBodyScrollLock';
import './BaseBottomSheet.css';

const props = withDefaults(defineProps<{
    enabled?: boolean;
    isOpen?: boolean;
    closeAriaLabel?: string;
}>(), {
    enabled: false,
    isOpen: false,
    closeAriaLabel: 'Close',
});

useBodyScrollLock(() => props.enabled && props.isOpen);

const emit = defineEmits<{
    (e: 'close'): void;
}>();
</script>

<template>
  <slot v-if="!enabled" />

  <div v-else class="base-bottom-sheet" :class="{ 'base-bottom-sheet--open': isOpen }">
    <button
        type="button"
        class="base-bottom-sheet__backdrop"
        :aria-label="closeAriaLabel"
        @click="emit('close')"
    />

    <div class="base-bottom-sheet__surface">
      <slot />
    </div>
  </div>
</template>
