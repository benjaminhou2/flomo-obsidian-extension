/**
 * Obsidian Writer
 * 
 * This class handles communication with a local Obsidian vault
 * using the "Local REST API" community plugin. It is responsible for
 * creating new notes in the specified vault.
 */
class ObsidianWriter {
	/**
	 * @param {string} vaultName The name of the Obsidian vault.
	 * @param {string} apiToken The API token for the Local REST API plugin.
	 * @param {string} [port='27123'] The port number for the API server.
	 */
	constructor(vaultName, apiToken, port = '27123') {
		this.vaultName = vaultName ? vaultName.trim() : '';
		this.apiToken = apiToken;
		this.port = port;
		this.apiUrl = `http://127.0.0.1:${this.port}`;
	}

	/**
	 * Generates a unique filename for a new note based on the current timestamp.
	 * Format: YYYY-MM-DD_HH-mm-ss.md
	 * @returns {string} The generated filename.
	 */
	generateFileName() {
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		const hours = String(now.getHours()).padStart(2, '0');
		const minutes = String(now.getMinutes()).padStart(2, '0');
		const seconds = String(now.getSeconds()).padStart(2, '0');
		return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}.md`;
	}

	/**
	 * Sends a note to the Obsidian vault.
	 * @param {string} content The content of the note.
	 * @returns {Promise<{success: boolean, message: string}>} The result of the operation.
	 */
	async sendToObsidian(content) {
		if (!this.vaultName || !this.apiToken) {
			return { success: false, message: 'Obsidian Vault Name or API Token is not set.' };
		}

		const fileName = this.generateFileName();
		const url = `${this.apiUrl}/notes`;

		console.log(`Attempting to send note to Obsidian:`, {
			url: url,
			fileName: fileName,
			vault: this.vaultName,
		});

		try {
			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${this.apiToken}`,
				},
				body: JSON.stringify({
					// The 'path' specifies the filename including the vault name.
					// The API handles creating the note in the correct vault's root.
					path: `${this.vaultName}/${fileName}`,
					content: content
				})
			});

			if (response.ok) {
				return { success: true, message: `Note '${fileName}' created in Obsidian successfully.` };
			} else {
				const errorText = await response.text();
				return { success: false, message: `Failed to create note in Obsidian. HTTP ${response.status}: ${errorText}` };
			}
		} catch (error) {
			console.error('Error sending to Obsidian:', error);
			return { success: false, message: `Network or other error: ${error.message}` };
		}
	}

	/**
	 * Tests the connection to the Obsidian Local REST API.
	 * This is done by sending a HEAD request to the vault's endpoint,
	 * which is a lightweight way to check for authentication and reachability.
	 * @returns {Promise<{success: boolean, message: string}>} The result of the test.
	 */
	async testConnection() {
		if (!this.vaultName || !this.apiToken) {
			return { success: false, message: 'Obsidian Vault Name or API Token is not set.' };
		}
		
		// Using a HEAD request to the vault endpoint is a good way to test credentials and reachability.
		const url = `${this.apiUrl}/vault/`;
		console.log(`Testing Obsidian connection to URL: ${url}`);
		
		try {
			const response = await fetch(url, {
				method: 'HEAD',
				headers: {
					'Authorization': `Bearer ${this.apiToken}`
				}
			});

			if (response.ok) {
				return { success: true, message: 'Obsidian API connection successful.' };
			} else {
				let message = `Obsidian API connection failed. HTTP ${response.status}: ${response.statusText}`;
				if (response.status === 401) {
					message = "Connection failed: Unauthorized. Check your API Token.";
				} else if (response.status === 404) {
					message = "Connection failed: Not Found. Check if the 'Local REST API' plugin is enabled in Obsidian.";
				}
				return { success: false, message };
			}
		} catch (error) {
			console.error('Error testing Obsidian connection:', error);
			return { success: false, message: `Network error. Is Obsidian running and the API plugin enabled on port ${this.port}?` };
		}
	}
}

// 导出类以供其他模块使用
if (typeof module !== 'undefined' && module.exports) {
	module.exports = ObsidianWriter;
}