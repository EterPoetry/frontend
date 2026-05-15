<script setup lang="ts">
import { useResetPasswordForm } from "@/modules/auth/composables/useResetPasswordForm";
import { AuthEvents } from "@/modules/auth/enums/auth-events.enum";
import { AUTH_MAX_LENGTH } from "@/modules/auth/constants/auth-max-length.constants";
import BaseInput from "@/shared/components/BaseInput/BaseInput.vue";
import BaseButton from "@/shared/components/BaseButton/BaseButton.vue";
import ErrorAlert from "@/shared/components/ErrorAlert/ErrorAlert.vue";
import "./ResetPasswordForm.css";

const emit = defineEmits<{
  (event: AuthEvents.RESET_PASSWORD): void;
  (event: AuthEvents.LOGIN): void;
}>();

const {
  password,
  passwordConfirm,
  isLoading,
  errorMessage,
  resetPassword,
  register,
  common,
  handleSubmit
} = useResetPasswordForm(emit);
</script>

<template>
  <div class="reset-password-container">
    <h1 class="reset-password-title">{{ resetPassword.labels.title }}</h1>

    <form class="reset-password-form" @submit.prevent="handleSubmit" novalidate>
      <p class="reset-password-description">
        {{ resetPassword.info.description }}
      </p>

      <ErrorAlert v-if="errorMessage" :message="errorMessage" />

      <div class="reset-password-form-fields">
        <BaseInput
            id="password"
            v-model="password"
            :label="common.labels.password"
            type="password"
            :placeholder="resetPassword.placeholders.password"
            :max-length="AUTH_MAX_LENGTH.PASSWORD"
        />
        <BaseInput
            id="passwordConfirm"
            v-model="passwordConfirm"
            :label="register.labels.passwordConfirm"
            type="password"
            :placeholder="resetPassword.placeholders.passwordConfirm"
            :max-length="AUTH_MAX_LENGTH.PASSWORD"
        />
      </div>

      <div class="reset-password-form-actions">
        <BaseButton
            :label="resetPassword.labels.submit"
            type="submit"
            variant="primary"
            :disabled="isLoading"
            :is-loading="isLoading"
        />
        <BaseButton
            :label="common.labels.cancel"
            type="button"
            variant="secondary"
            :disabled="isLoading"
            @click="emit(AuthEvents.LOGIN)"
        />
      </div>
    </form>
  </div>
</template>
