<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { isAxiosError } from 'axios';
import { useAdminStore } from '@/modules/admin/admin.store';
import {
    ADMIN_MAX_EMAIL_LENGTH,
    ADMIN_MAX_NAME_LENGTH,
    ADMIN_MAX_PASSWORD_LENGTH,
    ADMIN_MIN_PASSWORD_LENGTH,
} from '@/modules/admin/constants/admin.constants';
import { AdminRole } from '@/modules/admin/enums/admin-role.enum';
import AppDialogShell from '@/shared/components/AppDialogShell/AppDialogShell.vue';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import BaseInput from '@/shared/components/BaseInput/BaseInput.vue';
import BaseLoader from '@/shared/components/BaseLoader/BaseLoader.vue';
import ErrorAlert from '@/shared/components/ErrorAlert/ErrorAlert.vue';
import { AUTH_VALIDATION } from '@/modules/auth/constants/auth-validation.constants';
import { getLocalizedApiErrorMessage } from '@/shared/utils/api-error.utils';
import { uk } from '@/shared/locales/uk';
import '@/modules/admin/pages/admin-page-shared.css';
import './AdminProfileDialog.css';

const props = defineProps<{
    isOpen: boolean;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
}>();

const adminStore = useAdminStore();

const name = ref('');
const email = ref('');
const newPassword = ref('');
const currentPassword = ref('');
const errorMessage = ref('');
const isLoading = ref(false);
const isSaving = ref(false);

const roleLabel = computed(() => adminStore.admin?.role === AdminRole.GLOBAL_ADMIN
    ? uk.admin.roles.globalAdmin
    : uk.admin.roles.admin);

const adminInitials = computed(() => {
    const source = adminStore.admin?.name || adminStore.admin?.email || '';
    const parts = source.trim().split(/\s+/).filter(Boolean);

    if (!parts.length) {
        return 'A';
    }

    return parts
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
});

const syncForm = (): void => {
    name.value = adminStore.admin?.name ?? '';
    email.value = adminStore.admin?.email ?? '';
    newPassword.value = '';
    currentPassword.value = '';
};

const hasValidEmailDomain = (value: string): boolean => {
    const domain = value.split('@')[1]?.toLowerCase() ?? '';
    const labels = domain.split('.');

    return labels.length >= 2
        && labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
        && /^[a-z]{2,24}$/.test(labels[labels.length - 1]);
};

const loadProfile = async (): Promise<void> => {
    isLoading.value = true;
    errorMessage.value = '';

    try {
        await adminStore.getProfile();
        syncForm();
    } catch (_error) {
        errorMessage.value = uk.admin.loadFailed;
    } finally {
        isLoading.value = false;
    }
};

const closeDialog = (): void => {
    if (isSaving.value) {
        return;
    }

    emit('close');
};

const handleSubmit = async (): Promise<void> => {
    errorMessage.value = '';

    if (!name.value.trim() || !email.value.trim()) {
        errorMessage.value = uk.common.errors.emptyFields;
        return;
    }

    if (!AUTH_VALIDATION.EMAIL_REGEX.test(email.value.trim())) {
        errorMessage.value = uk.common.errors.invalidEmail;
        return;
    }

    if (!hasValidEmailDomain(email.value.trim())) {
        errorMessage.value = uk.common.errors.invalidEmailDomain;
        return;
    }

    if (newPassword.value && newPassword.value.length < ADMIN_MIN_PASSWORD_LENGTH) {
        errorMessage.value = uk.common.errors.passwordTooShort(ADMIN_MIN_PASSWORD_LENGTH);
        return;
    }

    if (newPassword.value && !currentPassword.value.trim()) {
        errorMessage.value = uk.admin.profile.currentPasswordRequired;
        return;
    }

    isSaving.value = true;

    try {
        await adminStore.updateProfile({
            name: name.value.trim(),
            email: email.value.trim(),
            newPassword: newPassword.value || undefined,
            currentPassword: currentPassword.value || undefined,
        });
        syncForm();
        emit('close');
    } catch (error) {
        if (isAxiosError(error) && error.response?.status === 403) {
            errorMessage.value = uk.admin.forbidden;
        } else {
            errorMessage.value = getLocalizedApiErrorMessage(error) ?? uk.common.errors.serverError;
        }
    } finally {
        isSaving.value = false;
    }
};

