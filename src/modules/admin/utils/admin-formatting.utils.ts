export const formatAdminDateTime = (value: string | null): string => {
    if (!value) {
        return '-';
    }

    return new Intl.DateTimeFormat('uk-UA', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
};

export const formatAdminDate = (value: string | null): string => {
    if (!value) {
        return '-';
    }

    return new Intl.DateTimeFormat('uk-UA', {
        dateStyle: 'medium',
    }).format(new Date(value));
};

export const formatAdminNumber = (value: number): string => new Intl.NumberFormat('uk-UA').format(value);

export const getAdminStatusTone = (value: boolean): string => value ? 'success' : 'muted';
