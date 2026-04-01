import {BaseTimerEvents} from "@/shared/enums/base-timer-events.enum.ts";

export interface BaseTimerEmits {
    (e: BaseTimerEvents.FINISHED): void;
}