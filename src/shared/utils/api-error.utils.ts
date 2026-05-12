import { isAxiosError } from 'axios';

import {ApiErrorItem} from "@/shared/interfaces/api-error.item.ts";
import {ApiErrorResponse} from "@/shared/interfaces/api-error.response.ts";

export const getApiErrorResponse = (error: unknown): ApiErrorResponse | null => {
    if (!isAxiosError<ApiErrorResponse>(error)) {
        return null;
    }

    return error.response?.data ?? null;
};

export const getApiFieldErrors = (error: unknown): Record<string, ApiErrorItem[]> => {
    const response = getApiErrorResponse(error);
    const errors = response?.errors;

    if (!errors?.length) {
        return {};
    }

    return errors.reduce<Record<string, ApiErrorItem[]>>((accumulator, item) => {
        if (!item.field) {
            return accumulator;
        }

        const fieldErrors = accumulator[item.field] ?? [];
        fieldErrors.push(item);
        accumulator[item.field] = fieldErrors;

        return accumulator;
    }, {});
};

export const getApiErrorMessage = (error: unknown): string | null => {
    return getApiErrorResponse(error)?.message ?? null;
};
