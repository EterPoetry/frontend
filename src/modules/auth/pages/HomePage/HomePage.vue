<script setup lang="ts">
import { useAuthStore } from '@/modules/auth/auth.store';
import { uk } from '@/shared/locales/uk';
import './HomePage.css';

const authStore = useAuthStore();
</script>

<template>
  <div class="home-page">
    <header class="home-header">
      <div class="home-container">
        <span class="home-user-name">{{ authStore.user?.name }}</span>
        <button class="home-logout-btn" @click="authStore.logout">
          {{ uk.common.labels.logout }}
        </button>
      </div>
    </header>

    <main class="home-main">
      <div class="home-hero">
        <h1 class="home-title">{{ uk.common.appName }}</h1>
        <p class="home-description">{{ uk.home.welcome }}</p>
      </div>
    </main>
  </div>
</template>