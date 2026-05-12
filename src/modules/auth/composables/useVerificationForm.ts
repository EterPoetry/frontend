import { ref, onMounted, computed } from "vue";
import { AxiosError } from "axios";
import { useAuthStore } from "@/modules/auth/auth.store";
import { AUTH_VERIFICATION } from "@/modules/auth/constants/auth-verification.constants";
import { AuthEvents } from "@/modules/auth/enums/auth-events.enum";
import { uk } from "@/shared/locales/uk";
import { VerificationEmits } from "@/modules/auth/interfaces/verification-emits-interface";

export function useVerificationForm(emit: VerificationEmits) {
    const authStore = useAuthStore();
    const { verification } = uk.auth;
    const { common } = uk;

    const isLoading = ref(false);
    const isReady = ref(false);
    const verificationCode = ref("");
    const errorMessage = ref("");
    const remainingMs = ref<number | null>(null);

    const userEmail = computed(() => authStore.user?.email || "");
    const applyRemainingMs = (ms: number | null): void => {
        remainingMs.value = ms !== null && ms > 0 ? ms : null;
    };

    const syncRemainingMs = async (): Promise<number | null> => {
        const data = await authStore.getVerificationStatus();
        applyRemainingMs(data.remainingMs);
        return data.remainingMs;
    };

    const currentDescription = computed(() => {
        const emailTag = `<strong>${userEmail.value}</strong>`;
        return remainingMs.value !== null
            ? verification.info.sent(emailTag)
            : verification.info.main(emailTag);
    });

    const handleCodeUpdate = (code: string): void => {
        verificationCode.value = code;
    };

    const handleSendRequest = async (): Promise<void> => {
        if (isLoading.value) return;

        isLoading.value = true;
        errorMessage.value = "";
        try {
            const success = await authStore.requestVerificationEmail();
            if (success) {
                try {
                    const syncedRemainingMs = await syncRemainingMs();
                    if (syncedRemainingMs === null) {
                        applyRemainingMs(AUTH_VERIFICATION.VERIFICATION_TIMEOUT_MS);
                    }
                } catch {
                    applyRemainingMs(AUTH_VERIFICATION.VERIFICATION_TIMEOUT_MS);
                }
                emit(AuthEvents.RESEND_CODE);
            }
        } catch (error: unknown) {
            const axiosError = error as AxiosError<{ message?: string }>;
            if (!axiosError.response || axiosError.response.status >= 500) {
                errorMessage.value = common.errors.serverError;
            } else if (axiosError.response.status === 429) {
                try {
                    await syncRemainingMs();
                } catch {
                    applyRemainingMs(AUTH_VERIFICATION.VERIFICATION_TIMEOUT_MS);
                }
            }
        } finally {
            isLoading.value = false;
        }
    };

    const checkStatus = async (): Promise<void> => {
        try {
            const currentRemainingMs = await syncRemainingMs();
            if (currentRemainingMs === null) {
                await handleSendRequest();
            }
        } catch (error: unknown) {
            console.error(error);
        }
    };

    const handleVerifyCode = async (code?: string): Promise<void> => {
        const targetCode = typeof code === "string" ? code : verificationCode.value;
        if (targetCode.length !== AUTH_VERIFICATION.CODE_LENGTH || isLoading.value) return;

        isLoading.value = true;
        errorMessage.value = "";
        try {
            const success = await authStore.verifyEmail(targetCode);
            if (success) {
                emit(AuthEvents.VERIFY, targetCode);
            }
        } catch (error: unknown) {
            const axiosError = error as AxiosError<{ message?: string }>;
            if (!axiosError.response || axiosError.response.status >= 500) {
                errorMessage.value = common.errors.serverError;
            } else if (axiosError.response.status === 401) {
                errorMessage.value = verification.errors.invalidCode;
                verificationCode.value = "";
            }
        } finally {
            isLoading.value = false;
        }
    };

    const onTimerFinished = (): void => {
        remainingMs.value = null;
    };

    const handleLogout = async (): Promise<void> => {
        try {
            await authStore.logout();
        } catch (error: unknown) {
            console.error(error);
        }
    };

    onMounted(async () => {
        isLoading.value = true;
        try {
            if (!authStore.user && authStore.token) {
                await authStore.getProfile();
            }
            await checkStatus();
        } finally {
            isLoading.value = false;
            isReady.value = true;
        }
    });

    return {
        verification,
        common,
        isLoading,
        isReady,
        remainingMs,
        verificationCode,
        errorMessage,
        currentDescription,
        codeLength: AUTH_VERIFICATION.CODE_LENGTH,
        handleCodeUpdate,
        handleSendRequest,
        handleVerifyCode,
        onTimerFinished,
        handleLogout
    };
}
