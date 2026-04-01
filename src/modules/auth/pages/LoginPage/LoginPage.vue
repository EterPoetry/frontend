<script setup lang="ts">
import { useRouter } from "vue-router";
import { useAuthStore } from "@/modules/auth/auth.store";
import { AuthRouteNames } from "@/modules/auth/enums/auth-route-names.enum";
import { uk } from "@/shared/locales/uk";
import LoginForm from "@/modules/auth/components/LoginForm/LoginForm.vue";
import logoUrl from "@/shared/assets/icons/eter-logo.svg";
import "./LoginPage.css";

const router = useRouter();
const authStore = useAuthStore();

const handleLoginSuccess = async (): Promise<void> => {
  if (authStore.isVerified) {
    await router.push({ name: AuthRouteNames.HOME });
  } else {
    await router.push({ name: AuthRouteNames.VERIFICATION });
  }
};

const handleForgotPassword = (): void => {
  router.push({ name: AuthRouteNames.FORGOT_PASSWORD });
};

const handleRegister = (): void => {
  router.push({ name: AuthRouteNames.REGISTER });
};
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo-section">
        <img :src="logoUrl" :alt="uk.common.appName" class="login-logo" />
        <div class="login-divider-line"></div>
      </div>

      <LoginForm
          @login="handleLoginSuccess"
          @forgot-password="handleForgotPassword"
          @register="handleRegister"
      />
    </div>
  </div>
</template>