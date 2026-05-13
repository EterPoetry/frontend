<script setup lang="ts">
import CreatePostModal from '@/modules/posts/components/CreatePostModal/CreatePostModal.vue';
import { usePostsAppShell } from '@/modules/posts/composables/usePostsAppShell';
import AppShell from '@/shared/components/AppShell/AppShell.vue';
import './HomePage.css';

const {
    authStore,
    durationLimitMinutes,
    handleCreateClick,
    handleModalClose,
    handlePostCreated,
    isAuthenticated,
    isCreatePostModalOpen,
    openLogin,
    openRegister,
    search,
} = usePostsAppShell();
</script>

<template>
  <AppShell
      v-model:search="search"
      :is-authenticated="isAuthenticated"
      active-nav-key="home"
      @create="handleCreateClick"
      @login="openLogin"
      @register="openRegister"
      @logout="authStore.logout"
  >
    <div class="home-page" />
  </AppShell>

  <CreatePostModal
      :is-open="isCreatePostModalOpen"
      :duration-limit-minutes="durationLimitMinutes"
      @close="handleModalClose"
      @created="handlePostCreated"
  />
</template>
