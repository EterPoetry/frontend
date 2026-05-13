import homeIconUrl from '@/shared/assets/icons/ui/home.svg';
import homeActiveIconUrl from '@/shared/assets/icons/ui/home-active.svg';
import eyeIconUrl from '@/shared/assets/icons/ui/eye.svg';
import eyeActiveIconUrl from '@/shared/assets/icons/ui/eye-active.svg';
import heartIconUrl from '@/shared/assets/icons/ui/heart.svg';
import heartActiveIconUrl from '@/shared/assets/icons/ui/heart-active.svg';
import userIconUrl from '@/shared/assets/icons/ui/user.svg';
import userActiveIconUrl from '@/shared/assets/icons/ui/user-active.svg';
import plusIconUrl from '@/shared/assets/icons/ui/plus.svg';
import plusActiveIconUrl from '@/shared/assets/icons/ui/plus-active.svg';

export interface AppNavigationItem {
    key: 'home' | 'subscriptions' | 'favorites' | 'profile' | 'create';
    label: string;
    icon: string;
    activeIcon: string;
    requiresAuth: boolean;
}

export const createAppNavigationItems = (labels: {
    home: string;
    subscriptions: string;
    favorites: string;
    profile: string;
    create: string;
}): AppNavigationItem[] => ([
    { key: 'home', label: labels.home, icon: homeIconUrl, activeIcon: homeActiveIconUrl, requiresAuth: false },
    { key: 'subscriptions', label: labels.subscriptions, icon: eyeIconUrl, activeIcon: eyeActiveIconUrl, requiresAuth: true },
    { key: 'favorites', label: labels.favorites, icon: heartIconUrl, activeIcon: heartActiveIconUrl, requiresAuth: true },
    { key: 'profile', label: labels.profile, icon: userIconUrl, activeIcon: userActiveIconUrl, requiresAuth: true },
    { key: 'create', label: labels.create, icon: plusIconUrl, activeIcon: plusActiveIconUrl, requiresAuth: true },
]);
