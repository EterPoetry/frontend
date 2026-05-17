<script setup lang="ts">
import { ComponentPublicInstance } from 'vue';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import BaseCheckbox from '@/shared/components/BaseCheckbox/BaseCheckbox.vue';
import BaseField from '@/shared/components/BaseField/BaseField.vue';
import BaseLoader from '@/shared/components/BaseLoader/BaseLoader.vue';
import ErrorAlert from '@/shared/components/ErrorAlert/ErrorAlert.vue';
import AudioPreviewCard from '@/modules/posts/components/AudioPreviewCard/AudioPreviewCard.vue';
import { SUPPORTED_AUDIO_ACCEPT } from '@/modules/posts/constants/post-audio.constants';
import { usePostEditor } from '@/modules/posts/composables/usePostEditor';
import { PostEditorEmits } from '@/modules/posts/interfaces/post-editor-emits.interface';
import { PostEditorProps } from '@/modules/posts/interfaces/post-editor-props.interface';
import { uk } from '@/shared/locales/uk';
import refreshIconUrl from '@/shared/assets/icons/ui/refresh.svg';
import playIconUrl from '@/shared/assets/icons/ui/play.svg';
import searchIconUrl from '@/shared/assets/icons/ui/search.svg';
import './PostEditor.css';

const props = defineProps<PostEditorProps>();

const emit = defineEmits<PostEditorEmits>();

const {
    addCategory,
    audioSource,
    audioStatusHint,
    audioStatusTitle,
    audioTitle,
    categoryBox,
    categoryQuery,
    categoryResults,
    categorySlotsLabel,
    description,
    errorMessage,
    fileInput,
    handleCategoryEscape,
    handleCategoryFocus,
    handleCategoryRootPointerDown,
    isAudioProcessingVisible,
    isAudioRefreshBusy,
    isBusy,
    isCategoryDropdownOpen,
    isCategoryLimitReached,
    isConsentChecked,
    isDraft,
    isUploadingAudio,
    openReplaceAudioPicker,
    originAuthorName,
    removeCategory,
    replaceAudio,
    selectedCategories,
    submit,
    submitLabel,
    text,
    textError,
    title,
    titleError,
} = usePostEditor(props, emit);

const setCategoryBoxRef = (element: Element | ComponentPublicInstance | null): void => {
    categoryBox.value = element instanceof HTMLElement ? element : null;
};

const setFileInputRef = (element: Element | ComponentPublicInstance | null): void => {
    fileInput.value = element instanceof HTMLInputElement ? element : null;
};
</script>

