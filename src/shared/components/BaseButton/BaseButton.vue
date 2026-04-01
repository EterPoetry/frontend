<script setup lang="ts">
import type { VNode } from 'vue';
import type { BaseButtonProperties } from '@/shared/interfaces/base-button-properties.interface.ts';
import './BaseButton.css';

defineSlots<{
  icon?: () => VNode[];
}>();

defineProps<BaseButtonProperties>();
</script>

<template>
  <button
      :type="type"
      class="btn"
      :class="variant === 'secondary' ? 'btn-secondary' : 'btn-primary'"
      :disabled="disabled"
  >
    <slot name="icon"></slot>
    <span>{{ label }}</span>
  </button>
</template>