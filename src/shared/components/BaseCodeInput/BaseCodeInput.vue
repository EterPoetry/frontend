<script setup lang="ts">
import { BaseCodeInputProperties } from "@/shared/interfaces/base-code-input-properties.interface";
import { BaseCodeInputEvents } from "@/shared/enums/base-code-input-events.enum";
import { useBaseCodeInput } from "@/shared/composables/useBaseCodeInput";
import "./BaseCodeInput.css";

const props = defineProps<BaseCodeInputProperties>();

const emit = defineEmits<{
  (e: BaseCodeInputEvents.UPDATE_MODEL_VALUE, value: string): void;
  (e: BaseCodeInputEvents.COMPLETE, value: string): void;
}>();

const {
  cells,
  inputs,
  handleInput,
  handleKeyDown,
  handlePaste
} = useBaseCodeInput(props, emit);
</script>

<template>
  <div class="code-input-container" @paste.prevent="handlePaste">
    <input
        v-for="i in length"
        :key="i"
        :ref="(el) => (inputs[i - 1] = el as HTMLInputElement)"
        v-model="cells[i - 1]"
        type="text"
        inputmode="numeric"
        maxlength="1"
        class="code-cell"
        :class="{ 'filled': cells[i - 1] }"
        :disabled="disabled"
        @input="handleInput(i - 1, $event)"
        @keydown="handleKeyDown(i - 1, $event)"
    />
  </div>
</template>