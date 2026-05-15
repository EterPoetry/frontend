<script setup lang="ts">
import { useLoginForm } from "@/modules/auth/composables/useLoginForm";
import { AuthEvents } from "@/modules/auth/enums/auth-events.enum";
import { AUTH_MAX_LENGTH } from "@/modules/auth/constants/auth-max-length.constants";
import BaseInput from "@/shared/components/BaseInput/BaseInput.vue";
import BaseButton from "@/shared/components/BaseButton/BaseButton.vue";
import ErrorAlert from "@/shared/components/ErrorAlert/ErrorAlert.vue";
import googleIconUrl from "@/shared/assets/icons/google.svg";
import "./LoginForm.css";
import { AuthData } from "@/modules/auth/interfaces/auth-data.interface.ts";

const emit = defineEmits<{
  (event: typeof AuthEvents.LOGIN, data: Pick<AuthData, 'email' | 'password'>): void;
  (event: AuthEvents.FORGOT_PASSWORD): void;
  (event: AuthEvents.REGISTER): void;
}>();

const {
  email,
  password,
  isLoading,
  errorMessage,
  login,
  common,
  loginWithGoogle,
  handleSubmit
} = useLoginForm(emit);
</script>

<template>
  <form class="login-form" @submit.prevent="handleSubmit" novalidate>
    <ErrorAlert v-if="errorMessage" :message="errorMessage" />

    <div class="login-form-fields">
      <BaseInput
          id="email"
          v-model="email"
          :label="common.labels.email"
          type="text"
          :placeholder="login.placeholders.email"
          :max-length="AUTH_MAX_LENGTH.EMAIL"
      />
      <BaseInput
          id="password"
          v-model="password"
          :label="common.labels.password"
          type="password"
          :placeholder="login.placeholders.password"
          :max-length="AUTH_MAX_LENGTH.PASSWORD"
      />
    </div>

    <div class="login-form-actions">
      <BaseButton
          :label="login.labels.submit"
          type="submit"
          variant="primary"
          :disabled="isLoading"
          :is-loading="isLoading"
      />
    </div>

    <div class="login-footer-links">
      <button type="button" class="login-link" @click="emit(AuthEvents.FORGOT_PASSWORD)">
        {{ login.labels.forgotPassword }}
      </button>
      <button type="button" class="login-link" @click="emit(AuthEvents.REGISTER)">
        {{ login.labels.createAccount }}
      </button>
    </div>

    <div class="login-separator">
      <span class="login-separator-text">{{ common.labels.separator }}</span>
    </div>

    <BaseButton
        :label="common.labels.google"
        type="button"
        variant="secondary"
        :disabled="isLoading"
        @click="loginWithGoogle"
    >
      <template #icon>
        <img :src="googleIconUrl" alt="Google" width="20" height="20" />
      </template>
    </BaseButton>
  </form>
</template>
