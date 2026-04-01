import { ref } from "vue";
import { AxiosError } from "axios";
import { useAuthStore } from "@/modules/auth/auth.store";
import { AUTH_VALIDATION } from "@/modules/auth/constants/auth-validation.constants";
import { AuthEvents } from "@/modules/auth/enums/auth-events.enum";
import { uk } from "@/shared/locales/uk";
import { LoginEmits } from "@/modules/auth/interfaces/login-emits.interface";

export function useLoginForm(emit: LoginEmits) {
    const authStore = useAuthStore();
    const { login } = uk.auth;
    const { common } = uk;

    const email = ref("");
    const password = ref("");
    const isLoading = ref(false);
    const errorMessage = ref("");

    const validateEmail = (value: string): boolean => {
        return AUTH_VALIDATION.EMAIL_REGEX.test(value);
    };

    const loginWithGoogle = (): void => {
        authStore.loginWithGoogle();
    };

    const handleSubmit = async (): Promise<void> => {
        errorMessage.value = "";

        if (!email.value || !password.value) {
            errorMessage.value = common.errors.emptyFields;
            return;
        }

        if (!validateEmail(email.value)) {
            errorMessage.value = common.errors.invalidEmail;
            return;
        }

        if (password.value.length < AUTH_VALIDATION.MIN_PASSWORD_LENGTH) {
            errorMessage.value = common.errors.passwordTooShort(AUTH_VALIDATION.MIN_PASSWORD_LENGTH);
            return;
        }

        isLoading.value = true;
        try {
            const success = await authStore.login({
                email: email.value,
                password: password.value
            });

            if (success) {
                emit(AuthEvents.LOGIN, {
                    email: email.value,
                    password: password.value
                });
            }
        } catch (error: unknown) {
            const axiosError = error as AxiosError<{ message?: string }>;
            if (!axiosError.response || axiosError.response.status >= 500) {
                errorMessage.value = common.errors.serverError;
            } else if (axiosError.response.status === 401) {
                errorMessage.value = login.errors.loginError;
            }
        } finally {
            isLoading.value = false;
        }
    };

    return {
        email,
        password,
        isLoading,
        errorMessage,
        login,
        common,
        loginWithGoogle,
        handleSubmit
    };
}