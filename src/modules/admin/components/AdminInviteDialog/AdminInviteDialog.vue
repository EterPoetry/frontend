<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import AppDialogShell from '@/shared/components/AppDialogShell/AppDialogShell.vue';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import BaseField from '@/shared/components/BaseField/BaseField.vue';
import ErrorAlert from '@/shared/components/ErrorAlert/ErrorAlert.vue';
import { uk } from '@/shared/locales/uk';
import './AdminInviteDialog.css';

const props = defineProps<{
    isOpen: boolean;
    isSubmitting: boolean;
    errorMessage: string;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'submit', email: string): void;
}>();

const email = ref('');

const isSubmitDisabled = computed(() => !email.value.trim() || props.isSubmitting);

watch(() => props.isOpen, (isOpen) => {
    if (!isOpen) {
        email.value = '';
    }
});

const handleSubmit = (): void => {
    emit('submit', email.value.trim());
};
</script>

<template>
  <AppDialogShell
      :is-open="isOpen"
      :title="uk.admin.admins.inviteDialog.title"
      :subtitle="uk.admin.admins.inviteDialog.subtitle"
      size="md"
      @close="emit('close')"
  >
    <form class="admin-invite-dialog" @submit.prevent="handleSubmit">
      <BaseField
          id="admin-invite-email"
          v-model="email"
          :label="uk.common.labels.email"
          :placeholder="uk.admin.admins.inviteDialog.emailPlaceholder"
          :max-length="320"
          :disabled="isSubmitting"
      />

      <ErrorAlert v-if="errorMessage" :message="errorMessage" />

      <div class="admin-invite-dialog__actions">
        <BaseButton
            :label="uk.common.labels.cancel"
            type="button"
            variant="secondary"
            :disabled="isSubmitting"
            @click="emit('close')"
        />
        <BaseButton
            :label="uk.admin.admins.inviteDialog.submit"
            type="submit"
            variant="primary"
            :disabled="isSubmitDisabled"
            :is-loading="isSubmitting"
        />
      </div>
    </form>
  </AppDialogShell>
</template>
