<script setup lang="ts">
import './BaseCheckbox.css';

withDefaults(defineProps<{
    modelValue: boolean;
    label: string;
    disabled?: boolean;
}>(), {
    disabled: false,
});

defineEmits<{ (e: 'update:modelValue', value: boolean): void }>();
</script>

<template>
  <label class="base-checkbox">
    <input
        :checked="modelValue"
        :disabled="disabled"
        type="checkbox"
        class="base-checkbox__input"
        @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span class="base-checkbox__mark" aria-hidden="true" />
    <span class="base-checkbox__label">{{ label }}</span>
  </label>
</template>
