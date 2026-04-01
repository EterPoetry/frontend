import { BaseCodeInputEvents } from "@/shared/enums/base-code-input-events.enum.ts";

export interface BaseCodeInputEmits {
    (e: BaseCodeInputEvents.UPDATE_MODEL_VALUE, value: string): void;
    (e: BaseCodeInputEvents.COMPLETE, value: string): void;
}