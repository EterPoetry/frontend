export interface AdminStatsMetricGroup {
    total: number;
    active?: number;
    blocked?: number;
    published?: number;
    removed?: number;
    pending?: number;
    resolved?: number;
    dismissed?: number;
    cancelled?: number;
}
