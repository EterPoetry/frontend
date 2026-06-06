import type { AdminStatsMetricGroup } from '@/modules/admin/interfaces/admin-stats-metric-group.interface';

export interface AdminStatsOverview {
    users: AdminStatsMetricGroup;
    posts: AdminStatsMetricGroup;
    complaints: AdminStatsMetricGroup;
}
