import { ref, computed, onMounted, onUnmounted } from 'vue';
import { TIME_CONVERSION } from "@/shared/constants/time.constants";

export function useBaseTimer(ms: number, onFinished: () => void) {
    const timeLeft = ref(Math.max(0, ms));
    let timerInterval: number | null = null;
    let deadline: number | null = null;

    const formattedTime = computed(() => {
        const totalSeconds = Math.max(0, Math.floor(timeLeft.value / TIME_CONVERSION.MS_PER_SECOND));
        const minutes = Math.floor(totalSeconds / TIME_CONVERSION.SECONDS_PER_MINUTE);
        const seconds = totalSeconds % TIME_CONVERSION.SECONDS_PER_MINUTE;

        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    });

    const stopTimer = () => {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    };

    const syncTimeLeft = () => {
        if (deadline === null) {
            timeLeft.value = 0;
            return;
        }

        const remaining = Math.max(0, deadline - Date.now());
        timeLeft.value = remaining;

        if (remaining <= 0) {
            deadline = null;
            stopTimer();
            onFinished();
        }
    };

    const startTimer = (newMs: number) => {
        stopTimer();
        deadline = Date.now() + Math.max(0, newMs);
        syncTimeLeft();

        if (timeLeft.value <= 0) {
            return;
        }

        timerInterval = window.setInterval(syncTimeLeft, TIME_CONVERSION.MS_PER_SECOND);
    };

    const resetTimer = (newMs: number) => {
        timeLeft.value = Math.max(0, newMs);
        startTimer(newMs);
    };

    onMounted(() => startTimer(ms));
    onUnmounted(stopTimer);

    return {
        timeLeft,
        formattedTime,
        resetTimer
    };
}
