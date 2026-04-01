<script setup lang="ts">
import { useVerificationForm } from "@/modules/auth/composables/useVerificationForm";
import { AuthEvents } from "@/modules/auth/enums/auth-events.enum";
import BaseButton from "@/shared/components/BaseButton/BaseButton.vue";
import BaseTimer from "@/shared/components/BaseTimer/BaseTimer.vue";
import BaseCodeInput from "@/shared/components/BaseCodeInput/BaseCodeInput.vue";
import ErrorAlert from "@/shared/components/ErrorAlert/ErrorAlert.vue";
import "./VerificationForm.css";

const emit = defineEmits<{
  (event: AuthEvents.VERIFY, code: string): void;
  (event: AuthEvents.RESEND_CODE): void;
}>();

const {
  verification,
  isLoading,
  isReady,
  remainingMs,
  verificationCode,
  errorMessage,
  currentDescription,
  codeLength,
  handleCodeUpdate,
  handleVerifyCode,
  onTimerFinished,
  handleSendRequest,
  handleLogout
} = useVerificationForm(emit);
</script>

<template>
  <form class="verification-form" @submit.prevent>
    <h1 class="verification-title">{{ verification.labels.title }}</h1>

    <p v-if="isReady" class="verification-description" v-html="currentDescription"></p>

    <ErrorAlert v-if="errorMessage" :message="errorMessage" />

    <BaseCodeInput
        :model-value="verificationCode"
        :length="codeLength"
        :disabled="isLoading || !isReady"
        @update-model-value="handleCodeUpdate"
        @complete="handleVerifyCode"
    />

    <div v-if="isReady" class="verification-actions">
      <div v-if="remainingMs === null && !isLoading">
        <BaseButton
            :label="verification.labels.resend"
            variant="primary"
            type="button"
            :disabled="isLoading"
            @click="handleSendRequest"
        />
      </div>

      <div v-else-if="remainingMs !== null && !isLoading" class="verification-timeout">
        <span>{{ verification.labels.timeout }}</span>
        <BaseTimer
            :ms="remainingMs"
            @finished="onTimerFinished"
        />
      </div>

      <button class="logout-link" type="button" @click="handleLogout">
        {{ verification.labels.logout }}
      </button>
    </div>
  </form>
</template>