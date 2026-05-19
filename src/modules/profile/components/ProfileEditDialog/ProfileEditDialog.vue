<script setup lang="ts">
import { ComponentPublicInstance, computed, reactive, ref, watch } from 'vue';
import {
    MAX_PROFILE_AVATAR_BYTES,
    PROFILE_LINK_MAX_LENGTH,
} from '@/modules/profile/constants/profile.constants';
import { validateProfileLink } from '@/shared/utils/profile-link.utils';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import BaseField from '@/shared/components/BaseField/BaseField.vue';
import type { ProfileResponse } from '@/modules/profile/interfaces/profile-response.interface';
import AppDialogShell from '@/shared/components/AppDialogShell/AppDialogShell.vue';
import { uk } from '@/shared/locales/uk';
import uploadIconUrl from '@/shared/assets/icons/ui/upload.svg';
import closeIconUrl from '@/shared/assets/icons/ui/close.svg';
import './ProfileEditDialog.css';

const props = defineProps<{
    isOpen: boolean;
    profile: ProfileResponse | null;
    isSaving: boolean;
    errorMessage: string;
    usernameError: string;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'save', payload: {
        name: string;
        username: string;
        bio: string | null;
        link: string | null;
        photoFile: File | null;
        photoRemoved: boolean;
    }): void;
}>();

const form = reactive({
    name: '',
    username: '',
    bio: '',
    link: '',
});

const linkError = computed(() => validateProfileLink(form.link));

const selectedPhotoFile = ref<File | null>(null);
const photoObjectUrl = ref<string | null>(null);
const photoRemoved = ref(false);
const photoErrorMessage = ref('');
const isConfirmingDelete = ref(false);
const photoInput = ref<HTMLInputElement | null>(null);

const initials = computed(() => (form.name || form.username || '?').trim().charAt(0).toUpperCase());

const photoPreview = computed<string | null>(() => {
    if (photoRemoved.value) return null;
    if (photoObjectUrl.value) return photoObjectUrl.value;
    return props.profile?.photo ?? null;
});

const revokeObjectUrl = (): void => {
    if (photoObjectUrl.value) {
        URL.revokeObjectURL(photoObjectUrl.value);
        photoObjectUrl.value = null;
    }
};

const syncForm = (): void => {
    form.name = props.profile?.name ?? '';
    form.username = props.profile?.username ?? '';
    form.bio = props.profile?.bio ?? '';
    form.link = props.profile?.link ?? '';
    revokeObjectUrl();
    selectedPhotoFile.value = null;
    photoRemoved.value = false;
    photoErrorMessage.value = '';
    isConfirmingDelete.value = false;

    if (photoInput.value) {
        photoInput.value.value = '';
    }
};

const handleSubmit = (): void => {
    emit('save', {
        name: form.name.trim(),
        username: form.username.trim(),
        bio: form.bio.trim() || null,
        link: form.link.trim() || null,
        photoFile: selectedPhotoFile.value,
        photoRemoved: photoRemoved.value,
    });
};

const setPhotoInputRef = (element: Element | ComponentPublicInstance | null): void => {
    photoInput.value = element instanceof HTMLInputElement ? element : null;
};

const openPhotoPicker = (): void => {
    isConfirmingDelete.value = false;
    photoInput.value?.click();
};

const requestDeletePhoto = (): void => {
    isConfirmingDelete.value = true;
};

const cancelDeletePhoto = (): void => {
    isConfirmingDelete.value = false;
};

const confirmDeletePhoto = (): void => {
    revokeObjectUrl();
    selectedPhotoFile.value = null;
    photoRemoved.value = true;
    photoErrorMessage.value = '';
    isConfirmingDelete.value = false;

    if (photoInput.value) {
        photoInput.value.value = '';
    }
};

const handlePhotoChange = (event: Event): void => {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];

    if (!file) return;

    photoErrorMessage.value = '';

    if (file.size > MAX_PROFILE_AVATAR_BYTES) {
        photoErrorMessage.value = uk.profile.editDialog.photoTooLarge;
        if (input) input.value = '';
        return;
    }

    revokeObjectUrl();
    photoObjectUrl.value = URL.createObjectURL(file);
    selectedPhotoFile.value = file;
    photoRemoved.value = false;
};

watch(() => props.isOpen, (isOpen) => {
    if (isOpen) syncForm();
}, { immediate: true });

