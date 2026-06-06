<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import type { AdminCategory } from '@/modules/admin/interfaces/admin-category.interface';
import AppDialogShell from '@/shared/components/AppDialogShell/AppDialogShell.vue';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import BaseField from '@/shared/components/BaseField/BaseField.vue';
import ErrorAlert from '@/shared/components/ErrorAlert/ErrorAlert.vue';
import { uk } from '@/shared/locales/uk';
import './AdminCategoryDialog.css';

const props = defineProps<{
    isOpen: boolean;
    category: AdminCategory | null;
    isSubmitting: boolean;
    errorMessage: string;
}>();

const emit = defineEmits<{
    (e: 'close'): void;
    (e: 'submit', payload: { categoryName: string }): void;
}>();

const form = reactive({
    categoryName: '',
});

const isEditMode = computed(() => Boolean(props.category));
const isSubmitDisabled = computed(() => !form.categoryName.trim() || props.isSubmitting);

const syncForm = (): void => {
    form.categoryName = props.category?.categoryName ?? '';
};

watch(() => props.isOpen, (isOpen) => {
    if (isOpen) {
        syncForm();
    }
});

watch(() => props.category, () => {
    if (props.isOpen) {
        syncForm();
    }
});

const handleSubmit = (): void => {
    emit('submit', {
        categoryName: form.categoryName.trim(),
    });
};
</script>

<template>
  <AppDialogShell
      :is-open="isOpen"
      :title="isEditMode ? uk.admin.categories.dialog.editTitle : uk.admin.categories.dialog.createTitle"
      :subtitle="uk.admin.categories.dialog.subtitle"
      size="lg"
      @close="emit('close')"
  >
    <form class="admin-category-dialog" @submit.prevent="handleSubmit">
      <BaseField
          id="admin-category-name"
          v-model="form.categoryName"
          :label="uk.admin.categories.fields.name"
          :placeholder="uk.admin.categories.dialog.namePlaceholder"
          :max-length="120"
          :disabled="isSubmitting"
      />

      <ErrorAlert v-if="errorMessage" :message="errorMessage" />

      <div class="admin-category-dialog__actions">
        <BaseButton
            :label="uk.common.labels.cancel"
            type="button"
            variant="secondary"
            :disabled="isSubmitting"
            @click="emit('close')"
        />
        <BaseButton
            :label="isEditMode ? uk.admin.categories.dialog.save : uk.admin.categories.dialog.create"
            type="submit"
            variant="primary"
            :disabled="isSubmitDisabled"
            :is-loading="isSubmitting"
        />
      </div>
    </form>
  </AppDialogShell>
</template>
