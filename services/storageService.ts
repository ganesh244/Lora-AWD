const API_URL = '/api/data';

export const storageService = {
    async setItem(key: string, value: string): Promise<void> {
        try {
            localStorage.setItem(key, value);
            await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value }),
            });
        } catch (e) {
            console.error("Error saving to server", e);
        }
    },

    async syncWithServer(): Promise<void> {
        try {
            const res = await fetch(API_URL);
            if (res.ok) {
                const data = await res.json();
                Object.entries(data).forEach(([key, value]) => {
                    localStorage.setItem(key, value as string);
                });
            }
        } catch (e) {
            console.error("Failed to sync with server", e);
        }
    }
};
