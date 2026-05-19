<script setup lang="ts">
import type { PaymentReturnAction } from '@/modules/payments/interfaces/payment-return-action.type';
import { useSubscriptionDialog } from '@/modules/payments/composables/useSubscriptionDialog';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import BaseLoader from '@/shared/components/BaseLoader/BaseLoader.vue';
import ErrorAlert from '@/shared/components/ErrorAlert/ErrorAlert.vue';
import AppDialogShell from '@/shared/components/AppDialogShell/AppDialogShell.vue';
import closeIconUrl from '@/shared/assets/icons/ui/close.svg';
import { uk } from '@/shared/locales/uk';
import './SubscriptionDialog.css';

const props = defineProps<{
    isOpen: boolean;
    returnAction?: PaymentReturnAction | null;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
}>();

const {
    canCancel,
    canLoadMoreTransactions,
    canOpenTransactionsDialog,
    canUpdateCard,
    closeDialog,
    closeTransactionsDialog,
    currentViewClassName,
    errorMessage,
    formatAmount,
    formatDate,
    freeDurationLimitMinutes,
    getTransactionStatusClassName,
    getTransactionStatusLabel,
    handleCancellationConfirm,
    handleCardUpdate,
    handlePrimaryAction,
    hasVisibleTransactions,
    isCancelConfirmOpen,
    isCancellationSubmitting,
    isCardUpdateSubmitting,
    isCheckoutSubmitting,
    isLoading,
    isPastDue,
    isTransactionsDialogOpen,
    isTransactionsLoading,
    isTransactionsLoadingMore,
    noticeMessage,
    openTransactionsDialog,
    premiumDurationLimitMinutes,
    primaryActionLabel,
    reconciliationNotice,
    shouldShowManagement,
    statusClassName,
    statusLabel,
    subscription,
    subscriptionPriceUsd,
    setTransactionsDialogBody,
    setTransactionsLoadMoreTrigger,
    subtitle,
    title,
    transactionsDialogMessage,
    visibleTransactions,
} = useSubscriptionDialog(props, () => emit('close'));
</script>

