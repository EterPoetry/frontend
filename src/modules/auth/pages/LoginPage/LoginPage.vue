<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/modules/auth/auth.store";
import { AuthRouteNames } from "@/modules/auth/enums/auth-route-names.enum";
import { PostRouteNames } from "@/modules/posts/enums/post-route-names.enum";
import { uk } from "@/shared/locales/uk";
import LoginForm from "@/modules/auth/components/LoginForm/LoginForm.vue";
import ErrorAlert from "@/shared/components/ErrorAlert/ErrorAlert.vue";
import logoUrl from "@/shared/assets/icons/eter-logo.svg";
import "./LoginPage.css";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const oauthError = ref('');

onMounted(() => {
  const errorCode = route.query.error as string | undefined;
  if (errorCode === 'ACCOUNT_BLOCKED') {
    oauthError.value = uk.auth.login.errors.accountBlocked;
  } else if (errorCode) {
    oauthError.value = uk.auth.login.errors.authFailed;
  }
  if (errorCode) {
    router.replace({ query: {} });
  }
});

const handleLoginSuccess = async (): Promise<void> => {
  if (authStore.isVerified) {
    await router.push({ name: PostRouteNames.HOME });
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
      <RouterLink class="login-logo-section" to="/">
        <img :src="logoUrl" :alt="uk.common.appName" class="login-logo" />
        <div class="login-divider-line"></div>
      </RouterLink>

      <ErrorAlert v-if="oauthError" :message="oauthError" />

      <LoginForm
          @login="handleLoginSuccess"
          @forgot-password="handleForgotPassword"
          @register="handleRegister"
      />
    </div>
  </div>
</template>
