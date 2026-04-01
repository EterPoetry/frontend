import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/modules/auth/auth.store';
import { AuthRouteNames } from "@/modules/auth/enums/auth-route-names.enum";
import { uk } from "@/shared/locales/uk";

const routes: Array<RouteRecordRaw> = [
    {
        path: '/login',
        name: AuthRouteNames.LOGIN,
        component: () => import('@/modules/auth/pages/LoginPage/LoginPage.vue'),
        meta: { isPublic: true, guestOnly: true, skipAuthRefresh: true, title: uk.auth.login.title }
    },
    {
        path: '/register',
        name: AuthRouteNames.REGISTER,
        component: () => import('@/modules/auth/pages/RegisterPage/RegisterPage.vue'),
        meta: { isPublic: true, guestOnly: true, title: uk.auth.register.title }
    },
    {
        path: '/verification',
        name: AuthRouteNames.VERIFICATION,
        component: () => import('@/modules/auth/pages/VerificationPage/VerificationPage.vue'),
        meta: { requiresAuth: true, requiresVerification: false, title: uk.auth.verification.title }
    },
    {
        path: '/',
        name: AuthRouteNames.HOME,
        component: () => import('@/modules/auth/pages/HomePage/HomePage.vue'),
        meta: { requiresAuth: true, requiresVerification: true, title: uk.home.title }
    },
    {
        path: '/forgot-password',
        name: AuthRouteNames.FORGOT_PASSWORD,
        component: () => import('@/modules/auth/pages/ForgotPasswordPage/ForgotPasswordPage.vue'),
        meta: { isPublic: true, guestOnly: true, title: uk.auth.forgotPassword.title }
    },
    {
        path: '/reset-password',
        name: AuthRouteNames.RESET_PASSWORD,
        component: () => import('@/modules/auth/pages/ResetPasswordPage/ResetPasswordPage.vue'),
        meta: { isPublic: true, guestOnly: true, skipAuthRefresh: true, title: uk.auth.resetPassword.title }
    }
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
});

router.afterEach((to) => {
    const pageTitle = to.meta.title as string;
    document.title = pageTitle ? `${uk.common.appName} — ${pageTitle}` : uk.common.appName;
});

let isInitialAuthenticationChecked = false;

router.beforeEach(async (to, _from, next) => {
    const authStore = useAuthStore();

    const googleAccessToken = to.query.accessToken as string;
    if (googleAccessToken) {
        localStorage.setItem('token', googleAccessToken);
        authStore.token = googleAccessToken;
        isInitialAuthenticationChecked = true;
        try {
            const user = await authStore.getProfile();
            if (user?.isEmailVerified) {
                return next({ name: AuthRouteNames.HOME });
            } else {
                return next({ name: AuthRouteNames.VERIFICATION });
            }
        } catch (error) {
            return next({ name: AuthRouteNames.LOGIN, replace: true });
        }
    }

    if (!isInitialAuthenticationChecked) {
        isInitialAuthenticationChecked = true;

        if (to.meta.guestOnly || to.meta.isPublic) {
            try {
                await authStore.refresh();
                await authStore.getProfile();
            } catch (error) {
                authStore.token = null;
                authStore.user = null;
                localStorage.removeItem('token');
            }
        } else if (authStore.token) {
            try {
                await authStore.getProfile();
            } catch (error) {
                return next();
            }
        }
    }

    const isAuthenticated = !!authStore.token;
    const isVerified = authStore.isVerified;

    if (to.meta.guestOnly && isAuthenticated) {
        if (isVerified) {
            return next({ name: AuthRouteNames.HOME });
        } else {
            return next({ name: AuthRouteNames.VERIFICATION });
        }
    }

    if (to.meta.requiresAuth && !isAuthenticated) {
        return next({ name: AuthRouteNames.LOGIN });
    }

    if (to.meta.requiresVerification && isAuthenticated && !isVerified) {
        return next({ name: AuthRouteNames.VERIFICATION });
    }

    return next();
});

export default router;