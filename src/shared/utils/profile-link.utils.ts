import { uk } from '@/shared/locales/uk';

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const PRIVATE_IP_RE = /^(10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/;
const LOCAL_TLDS = ['.local', '.internal', '.test', '.example', '.invalid', '.localhost'];
const LOCAL_HOSTS = new Set(['localhost', 'broadcasthost']);

export const validateProfileLink = (value: string): string | null => {
    const trimmed = value.trim();

    if (!trimmed) return null;

    if (!trimmed.startsWith('https://')) {
        return uk.profile.editDialog.linkErrorScheme;
    }

    let url: URL;

    try {
        url = new URL(trimmed);
    } catch {
        return uk.profile.editDialog.linkErrorInvalid;
    }

    const hostname = url.hostname.toLowerCase();

    if (!hostname) {
        return uk.profile.editDialog.linkErrorInvalid;
    }

    if (IPV4_RE.test(hostname)) {
        return PRIVATE_IP_RE.test(hostname)
            ? uk.profile.editDialog.linkErrorLocal
            : uk.profile.editDialog.linkErrorIp;
    }

    if (LOCAL_HOSTS.has(hostname) || LOCAL_TLDS.some((tld) => hostname.endsWith(tld))) {
        return uk.profile.editDialog.linkErrorLocal;
    }

    return null;
};
