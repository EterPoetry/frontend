<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import type { BaseFieldProperties } from '@/shared/interfaces/base-field-properties.interface';
import './BaseField.css';

const props = withDefaults(defineProps<BaseFieldProperties & {
    multiline?: boolean;
    rows?: number;
    autoResize?: boolean;
    autoResizeMaxHeight?: number;
}>(), {
    placeholder: '',
    maxLength: undefined,
    errorMessage: '',
    hint: '',
    disabled: false,
    multiline: false,
    rows: 6,
    autoResize: false,
    autoResizeMaxHeight: 180,
});

const controlElement = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);

const focus = (): void => {
    controlElement.value?.focus();
};

const setSelectionRange = (start: number, end: number): void => {
    if (controlElement.value instanceof HTMLTextAreaElement || controlElement.value instanceof HTMLInputElement) {
        controlElement.value.setSelectionRange(start, end);
    }
};

const resizeTextarea = (textarea?: HTMLTextAreaElement | null): void => {
    if (!props.autoResize || !(textarea instanceof HTMLTextAreaElement)) {
        return;
    }

    textarea.style.height = 'auto';

    const nextHeight = Math.min(textarea.scrollHeight, props.autoResizeMaxHeight);

    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > props.autoResizeMaxHeight ? 'auto' : 'hidden';
};

const handleTextareaInput = (event: Event): void => {
    const target = event.target as HTMLTextAreaElement;

    resizeTextarea(target);
    emit('update:modelValue', target.value);
};

const getControlElement = (): HTMLInputElement | HTMLTextAreaElement | null => controlElement.value;

const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>();

watch(() => props.modelValue, async () => {
    if (!props.multiline || !props.autoResize) {
        return;
    }

    await nextTick();
    resizeTextarea(controlElement.value as HTMLTextAreaElement | null);
});

onMounted(() => {
    if (!props.multiline || !props.autoResize) {
        return;
    }

    resizeTextarea(controlElement.value as HTMLTextAreaElement | null);
});

defineExpose({
    focus,
    setSelectionRange,
    getControlElement,
});
</script>

<template>
  <div class="base-field">
    <label v-if="label || hint" :for="id" class="base-field__label">
      <span v-if="label">{{ label }}</span>
      <span v-if="hint" class="base-field__hint">{{ hint }}</span>
    </label>

    <textarea
        v-if="multiline"
        ref="controlElement"
        :id="id"
        :value="modelValue"
        :placeholder="placeholder"
        :maxlength="maxLength"
        :rows="rows"
        :disabled="disabled"
        :class="['base-field__control', 'base-field__control--textarea', { 'base-field__control--invalid': errorMessage }]"
        @input="handleTextareaInput"
    />

    <input
        v-else
        ref="controlElement"
        :id="id"
        :value="modelValue"
        :placeholder="placeholder"
        :maxlength="maxLength"
        :disabled="disabled"
        :class="['base-field__control', { 'base-field__control--invalid': errorMessage }]"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />

    <span v-if="errorMessage" class="base-field__error">{{ errorMessage }}</span>
  </div>
</template>
