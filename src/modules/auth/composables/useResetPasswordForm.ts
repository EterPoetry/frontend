import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { AxiosError } from 'axios';
import { useAuthStore } from '@/modules/auth/auth.store';
import { AuthEvents } from '@/modules/auth/enums/auth-events.enum';
import { uk } from '@/shared/locales/uk';
import { ResetPasswordEmits } from '@/modules/auth/interfaces/reset-password-emits.interface';
import { authValidator } from '../utils/auth-validation.utils';

export function useResetPasswordForm(emit: ResetPasswordEmits) {
    const authStore = useAuthStore();
    const route = useRoute();

    const { resetPassword, register } = uk.auth;
    const { common } = uk;

    const password = ref('');
    const passwordConfirm = ref('');
    const isLoading = ref(false);
    const errorMessage = ref('');

    const handleSubmit = async (): Promise<void> => {
        errorMessage.value = '';
        const token = route.query.token as string;

        if (!token) {
            errorMessage.value = resetPassword.errors.invalidToken;
            return;
        }

        const passwordError = authValidator.validatePassword(password.value);
        const confirmError = authValidator.validatePasswordConfirm(password.value, passwordConfirm.value);

        const firstError = passwordError || confirmError;
        if (firstError) {
            errorMessage.value = firstError;
            return;
        }

        isLoading.value = true;
        try {
            const success = await authStore.resetPassword(token, password.value);
            if (success) {
                emit(AuthEvents.RESET_PASSWORD);
            }
        } catch (error: unknown) {
            const axiosError = error as AxiosError<{ message?: string }>;

            if (!axiosError.response || axiosError.response.status >= 500) {
                errorMessage.value = common.errors.serverError;
                return;
            }

            if (axiosError.response.status === 400) {
                errorMessage.value = resetPassword.errors.sameAsOld;
            } else if (axiosError.response.status === 401) {
                errorMessage.value = resetPassword.errors.invalidToken;
            } else {
                errorMessage.value = common.errors.serverError;
            }
        } finally {
            isLoading.value = false;
        }
    };

    return {
        password,
        passwordConfirm,
        isLoading,
        errorMessage,
        resetPassword,
        register,
        common,
        handleSubmit
    };
}