<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CreatePostModal from '@/modules/posts/components/CreatePostModal/CreatePostModal.vue';
import { usePostsAppShell } from '@/modules/posts/composables/usePostsAppShell';
import PostEditor from '@/modules/posts/components/PostEditor/PostEditor.vue';
import { PostRouteNames } from '@/modules/posts/enums/post-route-names.enum';
import { PostStatus } from '@/modules/posts/enums/post-status.enum';
import { Post } from '@/modules/posts/interfaces/post.interface';
import { usePostsStore } from '@/modules/posts/posts.store';
import AppShell from '@/shared/components/AppShell/AppShell.vue';
import type { AppNavigationItem } from '@/shared/constants/app-navigation';
import './EditPostPage.css';

const postsStore = usePostsStore();
const route = useRoute();
const router = useRouter();

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

const routePostId = computed<number | null>(() => {
    const rawPostId = route.params.postId;
    const normalizedPostId = Array.isArray(rawPostId) ? rawPostId[0] : rawPostId;

    if (!normalizedPostId) {
        return null;
    }

    const parsedPostId = Number(normalizedPostId);

    return Number.isInteger(parsedPostId) && parsedPostId > 0 ? parsedPostId : null;
});
const activePost = computed(() => {
    if (!routePostId.value) {
        return null;
    }

    return postsStore.currentPost?.postId === routePostId.value
        ? postsStore.currentPost
        : null;
});
const activeNavKey = computed<AppNavigationItem['key']>(() => {
    if (activePost.value?.status === PostStatus.DRAFT) {
        return 'create';
    }

    return 'home';
});

let activePostRequestId = 0;

const loadPost = async (postId: number): Promise<void> => {
    const requestId = ++activePostRequestId;

    try {
        const post = postsStore.currentPost?.postId === postId
            ? postsStore.currentPost
            : await postsStore.getPost(postId);

        if (requestId !== activePostRequestId || !post || post.status !== PostStatus.PROCESSING) {
            return;
        }

        await postsStore.waitForPostProcessing(postId);
    } catch (_error) {
        if (requestId !== activePostRequestId) {
            return;
        }

        await router.replace({ name: PostRouteNames.HOME });
    }
};

const handlePostUpdated = (post: Post): void => {
    if (routePostId.value === post.postId) {
        return;
    }

    void router.replace({
        name: PostRouteNames.EDIT_POST,
        params: { postId: post.postId },
    });
};

watch(routePostId, (postId) => {
    if (!postId) {
        activePostRequestId += 1;
        return;
    }

    void loadPost(postId);
}, { immediate: true });
</script>

<template>
  <AppShell
      v-model:search="search"
      :is-authenticated="isAuthenticated"
      :active-nav-key="activeNavKey"
      @create="handleCreateClick"
      @login="openLogin"
      @register="openRegister"
      @logout="authStore.logout"
  >
    <div class="edit-post-page">
      <PostEditor
          v-if="activePost"
          :post="activePost"
          @updated="handlePostUpdated"
      />
    </div>
  </AppShell>

  <CreatePostModal
      :is-open="isCreatePostModalOpen"
      :duration-limit-minutes="durationLimitMinutes"
      @close="handleModalClose"
      @created="handlePostCreated"
  />
</template>
