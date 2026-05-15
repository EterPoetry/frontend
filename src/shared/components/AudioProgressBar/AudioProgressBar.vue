<script setup lang="ts">
import { computed } from 'vue';
import './AudioProgressBar.css';

const props = withDefaults(defineProps<{
    modelValue: number;
    min?: number;
    max?: number;
    step?: number;
    ariaLabel: string;
    disabled?: boolean;
    density?: 'default' | 'compact';
}>(), {
    min: 0,
    max: 100,
    step: 0.1,
    disabled: false,
    density: 'default',
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: number): void;
}>();

const normalizedProgress = computed(() => {
    const safeRange = props.max - props.min;

    if (safeRange <= 0) {
        return 0;
    }

    const clampedValue = Math.min(props.max, Math.max(props.min, props.modelValue));

    return `${((clampedValue - props.min) / safeRange) * 100}%`;
});

const handleInput = (event: Event): void => {
    const target = event.target as HTMLInputElement | null;

    if (!target) {
        return;
    }

    emit('update:modelValue', Number(target.value));
};
</script>

<template>
  <div class="audio-progress-bar" :class="[`audio-progress-bar--${density}`, { 'audio-progress-bar--disabled': disabled }]">
    <div class="audio-progress-bar__track" aria-hidden="true">
      <span class="audio-progress-bar__value" :style="{ width: normalizedProgress }" />
    </div>

    <input
        class="audio-progress-bar__input"
        type="range"
        :min="min"
        :max="max"
        :step="step"
        :value="modelValue"
        :disabled="disabled"
        :aria-label="ariaLabel"
        @input="handleInput"
    />
  </div>
</template>
