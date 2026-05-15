export const getAuthorInitial = (name: string): string => {
    const trimmedName = name.trim();

    return trimmedName ? trimmedName.charAt(0).toUpperCase() : '?';
};
