export function extractPostId(slug: string): number | null {
    const match = /^(\d+)/.exec(slug);
    if (!match) return null;
    const id = parseInt(match[1], 10);
    return Number.isFinite(id) ? id : null;
}
