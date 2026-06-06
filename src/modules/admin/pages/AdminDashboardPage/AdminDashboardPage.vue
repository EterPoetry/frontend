<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAdminStore } from '@/modules/admin/admin.store';
import { useAdminDashboardChart } from '@/modules/admin/composables/useAdminDashboardChart';
import { ADMIN_MS_IN_DAY } from '@/modules/admin/constants/admin.constants';
import { AdminTimeseriesInterval } from '@/modules/admin/enums/admin-timeseries-interval.enum';
import type { AdminStatsOverview } from '@/modules/admin/interfaces/admin-stats-overview.interface';
import type { AdminTimeseriesResponse } from '@/modules/admin/interfaces/admin-timeseries-response.interface';
import AdminShell from '@/modules/admin/components/AdminShell/AdminShell.vue';
import BaseButton from '@/shared/components/BaseButton/BaseButton.vue';
import BaseLoader from '@/shared/components/BaseLoader/BaseLoader.vue';
import ErrorAlert from '@/shared/components/ErrorAlert/ErrorAlert.vue';
import { useTheme } from '@/shared/composables/useTheme';
import { uk } from '@/shared/locales/uk';
import { formatAdminDate, formatAdminNumber } from '@/modules/admin/utils/admin-formatting.utils';
import '@/modules/admin/pages/admin-page-shared.css';
import './AdminDashboardPage.css';

const adminStore = useAdminStore();
const { theme } = useTheme();

const overview = ref<AdminStatsOverview | null>(null);
const timeseries = ref<AdminTimeseriesResponse | null>(null);
const isLoading = ref(false);
const errorMessage = ref('');
const selectedRangeDays = ref(90);
const chartCanvas = ref<HTMLCanvasElement | null>(null);

const chartItems = computed(() => timeseries.value?.items ?? []);

const { chartSeries } = useAdminDashboardChart({
    chartCanvas,
    chartItems,
    theme,
});

const periodOptions = [
    { days: 30, label: uk.admin.dashboard.last30Days },
    { days: 90, label: uk.admin.dashboard.last90Days },
    { days: 180, label: uk.admin.dashboard.last180Days },
    { days: 365, label: uk.admin.dashboard.last365Days },
];

const metricCards = computed(() => overview.value ? [
    {
        title: uk.admin.dashboard.usersTotal,
        value: formatAdminNumber(overview.value.users.total),
        detail: `${uk.admin.dashboard.usersActive}: ${formatAdminNumber(overview.value.users.active ?? 0)}`,
    },
    {
        title: uk.admin.dashboard.postsTotal,
        value: formatAdminNumber(overview.value.posts.total),
        detail: `${uk.admin.dashboard.postsPublished}: ${formatAdminNumber(overview.value.posts.published ?? 0)}`,
    },
    {
        title: uk.admin.dashboard.complaintsTotal,
        value: formatAdminNumber(overview.value.complaints.total),
        detail: `${uk.admin.dashboard.complaintsPending}: ${formatAdminNumber(overview.value.complaints.pending ?? 0)}`,
    },
    {
        title: uk.admin.dashboard.usersBlocked,
        value: formatAdminNumber(overview.value.users.blocked ?? 0),
        detail: `${uk.admin.dashboard.complaintsResolved}: ${formatAdminNumber(overview.value.complaints.resolved ?? 0)} · ${uk.admin.dashboard.complaintsCancelled}: ${formatAdminNumber(overview.value.complaints.cancelled ?? 0)}`,
    },
] : []);

const resolveTimeseriesInterval = (days: number): AdminTimeseriesInterval => {
    if (days <= 45) {
        return AdminTimeseriesInterval.DAILY;
    }

    if (days <= 180) {
        return AdminTimeseriesInterval.WEEKLY;
    }

    return AdminTimeseriesInterval.MONTHLY;
};

const buildRangeStartIso = (days: number): string => new Date(Date.now() - days * ADMIN_MS_IN_DAY).toISOString();

