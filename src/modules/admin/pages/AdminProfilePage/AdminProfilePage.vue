<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { isAxiosError } from 'axios';
import { useAdminStore } from '@/modules/admin/admin.store';
import {
    ADMIN_MAX_EMAIL_LENGTH,
    ADMIN_MAX_NAME_LENGTH,
    ADMIN_MAX_PASSWORD_LENGTH,
    ADMIN_MIN_PASSWORD_LENGTH,
} from '@/modules/admin/constants/admin.constants';
import { AdminRole } from '@/modules/admin/enums/admin-role.enum';
import AdminShell from '@/modules/admin/components/AdminShell/AdminShell.vue';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import BaseField from '@/shared/components/BaseField/BaseField.vue';
import BaseInput from '@/shared/components/BaseInput/BaseInput.vue';
import BaseLoader from '@/shared/components/BaseLoader/BaseLoader.vue';
import ErrorAlert from '@/shared/components/ErrorAlert/ErrorAlert.vue';
import { AUTH_VALIDATION } from '@/modules/auth/constants/auth-validation.constants';
import { getApiErrorMessage } from '@/shared/utils/api-error.utils';
import { uk } from '@/shared/locales/uk';
import '@/modules/admin/pages/admin-page-shared.css';
import './AdminProfilePage.css';

const adminStore = useAdminStore();

const name = ref('');
const email = ref('');
const newPassword = ref('');
const currentPassword = ref('');
const errorMessage = ref('');
const successMessage = ref('');
const isLoading = ref(false);
const isSaving = ref(false);

const roleLabel = computed(() => adminStore.admin?.role === AdminRole.GLOBAL_ADMIN
    ? uk.admin.roles.globalAdmin
    : uk.admin.roles.admin);

const syncForm = (): void => {
    name.value = adminStore.admin?.name ?? '';
    email.value = adminStore.admin?.email ?? '';
    newPassword.value = '';
    currentPassword.value = '';
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

const handleSubmit = async (): Promise<void> => {
    errorMessage.value = '';
    successMessage.value = '';

    if (!name.value.trim() || !email.value.trim()) {
        errorMessage.value = uk.common.errors.emptyFields;
        return;
    }

    if (!AUTH_VALIDATION.EMAIL_REGEX.test(email.value.trim())) {
        errorMessage.value = uk.common.errors.invalidEmail;
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
        successMessage.value = uk.admin.profile.saveSuccess;
        syncForm();
    } catch (error) {
        if (isAxiosError(error) && error.response?.status === 403) {
            errorMessage.value = uk.admin.forbidden;
        } else {
            errorMessage.value = getApiErrorMessage(error) ?? uk.common.errors.serverError;
        }
    } finally {
        isSaving.value = false;
    }
};

onMounted(() => {
    syncForm();
    void loadProfile();
});
</script>

<template>
  <AdminShell :title="uk.admin.profile.title" :description="uk.admin.profile.description">
    <section class="admin-page">
      <div class="admin-page__grid">
        <section class="admin-page__panel admin-profile-page__form-panel">
          <form class="admin-profile-page__form" @submit.prevent="handleSubmit">
            <BaseField
                id="admin-profile-name"
                v-model="name"
                :label="uk.common.labels.name"
                :placeholder="uk.admin.profile.namePlaceholder"
                :max-length="ADMIN_MAX_NAME_LENGTH"
                :disabled="isSaving || isLoading"
            />

            <BaseField
                id="admin-profile-email"
                v-model="email"
                :label="uk.common.labels.email"
                :placeholder="uk.admin.profile.emailPlaceholder"
                :max-length="ADMIN_MAX_EMAIL_LENGTH"
                :disabled="isSaving || isLoading"
            />

            <BaseInput
                id="admin-profile-new-password"
                v-model="newPassword"
                :label="uk.admin.profile.newPasswordLabel"
                :type="'password'"
                :placeholder="uk.admin.profile.newPasswordPlaceholder"
                :max-length="ADMIN_MAX_PASSWORD_LENGTH"
                :disabled="isSaving || isLoading"
            />

            <BaseInput
                id="admin-profile-current-password"
                v-model="currentPassword"
                :label="uk.admin.profile.currentPasswordLabel"
                :type="'password'"
                :placeholder="uk.admin.profile.currentPasswordPlaceholder"
                :max-length="ADMIN_MAX_PASSWORD_LENGTH"
                :disabled="isSaving || isLoading"
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
            <p v-if="successMessage" class="admin-page__feedback">{{ successMessage }}</p>

            <div class="admin-profile-page__actions">
              <BaseButton
                  :label="uk.admin.actions.save"
                  type="submit"
                  variant="primary"
                  :disabled="isSaving || isLoading"
                  :is-loading="isSaving"
              />
            </div>
          </form>
        </section>

        <aside class="admin-page__detail">
          <div class="admin-page__detail-header">
            <h2 class="admin-page__detail-title">{{ adminStore.admin?.name }}</h2>
            <span class="admin-page__detail-subtitle">{{ roleLabel }}</span>
          </div>

          <div v-if="isLoading" class="admin-page__loading">
            <BaseLoader :label="uk.common.labels.loading" size="md" tone="primary" variant="wave" centered />
          </div>

          <div v-else class="admin-page__detail-list">
            <div class="admin-page__detail-item">
              <span class="admin-page__detail-label">{{ uk.common.labels.email }}</span>
              <span class="admin-page__detail-value">{{ adminStore.admin?.email }}</span>
            </div>
            <div class="admin-page__detail-item">
              <span class="admin-page__detail-label">{{ uk.admin.admins.role }}</span>
              <span class="admin-page__detail-value">{{ roleLabel }}</span>
            </div>
            <div class="admin-page__detail-item">
              <span class="admin-page__detail-label">{{ uk.admin.status.active }}</span>
              <span class="admin-page__detail-value">
                {{ adminStore.admin?.isActive ? uk.admin.status.active : uk.admin.status.invited }}
              </span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  </AdminShell>
</template>
