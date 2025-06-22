/**
 * Flomo API Handler
 * 
 * This class manages all interactions with the Flomo API.
 * It is responsible for sending notes to a user's Flomo account via a webhook URL.
 */
class FlomoAPI {
	/**
	 * @param {string} api_url The Flomo webhook URL.
	 */
	constructor(api_url) {
		// Store the Flomo API webhook URL.
		this.api_url = api_url;
	}

	/**
	 * Sends a note to Flomo.
	 * @param {string} content The text content of the note.
	 * @returns {Promise<{success: boolean, message: string}>} The result of the operation.
	 */
	async sendToFlomo(content) {
		if (!this.api_url) {
			return { success: false, message: 'Flomo API URL is not set.' };
		}

		try {
			const response = await fetch(this.api_url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ content: content }),
			});

			// Flomo API returns a 200 OK for successful requests.
			if (response.ok) {
				return { success: true, message: 'Note sent to Flomo successfully.' };
			} else {
				// Attempt to get more detailed error information from the response body.
				const errorData = await response.json().catch(() => null);
				const message = errorData ? errorData.message : `HTTP Error: ${response.status}`;
				return { success: false, message: `Failed to send to Flomo. ${message}` };
			}
		} catch (error) {
			console.error('Error sending to Flomo:', error);
			return { success: false, message: `Network or other error: ${error.message}` };
		}
	}

	/**
	 * Tests the connection to the Flomo API by sending a test note.
	 * @returns {Promise<{success: boolean, message: string}>} The result of the test.
	 */
	async testConnection() {
		// The content for the test note includes a timestamp to ensure uniqueness.
		const testContent = `#flomo-obsidian-extension\nThis is a test message from the Flomo & Obsidian Quick Memo extension.\n${new Date().toLocaleString()}`;
		return this.sendToFlomo(testContent);
	}
}

// 导出类以供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
	module.exports = FlomoAPI;
}