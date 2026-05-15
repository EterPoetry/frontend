import {ApiErrorItem} from "@/shared/interfaces/api-error.item.ts";

export interface ApiErrorResponse {
    statusCode?: number;
    message?: string;
    errorCode?: string;
    errors?: ApiErrorItem[];
}
