<script setup lang="ts">
import { ref } from 'vue';
import { useAdminStore } from '@/modules/admin/admin.store';
import { useAdminPaginatedList } from '@/modules/admin/composables/useAdminPaginatedList';
import type { AdminComplaintItem } from '@/modules/admin/interfaces/admin-complaint-item.interface';
import type { AdminComplaintsListQuery } from '@/modules/admin/interfaces/admin-complaints-list-query.interface';
import type { AdminComplaintStatus } from '@/modules/admin/types/admin-complaint-status.type';
import AdminShell from '@/modules/admin/components/AdminShell/AdminShell.vue';
import AppDialogShell from '@/shared/components/AppDialogShell/AppDialogShell.vue';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import BaseField from '@/shared/components/BaseField/BaseField.vue';
import BaseLoader from '@/shared/components/BaseLoader/BaseLoader.vue';
import ConfirmDialog from '@/shared/components/ConfirmDialog/ConfirmDialog.vue';
import ErrorAlert from '@/shared/components/ErrorAlert/ErrorAlert.vue';
import { PostRouteNames } from '@/modules/posts/enums/post-route-names.enum';
import { ProfileRouteNames } from '@/modules/profile/enums/profile-route-names.enum';
import { getApiErrorMessage } from '@/shared/utils/api-error.utils';
import { uk } from '@/shared/locales/uk';
import { formatAdminDateTime } from '@/modules/admin/utils/admin-formatting.utils';
import '@/modules/admin/pages/admin-page-shared.css';
import './AdminComplaintsPage.css';

type ComplaintAction = {
    item: AdminComplaintItem;
    kind: 'accept' | 'decline' | 'removeViolation';
};

const adminStore = useAdminStore();

const search = ref('');
const status = ref<AdminComplaintStatus | ''>('');
const sortBy = ref<'createdAt' | 'status' | 'reason'>('createdAt');
const sortOrder = ref<'asc' | 'desc'>('desc');
const pendingAction = ref<ComplaintAction | null>(null);
const isActionSubmitting = ref(false);
const selectedComplaint = ref<AdminComplaintItem | null>(null);

const {
    items,
    isLoading,
    errorMessage,
    feedbackMessage,
    hasNextPage,
    loadItems,
    loadMore,
    applyFilters,
} = useAdminPaginatedList<AdminComplaintItem, AdminComplaintsListQuery>({
    fetchItems: (query) => adminStore.getComplaints(query),
    buildQuery: () => ({
        search: search.value.trim() || undefined,
        status: status.value || undefined,
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
    }),
    filterSources: [search, status, sortBy, sortOrder],
});

const runComplaintAction = async (): Promise<void> => {
    if (!pendingAction.value || isActionSubmitting.value) {
        return;
    }

    feedbackMessage.value = '';
    isActionSubmitting.value = true;

    try {
        if (pendingAction.value.kind === 'accept') {
            await adminStore.acceptComplaint(pendingAction.value.item.complaintId);
            feedbackMessage.value = uk.admin.complaints.acceptSuccess;
        } else if (pendingAction.value.kind === 'decline') {
            await adminStore.declineComplaint(pendingAction.value.item.complaintId);
            feedbackMessage.value = uk.admin.complaints.declineSuccess;
        } else {
            await adminStore.deleteViolation(
                pendingAction.value.item.targetUser.userId,
                pendingAction.value.item.complaintId,
            );
            feedbackMessage.value = uk.admin.complaints.cancelViolationSuccess;
        }

        const activeComplaintId = pendingAction.value.item.complaintId;
        pendingAction.value = null;
        await loadItems();
        selectedComplaint.value = items.value.find((item) => item.complaintId === activeComplaintId) ?? null;
    } catch (error) {
        errorMessage.value = getApiErrorMessage(error) ?? uk.common.errors.serverError;
    } finally {
        isActionSubmitting.value = false;
    }
};

const statusClass = (value: AdminComplaintStatus): string => {
    if (value === 'pending') {
        return 'admin-page__status--warning';
    }

    if (value === 'resolved') {
        return 'admin-page__status--success';
    }

    if (value === 'cancelled') {
        return 'admin-page__status--danger';
    }

    return 'admin-page__status--muted';
};

