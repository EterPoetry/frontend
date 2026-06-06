<script setup lang="ts">
import { ref } from 'vue';
import { useAdminStore } from '@/modules/admin/admin.store';
import { useAdminPaginatedList } from '@/modules/admin/composables/useAdminPaginatedList';
import type { AdminCategoriesListQuery } from '@/modules/admin/interfaces/admin-categories-list-query.interface';
import type { AdminCategory } from '@/modules/admin/interfaces/admin-category.interface';
import AdminCategoryDialog from '@/modules/admin/components/AdminCategoryDialog/AdminCategoryDialog.vue';
import AdminShell from '@/modules/admin/components/AdminShell/AdminShell.vue';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import BaseField from '@/shared/components/BaseField/BaseField.vue';
import BaseLoader from '@/shared/components/BaseLoader/BaseLoader.vue';
import ConfirmDialog from '@/shared/components/ConfirmDialog/ConfirmDialog.vue';
import ErrorAlert from '@/shared/components/ErrorAlert/ErrorAlert.vue';
import { getApiErrorMessage } from '@/shared/utils/api-error.utils';
import { uk } from '@/shared/locales/uk';
import '@/modules/admin/pages/admin-page-shared.css';
import './AdminCategoriesPage.css';

const adminStore = useAdminStore();

const search = ref('');
const sortBy = ref<'categoryId' | 'categoryName'>('categoryName');
const sortOrder = ref<'asc' | 'desc'>('asc');
const dialogErrorMessage = ref('');
const isDialogOpen = ref(false);
const isDialogSubmitting = ref(false);
const isDeleteSubmitting = ref(false);
const editingCategory = ref<AdminCategory | null>(null);
const deleteTarget = ref<AdminCategory | null>(null);

const {
    items,
    isLoading,
    errorMessage,
    hasNextPage,
    setLoadMoreTrigger,
    loadItems,
    applyFilters,
    handleItemDeleted,
} = useAdminPaginatedList<AdminCategory, AdminCategoriesListQuery>({
    fetchItems: (query) => adminStore.getCategories(query),
    buildQuery: () => ({
        search: search.value.trim() || undefined,
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
    }),
    filterSources: [search, sortBy, sortOrder],
});

const openCreateDialog = (): void => {
    editingCategory.value = null;
    dialogErrorMessage.value = '';
    isDialogOpen.value = true;
};

const openEditDialog = (category: AdminCategory): void => {
    editingCategory.value = category;
    dialogErrorMessage.value = '';
    isDialogOpen.value = true;
};

const submitCategory = async (payload: { categoryName: string }): Promise<void> => {
    isDialogSubmitting.value = true;
    dialogErrorMessage.value = '';

    try {
        if (editingCategory.value) {
            await adminStore.updateCategory(editingCategory.value.categoryId, payload);
        } else {
            await adminStore.createCategory(payload);
        }

        isDialogOpen.value = false;
        await loadItems();
    } catch (error) {
        dialogErrorMessage.value = getApiErrorMessage(error) ?? uk.common.errors.serverError;
    } finally {
        isDialogSubmitting.value = false;
    }
};

const confirmDelete = async (): Promise<void> => {
    if (!deleteTarget.value || isDeleteSubmitting.value) {
        return;
    }

    isDeleteSubmitting.value = true;

    try {
        await adminStore.deleteCategory(deleteTarget.value.categoryId);
        deleteTarget.value = null;
        await handleItemDeleted();
    } catch (error) {
        errorMessage.value = getApiErrorMessage(error) ?? uk.common.errors.serverError;
    } finally {
        isDeleteSubmitting.value = false;
    }
};
</script>

