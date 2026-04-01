import {AuthEvents} from "@/modules/auth/enums/auth-events.enum.ts";

export interface VerificationEmits {
    (e: typeof AuthEvents.VERIFY, code: string): void;
    (e: typeof AuthEvents.RESEND_CODE): void;
}