const statusLabel = (value: AdminComplaintStatus): string => {
    if (value === 'pending') {
        return uk.admin.status.pending;
    }

    if (value === 'resolved') {
        return uk.admin.status.resolved;
    }

    if (value === 'cancelled') {
        return uk.admin.status.cancelled;
    }

    return uk.admin.status.dismissed;
};

const actionLabel = (value: AdminComplaintStatus): string => {
    if (value === 'pending') {
        return uk.admin.actions.review;
    }

    return uk.admin.actions.showDetails;
};

const postStateLabel = (postStatus: string, removedAt: string | null): string => {
    if (removedAt) {
        return uk.admin.status.removed;
    }

    if (postStatus === 'published') {
        return uk.admin.status.published;
    }

    return postStatus;
};

const openComplaintDetails = (item: AdminComplaintItem): void => {
    selectedComplaint.value = item;
};

const handleRowKeydown = (event: KeyboardEvent, item: AdminComplaintItem): void => {
    if (event.key !== 'Enter' && event.key !== ' ') {
        return;
    }

    event.preventDefault();
    openComplaintDetails(item);
};

const closeComplaintDetails = (): void => {
    selectedComplaint.value = null;
};
</script>

<template>
  <AdminShell :title="uk.admin.complaints.title" :description="uk.admin.complaints.description">
    <section class="admin-page">
      <div class="admin-page__toolbar">
        <div class="admin-page__toolbar-fields">
          <BaseField
              id="admin-complaints-search"
              v-model="search"
              class="admin-page__field admin-page__field--search"
              :label="uk.home.searchPlaceholder"
              :placeholder="uk.admin.complaints.searchPlaceholder"
              :max-length="120"
              :disabled="isLoading"
          />

          <label class="admin-page__field admin-page__field--sm">
            <span class="admin-page__field-label">{{ uk.admin.complaints.statusFilterLabel }}</span>
            <select v-model="status" class="admin-page__select">
              <option value="">{{ uk.admin.complaints.statusAll }}</option>
              <option value="pending">{{ uk.admin.status.pending }}</option>
              <option value="resolved">{{ uk.admin.status.resolved }}</option>
              <option value="dismissed">{{ uk.admin.status.dismissed }}</option>
              <option value="cancelled">{{ uk.admin.status.cancelled }}</option>
            </select>
          </label>

          <label class="admin-page__field admin-page__field--sm">
            <span class="admin-page__field-label">{{ uk.home.sort.ariaLabel }}</span>
            <select v-model="sortBy" class="admin-page__select">
              <option value="createdAt">{{ uk.admin.admins.createdAt }}</option>
              <option value="status">{{ uk.admin.complaints.statusFilterLabel }}</option>
              <option value="reason">{{ uk.posts.complaint.reasonLabel }}</option>
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
        {{ uk.admin.complaints.empty }}
      </div>

      <section v-else class="admin-page__table-wrap admin-page__table-wrap--cards admin-complaints-page__table-wrap">
        <table class="admin-page__table admin-complaints-page__table">
          <thead>
            <tr>
              <th>{{ uk.posts.complaint.reasonLabel }}</th>
              <th>{{ uk.admin.complaints.target }}</th>
              <th>{{ uk.admin.admins.createdAt }}</th>
              <th>{{ uk.admin.complaints.statusFilterLabel }}</th>
              <th class="admin-complaints-page__chevron-head" aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            <tr
                v-for="item in items"
                :key="item.complaintId"
                class="admin-complaints-page__row"
                tabindex="0"
                role="button"
                :aria-label="`${actionLabel(item.status)}: ${item.complaintReasonLabel}`"
                @click="openComplaintDetails(item)"
                @keydown="handleRowKeydown($event, item)"
            >
              <td :data-label="uk.posts.complaint.reasonLabel">
                <div class="admin-page__title-cell admin-complaints-page__summary-cell">
                  <span class="admin-page__title-primary">{{ item.complaintReasonLabel }}</span>
                  <RouterLink
                      class="admin-complaints-page__table-link"
                      :to="{ name: PostRouteNames.POST, params: { slug: item.targetPost.slug } }"
                      target="_blank"
                      rel="noopener"
                      @click.stop
                      @keydown.stop
                  >
                    {{ item.targetPost.title }}
                  </RouterLink>
                  <span class="admin-page__title-secondary">#{{ item.complaintId }}</span>
                </div>
              </td>
              <td :data-label="uk.admin.complaints.target">
                <div class="admin-page__title-cell admin-complaints-page__people-cell">
                  <RouterLink
                      class="admin-complaints-page__table-link admin-complaints-page__table-link--person"
                      :to="{ name: ProfileRouteNames.PROFILE_BY_USERNAME, params: { username: item.targetUser.username } }"
                      target="_blank"
                      rel="noopener"
                      @click.stop
                      @keydown.stop
                  >
                    {{ item.targetUser.name }}
                  </RouterLink>
                  <span class="admin-page__title-secondary">@{{ item.targetUser.username }}</span>
                  <span class="admin-page__title-secondary">{{ uk.admin.complaints.reporter }}: {{ item.author.name }}</span>
                </div>
              </td>
              <td class="admin-complaints-page__date-cell" :data-label="uk.admin.admins.createdAt">
                <span class="admin-page__title-secondary">{{ formatAdminDateTime(item.createdAt) }}</span>
              </td>
              <td class="admin-complaints-page__status-cell" :data-label="uk.admin.complaints.statusFilterLabel">
                <div class="admin-page__title-cell admin-complaints-page__status-stack">
                  <span class="admin-page__status" :class="statusClass(item.status)">
                    {{ statusLabel(item.status) }}
                  </span>
                  <span class="admin-page__title-secondary">{{ actionLabel(item.status) }}</span>
                </div>
              </td>
              <td class="admin-complaints-page__chevron-cell" data-label="" aria-hidden="true">
                <span class="admin-complaints-page__chevron">›</span>
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
        :is-open="Boolean(selectedComplaint)"
        :title="selectedComplaint?.complaintReasonLabel ?? uk.admin.complaints.title"
        :subtitle="selectedComplaint ? `#${selectedComplaint.complaintId}` : ''"
        size="md"
        @close="closeComplaintDetails"
    >
      <div v-if="selectedComplaint" class="admin-complaints-dialog">
        <div class="admin-complaints-dialog__top">
          <div class="admin-complaints-dialog__section admin-complaints-dialog__section--content">
            <span class="admin-page__detail-label">{{ uk.admin.complaints.post }}</span>
            <div class="admin-complaints-dialog__content-card">
              <RouterLink
                  class="admin-complaints-dialog__link"
                  :to="{ name: PostRouteNames.POST, params: { slug: selectedComplaint.targetPost.slug } }"
                  target="_blank"
                  rel="noopener"
              >
                {{ selectedComplaint.targetPost.title }}
              </RouterLink>
              <span class="admin-page__title-secondary">
                {{ postStateLabel(selectedComplaint.targetPost.status, selectedComplaint.targetPost.removedAt) }}
              </span>
              <span
                  v-if="selectedComplaint.targetPost.postRestorationDeadline"
                  class="admin-complaints-dialog__restoration-note"
              >
                {{ uk.admin.complaints.restorationDeadline }}:
                {{ formatAdminDateTime(selectedComplaint.targetPost.postRestorationDeadline) }}
              </span>
              <span
                  v-if="selectedComplaint.targetPost.postRestorationDeadline"
                  class="admin-page__title-secondary"
              >
                {{ uk.admin.complaints.restorationHint }}
              </span>
            </div>
          </div>

          <div class="admin-complaints-dialog__meta">
            <div class="admin-complaints-dialog__section">
              <span class="admin-page__detail-label">{{ uk.admin.complaints.reporter }}</span>
              <RouterLink
                  class="admin-complaints-dialog__link"
                  :to="{ name: ProfileRouteNames.PROFILE_BY_USERNAME, params: { username: selectedComplaint.author.username } }"
                  target="_blank"
                  rel="noopener"
              >
                {{ selectedComplaint.author.name }} (@{{ selectedComplaint.author.username }})
              </RouterLink>
            </div>

            <div class="admin-complaints-dialog__section">
              <span class="admin-page__detail-label">{{ uk.admin.complaints.target }}</span>
              <RouterLink
                  class="admin-complaints-dialog__link"
                  :to="{ name: ProfileRouteNames.PROFILE_BY_USERNAME, params: { username: selectedComplaint.targetUser.username } }"
                  target="_blank"
                  rel="noopener"
              >
                {{ selectedComplaint.targetUser.name }} (@{{ selectedComplaint.targetUser.username }})
              </RouterLink>
            </div>
          </div>
        </div>

        <div class="admin-complaints-dialog__grid">
          <div class="admin-complaints-dialog__section">
            <span class="admin-page__detail-label">{{ uk.admin.admins.createdAt }}</span>
            <span class="admin-page__detail-value">{{ formatAdminDateTime(selectedComplaint.createdAt) }}</span>
          </div>

          <div class="admin-complaints-dialog__section">
            <span class="admin-page__detail-label">{{ uk.admin.complaints.processedBy }}</span>
            <span class="admin-page__detail-value">{{ selectedComplaint.processedByAdmin?.name || '-' }}</span>
          </div>

          <div class="admin-complaints-dialog__section">
            <span class="admin-page__detail-label">{{ uk.admin.complaints.statusFilterLabel }}</span>
            <div class="admin-complaints-dialog__status-area">
              <span class="admin-page__status" :class="statusClass(selectedComplaint.status)">
                {{ statusLabel(selectedComplaint.status) }}
              </span>

              <div v-if="selectedComplaint.status === 'pending'" class="admin-complaints-dialog__actions">
                <BaseButton
                    class="admin-complaints-page__action-btn admin-complaints-page__action-btn--accept"
                    :label="uk.admin.actions.accept"
                    type="button"
                    variant="primary"
                    :disabled="isActionSubmitting"
                    @click="pendingAction = { item: selectedComplaint, kind: 'accept' }"
                />
                <BaseButton
                    class="admin-complaints-page__action-btn admin-complaints-page__action-btn--decline"
                    :label="uk.admin.actions.decline"
                    type="button"
                    variant="secondary"
                    :disabled="isActionSubmitting"
                    @click="pendingAction = { item: selectedComplaint, kind: 'decline' }"
                />
              </div>

              <div v-else-if="selectedComplaint.status === 'resolved'" class="admin-complaints-dialog__actions">
                <BaseButton
                    class="admin-complaints-page__action-btn admin-complaints-page__action-btn--decline"
                    :label="uk.admin.actions.removeViolation"
                    type="button"
                    variant="secondary"
                    :disabled="isActionSubmitting"
                    @click="pendingAction = { item: selectedComplaint, kind: 'removeViolation' }"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppDialogShell>

    <ConfirmDialog
        v-if="pendingAction"
        :title="pendingAction.kind === 'accept'
          ? uk.admin.complaints.acceptConfirmTitle
          : pendingAction.kind === 'decline'
              ? uk.admin.complaints.declineConfirmTitle
              : uk.admin.users.removeViolationConfirmTitle"
        :message="pendingAction.kind === 'accept'
          ? uk.admin.complaints.acceptConfirmMessage
          : pendingAction.kind === 'decline'
              ? uk.admin.complaints.declineConfirmMessage
              : uk.admin.users.removeViolationConfirmMessage"
        :confirm-label="pendingAction.kind === 'accept'
          ? uk.admin.actions.accept
          : pendingAction.kind === 'decline'
              ? uk.admin.actions.decline
              : uk.admin.actions.removeViolation"
        :cancel-label="uk.common.labels.cancel"
        :is-submitting="isActionSubmitting"
        @close="!isActionSubmitting && (pendingAction = null)"
        @confirm="runComplaintAction"
    />
  </AdminShell>
</template>
