<script setup lang="ts">
import { useRouter } from "vue-router";
import { AuthRouteNames } from "@/modules/auth/enums/auth-route-names.enum";
import { uk } from "@/shared/locales/uk";
import ForgotPasswordForm from "../../components/ForgotPasswordForm/ForgotPasswordForm.vue";
import logoUrl from "@/shared/assets/icons/eter-logo.svg";
import "./ForgotPasswordPage.css";

const router = useRouter();

const handleLoginNavigate = (): void => {
  router.push({ name: AuthRouteNames.LOGIN });
};
</script>

<template>
  <div class="forgot-password-page">
    <div class="forgot-password-card">
      <div class="forgot-password-logo-section">
        <img :src="logoUrl" :alt="uk.common.appName" class="forgot-password-logo" />
        <div class="forgot-password-divider-line"></div>
      </div>

      <ForgotPasswordForm @login="handleLoginNavigate" />
    </div>
  </div>
</template>