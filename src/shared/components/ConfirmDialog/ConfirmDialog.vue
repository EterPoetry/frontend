<script setup lang="ts">
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import { useBodyScrollLock } from '@/shared/composables/useBodyScrollLock';
import './ConfirmDialog.css';

withDefaults(defineProps<{
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
}>(), {});

useBodyScrollLock(true);

const emit = defineEmits<{
    (e: 'confirm'): void;
    (e: 'close'): void;
}>();
</script>

<template>
  <div class="confirm-dialog" @click.self="emit('close')">
    <div class="confirm-dialog__surface" role="alertdialog" aria-modal="true" :aria-label="title">
      <h3 class="confirm-dialog__title">{{ title }}</h3>
      <p class="confirm-dialog__message">{{ message }}</p>
      <div class="confirm-dialog__actions">
        <BaseButton :label="cancelLabel" type="button" variant="secondary" :disabled="false" @click="emit('close')" />
        <BaseButton :label="confirmLabel" type="button" variant="primary" :disabled="false" @click="emit('confirm')" />
      </div>
    </div>
  </div>
</template>
