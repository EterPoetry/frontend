import { AuthEvents } from "@/modules/auth/enums/auth-events.enum";

export type ResetPasswordEmits = {
    (event: AuthEvents.RESET_PASSWORD): void;
    (event: AuthEvents.LOGIN): void;
};