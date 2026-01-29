const API_BASE_URL = "http://localhost:8000";

export async function fetchAPI(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const detail = errorData.detail;
        const errorMessage = typeof detail === 'string' ? detail : JSON.stringify(detail);
        throw new Error(errorMessage || `API Error: ${response.statusText}`);
    }

    return response.json();
}
