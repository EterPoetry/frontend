import 'vue-router';
import { PrimaryPostsFeedKind } from '@/modules/posts/interfaces/primary-posts-feed-kind.type';

declare module 'vue-router' {
    interface RouteMeta {
        feedKind?: PrimaryPostsFeedKind;
        searchEnabled?: boolean;
    }
}
