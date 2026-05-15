const COMPACT_SUFFIXES = [
    { value: 1_000_000_000, suffix: 'млрд' },
    { value: 1_000_000, suffix: 'млн' },
    { value: 1_000, suffix: 'к' },
];

export const formatCompactNumber = (value: number): string => {
    const normalizedValue = Number.isFinite(value) ? value : 0;
    const absoluteValue = Math.abs(normalizedValue);

    const compactEntry = COMPACT_SUFFIXES.find(({ value: threshold }) => absoluteValue >= threshold);

    if (!compactEntry) {
        return `${Math.round(normalizedValue)}`;
    }

    const compactValue = normalizedValue / compactEntry.value;
    const roundedCompactValue = compactValue >= 10
        ? Math.round(compactValue)
        : Math.round(compactValue * 10) / 10;
    const formattedValue = Number.isInteger(roundedCompactValue)
        ? `${roundedCompactValue}`
        : roundedCompactValue.toFixed(1).replace('.0', '');

    return `${formattedValue}${compactEntry.suffix}`;
};
