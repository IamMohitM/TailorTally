export function formatDateTime(dateString) {
    if (!dateString) return '';
    // If string is ISO-like but missing Z and offset, append Z to force UTC
    // Regex checks for YYYY-MM-DDTHH:MM:SS(.sss)? and NO Z or + or - at end
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(dateString)) {
        dateString += 'Z';
    }
    return new Date(dateString).toLocaleString();
}

export function formatDate(dateString) {
    if (!dateString) return '';
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(dateString)) {
        dateString += 'Z';
    }
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}
