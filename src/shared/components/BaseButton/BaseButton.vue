<script setup lang="ts">
import type { VNode } from 'vue';
import type { BaseButtonProperties } from '@/shared/interfaces/base-button-properties.interface.ts';
import BaseLoader from '@/shared/components/BaseLoader/BaseLoader.vue';
import './BaseButton.css';

defineSlots<{
  icon?: () => VNode[];
}>();

const props = withDefaults(defineProps<BaseButtonProperties>(), {
  isLoading: false,
  iconOnly: false,
});
</script>

<template>
  <button
      :type="props.type"
      class="btn"
      :class="[
        props.variant === 'secondary' ? 'btn-secondary' : 'btn-primary',
        { 'btn-icon-only': props.iconOnly },
        { 'btn-loading': props.isLoading },
      ]"
      :disabled="props.disabled || props.isLoading"
      :aria-busy="props.isLoading"
      :aria-label="props.iconOnly ? props.label : undefined"
  >
    <slot v-if="!props.isLoading" name="icon"></slot>
    <BaseLoader
        v-if="props.isLoading"
        size="sm"
        variant="spin"
        :tone="props.variant === 'secondary' ? 'primary' : 'light'"
    />
    <span v-if="!props.iconOnly">{{ props.label }}</span>
  </button>
</template>
