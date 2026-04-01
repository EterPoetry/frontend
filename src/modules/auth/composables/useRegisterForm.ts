import { ref } from "vue";
import { AxiosError } from "axios";
import { useAuthStore } from "@/modules/auth/auth.store";
import { AuthEvents } from "@/modules/auth/enums/auth-events.enum";
import { uk } from "@/shared/locales/uk";
import { RegisterEmits } from "@/modules/auth/interfaces/register-emits.interface";
import { authValidator } from "../utils/auth-validation.utils";

export function useRegisterForm(emit: RegisterEmits) {
    const authStore = useAuthStore();
    const { register } = uk.auth;
    const { common } = uk;

    const name = ref("");
    const email = ref("");
    const password = ref("");
    const passwordConfirm = ref("");
    const isLoading = ref(false);
    const errorMessage = ref("");

    const loginWithGoogle = (): void => {
        authStore.loginWithGoogle();
    };

    const handleSubmit = async (): Promise<void> => {
        errorMessage.value = "";

        const emailError = authValidator.validateEmail(email.value);
        const passwordError = authValidator.validatePassword(password.value);
        const confirmError = authValidator.validatePasswordConfirm(password.value, passwordConfirm.value);

        if (!name.value) {
            errorMessage.value = common.errors.emptyFields;
            return;
        }

        const firstError = emailError || passwordError || confirmError;
        if (firstError) {
            errorMessage.value = firstError;
            return;
        }

        isLoading.value = true;
        try {
            const success = await authStore.register({
                name: name.value,
                email: email.value,
                password: password.value
            });

            if (success) {
                emit(AuthEvents.REGISTER, {
                    name: name.value,
                    email: email.value,
                    password: password.value,
                    passwordConfirm: passwordConfirm.value
                });
            }
        } catch (error: unknown) {
            const axiosError = error as AxiosError<{ message?: string }>;
            if (!axiosError.response || axiosError.response.status >= 500) {
                errorMessage.value = common.errors.serverError;
            } else if (axiosError.response.status === 409) {
                errorMessage.value = register.errors.emailAlreadyRegistered;
            }
        } finally {
            isLoading.value = false;
        }
    };

    return {
        name,
        email,
        password,
        passwordConfirm,
        isLoading,
        errorMessage,
        register,
        common,
        loginWithGoogle,
        handleSubmit
    };
}