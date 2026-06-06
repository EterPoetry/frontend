<script setup lang="ts">
import { ref } from 'vue';
import { isAxiosError } from 'axios';
import { useAdminStore } from '@/modules/admin/admin.store';
import { useAdminPaginatedList } from '@/modules/admin/composables/useAdminPaginatedList';
import type { AdminAccount } from '@/modules/admin/interfaces/admin-account.interface';
import type { AdminListQuery } from '@/modules/admin/interfaces/admin-list-query.interface';
import AdminInviteDialog from '@/modules/admin/components/AdminInviteDialog/AdminInviteDialog.vue';
import AdminShell from '@/modules/admin/components/AdminShell/AdminShell.vue';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import BaseField from '@/shared/components/BaseField/BaseField.vue';
import BaseLoader from '@/shared/components/BaseLoader/BaseLoader.vue';
import ConfirmDialog from '@/shared/components/ConfirmDialog/ConfirmDialog.vue';
import ErrorAlert from '@/shared/components/ErrorAlert/ErrorAlert.vue';
import { getApiErrorMessage } from '@/shared/utils/api-error.utils';
import { uk } from '@/shared/locales/uk';
import { formatAdminDateTime } from '@/modules/admin/utils/admin-formatting.utils';
import '@/modules/admin/pages/admin-page-shared.css';
import './AdminAdminsPage.css';

const adminStore = useAdminStore();

const search = ref('');
const sortBy = ref<'createdAt' | 'name' | 'email'>('createdAt');
const sortOrder = ref<'asc' | 'desc'>('desc');
const inviteErrorMessage = ref('');
const isInviteDialogOpen = ref(false);
const isInviteSubmitting = ref(false);
const isDeleteSubmitting = ref(false);
const deleteTarget = ref<AdminAccount | null>(null);

const {
    items,
    isLoading,
    errorMessage,
    feedbackMessage,
    hasNextPage,
    loadItems,
    loadMore,
    applyFilters,
    handleItemDeleted,
} = useAdminPaginatedList<AdminAccount, AdminListQuery>({
    fetchItems: (query) => adminStore.getAdmins(query),
    buildQuery: () => ({
        search: search.value.trim() || undefined,
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
    }),
    filterSources: [search, sortBy, sortOrder],
});

const submitInvite = async (email: string): Promise<void> => {
    inviteErrorMessage.value = '';
    feedbackMessage.value = '';
    isInviteSubmitting.value = true;

    try {
        await adminStore.inviteAdmin(email);
        isInviteDialogOpen.value = false;
        feedbackMessage.value = uk.admin.admins.invitedSuccess;
        await loadItems();
    } catch (error) {
        if (isAxiosError(error) && error.response?.status === 403) {
            inviteErrorMessage.value = uk.admin.forbidden;
        } else {
            inviteErrorMessage.value = getApiErrorMessage(error) ?? uk.common.errors.serverError;
        }
    } finally {
        isInviteSubmitting.value = false;
    }
};

const confirmDelete = async (): Promise<void> => {
    if (!deleteTarget.value || isDeleteSubmitting.value) {
        return;
    }

    feedbackMessage.value = '';
    isDeleteSubmitting.value = true;

    try {
        await adminStore.deleteAdmin(deleteTarget.value.adminId);
        deleteTarget.value = null;
        feedbackMessage.value = uk.admin.admins.deleteSuccess;
        await handleItemDeleted();
    } catch (error) {
        errorMessage.value = getApiErrorMessage(error) ?? uk.common.errors.serverError;
    } finally {
        isDeleteSubmitting.value = false;
    }
};
</script>

