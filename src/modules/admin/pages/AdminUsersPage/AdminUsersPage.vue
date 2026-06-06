<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { useAdminStore } from '@/modules/admin/admin.store';
import { useAdminPaginatedList } from '@/modules/admin/composables/useAdminPaginatedList';
import { ADMIN_ACTIVE_VIOLATIONS_BLOCK_THRESHOLD } from '@/modules/admin/constants/admin.constants';
import type { AdminUserAction } from '@/modules/admin/interfaces/admin-user-action.interface';
import type { AdminUserDetail } from '@/modules/admin/interfaces/admin-user-detail.interface';
import type { AdminUserListItem } from '@/modules/admin/interfaces/admin-user-list-item.interface';
import type { AdminUserViolation } from '@/modules/admin/interfaces/admin-user-violation.interface';
import type { AdminUsersListQuery } from '@/modules/admin/interfaces/admin-users-list-query.interface';
import AdminShell from '@/modules/admin/components/AdminShell/AdminShell.vue';
import AppDialogShell from '@/shared/components/AppDialogShell/AppDialogShell.vue';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import BaseField from '@/shared/components/BaseField/BaseField.vue';
import BaseLoader from '@/shared/components/BaseLoader/BaseLoader.vue';
import ConfirmDialog from '@/shared/components/ConfirmDialog/ConfirmDialog.vue';
import ErrorAlert from '@/shared/components/ErrorAlert/ErrorAlert.vue';
import { getApiErrorMessage } from '@/shared/utils/api-error.utils';
import { uk } from '@/shared/locales/uk';
import { formatAdminDateTime } from '@/modules/admin/utils/admin-formatting.utils';
import '@/modules/admin/pages/admin-page-shared.css';
import './AdminUsersPage.css';

const adminStore = useAdminStore();

const search = ref('');
const sortBy = ref<'createdAt' | 'name' | 'username' | 'postsCount' | 'activeViolationsCount'>('createdAt');
const sortOrder = ref<'asc' | 'desc'>('desc');
const selectedUser = ref<AdminUserDetail | null>(null);
const isDetailLoading = ref(false);
const isDetailOpen = ref(false);
const detailErrorMessage = ref('');
const pendingAction = ref<AdminUserAction | null>(null);
const isActionSubmitting = ref(false);
let detailRequestSequence = 0;

const {
    items,
    isLoading,
    errorMessage,
    feedbackMessage,
    hasNextPage,
    loadItems,
    loadMore,
    applyFilters,
} = useAdminPaginatedList<AdminUserListItem, AdminUsersListQuery>({
    fetchItems: (query) => adminStore.getUsers(query),
    buildQuery: () => ({
        search: search.value.trim() || undefined,
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
    }),
    filterSources: [search, sortBy, sortOrder],
});

const canUnblockSelectedUser = computed(() => Boolean(
    selectedUser.value
    && selectedUser.value.blockedAt
    && selectedUser.value.activeViolationsCount < ADMIN_ACTIVE_VIOLATIONS_BLOCK_THRESHOLD,
));

const userInitials = computed(() => {
    const name = selectedUser.value?.name ?? '';
    return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
});

const violationPostStateLabel = (violation: AdminUserViolation): string => {
    if (violation.postRemovedAt) {
        return uk.admin.status.removed;
    }

    if (violation.postStatus === 'published') {
        return uk.admin.status.published;
    }

    return violation.postStatus;
};

const openUserDetails = async (userId: number): Promise<void> => {
    const requestId = ++detailRequestSequence;
    isDetailOpen.value = true;
    isDetailLoading.value = true;
    detailErrorMessage.value = '';

    try {
        const response = await adminStore.getUser(userId);

        if (requestId !== detailRequestSequence) {
            return;
        }

        selectedUser.value = response;
    } catch (_error) {
        if (requestId !== detailRequestSequence) {
            return;
        }

        detailErrorMessage.value = uk.admin.loadFailed;
    } finally {
        if (requestId === detailRequestSequence) {
            isDetailLoading.value = false;
        }
    }
};

const closeUserDetails = (): void => {
    isDetailOpen.value = false;
    selectedUser.value = null;
    detailErrorMessage.value = '';
};

const runUserAction = async (): Promise<void> => {
    if (!pendingAction.value || isActionSubmitting.value) {
        return;
    }

    feedbackMessage.value = '';
    detailErrorMessage.value = '';
    isActionSubmitting.value = true;

    try {
        if (pendingAction.value.kind === 'block') {
            await adminStore.blockUser(pendingAction.value.user.userId);
            feedbackMessage.value = uk.admin.users.blockSuccess;
        } else if (pendingAction.value.kind === 'unblock') {
            await adminStore.unblockUser(pendingAction.value.user.userId);
            feedbackMessage.value = uk.admin.users.unblockSuccess;
        } else {
            const response = await adminStore.deleteViolation(
                pendingAction.value.user.userId,
                pendingAction.value.violation.complaintId,
            );

            feedbackMessage.value = pendingAction.value.user.blockedAt && !response.userBlocked
                ? uk.admin.users.autoUnblocked
                : uk.admin.users.removeViolationSuccess;
        }

        const activeUserId = pendingAction.value.user.userId;
        pendingAction.value = null;
        await Promise.all([loadItems(), openUserDetails(activeUserId)]);
    } catch (error) {
        const apiMessage = getApiErrorMessage(error);
        detailErrorMessage.value = pendingAction.value?.kind === 'removeViolation' && !apiMessage
            ? uk.admin.users.removeViolationRestoreUnavailable
            : apiMessage ?? uk.common.errors.serverError;
    } finally {
        isActionSubmitting.value = false;
    }
};

