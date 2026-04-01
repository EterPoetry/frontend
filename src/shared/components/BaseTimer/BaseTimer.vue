<script setup lang="ts">
import { watch } from 'vue';
import { useBaseTimer } from '@/shared/composables/useBaseTimer';
import { BaseTimerEvents } from '@/shared/enums/base-timer-events.enum';
import './BaseTimer.css';
import {BaseTimerProperties} from "@/shared/interfaces/base-timer-properties.interface.ts";
import {BaseTimerEmits} from "@/shared/interfaces/base-timer-emits.interface.ts";

const props = defineProps<BaseTimerProperties>();
const emit = defineEmits<BaseTimerEmits>();

const { formattedTime, resetTimer } = useBaseTimer(
    props.ms,
    () => emit(BaseTimerEvents.FINISHED)
);

watch(() => props.ms, (newVal) => {
  resetTimer(newVal);
});
</script>

<template>
  <span class="base-timer">
    {{ formattedTime }}
  </span>
</template>