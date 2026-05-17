<script setup lang="ts">
import infoCircleIconUrl from '@/shared/assets/icons/ui/info-circle.svg';
import shieldAlertIconUrl from '@/shared/assets/icons/ui/shield-alert.svg';
import type { ActiveViolationResponse } from '@/modules/profile/interfaces/active-violation-response.interface';
import { uk } from '@/shared/locales/uk';
import ProfileDialogShell from '@/modules/profile/components/ProfileDialogShell/ProfileDialogShell.vue';
import './ProfileViolationsDialog.css';

defineProps<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    isLoading: boolean;
    errorMessage: string;
    violations: ActiveViolationResponse[];
    currentViolationsCount: number;
    maxViolationsBeforeBlock: number;
    getReasonTitle: (reason: string) => string;
    getRemainingLabel: (expiresAt: string | null) => string | null;
    formatDate: (value: string) => string;
}>();

defineEmits<{
    (e: 'close'): void;
}>();
</script>

<template>
  <ProfileDialogShell :is-open="isOpen" :title="title" :subtitle="subtitle" size="lg" @close="$emit('close')">
    <div class="profile-violations-dialog">
      <section class="profile-violations-dialog__summary">
        <div class="profile-violations-dialog__summary-main">
          <span class="profile-violations-dialog__summary-icon">
            <img :src="shieldAlertIconUrl" alt="" />
          </span>

          <div class="profile-violations-dialog__summary-copy">
            <strong>{{ uk.profile.notices.violationsSummary(currentViolationsCount, maxViolationsBeforeBlock) }}</strong>
            <span>{{ uk.profile.notices.violationsStatus(currentViolationsCount, maxViolationsBeforeBlock) }}</span>
          </div>
        </div>

        <p class="profile-violations-dialog__summary-note">
          {{ uk.profile.notices.violationsBlocked(maxViolationsBeforeBlock) }}
        </p>
      </section>

      <div v-if="errorMessage" class="profile-violations-dialog__state profile-violations-dialog__state--error">
        {{ errorMessage }}
      </div>

      <div v-else-if="isLoading" class="profile-violations-dialog__skeleton-list" aria-hidden="true">
        <article
            v-for="index in 3"
            :key="index"
            class="profile-violations-dialog__item profile-violations-dialog__item--skeleton"
        >
          <div class="profile-violations-dialog__item-head">
            <div class="profile-violations-dialog__item-icon sk" />

            <div class="profile-violations-dialog__item-copy">
              <div class="profile-violations-dialog__line profile-violations-dialog__line--title sk" />
              <div class="profile-violations-dialog__line profile-violations-dialog__line--body sk" />
              <div class="profile-violations-dialog__line profile-violations-dialog__line--date sk" />
            </div>

            <div class="profile-violations-dialog__chip-skeleton sk" />
          </div>
        </article>
      </div>

      <div v-else-if="!violations.length" class="profile-violations-dialog__state">
        {{ uk.profile.emptyStates.violations }}
      </div>

      <div v-else class="profile-violations-dialog__list">
        <article
            v-for="violation in violations"
            :key="violation.complaintId"
            class="profile-violations-dialog__item"
        >
          <div class="profile-violations-dialog__item-head">
            <div class="profile-violations-dialog__item-icon">
              <img :src="shieldAlertIconUrl" alt="" />
            </div>

            <div class="profile-violations-dialog__item-copy">
              <h3 class="profile-violations-dialog__item-title">
                {{ getReasonTitle(violation.complaintReason) }}
              </h3>
              <div class="profile-violations-dialog__item-meta">
                <span class="profile-violations-dialog__item-date">{{ formatDate(violation.createdAt) }}</span>
                <span
                    v-if="violation.targetPost.title"
                    class="profile-violations-dialog__item-post"
                >
                  · {{ violation.targetPost.title }}
                </span>
              </div>
            </div>

            <span
                v-if="getRemainingLabel(violation.expiresAt)"
                class="profile-violations-dialog__item-chip"
            >
              {{ getRemainingLabel(violation.expiresAt) }}
            </span>
          </div>
        </article>
      </div>

      <section class="profile-violations-dialog__notice">
        <span class="profile-violations-dialog__notice-icon">
          <img :src="infoCircleIconUrl" alt="" />
        </span>
        <p>{{ uk.profile.notices.violationsExpire }}</p>
      </section>
    </div>
  </ProfileDialogShell>
</template>