watch(() => props.profile, () => {
    if (props.isOpen) syncForm();
});
</script>

<template>
  <AppDialogShell
      :is-open="isOpen"
      :title="uk.profile.editDialog.title"
      :subtitle="uk.profile.editDialog.subtitle"
      size="lg"
      @close="$emit('close')"
  >
    <form class="profile-edit-dialog" @submit.prevent="handleSubmit">
      <div class="profile-edit-dialog__fields">

        <div class="profile-edit-dialog__photo-wrap">
          <div class="profile-edit-dialog__photo-ring">
            <button
                type="button"
                class="profile-edit-dialog__photo-btn"
                :aria-label="uk.profile.editDialog.photoUpload"
                @click="openPhotoPicker"
            >
              <img
                  v-if="photoPreview"
                  :src="photoPreview"
                  :alt="uk.profile.editDialog.photoPreviewAlt"
                  class="profile-edit-dialog__photo-avatar"
              />
              <span v-else class="profile-edit-dialog__photo-avatar profile-edit-dialog__photo-avatar--empty">
                {{ initials }}
              </span>

              <span class="profile-edit-dialog__photo-overlay" aria-hidden="true">
                <img :src="uploadIconUrl" alt="" class="profile-edit-dialog__photo-overlay-icon" />
              </span>
            </button>

            <button
                v-if="photoPreview"
                type="button"
                class="profile-edit-dialog__photo-delete"
                :aria-label="uk.profile.editDialog.photoRemove"
                @click="requestDeletePhoto"
            >
              <img :src="closeIconUrl" alt="" class="profile-edit-dialog__photo-delete-icon" />
            </button>
          </div>

          <div v-if="isConfirmingDelete" class="profile-edit-dialog__photo-confirm">
            <span class="profile-edit-dialog__photo-confirm-text">{{ uk.profile.editDialog.photoConfirm }}</span>
            <button type="button" class="profile-edit-dialog__photo-confirm-yes" @click="confirmDeletePhoto">
              {{ uk.profile.editDialog.photoConfirmYes }}
            </button>
            <button type="button" class="profile-edit-dialog__photo-confirm-no" @click="cancelDeletePhoto">
              {{ uk.profile.editDialog.photoConfirmNo }}
            </button>
          </div>

          <p v-if="photoErrorMessage" class="profile-edit-dialog__photo-error">
            {{ photoErrorMessage }}
          </p>
        </div>

        <input
            :ref="setPhotoInputRef"
            type="file"
            accept="image/*"
            class="profile-edit-dialog__photo-input"
            @change="handlePhotoChange"
        />

        <BaseField
            v-model="form.name"
            id="profile-edit-name"
            :label="uk.common.labels.name"
            :placeholder="uk.profile.editDialog.namePlaceholder"
            :max-length="50"
            :disabled="isSaving"
        />

        <BaseField
            v-model="form.username"
            id="profile-edit-username"
            :label="uk.common.labels.username"
            :placeholder="uk.profile.editDialog.usernamePlaceholder"
            :max-length="30"
            :disabled="isSaving"
            :error-message="usernameError"
        />

        <BaseField
            v-model="form.bio"
            id="profile-edit-bio"
            :label="uk.profile.editDialog.bioLabel"
            :placeholder="uk.profile.editDialog.bioPlaceholder"
            :max-length="160"
            :disabled="isSaving"
            multiline
            auto-resize
            :rows="3"
            :auto-resize-max-height="130"
        />

        <BaseField
            v-model="form.link"
            id="profile-edit-link"
            :label="uk.profile.editDialog.linkLabel"
            :placeholder="uk.profile.editDialog.linkPlaceholder"
            :max-length="PROFILE_LINK_MAX_LENGTH"
            :disabled="isSaving"
            :error-message="linkError ?? ''"
        />
      </div>

      <p v-if="errorMessage" class="profile-edit-dialog__error">
        {{ errorMessage }}
      </p>

      <div class="profile-edit-dialog__actions">
        <BaseButton
            :label="uk.common.labels.cancel"
            type="button"
            variant="secondary"
            :disabled="false"
            @click="$emit('close')"
        />
        <BaseButton
            :label="uk.profile.editDialog.submit"
            type="submit"
            variant="primary"
            :disabled="!form.name.trim() || !form.username.trim() || !!linkError"
            :is-loading="isSaving"
        />
      </div>
    </form>
  </AppDialogShell>
</template>
