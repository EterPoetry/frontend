<script setup lang="ts">
import SubscriptionDialog from '@/modules/payments/components/SubscriptionDialog/SubscriptionDialog.vue';
import { usePaymentsReturnPage } from '@/modules/payments/composables/usePaymentsReturnPage';
import AppShell from '@/shared/components/AppShell/AppShell.vue';
import BaseLoader from '@/shared/components/BaseLoader/BaseLoader.vue';
import { uk } from '@/shared/locales/uk';
import './PaymentsReturnPage.css';

const {
    authStore,
    categoryId,
    closeDialog,
    handleCreateClick,
    isAuthenticated,
    isDialogOpen,
    openLogin,
    openRegister,
    returnAction,
    search,
    sortBy,
} = usePaymentsReturnPage();
</script>

<template>
  <AppShell
      v-model:search="search"
      v-model:sort-by="sortBy"
      v-model:category-id="categoryId"
      :is-authenticated="isAuthenticated"
      :active-nav-key="'home'"
      @create="handleCreateClick"
      @login="openLogin"
      @register="openRegister"
      @logout="authStore.logout"
  >
    <section class="payments-return-page">
      <div class="payments-return-page__card">
        <h1 class="payments-return-page__title">{{ uk.payments.returnPage.title }}</h1>
        <p class="payments-return-page__text">{{ uk.payments.returnPage.description }}</p>
        <div class="payments-return-page__loader">
          <BaseLoader :label="uk.common.labels.loading" size="sm" tone="primary" variant="wave" centered />
        </div>
      </div>
    </section>
  </AppShell>

  <SubscriptionDialog :is-open="isDialogOpen" :return-action="returnAction" @close="closeDialog" />
</template>
