import {AuthEvents} from "@/modules/auth/enums/auth-events.enum.ts";
import {AuthData} from "@/modules/auth/interfaces/auth-data.interface.ts";

export interface LoginEmits {
    (event: typeof AuthEvents.LOGIN, data: Pick<AuthData, 'email' | 'password'>): void;
}