watch(() => props.isOpen, (isOpen) => {
    if (!isOpen) {
        return;
    }

    syncForm();
    void loadProfile();
});
</script>

<template>
  <AppDialogShell
      :is-open="isOpen"
      :title="uk.admin.profile.title"
      :subtitle="uk.admin.profile.description"
      size="lg"
      @close="closeDialog"
  >
    <form class="admin-profile-dialog" @submit.prevent="handleSubmit">
      <div class="admin-profile-dialog__summary">
        <div class="admin-profile-dialog__identity">
          <span class="admin-profile-dialog__avatar">{{ adminInitials }}</span>
          <div class="admin-profile-dialog__identity-copy">
            <strong class="admin-profile-dialog__identity-name">
              {{ adminStore.admin?.name || uk.admin.profile.title }}
            </strong>
            <span class="admin-profile-dialog__identity-email">{{ adminStore.admin?.email }}</span>
          </div>
        </div>

        <div class="admin-profile-dialog__badges">
          <span class="admin-profile-dialog__badge">
            <span class="admin-profile-dialog__badge-label">{{ uk.admin.admins.role }}</span>
            <strong>{{ roleLabel }}</strong>
          </span>
          <span
              :class="[
                  'admin-profile-dialog__badge',
                  { 'admin-profile-dialog__badge--success': adminStore.admin?.isActive },
              ]"
          >
            <span class="admin-profile-dialog__badge-dot" aria-hidden="true"></span>
            <strong>{{ adminStore.admin?.isActive ? uk.admin.status.active : uk.admin.status.invited }}</strong>
          </span>
        </div>
      </div>

      <div v-if="isLoading" class="admin-page__loading">
        <BaseLoader :label="uk.common.labels.loading" size="md" tone="primary" variant="wave" centered />
      </div>

      <template v-else>
        <BaseInput
            id="admin-profile-name"
            v-model="name"
            :label="uk.common.labels.name"
            :type="'text'"
            :placeholder="uk.admin.profile.namePlaceholder"
            :max-length="ADMIN_MAX_NAME_LENGTH"
            :disabled="isSaving"
        />

        <BaseInput
            id="admin-profile-email"
            v-model="email"
            :label="uk.common.labels.email"
            :type="'email'"
            :placeholder="uk.admin.profile.emailPlaceholder"
            :max-length="ADMIN_MAX_EMAIL_LENGTH"
            :disabled="isSaving"
        />

        <BaseInput
            id="admin-profile-new-password"
            v-model="newPassword"
            :label="uk.admin.profile.newPasswordLabel"
            :type="'password'"
            :placeholder="uk.admin.profile.newPasswordPlaceholder"
            :max-length="ADMIN_MAX_PASSWORD_LENGTH"
            :disabled="isSaving"
        />

        <BaseInput
            id="admin-profile-current-password"
            v-model="currentPassword"
            :label="uk.admin.profile.currentPasswordLabel"
            :type="'password'"
            :placeholder="uk.admin.profile.currentPasswordPlaceholder"
            :max-length="ADMIN_MAX_PASSWORD_LENGTH"
            :disabled="isSaving"
        />

        <ErrorAlert v-if="errorMessage" :message="errorMessage" />
        <div v-if="errorMessage === uk.admin.loadFailed && !isSaving" class="admin-page__error-actions">
          <BaseButton
              :label="uk.admin.actions.retry"
              type="button"
              variant="secondary"
              :disabled="isLoading"
              :is-loading="isLoading"
              @click="loadProfile"
          />
        </div>

        <div class="admin-profile-dialog__actions">
          <BaseButton
              :label="uk.admin.actions.save"
              type="submit"
              variant="primary"
              :disabled="isSaving"
              :is-loading="isSaving"
          />
        </div>
      </template>
    </form>
  </AppDialogShell>
</template>
