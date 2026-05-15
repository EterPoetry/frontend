<script setup lang="ts">
import { useRouter } from "vue-router";
import { AuthRouteNames } from "@/modules/auth/enums/auth-route-names.enum";
import { uk } from "@/shared/locales/uk";
import RegisterForm from "@/modules/auth/components/RegisterForm/RegisterForm.vue";
import logoUrl from "@/shared/assets/icons/eter-logo.svg";
import "./RegisterPage.css";

const router = useRouter();

const handleRegisterSuccess = async (): Promise<void> => {
  await router.push({ name: AuthRouteNames.VERIFICATION });
};

const handleLoginNavigate = (): void => {
  router.push({ name: AuthRouteNames.LOGIN });
};
</script>

<template>
  <div class="register-page">
    <div class="register-card">
      <RouterLink class="register-logo-section" to="/">
        <img :src="logoUrl" :alt="uk.common.appName" class="register-logo" />
        <div class="register-divider-line"></div>
      </RouterLink>

      <RegisterForm
          @register="handleRegisterSuccess"
          @login="handleLoginNavigate"
      />
    </div>
  </div>
</template>
