import { ref, watch } from "vue";
import { AxiosError } from "axios";
import { useAuthStore } from "@/modules/auth/auth.store";
import { AuthEvents } from "@/modules/auth/enums/auth-events.enum";
import { uk } from "@/shared/locales/uk";
import { RegisterEmits } from "@/modules/auth/interfaces/register-emits.interface";
import { authValidator } from "../utils/auth-validation.utils";
import { getApiFieldErrors } from "@/shared/utils/api-error.utils";

type RegisterField = 'email' | 'username';

type RegisterFieldErrors = Record<RegisterField, string>;

export function useRegisterForm(emit: RegisterEmits) {
    const authStore = useAuthStore();
    const { register } = uk.auth;
    const { common } = uk;

    const name = ref("");
    const username = ref("");
    const email = ref("");
    const password = ref("");
    const passwordConfirm = ref("");
    const isLoading = ref(false);
    const errorMessage = ref("");
    const fieldErrors = ref<RegisterFieldErrors>({
        email: "",
        username: ""
    });

    const clearFieldError = (field: RegisterField): void => {
        fieldErrors.value[field] = "";
    };

    const resetFieldErrors = (): void => {
        clearFieldError('email');
        clearFieldError('username');
    };

    watch(email, () => clearFieldError('email'));
    watch(username, () => clearFieldError('username'));

    const loginWithGoogle = (): void => {
        authStore.loginWithGoogle();
    };

    const handleSubmit = async (): Promise<void> => {
        errorMessage.value = "";
        resetFieldErrors();

        const emailError = authValidator.validateEmail(email.value);
        const passwordError = authValidator.validatePassword(password.value);
        const confirmError = authValidator.validatePasswordConfirm(password.value, passwordConfirm.value);

        if (!name.value || !username.value) {
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
                username: username.value,
                email: email.value,
                password: password.value
            });

            if (success) {
                emit(AuthEvents.REGISTER, {
                    name: name.value,
                    username: username.value,
                    email: email.value,
                    password: password.value,
                    passwordConfirm: passwordConfirm.value
                });
            }
        } catch (error: unknown) {
            const axiosError = error as AxiosError;
            if (!axiosError.response || axiosError.response.status >= 500) {
                errorMessage.value = common.errors.serverError;
            } else if (axiosError.response.status === 409) {
                const apiFieldErrors = getApiFieldErrors(error);
                const fieldErrorMessagesByCode: Record<string, string> = {
                    EMAIL_NOT_UNIQUE: register.errors.emailAlreadyRegistered,
                    USERNAME_NOT_UNIQUE: register.errors.usernameAlreadyTaken
                };

                const registrationFields: RegisterField[] = ['email', 'username'];
                let hasKnownFieldErrors = false;

                registrationFields.forEach((field) => {
                    const fieldError = apiFieldErrors[field]?.[0];

                    if (!fieldError) {
                        return;
                    }

                    fieldErrors.value[field] = fieldErrorMessagesByCode[fieldError.code] || fieldError.message;
                    hasKnownFieldErrors = true;
                });

                if (!hasKnownFieldErrors) {
                    errorMessage.value = register.errors.credentialsAlreadyRegistered;
                }
            }
        } finally {
            isLoading.value = false;
        }
    };

    return {
        name,
        username,
        email,
        password,
        passwordConfirm,
        isLoading,
        errorMessage,
        fieldErrors,
        register,
        common,
        loginWithGoogle,
        handleSubmit
    };
}