<template>
  <AdminShell :title="uk.admin.admins.title" :description="uk.admin.admins.description">
    <section class="admin-page">
      <div class="admin-page__toolbar">
        <div class="admin-page__toolbar-fields">
          <BaseField
              id="admin-admins-search"
              v-model="search"
              class="admin-page__field admin-page__field--search"
              :label="uk.home.searchPlaceholder"
              :placeholder="uk.admin.admins.searchPlaceholder"
              :max-length="120"
              :disabled="isLoading"
          />

          <label class="admin-page__field admin-page__field--sm">
            <span class="admin-page__field-label">{{ uk.home.sort.ariaLabel }}</span>
            <select v-model="sortBy" class="admin-page__select">
              <option value="createdAt">{{ uk.admin.admins.createdAt }}</option>
              <option value="name">{{ uk.common.labels.name }}</option>
              <option value="email">{{ uk.common.labels.email }}</option>
            </select>
          </label>

          <label class="admin-page__field admin-page__field--sm">
            <span class="admin-page__field-label">{{ uk.home.sort.ariaLabel }}</span>
            <select v-model="sortOrder" class="admin-page__select">
              <option value="desc">{{ uk.admin.sort.desc }}</option>
              <option value="asc">{{ uk.admin.sort.asc }}</option>
            </select>
          </label>
        </div>

        <div class="admin-page__toolbar-actions">
          <span v-if="isLoading && items.length" class="admin-page__toolbar-status">
            <BaseLoader :label="uk.common.labels.loading" size="sm" tone="primary" variant="wave" />
          </span>
          <BaseButton
              :label="uk.admin.admins.invite"
              type="button"
              variant="primary"
              :disabled="false"
              @click="isInviteDialogOpen = true"
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
      <p v-if="feedbackMessage" class="admin-page__feedback">{{ feedbackMessage }}</p>

      <div v-if="isLoading && !items.length" class="admin-page__loading">
        <BaseLoader :label="uk.common.labels.loading" size="md" tone="primary" variant="wave" centered />
      </div>

      <div v-else-if="!items.length" class="admin-page__empty">
        {{ uk.admin.admins.empty }}
      </div>

      <section v-else class="admin-page__table-wrap admin-page__table-wrap--cards">
        <table class="admin-page__table">
          <thead>
            <tr>
              <th>{{ uk.common.labels.name }}</th>
              <th>{{ uk.admin.admins.status }}</th>
              <th>{{ uk.admin.admins.createdAt }}</th>
              <th>{{ uk.admin.admins.inviteExpiresAt }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.adminId">
              <td :data-label="uk.common.labels.name">
                <div class="admin-page__title-cell">
                  <span class="admin-page__title-primary">{{ item.name }}</span>
                  <span class="admin-page__title-secondary">{{ item.email }}</span>
                </div>
              </td>
              <td :data-label="uk.admin.admins.status">
                <span class="admin-page__status" :class="item.isActive ? 'admin-page__status--success' : 'admin-page__status--warning'">
                  {{ item.isActive ? uk.admin.status.active : uk.admin.status.invited }}
                </span>
              </td>
              <td :data-label="uk.admin.admins.createdAt">{{ formatAdminDateTime(item.createdAt) }}</td>
              <td :data-label="uk.admin.admins.inviteExpiresAt">{{ formatAdminDateTime(item.inviteExpiresAt) }}</td>
              <td class="admin-admins-page__actions" data-label="">
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

      <div v-if="hasNextPage" class="admin-page__load-more">
        <BaseButton
            :label="uk.admin.actions.loadMore"
            type="button"
            variant="secondary"
            :disabled="isLoading"
            :is-loading="isLoading"
            @click="loadMore"
        />
      </div>
    </section>

    <AdminInviteDialog
        :is-open="isInviteDialogOpen"
        :is-submitting="isInviteSubmitting"
        :error-message="inviteErrorMessage"
        @close="isInviteDialogOpen = false"
        @submit="submitInvite"
    />

    <ConfirmDialog
        v-if="deleteTarget"
        :title="uk.admin.admins.deleteConfirmTitle"
        :message="uk.admin.admins.deleteConfirmMessage"
        :confirm-label="uk.admin.actions.delete"
        :cancel-label="uk.common.labels.cancel"
        :is-submitting="isDeleteSubmitting"
        @close="!isDeleteSubmitting && (deleteTarget = null)"
        @confirm="confirmDelete"
    />
  </AdminShell>
</template>
