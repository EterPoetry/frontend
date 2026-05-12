import {ApiErrorItem} from "@/shared/interfaces/api-error.item.ts";

export interface ApiErrorResponse {
    message?: string;
    errors?: ApiErrorItem[];
}