<template>
  <AdminShell :title="uk.admin.categories.title" :description="uk.admin.categories.description">
    <section class="admin-page">
      <div class="admin-page__toolbar">
        <div class="admin-page__toolbar-fields">
          <BaseField
              id="admin-categories-search"
              v-model="search"
              class="admin-page__field admin-page__field--search"
              :label="uk.home.searchPlaceholder"
              :placeholder="uk.admin.categories.searchPlaceholder"
              :max-length="120"
              :disabled="isLoading"
          />

          <label class="admin-page__field admin-page__field--sm">
            <span class="admin-page__field-label">{{ uk.home.sort.ariaLabel }}</span>
            <select v-model="sortBy" class="admin-page__select">
              <option value="categoryName">{{ uk.admin.categories.fields.name }}</option>
              <option value="categoryId">{{ uk.admin.categories.sortById }}</option>
            </select>
          </label>

          <label class="admin-page__field admin-page__field--sm">
            <span class="admin-page__field-label">{{ uk.home.sort.ariaLabel }}</span>
            <select v-model="sortOrder" class="admin-page__select">
              <option value="asc">{{ uk.admin.sort.asc }}</option>
              <option value="desc">{{ uk.admin.sort.desc }}</option>
            </select>
          </label>
        </div>

        <div class="admin-page__toolbar-actions">
          <span v-if="isLoading && items.length" class="admin-page__toolbar-status">
            <BaseLoader :label="uk.common.labels.loading" size="sm" tone="primary" variant="wave" />
          </span>
          <BaseButton
              :label="uk.admin.categories.create"
              type="button"
              variant="primary"
              :disabled="false"
              @click="openCreateDialog"
          />
        </div>
      </div>

      <ErrorAlert v-if="errorMessage" :message="errorMessage" />
      <div v-if="errorMessage === uk.admin.loadFailed" class="admin-page__error-actions">
        <BaseButton
            :label="uk.admin.actions.retry"
            type="button"
            variant="secondary"
            :disabled="isLoading"
            :is-loading="isLoading"
            @click="applyFilters"
        />
      </div>
      <div v-if="isLoading && !items.length" class="admin-page__loading">
        <BaseLoader :label="uk.common.labels.loading" size="md" tone="primary" variant="wave" centered />
      </div>

      <div v-else-if="!items.length" class="admin-page__empty">
        {{ uk.admin.categories.empty }}
      </div>

      <section v-else class="admin-page__table-wrap admin-page__table-wrap--cards">
        <table class="admin-page__table admin-categories-page__table">
          <colgroup>
            <col class="admin-categories-page__name-col" />
            <col class="admin-categories-page__posts-col" />
            <col class="admin-categories-page__actions-col" />
          </colgroup>
          <thead>
            <tr>
              <th>{{ uk.admin.categories.fields.name }}</th>
              <th>{{ uk.admin.categories.postsCount }}</th>
              <th>{{ uk.admin.table.actions }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.categoryId">
              <td class="admin-categories-page__name-cell" :data-label="uk.admin.categories.fields.name">{{ item.categoryName }}</td>
              <td :data-label="uk.admin.categories.postsCount">{{ item.postsCount }}</td>
              <td class="admin-categories-page__actions" :data-label="uk.admin.table.actions">
                <BaseButton
                    :label="uk.admin.actions.edit"
                    type="button"
                    variant="secondary"
                    :disabled="false"
                    @click="openEditDialog(item)"
                />
                <BaseButton
                    :label="uk.admin.actions.delete"
                    type="button"
                    variant="secondary"
                    :disabled="false"
                    @click="deleteTarget = item"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <div v-if="hasNextPage" :ref="setLoadMoreTrigger" class="admin-page__infinite-scroll" aria-live="polite">
        <BaseLoader v-if="isLoading" :label="uk.common.labels.loading" size="sm" tone="primary" variant="wave" />
      </div>
    </section>

    <AdminCategoryDialog
        :is-open="isDialogOpen"
        :category="editingCategory"
        :is-submitting="isDialogSubmitting"
        :error-message="dialogErrorMessage"
        @close="isDialogOpen = false"
        @submit="submitCategory"
    />

    <ConfirmDialog
        v-if="deleteTarget"
        :title="uk.admin.categories.deleteConfirmTitle"
        :message="uk.admin.categories.deleteConfirmMessage"
        :confirm-label="uk.admin.actions.delete"
        :cancel-label="uk.common.labels.cancel"
        :is-submitting="isDeleteSubmitting"
        @close="!isDeleteSubmitting && (deleteTarget = null)"
        @confirm="confirmDelete"
    />
  </AdminShell>
</template>
