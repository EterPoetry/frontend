<script setup lang="ts">
import { isAxiosError } from 'axios';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAdminStore } from '@/modules/admin/admin.store';
import {
    ADMIN_MAX_EMAIL_LENGTH,
    ADMIN_MAX_PASSWORD_LENGTH,
    ADMIN_MIN_PASSWORD_LENGTH,
} from '@/modules/admin/constants/admin.constants';
import { AdminRouteNames } from '@/modules/admin/enums/admin-route-names.enum';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import BaseInput from '@/shared/components/BaseInput/BaseInput.vue';
import ErrorAlert from '@/shared/components/ErrorAlert/ErrorAlert.vue';
import { AUTH_VALIDATION } from '@/modules/auth/constants/auth-validation.constants';
import logoUrl from '@/shared/assets/icons/eter-logo.svg';
import { getApiErrorMessage } from '@/shared/utils/api-error.utils';
import { uk } from '@/shared/locales/uk';
import './AdminLoginPage.css';

const router = useRouter();
const adminStore = useAdminStore();

const email = ref('');
const password = ref('');
const errorMessage = ref('');
const isSubmitting = ref(false);

const handleSubmit = async (): Promise<void> => {
    errorMessage.value = '';

    if (!email.value.trim() || !password.value.trim()) {
        errorMessage.value = uk.common.errors.emptyFields;
        return;
    }

    if (!AUTH_VALIDATION.EMAIL_REGEX.test(email.value.trim())) {
        errorMessage.value = uk.common.errors.invalidEmail;
        return;
    }

    if (password.value.length < ADMIN_MIN_PASSWORD_LENGTH) {
        errorMessage.value = uk.common.errors.passwordTooShort(ADMIN_MIN_PASSWORD_LENGTH);
        return;
    }

    isSubmitting.value = true;

    try {
        await adminStore.login({
            email: email.value.trim(),
            password: password.value,
        });
        await router.push({ name: AdminRouteNames.DASHBOARD });
    } catch (error) {
        if (isAxiosError(error)) {
            if (error.response?.status === 401) {
                errorMessage.value = uk.admin.login.invalidCredentials;
            } else if (error.response?.status === 409) {
                errorMessage.value = uk.admin.login.inactiveInvite;
            } else if (error.response?.status === 403) {
                errorMessage.value = uk.admin.forbidden;
            } else {
                errorMessage.value = getApiErrorMessage(error) ?? uk.common.errors.serverError;
            }
        } else {
            errorMessage.value = uk.common.errors.serverError;
        }
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
  <div class="admin-login-page">
    <section class="admin-login-page__card" aria-labelledby="admin-login-title">
      <RouterLink class="admin-login-page__logo-section" to="/">
        <img :src="logoUrl" :alt="uk.common.appName" class="admin-login-page__logo" />
        <div class="admin-login-page__divider-line" />
      </RouterLink>

      <div class="admin-login-page__copy">
        <p class="admin-login-page__eyebrow">{{ uk.admin.subtitle }}</p>
        <h1 id="admin-login-title" class="admin-login-page__title">
          {{ uk.admin.login.title }}
        </h1>
        <p class="admin-login-page__description">
          {{ uk.admin.login.description }}
        </p>
      </div>

      <form class="admin-login-page__form" @submit.prevent="handleSubmit">
        <BaseInput
            id="admin-login-email"
            v-model="email"
            :label="uk.common.labels.email"
            :type="'email'"
            :placeholder="uk.admin.login.emailPlaceholder"
            :max-length="ADMIN_MAX_EMAIL_LENGTH"
            :disabled="isSubmitting"
        />

        <BaseInput
            id="admin-login-password"
            v-model="password"
            :label="uk.common.labels.password"
            :type="'password'"
            :placeholder="uk.admin.login.passwordPlaceholder"
            :max-length="ADMIN_MAX_PASSWORD_LENGTH"
            :disabled="isSubmitting"
        />

        <ErrorAlert v-if="errorMessage" :message="errorMessage" />

        <BaseButton
            :label="uk.admin.login.submit"
            type="submit"
            variant="primary"
            :disabled="isSubmitting"
            :is-loading="isSubmitting"
        />
      </form>
    </section>
  </div>
</template>
