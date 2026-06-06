import type { AdminTimeseriesInterval } from '@/modules/admin/enums/admin-timeseries-interval.enum';
import type { AdminTimeseriesItem } from '@/modules/admin/interfaces/admin-timeseries-item.interface';

export interface AdminTimeseriesResponse {
    interval: AdminTimeseriesInterval;
    from: string;
    to: string;
    items: AdminTimeseriesItem[];
}
