import type { AdminTimeseriesInterval } from '@/modules/admin/enums/admin-timeseries-interval.enum';

export interface AdminTimeseriesQuery {
    interval?: AdminTimeseriesInterval;
    from?: string;
    to?: string;
}
