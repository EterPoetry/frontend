<script setup lang="ts">
import { computed } from 'vue';
import type { BaseLoaderProperties } from '@/shared/interfaces/base-loader-properties.interface.ts';
import './BaseLoader.css';

const props = withDefaults(defineProps<BaseLoaderProperties>(), {
    size: 'md',
    tone: 'primary',
    centered: false,
    label: '',
    variant: 'wave',
});

const classes = computed(() => [
    'base-loader',
    `base-loader--${props.size}`,
    `base-loader--${props.tone}`,
    `base-loader--${props.variant}`,
    { 'base-loader--centered': props.centered },
]);
</script>

<template>
  <span :class="classes" role="status" :aria-label="label || 'Loading'">
    <template v-if="props.variant === 'spin'">
      <span class="base-loader__ring" aria-hidden="true" />
    </template>
    <template v-else>
      <span class="base-loader__wave" aria-hidden="true">
        <span class="base-loader__bar" />
        <span class="base-loader__bar" />
        <span class="base-loader__bar" />
        <span class="base-loader__bar" />
        <span class="base-loader__bar" />
        <span class="base-loader__bar" />
        <span class="base-loader__bar" />
      </span>
      <span v-if="label" class="base-loader__label">{{ label }}</span>
    </template>
  </span>
</template>