<template>
  <section class="post-editor">
    <div class="post-editor__card">
      <div class="post-editor__header">
        <div class="post-editor__header-icon">✎</div>
        <div>
          <h2 class="post-editor__title">{{ uk.posts.editor.title }}</h2>
          <p class="post-editor__subtitle">{{ uk.posts.editor.subtitle }}</p>
        </div>
      </div>

      <div class="post-editor__divider" />

      <div
          class="post-editor__audio-panel"
          :class="{
            'post-editor__audio-panel--pending': isAudioProcessingVisible,
            'post-editor__audio-panel--without-refresh': !isDraft,
          }"
      >
        <AudioPreviewCard
            v-if="audioSource"
            :src="audioSource"
            :title="audioTitle"
            :disabled="isBusy"
            :show-remove="false"
        />

        <div v-else-if="isAudioProcessingVisible" class="post-editor__audio-state">
          <div class="post-editor__audio-state-icon" aria-hidden="true">
            <span class="post-editor__audio-state-wave" />
            <span class="post-editor__audio-state-wave" />
            <span class="post-editor__audio-state-wave" />
          </div>
          <div class="post-editor__audio-state-copy">
            <span class="post-editor__audio-state-badge">
              {{ isUploadingAudio ? uk.posts.editor.audioUploadingBadge : uk.posts.editor.audioPendingBadge }}
            </span>
            <strong class="post-editor__audio-state-title">{{ audioStatusTitle }}</strong>
            <span class="post-editor__audio-state-text">{{ audioStatusHint }}</span>
          </div>
        </div>

        <div v-else class="post-editor__audio-empty">
          <img :src="playIconUrl" alt="" class="post-editor__audio-empty-icon" />
          <span>{{ uk.posts.editor.audioPending }}</span>
        </div>

        <button
            v-if="isDraft"
            type="button"
            class="post-editor__replace-audio"
            :class="{ 'post-editor__replace-audio--loading': isAudioRefreshBusy }"
            :disabled="isBusy"
            @click="openReplaceAudioPicker"
        >
          <BaseLoader
              v-if="isAudioRefreshBusy"
              size="sm"
              tone="primary"
          />
          <img v-else :src="refreshIconUrl" :alt="uk.posts.editor.replaceAudio" />
        </button>

        <input
            :ref="setFileInputRef"
            type="file"
            class="post-editor__file-input"
            :accept="SUPPORTED_AUDIO_ACCEPT"
            @change="replaceAudio"
        />
      </div>

      <div class="post-editor__fields">
        <BaseField
            id="post-title"
            v-model="title"
            :label="uk.posts.editor.fields.title"
            :placeholder="uk.posts.editor.placeholders.title"
            :max-length="200"
            :error-message="titleError"
            :disabled="isBusy"
        />

        <BaseField
            id="post-text"
            v-model="text"
            :label="uk.posts.editor.fields.text"
            :placeholder="uk.posts.editor.placeholders.text"
            :error-message="textError"
            :disabled="isBusy"
            multiline
            :rows="6"
        />

        <BaseField
            id="post-author"
            v-model="originAuthorName"
            :label="uk.posts.editor.fields.originAuthor"
            :hint="uk.posts.editor.fields.originAuthorHint"
            :placeholder="uk.posts.editor.placeholders.originAuthor"
            :max-length="200"
            :disabled="isBusy"
        />

        <BaseField
            id="post-description"
            v-model="description"
            :label="uk.posts.editor.fields.description"
            :hint="uk.posts.editor.fields.descriptionHint"
            :placeholder="uk.posts.editor.placeholders.description"
            :disabled="isBusy"
        />

        <div class="post-editor__category-section">
          <p class="post-editor__category-label">{{ uk.posts.editor.fields.categories }}</p>

          <div
              :ref="setCategoryBoxRef"
              class="post-editor__category-box"
              :class="{ 'post-editor__category-box--active': isCategoryDropdownOpen }"
              @pointerdown="handleCategoryRootPointerDown"
          >
            <label v-if="!isCategoryLimitReached" class="post-editor__category-search">
              <img :src="searchIconUrl" :alt="uk.home.searchPlaceholder" class="post-editor__category-search-icon" />
              <input
                  v-model="categoryQuery"
                  type="text"
                  :placeholder="uk.posts.editor.placeholders.categorySearch"
                  :disabled="isBusy || isCategoryLimitReached"
                  class="post-editor__category-input"
                  @focus="handleCategoryFocus"
                  @keydown.esc="handleCategoryEscape"
              />
            </label>

            <div
                v-if="isCategoryDropdownOpen && categoryResults.length"
                class="post-editor__category-results"
            >
              <button
                  v-for="category in categoryResults"
                  :key="category.categoryId"
                  type="button"
                  class="post-editor__category-result"
                  :disabled="isCategoryLimitReached"
                  @click="addCategory(category)"
              >
                {{ category.categoryName }}
              </button>
            </div>

            <div class="post-editor__chips-row">
              <div class="post-editor__chips">
                <button
                    v-for="category in selectedCategories"
                    :key="category.categoryId"
                    type="button"
                    class="post-editor__chip"
                    @click="removeCategory(category.categoryId)"
                >
                  <span>{{ category.categoryName }}</span>
                  <span>×</span>
                </button>
              </div>
              <span class="post-editor__category-count">{{ categorySlotsLabel }}</span>
            </div>
          </div>
        </div>

        <BaseCheckbox
            v-model="isConsentChecked"
            :label="uk.posts.editor.confirmation"
            :disabled="isBusy"
        />

        <ErrorAlert v-if="errorMessage" :message="errorMessage" />
      </div>

      <div class="post-editor__divider" />

      <div class="post-editor__actions">
        <button
            v-if="isDraft"
            type="button"
            class="post-editor__delete-draft btn btn-secondary"
            :disabled="isBusy || props.isDeleteDraftPending"
            @click="emit('delete-draft')"
        >
          <span>{{ uk.posts.editor.deleteDraft }}</span>
        </button>

        <BaseButton
            :label="submitLabel"
            type="button"
            variant="primary"
            :disabled="isBusy"
            :is-loading="isBusy"
            @click="submit"
        />
      </div>
    </div>
  </section>
</template>
