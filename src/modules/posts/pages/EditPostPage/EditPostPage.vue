<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CreatePostModal from '@/modules/posts/components/CreatePostModal/CreatePostModal.vue';
import { usePostsAppShell } from '@/modules/posts/composables/usePostsAppShell';
import PostEditor from '@/modules/posts/components/PostEditor/PostEditor.vue';
import { PostRouteNames } from '@/modules/posts/enums/post-route-names.enum';
import { PostStatus } from '@/modules/posts/enums/post-status.enum';
import { Post } from '@/modules/posts/interfaces/post.interface';
import { usePostsStore } from '@/modules/posts/posts.store';
import { ProfileRouteNames } from '@/modules/profile/enums/profile-route-names.enum';
import AppShell from '@/shared/components/AppShell/AppShell.vue';
import ConfirmDialog from '@/shared/components/ConfirmDialog/ConfirmDialog.vue';
import type { AppNavigationItem } from '@/shared/constants/app-navigation';
import { uk } from '@/shared/locales/uk';
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
const activeNavKey = computed<AppNavigationItem['key']>(() => 'create');

let activePostRequestId = 0;
const isDeleteDraftDialogOpen = ref(false);
const isDeletingDraft = ref(false);
const isLoadingPost = ref(false);

const loadPost = async (postId: number): Promise<void> => {
    const requestId = ++activePostRequestId;
    isLoadingPost.value = true;

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
    } finally {
        if (requestId === activePostRequestId) {
            isLoadingPost.value = false;
        }
    }
};

const handlePostUpdated = (post: Post): void => {
    void router.replace({
        name: PostRouteNames.POST,
        params: { slug: post.slug },
    });
};

const openDeleteDraftDialog = (): void => {
    if (!activePost.value || activePost.value.status !== PostStatus.DRAFT || isDeletingDraft.value) {
        return;
    }

    isDeleteDraftDialogOpen.value = true;
};

const closeDeleteDraftDialog = (): void => {
    if (isDeletingDraft.value) {
        return;
    }

    isDeleteDraftDialogOpen.value = false;
};

const deleteDraft = async (): Promise<void> => {
    if (!activePost.value || activePost.value.status !== PostStatus.DRAFT || isDeletingDraft.value) {
        return;
    }

    isDeletingDraft.value = true;

    try {
        const isDeleted = await postsStore.deletePost(activePost.value.postId);

        if (isDeleted) {
            await router.replace({
                name: ProfileRouteNames.PROFILE_ME,
                query: { tab: 'drafts' },
            });
        }
    } finally {
        isDeletingDraft.value = false;
        isDeleteDraftDialogOpen.value = false;
    }
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
          :is-delete-draft-pending="isDeletingDraft"
          @delete-draft="openDeleteDraftDialog"
          @updated="handlePostUpdated"
      />

      <div v-else-if="isLoadingPost" class="edit-post-page__loading">
        {{ uk.common.labels.loading }}
      </div>
    </div>
  </AppShell>

  <CreatePostModal
      :is-open="isCreatePostModalOpen"
      :duration-limit-minutes="durationLimitMinutes"
      @close="handleModalClose"
      @created="handlePostCreated"
  />

  <ConfirmDialog
      v-if="isDeleteDraftDialogOpen"
      :title="uk.posts.editor.deleteDraftTitle"
      :message="uk.posts.editor.deleteDraftMessage"
      :confirm-label="uk.posts.editor.deleteDraft"
      :cancel-label="uk.common.labels.cancel"
      @close="closeDeleteDraftDialog"
      @confirm="deleteDraft"
  />
</template>