const statusClass = (isBlocked: boolean): string => isBlocked ? 'admin-page__status--danger' : 'admin-page__status--success';

onBeforeUnmount(() => {
    detailRequestSequence++;
});
</script>

<template>
  <AdminShell :title="uk.admin.users.title" :description="uk.admin.users.description">
    <section class="admin-page">
      <div class="admin-page__toolbar">
        <div class="admin-page__toolbar-fields">
          <BaseField
              id="admin-users-search"
              v-model="search"
              class="admin-page__field admin-page__field--search"
              :label="uk.home.searchPlaceholder"
              :placeholder="uk.admin.users.searchPlaceholder"
              :max-length="120"
              :disabled="isLoading"
          />

          <label class="admin-page__field admin-page__field--sm">
            <span class="admin-page__field-label">{{ uk.home.sort.ariaLabel }}</span>
            <select v-model="sortBy" class="admin-page__select">
              <option value="createdAt">{{ uk.admin.users.memberSince }}</option>
              <option value="name">{{ uk.common.labels.name }}</option>
              <option value="username">{{ uk.common.labels.username }}</option>
              <option value="postsCount">{{ uk.admin.users.postsCount }}</option>
              <option value="activeViolationsCount">{{ uk.admin.users.violationsCount }}</option>
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

        <span v-if="isLoading && items.length" class="admin-page__toolbar-status">
          <BaseLoader :label="uk.common.labels.loading" size="sm" tone="primary" variant="wave" />
        </span>
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
        {{ uk.admin.users.empty }}
      </div>

      <section v-else class="admin-page__table-wrap admin-page__table-wrap--cards">
        <table class="admin-page__table">
          <thead>
            <tr>
              <th>{{ uk.common.labels.name }}</th>
              <th>{{ uk.admin.users.postsCount }}</th>
              <th>{{ uk.admin.users.violationsCount }}</th>
              <th>{{ uk.admin.status.blocked }}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.userId">
              <td :data-label="uk.common.labels.name">
                <div class="admin-page__title-cell">
                  <span class="admin-page__title-primary">{{ item.name }}</span>
                  <span class="admin-page__title-secondary">@{{ item.username }} · {{ item.email }}</span>
                </div>
              </td>
              <td :data-label="uk.admin.users.postsCount">{{ item.postsCount }}</td>
              <td :data-label="uk.admin.users.violationsCount">{{ item.activeViolationsCount }}</td>
              <td :data-label="uk.admin.status.blocked">
                <span class="admin-page__status" :class="statusClass(Boolean(item.blockedAt))">
                  {{ item.blockedAt ? uk.admin.status.blocked : uk.admin.status.active }}
                </span>
              </td>
              <td class="admin-users-page__actions" data-label="">
                <button
                    type="button"
                    class="admin-page__row-button"
                    :aria-label="`${uk.admin.actions.showDetails}: ${item.name}`"
                    @click="openUserDetails(item.userId)"
                >
                  <span class="admin-page__title-primary">{{ uk.admin.actions.showDetails }}</span>
                  <span class="admin-page__title-secondary">{{ uk.admin.users.detailsTitle }}</span>
                </button>
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

    <AppDialogShell
        :is-open="isDetailOpen"
        :title="selectedUser?.name ?? uk.admin.users.detailsTitle"
        :subtitle="selectedUser ? `@${selectedUser.username}` : ''"
        size="lg"
        @close="closeUserDetails"
    >
      <div class="admin-users-dialog">
        <div v-if="isDetailLoading" class="admin-users-dialog__loading">
          <BaseLoader :label="uk.common.labels.loading" size="md" tone="primary" variant="wave" centered />
        </div>

        <template v-else-if="selectedUser">
          <ErrorAlert v-if="detailErrorMessage" :message="detailErrorMessage" />

          <div class="admin-users-dialog__identity">
            <div class="admin-users-dialog__avatar">{{ userInitials }}</div>
            <div class="admin-users-dialog__identity-copy">
              <strong class="admin-users-dialog__name">{{ selectedUser.name }}</strong>
              <span class="admin-users-dialog__username">@{{ selectedUser.username }}</span>
              <span
                  class="admin-page__status"
                  :class="selectedUser.blockedAt ? 'admin-page__status--danger' : 'admin-page__status--success'"
              >
                {{ selectedUser.blockedAt ? uk.admin.status.blocked : uk.admin.status.active }}
              </span>
            </div>
          </div>

          <div class="admin-users-dialog__stats">
            <div class="admin-users-dialog__stat">
              <span class="admin-users-dialog__stat-value">{{ selectedUser.postsCount }}</span>
              <span class="admin-users-dialog__stat-label">{{ uk.admin.users.postsCount }}</span>
            </div>
            <div class="admin-users-dialog__stat">
              <span class="admin-users-dialog__stat-value">{{ selectedUser.activeViolationsCount }}</span>
              <span class="admin-users-dialog__stat-label">{{ uk.admin.users.violationsCount }}</span>
            </div>
          </div>

          <div class="admin-users-dialog__info">
            <div class="admin-page__detail-item">
              <span class="admin-page__detail-label">{{ uk.common.labels.email }}</span>
              <span class="admin-page__detail-value">{{ selectedUser.email }}</span>
            </div>
            <div class="admin-page__detail-item">
              <span class="admin-page__detail-label">{{ uk.admin.users.memberSince }}</span>
              <span class="admin-page__detail-value">{{ formatAdminDateTime(selectedUser.createdAt) }}</span>
            </div>
          </div>

          <div class="admin-users-dialog__action">
            <BaseButton
                v-if="!selectedUser.blockedAt"
                :label="uk.admin.actions.block"
                type="button"
                variant="primary"
                :disabled="isActionSubmitting"
                @click="pendingAction = { kind: 'block', user: selectedUser }"
            />
            <BaseButton
                v-else
                :label="uk.admin.actions.unblock"
                type="button"
                variant="secondary"
                :disabled="!canUnblockSelectedUser || isActionSubmitting"
                @click="pendingAction = { kind: 'unblock', user: selectedUser }"
            />
          </div>

          <section class="admin-users-dialog__violations">
            <h3 class="admin-users-dialog__violations-title">{{ uk.admin.users.historyTitle }}</h3>

            <p v-if="!selectedUser.violations.length" class="admin-users-dialog__violations-empty">
              {{ uk.admin.users.noViolations }}
            </p>

            <div v-else class="admin-users-dialog__violations-list">
              <article
                  v-for="violation in selectedUser.violations"
                  :key="violation.complaintId"
                  class="admin-users-dialog__violation"
              >
                <div class="admin-users-dialog__violation-head">
                  <span class="admin-users-dialog__violation-reason">{{ violation.complaintReasonLabel }}</span>
                  <span class="admin-users-dialog__violation-date">{{ formatAdminDateTime(violation.createdAt) }}</span>
                </div>

                <div class="admin-users-dialog__violation-meta">
                  <div class="admin-page__meta-item">
                    <span class="admin-page__meta-label">{{ uk.admin.complaints.post }}</span>
                    <span class="admin-page__meta-value">#{{ violation.postId }}</span>
                  </div>
                  <div class="admin-page__meta-item">
                    <span class="admin-page__meta-label">{{ uk.admin.users.postState }}</span>
                    <span class="admin-page__meta-value">{{ violationPostStateLabel(violation) }}</span>
                  </div>
                  <div class="admin-page__meta-item">
                    <span class="admin-page__meta-label">{{ uk.admin.users.expiresAt }}</span>
                    <span class="admin-page__meta-value">{{ formatAdminDateTime(violation.expiresAt) }}</span>
                  </div>
                  <div v-if="violation.postRestorationDeadline" class="admin-page__meta-item">
                    <span class="admin-page__meta-label">{{ uk.admin.users.restorationDeadline }}</span>
                    <span class="admin-page__meta-value">{{ formatAdminDateTime(violation.postRestorationDeadline) }}</span>
                  </div>
                </div>

                <BaseButton
                    v-if="violation.expiresAt"
                    :label="uk.admin.actions.removeViolation"
                    type="button"
                    variant="secondary"
                    :disabled="isActionSubmitting"
                    @click="pendingAction = { kind: 'removeViolation', user: selectedUser, violation }"
                />
              </article>
            </div>
          </section>
        </template>

        <ErrorAlert v-else-if="detailErrorMessage" :message="detailErrorMessage" />
      </div>
    </AppDialogShell>

    <ConfirmDialog
        v-if="pendingAction"
        :title="pendingAction.kind === 'block'
          ? uk.admin.users.blockConfirmTitle
          : pendingAction.kind === 'unblock'
              ? uk.admin.users.unblockConfirmTitle
              : uk.admin.users.removeViolationConfirmTitle"
        :message="pendingAction.kind === 'block'
          ? uk.admin.users.blockConfirmMessage
          : pendingAction.kind === 'unblock'
              ? uk.admin.users.unblockConfirmMessage
              : uk.admin.users.removeViolationConfirmMessage"
        :confirm-label="pendingAction.kind === 'block'
          ? uk.admin.actions.block
          : pendingAction.kind === 'unblock'
              ? uk.admin.actions.unblock
              : uk.admin.actions.removeViolation"
        :cancel-label="uk.common.labels.cancel"
        :is-submitting="isActionSubmitting"
        @close="!isActionSubmitting && (pendingAction = null)"
        @confirm="runUserAction"
    />
  </AdminShell>
</template>
