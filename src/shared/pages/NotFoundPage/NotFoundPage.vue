<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/modules/auth/auth.store';
import { AuthRouteNames } from '@/modules/auth/enums/auth-route-names.enum';
import { PostRouteNames } from '@/modules/posts/enums/post-route-names.enum';
import { SharedRouteNames } from '@/shared/enums/shared-route-names.enum';
import { useTheme } from '@/shared/composables/useTheme';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import logoUrl from '@/shared/assets/icons/eter-logo.svg';
import moonIconUrl from '@/shared/assets/icons/ui/moon.svg';
import sunIconUrl from '@/shared/assets/icons/ui/sun.svg';
import { uk } from '@/shared/locales/uk';
import './NotFoundPage.css';

const router = useRouter();
const authStore = useAuthStore();
const { theme, toggleTheme } = useTheme();

const primaryLabel = computed(() => authStore.isAuthenticated ? 'До стрічки' : 'На головну');

const openPrimaryDestination = (): void => {
    void router.push({
        name: authStore.isAuthenticated ? PostRouteNames.HOME : SharedRouteNames.LANDING,
    });
};

const openLogin = (): void => {
    void router.push({ name: AuthRouteNames.LOGIN });
};
</script>

<template>
  <div class="not-found-page">
    <button
        type="button"
        class="not-found-page__theme-toggle"
        :aria-label="uk.home.themeLabel"
        @click="toggleTheme"
    >
      <img
          :src="theme === 'dark' ? sunIconUrl : moonIconUrl"
          :alt="uk.home.themeLabel"
          class="not-found-page__theme-icon"
      />
    </button>

    <main class="not-found-page__main">
      <section class="not-found-page__panel" aria-labelledby="not-found-title">
        <img :src="logoUrl" :alt="uk.common.appName" class="not-found-page__logo" />

        <p class="not-found-page__eyebrow">404</p>
        <h1 id="not-found-title" class="not-found-page__title">Сторінку не знайдено</h1>
        <p class="not-found-page__text">
          Можливо, адреса змінилася або посилання веде на сторінку, якої більше немає.
        </p>

        <div class="not-found-page__actions">
          <BaseButton
              :label="primaryLabel"
              type="button"
              variant="primary"
              :disabled="false"
              @click="openPrimaryDestination"
          />
          <BaseButton
              v-if="!authStore.isAuthenticated"
              label="Увійти"
              type="button"
              variant="secondary"
              :disabled="false"
              @click="openLogin"
          />
        </div>
      </section>
    </main>
  </div>
</template>