<template>
  <AppDialogShell
      :is-open="isOpen"
      class="subscription-dialog"
      :title="title"
      :subtitle="subtitle"
      size="lg"
      @close="closeDialog"
  >
    <div class="subscription-dialog__content" :class="currentViewClassName">
      <div v-if="errorMessage" class="subscription-dialog__alert">
        <ErrorAlert :message="errorMessage" />
      </div>

      <div class="subscription-dialog__body" :class="currentViewClassName">
        <div v-if="isLoading" class="subscription-dialog__loader" :class="currentViewClassName">
          <BaseLoader size="md" tone="primary" variant="wave" centered />
        </div>

        <template v-else-if="isCancelConfirmOpen">
          <section class="subscription-dialog__confirm">
            <h3 class="subscription-dialog__confirm-title">{{ uk.payments.cancel.title }}</h3>
            <p class="subscription-dialog__confirm-message">{{ uk.payments.cancel.message }}</p>

            <div class="subscription-dialog__confirm-actions">
              <BaseButton
                  :label="uk.payments.cancel.keep"
                  type="button"
                  variant="secondary"
                  :disabled="isCancellationSubmitting"
                  @click="isCancelConfirmOpen = false"
              />
              <BaseButton
                  :label="uk.payments.cancel.confirm"
                  type="button"
                  variant="primary"
                  :disabled="false"
                  :is-loading="isCancellationSubmitting"
                  @click="handleCancellationConfirm"
              />
            </div>
          </section>
        </template>

        <template v-else-if="shouldShowManagement">
          <section v-if="reconciliationNotice" class="subscription-dialog__notice-card">
            <div class="subscription-dialog__notice-card-head">
              <p class="subscription-dialog__notice-card-title">{{ reconciliationNotice.title }}</p>
              <BaseLoader
                  v-if="reconciliationNotice.isPending"
                  :label="uk.common.labels.loading"
                  size="sm"
                  tone="primary"
                  variant="wave"
                  centered
              />
            </div>
            <p class="subscription-dialog__notice-card-text">{{ reconciliationNotice.message }}</p>
          </section>

          <section class="subscription-dialog__status-card">
            <div class="subscription-dialog__status-copy">
              <p class="subscription-dialog__status-row">
                <span class="subscription-dialog__status-label">{{ uk.payments.manage.statusLabel }}</span>
                <strong class="subscription-dialog__status-value" :class="statusClassName">{{ statusLabel }}</strong>
              </p>
              <p v-if="subscription?.nextPaymentDate" class="subscription-dialog__status-row">
                <span class="subscription-dialog__status-label">{{ uk.payments.manage.nextPaymentLabel }}</span>
                <strong>{{ formatDate(subscription.nextPaymentDate) }}</strong>
              </p>
              <p v-if="noticeMessage" class="subscription-dialog__notice">{{ noticeMessage }}</p>
            </div>

            <div class="subscription-dialog__status-actions">
              <BaseButton
                  v-if="canCancel"
                  :label="uk.payments.actions.cancel"
                  type="button"
                  variant="primary"
                  :disabled="isCancellationSubmitting"
                  @click="isCancelConfirmOpen = true"
              />
              <BaseButton
                  v-if="isPastDue"
                  :label="uk.payments.actions.renew"
                  type="button"
                  variant="secondary"
                  :disabled="false"
                  :is-loading="isCheckoutSubmitting"
                  @click="handlePrimaryAction"
              />
            </div>
          </section>

          <section class="subscription-dialog__panel">
            <div class="subscription-dialog__panel-header">
              <h3 class="subscription-dialog__section-title">{{ uk.payments.manage.cardTitle }}</h3>
              <BaseButton
                  v-if="canUpdateCard"
                  :label="uk.payments.actions.updateCard"
                  type="button"
                  variant="secondary"
                  :disabled="false"
                  :is-loading="isCardUpdateSubmitting"
                  @click="handleCardUpdate"
              />
            </div>

            <div v-if="subscription?.card" class="subscription-dialog__card-row">
              <span class="subscription-dialog__card-brand">{{ subscription.card.paymentSystem }}</span>
              <span class="subscription-dialog__card-number">{{ subscription.card.maskedNumber }}</span>
            </div>
            <p v-else class="subscription-dialog__empty">{{ uk.payments.manage.cardMissing }}</p>
          </section>

          <footer v-if="canOpenTransactionsDialog" class="subscription-dialog__footer">
            <button
                type="button"
                class="subscription-dialog__transactions-link"
                @click="openTransactionsDialog"
            >
              {{ uk.payments.transactions.showLink }}
            </button>
          </footer>
        </template>

        <template v-else>
          <section v-if="reconciliationNotice || noticeMessage" class="subscription-dialog__notice-card">
            <div v-if="reconciliationNotice" class="subscription-dialog__notice-card-head">
              <p class="subscription-dialog__notice-card-title">{{ reconciliationNotice.title }}</p>
              <BaseLoader
                  v-if="reconciliationNotice.isPending"
                  :label="uk.common.labels.loading"
                  size="sm"
                  tone="primary"
                  variant="wave"
                  centered
              />
            </div>
            <p v-else class="subscription-dialog__notice-card-title">{{ statusLabel }}</p>
            <p class="subscription-dialog__notice-card-text">
              {{ reconciliationNotice ? reconciliationNotice.message : noticeMessage }}
            </p>
          </section>

          <section class="subscription-dialog__hero">
            <div>
              <p class="subscription-dialog__eyebrow">{{ uk.profile.premiumLabel }}</p>
              <h3 class="subscription-dialog__hero-title">{{ uk.payments.tiers.premium }}</h3>
              <p class="subscription-dialog__hero-text">{{ uk.payments.dialog.checkoutSubtitle }}</p>
            </div>

            <div class="subscription-dialog__hero-price">
              <p class="subscription-dialog__price">{{ uk.payments.pricePerMonth(subscriptionPriceUsd) }}</p>
              <p class="subscription-dialog__price-hint">{{ uk.payments.priceHint }}</p>
            </div>
          </section>

          <section class="subscription-dialog__compare">
            <article class="subscription-dialog__tier">
              <div class="subscription-dialog__tier-head">
                <h3 class="subscription-dialog__tier-title">{{ uk.payments.tiers.free }}</h3>
              </div>

              <div class="subscription-dialog__feature subscription-dialog__feature--inactive">
                <span class="subscription-dialog__feature-icon subscription-dialog__feature-icon--inactive" aria-hidden="true" />
                <div>
                  <p class="subscription-dialog__feature-title">{{ uk.payments.features.recordingTitle }}</p>
                  <p class="subscription-dialog__feature-text">{{ uk.payments.features.freeRecording(freeDurationLimitMinutes) }}</p>
                </div>
              </div>

              <div class="subscription-dialog__feature subscription-dialog__feature--inactive">
                <span class="subscription-dialog__feature-icon subscription-dialog__feature-icon--inactive" aria-hidden="true" />
                <div>
                  <p class="subscription-dialog__feature-title">{{ uk.payments.features.syncTitle }}</p>
                  <p class="subscription-dialog__feature-text">{{ uk.payments.features.syncUnavailable }}</p>
                </div>
              </div>
            </article>

            <article class="subscription-dialog__tier subscription-dialog__tier--premium">
              <div class="subscription-dialog__tier-head">
                <h3 class="subscription-dialog__tier-title">{{ uk.payments.tiers.premium }}</h3>
                <span class="subscription-dialog__premium-badge">{{ uk.profile.premiumLabel }}</span>
              </div>

              <div class="subscription-dialog__feature">
                <span class="subscription-dialog__feature-icon" aria-hidden="true" />
                <div>
                  <p class="subscription-dialog__feature-title">{{ uk.payments.features.recordingTitle }}</p>
                  <p class="subscription-dialog__feature-text">{{ uk.payments.features.premiumRecording(premiumDurationLimitMinutes) }}</p>
                </div>
              </div>

              <div class="subscription-dialog__feature">
                <span class="subscription-dialog__feature-icon" aria-hidden="true" />
                <div>
                  <p class="subscription-dialog__feature-title">{{ uk.payments.features.syncTitle }}</p>
                  <p class="subscription-dialog__feature-text">{{ uk.payments.features.syncAvailable }}</p>
                </div>
              </div>
            </article>
          </section>

          <footer class="subscription-dialog__footer subscription-dialog__checkout">
            <BaseButton
                :label="primaryActionLabel"
                type="button"
                variant="primary"
                :disabled="false"
                :is-loading="isCheckoutSubmitting"
                @click="handlePrimaryAction"
            />

            <button
                v-if="canOpenTransactionsDialog"
                type="button"
                class="subscription-dialog__transactions-link"
                @click="openTransactionsDialog"
            >
              {{ uk.payments.transactions.showLink }}
            </button>
          </footer>
        </template>
      </div>
    </div>
  </AppDialogShell>

  <div v-if="isTransactionsDialogOpen" class="subscription-transactions-dialog" @click.self="closeTransactionsDialog">
    <div class="subscription-transactions-dialog__surface" role="dialog" aria-modal="true" :aria-label="uk.payments.transactions.title">
      <button
          type="button"
          class="subscription-transactions-dialog__close"
          :aria-label="uk.common.labels.close"
          @click="closeTransactionsDialog"
      >
        <img :src="closeIconUrl" alt="" class="subscription-transactions-dialog__close-icon" />
      </button>

      <div class="subscription-transactions-dialog__header">
        <h3 class="subscription-transactions-dialog__title">{{ uk.payments.transactions.title }}</h3>
        <p v-if="transactionsDialogMessage" class="subscription-transactions-dialog__message">
          {{ transactionsDialogMessage }}
        </p>
      </div>

      <div :ref="setTransactionsDialogBody" class="subscription-transactions-dialog__body">
        <div v-if="isTransactionsLoading" class="subscription-transactions-dialog__loader">
          <BaseLoader :label="uk.common.labels.loading" size="sm" tone="primary" variant="wave" centered />
        </div>

        <template v-else-if="hasVisibleTransactions">
          <div class="subscription-transactions-dialog__head">
            <span>{{ uk.payments.transactions.columns.date }}</span>
            <span>{{ uk.payments.transactions.columns.amount }}</span>
            <span>{{ uk.payments.transactions.columns.status }}</span>
          </div>

          <div class="subscription-transactions-dialog__list">
            <div v-for="transaction in visibleTransactions" :key="transaction.transactionId" class="subscription-transactions-dialog__row">
              <span>{{ formatDate(transaction.modifiedDate ?? transaction.createdAt) }}</span>
              <strong>{{ formatAmount(transaction.amount, transaction.currency) }}</strong>
              <span
                  class="subscription-dialog__transaction-status"
                  :class="getTransactionStatusClassName(transaction)"
              >
                {{ getTransactionStatusLabel(transaction) }}
              </span>
            </div>
          </div>

          <div
              v-if="canLoadMoreTransactions"
              :ref="setTransactionsLoadMoreTrigger"
              class="subscription-transactions-dialog__load-more"
          >
            <BaseLoader
                v-if="isTransactionsLoadingMore"
                :label="uk.common.labels.loading"
                size="sm"
                tone="primary"
                variant="wave"
                centered
            />
          </div>
        </template>

        <p v-else class="subscription-transactions-dialog__empty">
          {{ transactionsDialogMessage || uk.payments.transactions.empty }}
        </p>
      </div>
    </div>
  </div>
</template>
