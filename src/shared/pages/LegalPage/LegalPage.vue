<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useTheme } from '@/shared/composables/useTheme';
import { uk } from '@/shared/locales/uk';
import logoUrl from '@/shared/assets/icons/eter-logo.svg';
import moonIconUrl from '@/shared/assets/icons/ui/moon.svg';
import sunIconUrl from '@/shared/assets/icons/ui/sun.svg';
import './LegalPage.css';

defineProps<{
    title: string;
    kicker: string;
}>();

const router = useRouter();
const { theme, toggleTheme } = useTheme();

const goBack = (): void => {
    if (window.history.length > 1) {
        router.back();
    } else {
        void router.push('/');
    }
};
</script>

<template>
  <div class="legal-page">
    <header class="legal-page__header">
      <RouterLink class="legal-page__header-logo" to="/" :aria-label="uk.common.appName">
        <img :src="logoUrl" :alt="uk.common.appName" class="legal-page__logo-img" />
      </RouterLink>
      <div class="legal-page__header-sep" aria-hidden="true"></div>
      <p class="legal-page__header-title">{{ title }}</p>
      <button type="button" class="legal-page__back-btn" @click="goBack">
        <i class="legal-page__back-arrow" aria-hidden="true">←</i>
        <span class="legal-page__back-label">{{ uk.legal.back }}</span>
      </button>
      <button
          type="button"
          class="legal-page__theme-toggle"
          :aria-label="uk.home.themeLabel"
          @click="toggleTheme"
      >
        <img
            :src="theme === 'dark' ? sunIconUrl : moonIconUrl"
            :alt="uk.home.themeLabel"
            class="legal-page__theme-icon"
        />
      </button>
    </header>

    <main class="legal-page__main">
      <span class="legal-page__doc-kicker">{{ kicker }}</span>
      <h1 class="legal-page__doc-title">{{ title }}</h1>

      <div class="legal-page__doc">
        <slot />
      </div>
    </main>
  </div>
</template>
