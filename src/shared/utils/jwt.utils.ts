import { JWT_CONFIG } from "@/shared/constants/jwt.constants";
import { TIME_CONVERSION } from "@/shared/constants/time.constants";

export const parseJwt = (token: string): number | null => {
    try {
        const base64Url = token.split(JWT_CONFIG.PART_SEPARATOR)[JWT_CONFIG.PAYLOAD_INDEX];
        if (!base64Url) return null;

        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            window.atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );

        if (!JSON.parse(jsonPayload)) return null;

        return JSON.parse(jsonPayload).exp;
    } catch {
        return null;
    }
};

export const isTokenExpired = (token: string | null): boolean => {
    if (!token) return true;
    const exp = parseJwt(token);
    if (!exp) {
        return true;
    }

    return Date.now() >= exp * TIME_CONVERSION.MS_PER_SECOND;
};