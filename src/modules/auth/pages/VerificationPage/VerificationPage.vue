<script setup lang="ts">
import { useRouter } from "vue-router";
import { PostRouteNames } from "@/modules/posts/enums/post-route-names.enum";
import { uk } from "@/shared/locales/uk";
import VerificationForm from "@/modules/auth/components/VerificationForm/VerificationForm.vue";
import logoUrl from "@/shared/assets/icons/eter-logo.svg";
import "./VerificationPage.css";

const router = useRouter();

const handleVerifySuccess = async (): Promise<void> => {
  await router.push({ name: PostRouteNames.HOME });
};
</script>

<template>
  <div class="verification-page">
    <div class="verification-card">
      <div class="verification-logo-section">
        <img :src="logoUrl" :alt="uk.common.appName" class="verification-logo" />
        <div class="verification-divider-line"></div>
      </div>

      <VerificationForm @verify="handleVerifySuccess" />
    </div>
  </div>
</template>
