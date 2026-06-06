import type { AdminStatsMetricGroup } from '@/modules/admin/interfaces/admin-stats-metric-group.interface';

export interface AdminTimeseriesItem {
    bucketStart: string;
    users: AdminStatsMetricGroup;
    posts: AdminStatsMetricGroup;
    complaints: AdminStatsMetricGroup;
}
