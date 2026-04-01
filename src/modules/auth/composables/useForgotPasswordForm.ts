import { ref } from 'vue';
import { useAuthStore } from '@/modules/auth/auth.store';
import { AUTH_VALIDATION } from '@/modules/auth/constants/auth-validation.constants';
import { AuthEvents } from '@/modules/auth/enums/auth-events.enum';
import { uk } from '@/shared/locales/uk';

export function useForgotPasswordForm(emit: (event: AuthEvents.FORGOT_PASSWORD) => void) {
    const authStore = useAuthStore();
    const { forgotPassword } = uk.auth;
    const { common } = uk;

    const email = ref('');
    const isLoading = ref(false);
    const isSent = ref(false);
    const errorMessage = ref('');

    const validateEmail = (value: string): boolean => {
        return AUTH_VALIDATION.EMAIL_REGEX.test(value);
    };

    const handleSubmit = async (): Promise<void> => {
        errorMessage.value = '';

        if (!email.value) {
            errorMessage.value = common.errors.emptyFields;
            return;
        }

        if (!validateEmail(email.value)) {
            errorMessage.value = common.errors.invalidEmail;
            return;
        }

        isLoading.value = true;
        try {
            await authStore.forgotPassword(email.value);
            isSent.value = true;
            emit(AuthEvents.FORGOT_PASSWORD);
        } catch (error) {
            errorMessage.value = common.errors.serverError;
        } finally {
            isLoading.value = false;
        }
    };

    return {
        email,
        isLoading,
        isSent,
        errorMessage,
        forgotPassword,
        common,
        handleSubmit
    };
}