const loadDashboard = async (): Promise<void> => {
    errorMessage.value = '';

    isLoading.value = true;

    try {
        const [nextOverview, nextTimeseries] = await Promise.all([
            adminStore.getStatsOverview(),
            adminStore.getStatsTimeseries({
                interval: resolveTimeseriesInterval(selectedRangeDays.value),
                from: buildRangeStartIso(selectedRangeDays.value),
            }),
        ]);

        overview.value = nextOverview;
        timeseries.value = nextTimeseries;
    } catch (_error) {
        errorMessage.value = uk.admin.loadFailed;
    } finally {
        isLoading.value = false;
    }
};

onMounted(() => {
    void loadDashboard();
});
</script>

<template>
  <AdminShell :title="uk.admin.dashboard.title" :description="uk.admin.dashboard.description">
    <section class="admin-page">
      <ErrorAlert v-if="errorMessage" :message="errorMessage" />
      <div v-if="errorMessage === uk.admin.loadFailed" class="admin-page__error-actions">
        <BaseButton
            :label="uk.admin.actions.retry"
            type="button"
            variant="secondary"
            :disabled="isLoading"
            :is-loading="isLoading"
            @click="loadDashboard"
        />
      </div>

      <div v-if="isLoading && !overview" class="admin-page__loading">
        <BaseLoader :label="uk.common.labels.loading" size="md" tone="primary" variant="wave" centered />
      </div>

      <div v-else-if="overview" class="admin-dashboard-page__metrics">
        <article v-for="card in metricCards" :key="card.title" class="admin-page__metric-card admin-dashboard-page__metric-card">
          <p class="admin-dashboard-page__metric-title">{{ card.title }}</p>
          <strong class="admin-dashboard-page__metric-value">{{ card.value }}</strong>
          <span class="admin-dashboard-page__metric-detail">{{ card.detail }}</span>
        </article>
      </div>

      <section v-if="timeseries" class="admin-page__chart admin-dashboard-page__chart-panel">
        <div class="admin-dashboard-page__section-header">
          <div class="admin-dashboard-page__section-copy">
            <h2 class="admin-dashboard-page__section-title">{{ uk.admin.dashboard.chartTitle }}</h2>
            <span class="admin-dashboard-page__section-caption">
              {{ formatAdminDate(timeseries.from) }} - {{ formatAdminDate(timeseries.to) }}
            </span>
          </div>

          <div class="admin-dashboard-page__range-switcher" :aria-label="uk.admin.dashboard.rangeLabel">
            <span v-if="isLoading && overview" class="admin-page__toolbar-status admin-dashboard-page__range-status">
              <BaseLoader :label="uk.common.labels.loading" size="sm" tone="primary" variant="wave" />
            </span>
            <BaseButton
                v-for="option in periodOptions"
                :key="option.days"
                :label="option.label"
                type="button"
                variant="secondary"
                class="admin-dashboard-page__range-option"
                :class="{ 'admin-dashboard-page__range-option--active': selectedRangeDays === option.days }"
                :disabled="isLoading"
                @click="selectedRangeDays = option.days; loadDashboard()"
            />
          </div>
        </div>

        <div v-if="!chartItems.length" class="admin-page__empty">
          {{ uk.admin.dashboard.chartEmpty }}
        </div>

        <div v-else class="admin-dashboard-page__visual-main" :aria-busy="isLoading">
          <div class="admin-dashboard-page__legend" aria-hidden="true">
            <span v-for="series in chartSeries" :key="series.key" class="admin-dashboard-page__legend-item">
              <span class="admin-dashboard-page__legend-swatch" :class="series.colorClass" />
              {{ series.label }}
            </span>
          </div>

          <div class="admin-dashboard-page__svg-wrap">
            <canvas
                ref="chartCanvas"
                class="admin-dashboard-page__canvas"
                :aria-label="uk.admin.dashboard.chartTitle"
            />
          </div>
        </div>
      </section>
    </section>
  </AdminShell>
</template>
