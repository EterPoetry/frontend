<script setup lang="ts">
import type { BaseInputProperties } from '@/shared/interfaces/base-input-properties.interface';
import { useBaseInput } from '@/shared/composables/useBaseInput';
import './BaseInput.css';

const props = defineProps<BaseInputProperties>();
defineEmits<{ (e: 'update:modelValue', value: string): void }>();

const { isPasswordVisible, togglePasswordVisibility, inputType } = useBaseInput(props);
</script>

<template>
  <div class="input-group">
    <label :for="id" class="input-label">{{ label }}</label>
    <div class="input-wrapper">
      <input
          :id="id"
          :type="inputType"
          :placeholder="placeholder"
          :value="modelValue"
          :maxlength="maxLength"
          :class="['input-field', { 'is-invalid': errorMessage }]"
          :aria-invalid="Boolean(errorMessage)"
          autocomplete="off"
          @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />

      <button
          v-if="type === 'password'"
          type="button"
          class="password-toggle"
          @click="togglePasswordVisibility"
      >
        <svg v-if="!isPasswordVisible" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.878 9.878" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.644C3.226 7.662 7.244 4.5 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 010 .644C20.774 16.338 16.756 19.5 12 19.5c-4.756 0-8.773-3.162-10.065-7.498z" />
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
    <span v-if="errorMessage" class="input-error">{{ errorMessage }}</span>
  </div>
</template>
