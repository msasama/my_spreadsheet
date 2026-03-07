// A selection of distinct Tailwind-friendly colors for collaborators
const COLORS = [
    '#ef4444', // Red 500
    '#f97316', // Orange 500
    '#f59e0b', // Amber 500
    '#10b981', // Emerald 500
    '#3b82f6', // Blue 500
    '#6366f1', // Indigo 500
    '#8b5cf6', // Violet 500
    '#ec4899', // Pink 500
];

export function getUserColor(uid: string): string {
    // Simple hashing algorithm to turn a string (UID) into a stable index
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
        hash = uid.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % COLORS.length;
    return COLORS[index];
}