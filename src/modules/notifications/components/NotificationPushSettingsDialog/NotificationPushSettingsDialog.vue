<script setup lang="ts">
import { watch } from 'vue';
import AppDialogShell from '@/shared/components/AppDialogShell/AppDialogShell.vue';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import BaseCheckbox from '@/shared/components/BaseCheckbox/BaseCheckbox.vue';
import BaseLoader from '@/shared/components/BaseLoader/BaseLoader.vue';
import ErrorAlert from '@/shared/components/ErrorAlert/ErrorAlert.vue';
import { useNotificationPushSettingsDialog } from '@/modules/notifications/composables/useNotificationPushSettingsDialog';
import { uk } from '@/shared/locales/uk';
import './NotificationPushSettingsDialog.css';

const props = defineProps<{
    isOpen: boolean;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
}>();

const {
    errorMessage,
    isLoading,
    isSaving,
    typeItems,
    loadSettings,
    save,
    toggleType,
} = useNotificationPushSettingsDialog(() => emit('close'));

watch(() => props.isOpen, (open) => {
    if (open) {
        void loadSettings();
    }
}, { immediate: true });
</script>

<template>
  <AppDialogShell
      :is-open="isOpen"
      :title="uk.notifications.browserPush.settingsTitle"
      :subtitle="uk.notifications.browserPush.settingsSubtitle"
      @close="emit('close')"
  >
    <div class="notification-push-settings-dialog">
      <div v-if="isLoading" class="notification-push-settings-dialog__loading">
        <BaseLoader
            :label="uk.common.labels.loading"
            size="md"
            tone="primary"
            variant="wave"
            centered
        />
      </div>

      <template v-else>
        <ErrorAlert v-if="errorMessage" :message="errorMessage" />

        <ul class="notification-push-settings-dialog__list">
          <li
              v-for="item in typeItems"
              :key="item.type"
              class="notification-push-settings-dialog__item"
          >
            <BaseCheckbox
                :model-value="item.isEnabled"
                :label="item.label"
                :disabled="isSaving"
                @update:model-value="toggleType(item.type)"
            />
          </li>
        </ul>

        <div class="notification-push-settings-dialog__actions">
          <BaseButton
              :label="uk.common.labels.cancel"
              type="button"
              variant="secondary"
              :disabled="isSaving"
              @click="emit('close')"
          />
          <BaseButton
              :label="uk.notifications.browserPush.settingsSave"
              type="button"
              variant="primary"
              :disabled="isSaving"
              :is-loading="isSaving"
              @click="save"
          />
        </div>
      </template>
    </div>
  </AppDialogShell>
</template>
