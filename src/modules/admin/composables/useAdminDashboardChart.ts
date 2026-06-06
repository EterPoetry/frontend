import { nextTick, onBeforeUnmount, shallowRef, watch, type Ref, type ShallowRef } from 'vue';
import {
    CategoryScale,
    Chart,
    type ChartConfiguration,
    Filler,
    Legend,
    LineController,
    LineElement,
    LinearScale,
    PointElement,
    Tooltip,
} from 'chart.js';
import type { AdminTimeseriesItem } from '@/modules/admin/interfaces/admin-timeseries-item.interface';
import { formatAdminDate } from '@/modules/admin/utils/admin-formatting.utils';
import { uk } from '@/shared/locales/uk';

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

export interface ChartSeries {
    key: string;
    label: string;
    colorClass: string;
    values: number[];
    strokeColor: string;
    fillColor: string;
}

export interface AdminDashboardChartOptions {
    chartCanvas: Ref<HTMLCanvasElement | null>;
    chartItems: Ref<AdminTimeseriesItem[]>;
    theme: Ref<'light' | 'dark'>;
}

export interface AdminDashboardChartReturn {
    chartInstance: ShallowRef<Chart<'line'> | null>;
    chartSeries: Ref<ChartSeries[]>;
    renderChart: () => void;
    destroyChart: () => void;
}

export function useAdminDashboardChart(options: AdminDashboardChartOptions): AdminDashboardChartReturn {
    const { chartCanvas, chartItems, theme } = options;

    const chartInstance = shallowRef<Chart<'line'> | null>(null);

    const chartSeries = shallowRef<ChartSeries[]>([]);

    const updateChartSeries = (): void => {
        const items = chartItems.value;

        chartSeries.value = [
            {
                key: 'users',
                label: uk.admin.dashboard.usersTotal,
                colorClass: 'admin-dashboard-page__series--users',
                values: items.map((item) => item.users.total),
                strokeColor: '#2e9a62',
                fillColor: 'rgba(46, 154, 98, 0.12)',
            },
            {
                key: 'posts',
                label: uk.admin.dashboard.postsTotal,
                colorClass: 'admin-dashboard-page__series--posts',
                values: items.map((item) => item.posts.total),
                strokeColor: '#8b4a2e',
                fillColor: 'rgba(139, 74, 46, 0.12)',
            },
            {
                key: 'complaints',
                label: uk.admin.dashboard.complaintsTotal,
                colorClass: 'admin-dashboard-page__series--complaints',
                values: items.map((item) => item.complaints.total),
                strokeColor: '#c05555',
                fillColor: 'rgba(192, 85, 85, 0.12)',
            },
        ];
    };

    const destroyChart = (): void => {
        chartInstance.value?.destroy();
        chartInstance.value = null;
    };

    const renderChart = (): void => {
        updateChartSeries();

        if (!chartCanvas.value || !chartItems.value.length) {
            destroyChart();
            return;
        }

        destroyChart();

        const textColor = theme.value === 'dark' ? '#c8b8a4' : '#7b7f87';
        const strongTextColor = theme.value === 'dark' ? '#f5ecdf' : '#2b273b';
        const gridColor = theme.value === 'dark' ? 'rgba(199, 131, 84, 0.16)' : 'rgba(139, 74, 46, 0.12)';

        const configuration: ChartConfiguration<'line'> = {
            type: 'line',
            data: {
                labels: chartItems.value.map((item) => formatAdminDate(item.bucketStart)),
                datasets: chartSeries.value.map((series) => ({
                    label: series.label,
                    data: series.values,
                    borderColor: series.strokeColor,
                    backgroundColor: series.fillColor,
                    fill: true,
                    borderWidth: 3,
                    pointRadius: 2,
                    pointHoverRadius: 4,
                    pointHitRadius: 18,
                    pointBorderWidth: 1.5,
                    pointBackgroundColor: series.strokeColor,
                    pointBorderColor: strongTextColor,
                    tension: 0.35,
                })),
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        backgroundColor: theme.value === 'dark' ? 'rgba(33, 26, 23, 0.96)' : 'rgba(255, 251, 244, 0.96)',
                        borderColor: gridColor,
                        borderWidth: 1,
                        titleColor: strongTextColor,
                        bodyColor: textColor,
                        displayColors: true,
                        padding: 12,
                        cornerRadius: 12,
                    },
                },
                scales: {
                    x: {
                        grid: {
                            display: false,
                        },
                        ticks: {
                            color: textColor,
                            maxRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 8,
                        },
                        border: {
                            color: gridColor,
                        },
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor,
                            precision: 0,
                        },
                        grid: {
                            color: gridColor,
                        },
                        border: {
                            color: gridColor,
                        },
                    },
                },
            },
        };

        chartInstance.value = new Chart(chartCanvas.value, configuration);
    };

    watch([chartItems, theme], async () => {
        await nextTick();
        renderChart();
    }, { flush: 'post' });

    onBeforeUnmount(() => {
        destroyChart();
    });

    return {
        chartInstance,
        chartSeries,
        renderChart,
        destroyChart,
    };
}
