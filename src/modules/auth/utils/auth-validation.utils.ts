import { AUTH_VALIDATION } from '@/modules/auth/constants/auth-validation.constants';
import { uk } from '@/shared/locales/uk';

const { common, auth } = uk;

export const authValidator = {
    validateEmail(email: string): string | null {
        if (!email) return common.errors.emptyFields;
        if (!AUTH_VALIDATION.EMAIL_REGEX.test(email)) return common.errors.invalidEmail;
        return null;
    },

    validateUsername(username: string): string | null {
        if (!username) return common.errors.emptyFields;
        if (username.length < AUTH_VALIDATION.MIN_USERNAME_LENGTH) {
            return common.errors.usernameTooShort(AUTH_VALIDATION.MIN_USERNAME_LENGTH);
        }
        return null;
    },

    validatePassword(password: string): string | null {
        if (!password) return common.errors.emptyFields;
        if (password.length < AUTH_VALIDATION.MIN_PASSWORD_LENGTH) {
            return common.errors.passwordTooShort(AUTH_VALIDATION.MIN_PASSWORD_LENGTH);
        }
        return null;
    },

    validatePasswordConfirm(password: string, confirm: string): string | null {
        if (!confirm) return common.errors.emptyFields;
        if (password !== confirm) return auth.register.errors.passwordsDoNotMatch;
        return null;
    }
};
