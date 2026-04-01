import { ref, computed } from 'vue';

export function useBaseInput(props: { type: string }) {
    const isPasswordVisible = ref(false);

    const togglePasswordVisibility = () => {
        isPasswordVisible.value = !isPasswordVisible.value;
    };

    const inputType = computed(() => {
        if (props.type === 'password' && isPasswordVisible.value) {
            return 'text';
        }
        return props.type;
    });

    return {
        isPasswordVisible,
        togglePasswordVisibility,
        inputType
    };
}