<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { AuthRouteNames } from "@/modules/auth/enums/auth-route-names.enum";
import { uk } from "@/shared/locales/uk";
import ResetPasswordForm from "../../components/ResetPasswordForm/ResetPasswordForm.vue";
import BaseButton from "@/shared/components/BaseButton/BaseButton.vue";
import logoUrl from "@/shared/assets/icons/eter-logo.svg";
import "./ResetPasswordPage.css";

const router = useRouter();
const isSubmitted = ref(false);

const handleSuccess = (): void => {
  isSubmitted.value = true;
};

const handleLoginNavigate = (): void => {
  router.push({ name: AuthRouteNames.LOGIN });
};
</script>

<template>
  <div class="reset-password-page">
    <div class="reset-password-card">
      <div class="reset-password-logo-section">
        <img :src="logoUrl" :alt="uk.common.appName" class="reset-password-logo" />
        <div class="reset-password-divider-line"></div>
      </div>

      <div v-if="isSubmitted" class="reset-success-container">
        <p class="reset-success-text">{{ uk.auth.resetPassword.info.success }}</p>
        <BaseButton
            :label="uk.auth.resetPassword.labels.successBack"
            type="button"
            variant="primary"
            :disabled="false"
            @click="handleLoginNavigate"
        />
      </div>

      <ResetPasswordForm
          v-else
          @reset-password="handleSuccess"
          @login="handleLoginNavigate"
      />
    </div>
  </div>
</template>