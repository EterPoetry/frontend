<script setup lang="ts">
import type { BaseFieldProperties } from '@/shared/interfaces/base-field-properties.interface';
import './BaseField.css';

withDefaults(defineProps<BaseFieldProperties & {
    multiline?: boolean;
    rows?: number;
}>(), {
    placeholder: '',
    maxLength: undefined,
    errorMessage: '',
    hint: '',
    disabled: false,
    multiline: false,
    rows: 6,
});

defineEmits<{ (e: 'update:modelValue', value: string): void }>();
</script>

<template>
  <div class="base-field">
    <label :for="id" class="base-field__label">
      <span>{{ label }}</span>
      <span v-if="hint" class="base-field__hint">{{ hint }}</span>
    </label>

    <textarea
        v-if="multiline"
        :id="id"
        :value="modelValue"
        :placeholder="placeholder"
        :maxlength="maxLength"
        :rows="rows"
        :disabled="disabled"
        :class="['base-field__control', 'base-field__control--textarea', { 'base-field__control--invalid': errorMessage }]"
        @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />

    <input
        v-else
        :id="id"
        :value="modelValue"
        :placeholder="placeholder"
        :maxlength="maxLength"
        :disabled="disabled"
        :class="['base-field__control', { 'base-field__control--invalid': errorMessage }]"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />

    <span v-if="errorMessage" class="base-field__error">{{ errorMessage }}</span>
  </div>
</template>
