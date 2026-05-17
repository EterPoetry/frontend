<script setup lang="ts">
import { ref, watch } from 'vue';
import checkIconUrl from '@/shared/assets/icons/ui/check.svg';
import ProfileDialogShell from '@/modules/profile/components/ProfileDialogShell/ProfileDialogShell.vue';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import type { ComplaintReasonItem } from '@/modules/profile/interfaces/complaint-reason-item.interface';
import { uk } from '@/shared/locales/uk';
import './PostComplaintDialog.css';

const props = defineProps<{
    isOpen: boolean;
    reasons: ComplaintReasonItem[];
    isLoadingReasons: boolean;
    isSubmitting: boolean;
    isSubmitted: boolean;
    errorMessage: string;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'submit', reason: string): void;
}>();

const selectedReason = ref('');

watch(() => props.isOpen, (open) => {
    if (!open) {
        selectedReason.value = '';
    }
});

const handleSubmit = (): void => {
    if (selectedReason.value && !props.isSubmitting) {
        emit('submit', selectedReason.value);
    }
};
</script>

<template>
  <ProfileDialogShell
      :is-open="isOpen"
      :title="uk.posts.complaint.title"
      @close="$emit('close')"
  >
    <div class="post-complaint-dialog">
      <div v-if="isSubmitted" class="post-complaint-dialog__success">
        <div class="post-complaint-dialog__success-icon">
          <img :src="checkIconUrl" alt="" />
        </div>
        <strong>{{ uk.posts.complaint.successTitle }}</strong>
        <BaseButton
            :label="uk.common.labels.close"
            type="button"
            variant="primary"
            :disabled="false"
            @click="$emit('close')"
        />
      </div>

      <template v-else>
        <div v-if="isLoadingReasons" class="post-complaint-dialog__loading">
          {{ uk.posts.complaint.loadingReasons }}
        </div>

        <template v-else>
          <fieldset class="post-complaint-dialog__fieldset">
            <legend class="post-complaint-dialog__legend">{{ uk.posts.complaint.reasonLabel }}</legend>

            <ul class="post-complaint-dialog__list">
              <li v-for="reason in reasons" :key="reason.key" class="post-complaint-dialog__item">
                <label class="post-complaint-dialog__label">
                  <input
                      v-model="selectedReason"
                      type="radio"
                      :value="reason.key"
                      class="post-complaint-dialog__radio"
                  />
                  <span class="post-complaint-dialog__radio-circle" />
                  <span class="post-complaint-dialog__reason-text">{{ reason.label }}</span>
                </label>
              </li>
            </ul>
          </fieldset>

          <p v-if="errorMessage" class="post-complaint-dialog__error">{{ errorMessage }}</p>

          <div class="post-complaint-dialog__actions">
            <BaseButton
                :label="uk.posts.complaint.cancel"
                type="button"
                variant="secondary"
                :disabled="isSubmitting"
                @click="$emit('close')"
            />
            <BaseButton
                :label="uk.posts.complaint.submit"
                type="button"
                variant="primary"
                :disabled="!selectedReason"
                :is-loading="isSubmitting"
                @click="handleSubmit"
            />
          </div>
        </template>
      </template>
    </div>
  </ProfileDialogShell>
</template>
