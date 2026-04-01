import { ref, computed, onMounted, onUnmounted } from 'vue';
import { TIME_CONVERSION } from "@/shared/constants/time.constants";

export function useBaseTimer(ms: number, onFinished: () => void) {
    const timeLeft = ref(ms);
    let timerInterval: number | null = null;

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

    const startTimer = () => {
        stopTimer();
        timerInterval = window.setInterval(() => {
            timeLeft.value -= TIME_CONVERSION.MS_PER_SECOND;
            if (timeLeft.value <= 0) {
                stopTimer();
                onFinished();
            }
        }, TIME_CONVERSION.MS_PER_SECOND);
    };

    const resetTimer = (newMs: number) => {
        timeLeft.value = newMs;
        startTimer();
    };

    onMounted(startTimer);
    onUnmounted(stopTimer);

    return {
        timeLeft,
        formattedTime,
        resetTimer
    };
}