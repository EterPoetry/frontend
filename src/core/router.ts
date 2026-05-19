import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/modules/auth/auth.store';
import { AuthRouteNames } from '@/modules/auth/enums/auth-route-names.enum';
import { PaymentsRouteNames } from '@/modules/payments/enums/payments-route-names.enum';
import { PostRouteNames } from '@/modules/posts/enums/post-route-names.enum';
import { ProfileRouteNames } from '@/modules/profile/enums/profile-route-names.enum';
import { SharedRouteNames } from '@/shared/enums/shared-route-names.enum';
import { uk } from '@/shared/locales/uk';
import { updateSeoMeta } from '@/core/seo';
import { SEO_ROUTES } from '@/shared/constants/seo.constants';
import { isRouteNavigating } from '@/core/navigation-loading';

const noIndexMeta = SEO_ROUTES.noIndex;

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        name: SharedRouteNames.LANDING,
        component: () => import('@/modules/auth/pages/LandingPage/LandingPage.vue'),
        meta: {
            isPublic: true,
            skipAuthRefresh: true,
            ...SEO_ROUTES.landing,
        }
    },
    {
        path: '/login',
        name: AuthRouteNames.LOGIN,
        component: () => import('@/modules/auth/pages/LoginPage/LoginPage.vue'),
        meta: { isPublic: true, guestOnly: true, skipAuthRefresh: true, title: uk.auth.login.title, ...noIndexMeta }
    },
    {
        path: '/register',
        name: AuthRouteNames.REGISTER,
        component: () => import('@/modules/auth/pages/RegisterPage/RegisterPage.vue'),
        meta: { isPublic: true, guestOnly: true, title: uk.auth.register.title, ...noIndexMeta }
    },
    {
        path: '/verification',
        name: AuthRouteNames.VERIFICATION,
        component: () => import('@/modules/auth/pages/VerificationPage/VerificationPage.vue'),
        meta: { requiresAuth: true, requiresVerification: false, title: uk.auth.verification.title, ...noIndexMeta }
    },
    {
        path: '/home',
        name: PostRouteNames.HOME,
        component: () => import('@/modules/posts/pages/PostsFeedPage/PostsFeedPage.vue'),
        meta: { isPublic: true, searchEnabled: true, feedKind: 'popular', ...SEO_ROUTES.home }
    },
    {
        path: '/subscriptions',
        name: PostRouteNames.SUBSCRIPTIONS,
        component: () => import('@/modules/posts/pages/PostsFeedPage/PostsFeedPage.vue'),
        meta: { requiresAuth: true, searchEnabled: true, feedKind: 'subscriptions', ...SEO_ROUTES.subscriptions }
    },
    {
        path: '/favorites',
        name: PostRouteNames.FAVORITES,
        component: () => import('@/modules/posts/pages/PostsFeedPage/PostsFeedPage.vue'),
        meta: { requiresAuth: true, searchEnabled: true, feedKind: 'favorites', ...SEO_ROUTES.favorites }
    },
    {
        path: '/payments/return',
        name: PaymentsRouteNames.RETURN,
        component: () => import('@/modules/payments/pages/PaymentsReturnPage/PaymentsReturnPage.vue'),
        meta: { isPublic: true, title: uk.payments.dialog.manageTitle, ...noIndexMeta }
    },
    {
        path: '/profile',
        name: ProfileRouteNames.PROFILE_ME,
        component: () => import('@/modules/profile/pages/ProfilePage/ProfilePage.vue'),
        meta: { requiresAuth: true, title: uk.profile.title, ...noIndexMeta }
    },
    {
        path: '/profile/:userId(\\d+)',
        name: ProfileRouteNames.PROFILE_PUBLIC,
        component: () => import('@/modules/profile/pages/ProfilePage/ProfilePage.vue'),
        meta: { isPublic: true, title: uk.profile.title }
    },
    {
        path: '/@:username',
        name: ProfileRouteNames.PROFILE_BY_USERNAME,
        component: () => import('@/modules/profile/pages/ProfilePage/ProfilePage.vue'),
        meta: { isPublic: true, title: uk.profile.title }
    },
    {
        path: '/:username([a-zA-Z0-9_]{3,32})',
        redirect: (to) => ({ name: ProfileRouteNames.PROFILE_BY_USERNAME, params: { username: to.params.username } }),
    },
    {
        path: '/posts/:slug',
        name: PostRouteNames.POST,
        component: () => import('@/modules/posts/pages/PostPage/PostPage.vue'),
        meta: { isPublic: true, ...SEO_ROUTES.post }
    },
    {
        path: '/edit/:postId(\\d+)',
        name: PostRouteNames.EDIT_POST,
        component: () => import('@/modules/posts/pages/EditPostPage/EditPostPage.vue'),
        meta: { requiresAuth: true, title: uk.posts.editor.title, ...noIndexMeta }
    },
    {
        path: '/posts/:postId(\\d+)/sync',
        name: PostRouteNames.SYNC_POST,
        component: () => import('@/modules/posts/pages/SyncPostPage/SyncPostPage.vue'),
        meta: { requiresAuth: true, title: uk.posts.sync.title, ...noIndexMeta }
    },
    {
        path: '/forgot-password',
        name: AuthRouteNames.FORGOT_PASSWORD,
        component: () => import('@/modules/auth/pages/ForgotPasswordPage/ForgotPasswordPage.vue'),
        meta: { isPublic: true, guestOnly: true, title: uk.auth.forgotPassword.title, ...noIndexMeta }
    },
    {
        path: '/reset-password',
        name: AuthRouteNames.RESET_PASSWORD,
        component: () => import('@/modules/auth/pages/ResetPasswordPage/ResetPasswordPage.vue'),
        meta: { isPublic: true, guestOnly: true, skipAuthRefresh: true, title: uk.auth.resetPassword.title, ...noIndexMeta }
    },
    {
        path: '/404',
        name: SharedRouteNames.NOT_FOUND,
        component: () => import('@/shared/pages/NotFoundPage/NotFoundPage.vue'),
        meta: { isPublic: true, ...SEO_ROUTES.notFound }
    },
    {
        path: '/:pathMatch(.*)*',
        redirect: { name: SharedRouteNames.NOT_FOUND },
    },
];

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
});

router.afterEach((to) => {
    isRouteNavigating.value = false;
    updateSeoMeta(to);
});

router.onError(() => {
    isRouteNavigating.value = false;
});

let isInitialAuthenticationChecked = false;

router.beforeEach(async (to, _from, next) => {
    isRouteNavigating.value = true;
    const authStore = useAuthStore();

    const googleAccessToken = to.query.accessToken as string;
    if (googleAccessToken) {
        localStorage.setItem('token', googleAccessToken);
        authStore.token = googleAccessToken;
        isInitialAuthenticationChecked = true;
        try {
            const user = await authStore.getProfile();
            authStore.isInitialized = true;
            if (user?.isEmailVerified) {
                return next({ name: PostRouteNames.HOME });
            } else {
                return next({ name: AuthRouteNames.VERIFICATION });
            }
        } catch (error) {
            authStore.isInitialized = true;
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
                authStore.isInitialized = true;
                return next();
            }
        }

        authStore.isInitialized = true;
    }

    const isAuthenticated = !!authStore.token;
    const isVerified = authStore.isVerified;

    if (to.name === SharedRouteNames.LANDING && isAuthenticated) {
        return next({ name: PostRouteNames.HOME });
    }

    if (to.meta.guestOnly && isAuthenticated) {
        if (isVerified) {
            return next({ name: PostRouteNames.HOME });
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
