<script setup lang="ts">
import { useForgotPasswordForm } from "@/modules/auth/composables/useForgotPasswordForm";
import { AuthEvents } from "@/modules/auth/enums/auth-events.enum";
import { AUTH_MAX_LENGTH } from "@/modules/auth/constants/auth-max-length.constants";
import BaseInput from "@/shared/components/BaseInput/BaseInput.vue";
import BaseButton from "@/shared/components/BaseButton/BaseButton.vue";
import ErrorAlert from "@/shared/components/ErrorAlert/ErrorAlert.vue";
import "./ForgotPasswordForm.css";

const emit = defineEmits<{
  (event: AuthEvents.FORGOT_PASSWORD): void;
  (event: AuthEvents.LOGIN): void;
}>();

const {
  email,
  isLoading,
  isSent,
  errorMessage,
  forgotPassword,
  common,
  handleSubmit
} = useForgotPasswordForm(emit);
</script>

<template>
  <div class="forgot-password-container">
    <h1 class="forgot-password-title">{{ forgotPassword.labels.title }}</h1>

    <div v-if="isSent" class="forgot-password-success">
      <p class="success-message">{{ forgotPassword.info.resetSent }}</p>
      <BaseButton
          :label="forgotPassword.labels.backToLogin"
          type="button"
          variant="primary"
          :disabled="isLoading"
          @click="emit(AuthEvents.LOGIN)"
      />
    </div>

    <form v-else class="forgot-password-form" @submit.prevent="handleSubmit" novalidate>
      <p class="forgot-password-description">
        {{ forgotPassword.info.description }}
      </p>

      <ErrorAlert v-if="errorMessage" :message="errorMessage" />

      <div class="forgot-password-fields">
        <BaseInput
            id="email"
            v-model="email"
            :label="common.labels.email"
            type="text"
            :placeholder="forgotPassword.placeholders.email"
            :max-length="AUTH_MAX_LENGTH.EMAIL"
        />
      </div>

      <div class="forgot-password-actions">
        <BaseButton
            :label="forgotPassword.labels.submit"
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
