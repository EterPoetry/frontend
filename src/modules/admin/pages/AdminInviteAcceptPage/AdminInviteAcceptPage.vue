<script setup lang="ts">
import { isAxiosError } from 'axios';
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAdminStore } from '@/modules/admin/admin.store';
import {
    ADMIN_INVITE_TOKEN_LENGTH,
    ADMIN_MAX_EMAIL_LENGTH,
    ADMIN_MAX_NAME_LENGTH,
    ADMIN_MAX_PASSWORD_LENGTH,
    ADMIN_MIN_NAME_LENGTH,
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
import './AdminInviteAcceptPage.css';

const route = useRoute();
const router = useRouter();
const adminStore = useAdminStore();

const name = ref('');
const email = ref('');
const password = ref('');
const errorMessage = ref('');
const isSubmitting = ref(false);

const inviteToken = computed(() => {
    const rawToken = route.query.token;
    return typeof rawToken === 'string' ? rawToken : '';
});

const handleSubmit = async (): Promise<void> => {
    errorMessage.value = '';

    if (inviteToken.value.length !== ADMIN_INVITE_TOKEN_LENGTH) {
        errorMessage.value = uk.admin.inviteAccept.tokenMissing;
        return;
    }

    if (!name.value.trim() || !email.value.trim() || !password.value.trim()) {
        errorMessage.value = uk.common.errors.emptyFields;
        return;
    }

    if (name.value.trim().length < ADMIN_MIN_NAME_LENGTH) {
        errorMessage.value = uk.common.errors.nameTooShort(ADMIN_MIN_NAME_LENGTH);
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
        await adminStore.acceptInvite(inviteToken.value, {
            name: name.value.trim(),
            email: email.value.trim(),
            password: password.value,
        });
        await router.push({ name: AdminRouteNames.DASHBOARD });
    } catch (error) {
        if (isAxiosError(error) && (error.response?.status === 400 || error.response?.status === 404)) {
            errorMessage.value = uk.admin.inviteAccept.expired;
        } else {
            errorMessage.value = getApiErrorMessage(error) ?? uk.common.errors.serverError;
        }
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
  <div class="admin-invite-accept-page">
    <section class="admin-invite-accept-page__card" aria-labelledby="admin-invite-accept-title">
      <RouterLink class="admin-invite-accept-page__logo-section" to="/">
        <img :src="logoUrl" :alt="uk.common.appName" class="admin-invite-accept-page__logo" />
        <div class="admin-invite-accept-page__divider-line" />
      </RouterLink>

      <div class="admin-invite-accept-page__copy">
        <p class="admin-invite-accept-page__eyebrow">{{ uk.admin.subtitle }}</p>
        <h1 id="admin-invite-accept-title" class="admin-invite-accept-page__title">
          {{ uk.admin.inviteAccept.title }}
        </h1>
        <p class="admin-invite-accept-page__description">
          {{ uk.admin.inviteAccept.description }}
        </p>
      </div>

      <form class="admin-invite-accept-page__form" @submit.prevent="handleSubmit">
        <BaseInput
            id="admin-invite-name"
            v-model="name"
            :label="uk.common.labels.name"
            :type="'text'"
            :placeholder="uk.admin.inviteAccept.namePlaceholder"
            :max-length="ADMIN_MAX_NAME_LENGTH"
            :disabled="isSubmitting"
        />

        <BaseInput
            id="admin-invite-email"
            v-model="email"
            :label="uk.common.labels.email"
            :type="'email'"
            :placeholder="uk.admin.inviteAccept.emailPlaceholder"
            :max-length="ADMIN_MAX_EMAIL_LENGTH"
            :disabled="isSubmitting"
        />

        <BaseInput
            id="admin-invite-password"
            v-model="password"
            :label="uk.common.labels.password"
            :type="'password'"
            :placeholder="uk.admin.inviteAccept.passwordPlaceholder"
            :max-length="ADMIN_MAX_PASSWORD_LENGTH"
            :disabled="isSubmitting"
        />

        <ErrorAlert v-if="errorMessage" :message="errorMessage" />

        <BaseButton
            :label="uk.admin.inviteAccept.submit"
            type="submit"
            variant="primary"
            :disabled="isSubmitting"
            :is-loading="isSubmitting"
        />
      </form>
    </section>
  </div>
</template>
