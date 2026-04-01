import { ref, onMounted, watch, nextTick } from 'vue';
import { BaseCodeInputEvents } from "@/shared/enums/base-code-input-events.enum";
import { BaseCodeInputProperties } from "@/shared/interfaces/base-code-input-properties.interface";
import { BaseCodeInputEmits } from "@/shared/interfaces/base-code-input-emits.interface";
import { REGEX } from "@/shared/constants/regex.constants";

export function useBaseCodeInput(properties: BaseCodeInputProperties, emit: BaseCodeInputEmits) {
    const cells = ref<string[]>(Array(properties.length).fill(''));
    const inputs = ref<(HTMLInputElement | null)[]>([]);

    const emitUpdate = (): void => {
        const code = cells.value.join('');
        emit(BaseCodeInputEvents.UPDATE_MODEL_VALUE, code);

        if (code.length === properties.length && !cells.value.includes('')) {
            emit(BaseCodeInputEvents.COMPLETE, code);
        }
    };

    const handleInput = (index: number, event: Event): void => {
        const input = event.target as HTMLInputElement;
        const value = input.value.slice(-1);

        if (value && !REGEX.SINGLE_DIGIT.test(value)) {
            cells.value[index] = '';
            input.value = '';
            return;
        }

        cells.value[index] = value;
        emitUpdate();

        if (value && index < properties.length - 1) {
            void nextTick(() => inputs.value[index + 1]?.focus());
        }
    };

    const handleKeyDown = (index: number, event: KeyboardEvent): void => {
        if (event.key === 'Backspace') {
            if (!cells.value[index] && index > 0) {
                cells.value[index - 1] = '';
                inputs.value[index - 1]?.focus();
                emitUpdate();
            }
        }
    };

    const handlePaste = (event: ClipboardEvent): void => {
        const data = event.clipboardData?.getData('text').trim() || '';
        const digits = data.replace(REGEX.NON_DIGITS, '').slice(0, properties.length);

        if (!digits) return;

        digits.split('').forEach((char, i) => {
            cells.value[i] = char;
        });

        emitUpdate();

        const nextIndex = digits.length < properties.length ? digits.length : properties.length - 1;
        void nextTick(() => inputs.value[nextIndex]?.focus());
    };

    watch(() => properties.modelValue, (newValue) => {
        const newCode = newValue || '';
        if (newCode !== cells.value.join('')) {
            cells.value = Array.from({ length: properties.length }, (_, i) => newCode[i] || '');
        }
    }, { immediate: true });

    onMounted(() => {
        void nextTick(() => {
            inputs.value[0]?.focus();
        });
    });

    return {
        cells,
        inputs,
        handleInput,
        handleKeyDown,
        handlePaste
    };
}