import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useAdminStore } from '@/modules/admin/admin.store';
import { AdminRouteNames } from '@/modules/admin/enums/admin-route-names.enum';
import { useAuthStore } from '@/modules/auth/auth.store';
import { AuthRouteNames } from '@/modules/auth/enums/auth-route-names.enum';
import { NotificationRouteNames } from '@/modules/notifications/enums/notification-route-names.enum';
import { PaymentsRouteNames } from '@/modules/payments/enums/payments-route-names.enum';
import { PostRouteNames } from '@/modules/posts/enums/post-route-names.enum';
import { ProfileRouteNames } from '@/modules/profile/enums/profile-route-names.enum';
import { SharedRouteNames } from '@/shared/enums/shared-route-names.enum';
import { uk } from '@/shared/locales/uk';
import { updateSeoMeta } from '@/core/seo';
import { trackPageView } from '@/core/analytics';
import { SEO_ROUTES } from '@/shared/constants/seo.constants';
import { isRouteNavigating } from '@/core/navigation-loading';

const noIndexMeta = SEO_ROUTES.noIndex;

const routes: Array<RouteRecordRaw> = [
    {
        path: '/admin/login',
        name: AdminRouteNames.LOGIN,
        component: () => import('@/modules/admin/pages/AdminLoginPage/AdminLoginPage.vue'),
        meta: { isPublic: true, isAdminRoute: true, guestAdminOnly: true, skipAdminRefresh: true, title: uk.admin.login.title, ...noIndexMeta }
    },
    {
        path: '/admin/invite/accept',
        name: AdminRouteNames.INVITE_ACCEPT,
        component: () => import('@/modules/admin/pages/AdminInviteAcceptPage/AdminInviteAcceptPage.vue'),
        meta: { isPublic: true, isAdminRoute: true, guestAdminOnly: true, skipAdminRefresh: true, title: uk.admin.inviteAccept.title, ...noIndexMeta }
    },
    {
        path: '/admin',
        name: AdminRouteNames.DASHBOARD,
        component: () => import('@/modules/admin/pages/AdminDashboardPage/AdminDashboardPage.vue'),
        meta: { isAdminRoute: true, requiresAdminAuth: true, title: uk.admin.dashboard.title, ...noIndexMeta }
    },
    {
        path: '/admin/complaints',
        name: AdminRouteNames.COMPLAINTS,
        component: () => import('@/modules/admin/pages/AdminComplaintsPage/AdminComplaintsPage.vue'),
        meta: { isAdminRoute: true, requiresAdminAuth: true, title: uk.admin.complaints.title, ...noIndexMeta }
    },
    {
        path: '/admin/users',
        name: AdminRouteNames.USERS,
        component: () => import('@/modules/admin/pages/AdminUsersPage/AdminUsersPage.vue'),
        meta: { isAdminRoute: true, requiresAdminAuth: true, title: uk.admin.users.title, ...noIndexMeta }
    },
    {
        path: '/admin/categories',
        name: AdminRouteNames.CATEGORIES,
        component: () => import('@/modules/admin/pages/AdminCategoriesPage/AdminCategoriesPage.vue'),
        meta: { isAdminRoute: true, requiresAdminAuth: true, title: uk.admin.categories.title, ...noIndexMeta }
    },
    {
        path: '/admin/admins',
        name: AdminRouteNames.ADMINS,
        component: () => import('@/modules/admin/pages/AdminAdminsPage/AdminAdminsPage.vue'),
        meta: { isAdminRoute: true, requiresAdminAuth: true, requiresGlobalAdmin: true, title: uk.admin.admins.title, ...noIndexMeta }
    },
    {
        path: '/admin/profile',
        name: AdminRouteNames.PROFILE,
        component: () => import('@/modules/admin/pages/AdminProfilePage/AdminProfilePage.vue'),
        meta: { isAdminRoute: true, requiresAdminAuth: true, title: uk.admin.profile.title, ...noIndexMeta }
    },
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
        path: '/notifications',
        name: NotificationRouteNames.NOTIFICATIONS,
        component: () => import('@/modules/notifications/pages/NotificationsPage/NotificationsPage.vue'),
        meta: { requiresAuth: true, title: uk.notifications.title, ...noIndexMeta }
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
        path: '/terms',
        name: SharedRouteNames.TERMS,
        component: () => import('@/shared/pages/TermsOfServicePage/TermsOfServicePage.vue'),
        meta: { isPublic: true, title: uk.legal.terms.title, ...noIndexMeta }
    },
    {
        path: '/privacy',
        name: SharedRouteNames.PRIVACY,
        component: () => import('@/shared/pages/PrivacyPolicyPage/PrivacyPolicyPage.vue'),
        meta: { isPublic: true, title: uk.legal.privacy.title, ...noIndexMeta }
    },
    {
        path: '/copyright',
        name: SharedRouteNames.COPYRIGHT,
        component: () => import('@/shared/pages/CopyrightPolicyPage/CopyrightPolicyPage.vue'),
        meta: { isPublic: true, title: uk.legal.copyright.title, ...noIndexMeta }
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
    trackPageView(to);
});

router.onError(() => {
    isRouteNavigating.value = false;
});

let isInitialAuthenticationChecked = false;
let isInitialAdminAuthenticationChecked = false;

router.beforeEach(async (to, _from, next) => {
    isRouteNavigating.value = true;
    const authStore = useAuthStore();
    const adminStore = useAdminStore();

    if (to.meta.isAdminRoute) {
        if (!isInitialAdminAuthenticationChecked) {
            isInitialAdminAuthenticationChecked = true;

            if (to.meta.guestAdminOnly || to.meta.isPublic || !adminStore.token) {
                try {
                    await adminStore.refresh();
                    await adminStore.getProfile();
                } catch (_error) {
                    adminStore.clearSession();
                }
            } else if (adminStore.token) {
                try {
                    await adminStore.getProfile();
                } catch (_error) {
                    adminStore.clearSession();
                }
            }

            adminStore.isInitialized = true;
        }

        if (to.meta.guestAdminOnly && adminStore.isAuthenticated) {
            return next({ name: AdminRouteNames.DASHBOARD });
        }

        if (to.meta.requiresAdminAuth && !adminStore.isAuthenticated) {
            return next({ name: AdminRouteNames.LOGIN });
        }

        if (to.meta.requiresGlobalAdmin && !adminStore.isGlobalAdmin) {
            return next({ name: AdminRouteNames.DASHBOARD });
        }

        return next();
    }

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
