<script setup lang="ts">
import { ComponentPublicInstance } from 'vue';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import ConfirmDialog from '@/shared/components/ConfirmDialog/ConfirmDialog.vue';
import ErrorAlert from '@/shared/components/ErrorAlert/ErrorAlert.vue';
import AudioPreviewCard from '@/modules/posts/components/AudioPreviewCard/AudioPreviewCard.vue';
import { SUPPORTED_AUDIO_ACCEPT } from '@/modules/posts/constants/post-audio.constants';
import { useCreatePostModal } from '@/modules/posts/composables/useCreatePostModal';
import { CreatePostModalEmits } from '@/modules/posts/interfaces/create-post-modal-emits.interface';
import { CreatePostModalProps } from '@/modules/posts/interfaces/create-post-modal-props.interface';
import { uk } from '@/shared/locales/uk';
import musicIconUrl from '@/shared/assets/icons/ui/music.svg';
import recordIconUrl from '@/shared/assets/icons/ui/record.svg';
import stopIconUrl from '@/shared/assets/icons/ui/stop.svg';
import uploadIconUrl from '@/shared/assets/icons/ui/upload.svg';
import './CreatePostModal.css';

const props = defineProps<CreatePostModalProps>();

const emit = defineEmits<CreatePostModalEmits>();

const {
    activeMode,
    canSubmit,
    closeRemoveRecordConfirm,
    currentSelectionPreviewUrl,
    currentSelectionTitle,
    errorMessage,
    fileInput,
    formattedLimit,
    handleCloseClick,
    handleDrop,
    handleNativeFileSelection,
    handleRemoveSelection,
    hasSelection,
    isDragging,
    isProcessing,
    isRecording,
    isRemoveRecordConfirmOpen,
    isSubmitting,
    openFilePicker,
    recordingProgressLabel,
    removeSelectedAudio,
    startRecording,
    stopRecording,
    submit,
    supportedFormatsLabel,
} = useCreatePostModal(props, emit);

const setFileInputRef = (element: Element | ComponentPublicInstance | null): void => {
    fileInput.value = element instanceof HTMLInputElement ? element : null;
};
</script>

<template>
  <Teleport to="body">
    <Transition name="dialog-fade">
      <div v-if="isOpen" class="create-post-modal">
        <div class="create-post-modal__backdrop" @click="handleCloseClick" />

        <section class="create-post-modal__dialog" aria-modal="true" role="dialog">
          <div class="create-post-modal__header">
            <div class="create-post-modal__title-block">
              <span class="create-post-modal__icon">
                <img :src="musicIconUrl" alt="" class="create-post-modal__icon-image" />
              </span>

              <div>
                <h2 class="create-post-modal__title">{{ uk.posts.modal.title }}</h2>
                <p class="create-post-modal__subtitle">
                  {{ uk.posts.modal.limitPrefix }} {{ formattedLimit }} {{ uk.posts.modal.limitSuffix }}
                </p>
              </div>
            </div>

          </div>

          <div class="create-post-modal__tabs">
            <button
                type="button"
                class="create-post-modal__tab"
                :class="{ 'create-post-modal__tab--active': activeMode === 'record' }"
                @click="activeMode = 'record'"
            >
              {{ uk.posts.modal.tabs.record }}
            </button>
            <button
                type="button"
                class="create-post-modal__tab"
                :class="{ 'create-post-modal__tab--active': activeMode === 'upload' }"
                @click="activeMode = 'upload'"
            >
              {{ uk.posts.modal.tabs.upload }}
            </button>
          </div>

          <div
              class="create-post-modal__panel"
              :class="{ 'create-post-modal__panel--dragging': isDragging }"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop="handleDrop"
          >
            <template v-if="!hasSelection">
              <div v-if="activeMode === 'record'" class="create-post-modal__record-state">
                <div class="create-post-modal__wave" :class="{ 'create-post-modal__wave--active': isRecording }">
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>

                <p v-if="isRecording" class="create-post-modal__recording-time">{{ recordingProgressLabel }}</p>

                <BaseButton
                    :label="isRecording ? uk.posts.modal.actions.stopRecording : uk.posts.modal.actions.startRecording"
                    type="button"
                    variant="primary"
                    :disabled="isSubmitting || isProcessing"
                    @click="isRecording ? stopRecording() : startRecording()"
                >
                  <template #icon>
                    <img :src="isRecording ? stopIconUrl : recordIconUrl" alt="" class="create-post-modal__button-icon" />
                  </template>
                </BaseButton>
              </div>

              <div v-else class="create-post-modal__upload-state">
                <img :src="uploadIconUrl" alt="" class="create-post-modal__upload-icon" />
                <p class="create-post-modal__upload-copy">
                  {{ uk.posts.modal.uploadPrefix }}
                  <button type="button" class="create-post-modal__upload-link" @click="openFilePicker">
                    {{ uk.posts.modal.uploadLink }}
                  </button>
                </p>
                <p class="create-post-modal__upload-meta">{{ supportedFormatsLabel }} · {{ formattedLimit }}</p>
                <input
                    :ref="setFileInputRef"
                    type="file"
                    class="create-post-modal__file-input"
                    :accept="SUPPORTED_AUDIO_ACCEPT"
                    @change="handleNativeFileSelection"
                />
              </div>
            </template>

            <AudioPreviewCard
                v-else
                :src="currentSelectionPreviewUrl"
                :title="currentSelectionTitle"
                :disabled="isSubmitting || isProcessing"
                @remove="handleRemoveSelection"
            />

            <ConfirmDialog
                v-if="isRemoveRecordConfirmOpen"
                :title="uk.posts.modal.removeConfirm.title"
                :message="uk.posts.modal.removeConfirm.text"
                :cancel-label="uk.common.labels.cancel"
                :confirm-label="uk.posts.modal.removeConfirm.confirm"
                @close="closeRemoveRecordConfirm"
                @confirm="removeSelectedAudio"
            />
          </div>

          <ErrorAlert v-if="errorMessage" :message="errorMessage" />

          <div v-if="isProcessing" class="create-post-modal__processing">
            <div class="create-post-modal__spinner" />
            <p>{{ uk.posts.modal.processing }}</p>
          </div>

          <div class="create-post-modal__actions">
            <BaseButton
                :label="uk.common.labels.cancel"
                type="button"
                variant="secondary"
                :disabled="isSubmitting || isProcessing"
                @click="handleCloseClick"
            />
            <BaseButton
                :label="uk.posts.modal.actions.continue"
                type="button"
                variant="primary"
                :disabled="!canSubmit"
                @click="submit"
            />
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>
