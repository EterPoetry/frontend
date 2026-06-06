import { isAxiosError } from 'axios';

import {ApiErrorItem} from "@/shared/interfaces/api-error.item.ts";
import {ApiErrorResponse} from "@/shared/interfaces/api-error.response.ts";
import { uk } from '@/shared/locales/uk';

const API_ERROR_TRANSLATIONS: Array<{ pattern: RegExp; message: string }> = [
    { pattern: /\b(email|e-mail)\b.*\b(domain|host|dns|mx)\b/i, message: uk.common.errors.invalidEmailDomain },
    { pattern: /\b(domain|host|dns|mx)\b.*\b(email|e-mail)\b/i, message: uk.common.errors.invalidEmailDomain },
    { pattern: /\b(email|e-mail)\b.*\b(format|invalid|valid)\b/i, message: uk.common.errors.invalidEmail },
    { pattern: /\b(format|invalid|valid)\b.*\b(email|e-mail)\b/i, message: uk.common.errors.invalidEmail },
];

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

export const getLocalizedApiErrorMessage = (error: unknown): string | null => {
    const response = getApiErrorResponse(error);
    const messages = [
        response?.message,
        ...(response?.errors ?? []).flatMap((item) => [item.message, item.code]),
        response?.errorCode,
    ].filter((message): message is string => Boolean(message));

    for (const message of messages) {
        const translation = API_ERROR_TRANSLATIONS.find((item) => item.pattern.test(message));

        if (translation) {
            return translation.message;
        }
    }

    return response?.message ?? null;
};
