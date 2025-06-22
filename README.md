# Flomo & Obsidian Quick Memo

A minimalist browser extension to quickly capture notes and send them to Flomo, Obsidian, or both simultaneously.

*(Here is where a screenshot of the final UI would go)*

## Core Features

- **Streamlined Interface**: A clean, simple text area to get your ideas down without distraction.
- **Dual Destination**: Choose to send your note to Flomo, Obsidian, or both with simple checkboxes.
- **Simple Configuration**: A small, collapsible panel to set up your API credentials.
- **Connection Testing**: Verify your API setup for both Flomo and Obsidian right from the extension.
- **Keyboard Shortcut**: Use `Ctrl + Enter` to submit your note instantly.
- **Resizable Window**: The popup window can be resized to your liking.

## Installation and Setup

### 1. Install the Extension
1.  Download or clone this project to a local folder on your computer.
2.  Open your Chrome-based browser and navigate to `chrome://extensions/`.
3.  Enable "Developer mode" using the toggle switch in the top-right corner.
4.  Click the "Load unpacked" button and select the project folder you downloaded.

### 2. Configure the APIs

The extension requires API access to send notes. Click the settings icon (⚙️) in the popup to open the configuration panel.

#### For Flomo:
1.  **Get your Webhook URL**: In the Flomo app or on the website, go to `Settings > API` and copy your unique webhook URL.
2.  **Enter in Extension**: Paste the URL into the "Flomo API URL" field in the extension's settings.
3.  **Test**: Click the "Test" button to ensure the connection is working. You should see a success message and a new test memo in your Flomo.

#### For Obsidian:
1.  **Install the Plugin**: In Obsidian, go to `Settings > Community plugins` and install the **"Local REST API"** plugin.
2.  **Enable the Plugin**: After installation, enable the plugin.
3.  **Get the API Token**: In the plugin's settings, you will find a long API token. Copy it.
4.  **Enter in Extension**:
    *   Paste the token into the "Obsidian API Token" field.
    *   Enter your vault's name exactly as it appears in Obsidian into the "Obsidian Vault Name" field.
5.  **Test**: Click the "Test" button. A success message indicates that the extension can connect to your vault.

## Development Journey & Troubleshooting

This project went through a significant evolution, facing several technical challenges along the way. Here is a summary of the journey.

### Pivot from Sync Tool to Quick Capture

The project was initially conceived as a complex tool to **synchronize** notes from Flomo *to* Obsidian. However, this proved to be difficult and less useful. We pivoted to a much simpler and more powerful concept: a **quick capture** tool that sends notes *to* Flomo and/or Obsidian. This clarified the project's purpose and led to a complete UI redesign.

### UI/UX Refinements

The first version of the new UI was functional but had usability issues. The popup window was too narrow (`width: 100vw` was a misinterpretation of viewport units in an extension context).

-   **Solution**: We first set a fixed, wider width (`520px`) for better readability. To further improve usability, we then added the `resize: both;` CSS property to the main container, making the popup fully resizable by the user.

### The Mystery of the Obsidian 404 Error

The most significant challenge was a persistent `HTTP 404: Not Found` error when trying to send notes to Obsidian, even though the API server seemed to be running correctly. Our debugging process involved several steps:

1.  **Port and Vault Name Check**: We first suspected an incorrect port or a typo in the vault name. We standardized the port to the plugin's default (`27123`) and added `.trim()` to sanitize the vault name input. The error persisted.

2.  **Deep Logging**: We added "detective-level" logging to inspect the exact URL, headers, and body of the `fetch` request being sent to the Obsidian API. This confirmed our data was being sent, but the endpoint itself was wrong.

3.  **The Misconception**: We were operating under the assumption that the API endpoint to create a note was `PUT /vault/{vault_name}/{filename}`. This was based on incomplete documentation and was the root cause of the 404 error.

4.  **The Breakthrough**: The user provided the crucial information that the correct method was `POST /notes`. Furthermore, the vault name was not part of the URL but was expected inside the JSON payload, prepended to the filename (e.g., `path: "vault-name/note.md"`).

5.  **Final Bug - The Double Path**: After refactoring the code to use `POST /notes`, we encountered a `400 Bad Request` error. Logs revealed the file path was being duplicated (e.g., `ob-flomo/ob-flomo/note.md`). We had mistakenly prepended the vault name in two different places.

-   **Final Solution**: The `obsidianWriter.js` was corrected to build the path correctly inside the JSON body of the `POST` request, finally resolving the issue and allowing notes to be created successfully.

## Final File Structure

After cleaning up redundant and legacy files, the project now consists of the following core components:

-   `manifest.json`: The extension's configuration file.
-   `popup.html`: The UI structure for the popup window.
-   `popup.js`: The main script for UI logic, configuration, and event handling.
-   `styles.css`: All CSS styles for the UI.
-   `flomoAPI.js`: A class for handling communication with the Flomo API.
-   `obsidianWriter.js`: A class for handling note creation via the Obsidian Local REST API.
-   `README.md`: This file.

## License

This project is licensed under the MIT License. 