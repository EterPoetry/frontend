<script setup lang="ts">
import { useRegisterForm } from "@/modules/auth/composables/useRegisterForm";
import { AuthData } from "@/modules/auth/interfaces/auth-data.interface.ts";
import { AuthEvents } from "@/modules/auth/enums/auth-events.enum";
import { AUTH_MAX_LENGTH } from "@/modules/auth/constants/auth-max-length.constants";
import BaseInput from "@/shared/components/BaseInput/BaseInput.vue";
import BaseButton from "@/shared/components/BaseButton/BaseButton.vue";
import ErrorAlert from "@/shared/components/ErrorAlert/ErrorAlert.vue";
import googleIconUrl from "@/shared/assets/icons/google.svg";
import "./RegisterForm.css";

const emit = defineEmits<{
  (event: typeof AuthEvents.REGISTER, data: AuthData): void;
  (event: AuthEvents.LOGIN): void;
}>();

const {
  name,
  username,
  email,
  password,
  passwordConfirm,
  isLoading,
  errorMessage,
  fieldErrors,
  register,
  common,
  loginWithGoogle,
  handleSubmit
} = useRegisterForm(emit);
</script>

<template>
  <form class="register-form" @submit.prevent="handleSubmit" novalidate>
    <ErrorAlert v-if="errorMessage" :message="errorMessage" />

    <div class="register-form-fields">
      <BaseInput
          id="name"
          v-model="name"
          :label="common.labels.name"
          type="text"
          :placeholder="register.placeholders.name"
          :max-length="AUTH_MAX_LENGTH.NAME"
      />
      <BaseInput
          id="username"
          v-model="username"
          :label="common.labels.username"
          type="text"
          :placeholder="register.placeholders.username"
          :max-length="AUTH_MAX_LENGTH.USERNAME"
          :error-message="fieldErrors.username"
      />
      <BaseInput
          id="email"
          v-model="email"
          :label="common.labels.email"
          type="text"
          :placeholder="register.placeholders.email"
          :max-length="AUTH_MAX_LENGTH.EMAIL"
          :error-message="fieldErrors.email"
      />
      <BaseInput
          id="password"
          v-model="password"
          :label="common.labels.password"
          type="password"
          :placeholder="register.placeholders.password"
          :max-length="AUTH_MAX_LENGTH.PASSWORD"
      />
      <BaseInput
          id="passwordConfirm"
          v-model="passwordConfirm"
          :label="register.labels.passwordConfirm"
          type="password"
          :placeholder="register.placeholders.passwordConfirm"
          :max-length="AUTH_MAX_LENGTH.PASSWORD"
      />
    </div>

    <div class="register-form-actions">
      <BaseButton
          :label="isLoading ? common.labels.loading : register.labels.submit"
          type="submit"
          variant="primary"
          :disabled="isLoading"
      />
    </div>

    <div class="register-footer-links">
      <span class="register-text-muted">{{ register.labels.alreadyHaveAccount }}</span>
      <button type="button" class="register-link" @click="emit(AuthEvents.LOGIN)">
        {{ register.labels.login }}
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
