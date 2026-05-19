import type { NotificationType } from '@/modules/notifications/enums/notification-type.enum';

export interface BrowserPushSettings {
    disabledTypes: NotificationType[];
}
