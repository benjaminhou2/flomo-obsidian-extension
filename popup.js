/**
 * @file popup.js
 * @description Main logic for the Flomo & Obsidian Quick Memo extension's popup window.
 * This script handles UI interactions, manages user configuration, and orchestrates
 * the process of sending notes to the Flomo and/or Obsidian APIs.
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Element References ---
    // A centralized object to hold references to all necessary DOM elements for easy access.
    const elements = {
        memoContent: document.getElementById('memo-content'),
        submitButton: document.getElementById('submit-button'),
        statusMessage: document.getElementById('status-message'),
        resultBox: document.getElementById('result-box'),
        // Target selection checkboxes
        sendToFlomo: document.getElementById('send-to-flomo'),
        sendToObsidian: document.getElementById('send-to-obsidian'),
        // Configuration section
        settingsToggle: document.getElementById('settings-toggle'),
        settingsPanel: document.getElementById('settings-panel'),
        // Flomo settings
        flomoUrlInput: document.getElementById('flomo-url'),
        testFlomoButton: document.getElementById('test-flomo'),
        // Obsidian settings
        obsidianVaultInput: document.getElementById('obsidian-vault'),
        obsidianTokenInput: document.getElementById('obsidian-token'),
        testObsidianButton: document.getElementById('test-obsidian'),
    };

    // --- Application State ---
    // A single object to hold the application's configuration and API instances.
    const state = {
        config: {},
        flomoAPI: null,
        obsidianAPI: null,
    };

    /**
     * Loads configuration from chrome.storage.local, initializes API handlers,
     * and updates the UI to reflect the loaded settings. This is the entry point.
     */
    async function loadConfigAndSetup() {
        try {
            const data = await chrome.storage.local.get(['config']);
            state.config = data.config || {};
            
            // Populate UI fields with loaded config values, providing defaults.
            elements.flomoUrlInput.value = state.config.flomoUrl || '';
            elements.obsidianVaultInput.value = state.config.obsidianVault || '';
            elements.obsidianTokenInput.value = state.config.obsidianToken || '';
            elements.sendToFlomo.checked = state.config.sendToFlomo ?? true;
            elements.sendToObsidian.checked = state.config.sendToObsidian ?? false;

            // Initialize API handlers with loaded credentials.
            reinitializeApis();
            updateSubmitButtonState();
        } catch (error) {
            console.error('Error loading configuration:', error);
            updateStatus('Error loading configuration.', 'error');
        }
    }

    /**
     * Saves the current configuration from the UI input fields 
     * to chrome.storage.local and re-initializes the API handlers.
     */
    async function saveConfig() {
        state.config = {
            flomoUrl: elements.flomoUrlInput.value.trim(),
            obsidianVault: elements.obsidianVaultInput.value.trim(),
            obsidianToken: elements.obsidianTokenInput.value.trim(),
            sendToFlomo: elements.sendToFlomo.checked,
            sendToObsidian: elements.sendToObsidian.checked,
        };
        try {
            await chrome.storage.local.set({ config: state.config });
            reinitializeApis();
            updateStatus('Settings saved!', 'success');
        } catch (error) {
            console.error('Error saving configuration:', error);
            updateStatus('Error saving settings.', 'error');
        }
    }

    /**
     * Creates new instances of the API handlers based on the current configuration.
     * This should be called whenever the configuration is loaded or updated.
     */
    function reinitializeApis() {
        state.flomoAPI = new FlomoAPI(state.config.flomoUrl);
        state.obsidianAPI = new ObsidianWriter(state.config.obsidianVault, state.config.obsidianToken);
    }

    /**
     * Sets up all event listeners for the UI elements.
     */
    function setupEventListeners() {
        elements.submitButton.addEventListener('click', submitNote);

        // Auto-save config when any setting input changes.
        const inputs = [
            elements.flomoUrlInput,
            elements.obsidianVaultInput,
            elements.obsidianTokenInput,
            elements.sendToFlomo,
            elements.sendToObsidian,
        ];
        inputs.forEach(input => input.addEventListener('change', saveConfig));
        
        // Update submit button text immediately when targets change.
        [elements.sendToFlomo, elements.sendToObsidian].forEach(checkbox => {
            checkbox.addEventListener('change', updateSubmitButtonState);
        });

        // Connection test buttons.
        elements.testFlomoButton.addEventListener('click', testFlomoConnection);
        elements.testObsidianButton.addEventListener('click', testObsidianConnection);

        // Settings panel toggle visibility.
        elements.settingsToggle.addEventListener('click', () => {
            elements.settingsPanel.classList.toggle('hidden');
        });

        // Keyboard shortcut for submission (Ctrl+Enter).
        elements.memoContent.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                e.preventDefault(); // Prevent new line in textarea
                submitNote();
            }
        });
    }

    /**
     * Handles the main note submission logic. It determines the targets 
     * (Flomo, Obsidian, or both), sends the note via the respective APIs,
     * and displays the consolidated results.
     */
    async function submitNote() {
        const content = elements.memoContent.value.trim();
        if (!content) {
            updateStatus('Note content cannot be empty.', 'error');
            return;
        }

        const toFlomo = elements.sendToFlomo.checked;
        const toObsidian = elements.sendToObsidian.checked;

        if (!toFlomo && !toObsidian) {
            updateStatus('Please select a destination (Flomo or Obsidian).', 'error');
            return;
        }

        updateStatus('Submitting...', 'loading');
        elements.submitButton.disabled = true;

        const submissionPromises = [];
        if (toFlomo) {
            submissionPromises.push(state.flomoAPI.sendToFlomo(content));
        }
        if (toObsidian) {
            submissionPromises.push(state.obsidianAPI.sendToObsidian(content));
        }

        const settledResults = await Promise.all(submissionPromises);

        // Process and display results from all submissions.
        const successMessages = settledResults.filter(r => r.success).map(r => r.message);
        const errorMessages = settledResults.filter(r => !r.success).map(r => r.message);
        
        showResult(successMessages, errorMessages);

        // Only clear the text area if all submissions were successful.
        if (errorMessages.length === 0) {
            elements.memoContent.value = '';
        }
        
        elements.submitButton.disabled = false;
        updateSubmitButtonState();
    }

    /**
     * Tests the connection to the Flomo API and displays the result in the status area.
     */
    async function testFlomoConnection() {
        updateStatus('Testing Flomo connection...', 'loading');
        // Create a temporary API instance with the current input value to test before saving.
        const tempApi = new FlomoAPI(elements.flomoUrlInput.value.trim());
        const result = await tempApi.testConnection();
        updateStatus(result.message, result.success ? 'success' : 'error');
    }

    /**
     * Tests the connection to the Obsidian API and displays the result.
     */
    async function testObsidianConnection() {
        updateStatus('Testing Obsidian connection...', 'loading');
        const tempApi = new ObsidianWriter(
            elements.obsidianVaultInput.value.trim(),
            elements.obsidianTokenInput.value.trim()
        );
        const result = await tempApi.testConnection();
        updateStatus(result.message, result.success ? 'success' : 'error');
    }

    /**
     * Updates the text and appearance of the primary status message area.
     * @param {string} message The text to display.
     * @param {'success'|'error'|'loading'|'info'} type The type of message, used for styling.
     */
    function updateStatus(message, type = 'info') {
        elements.statusMessage.textContent = message;
        elements.statusMessage.className = `status-message ${type}`;
        elements.resultBox.classList.add('hidden'); // Hide the detailed result box
    }
    
    /**
     * Displays the final results of the submission in a dedicated, detailed result box.
     * @param {string[]} successMessages Array of success messages from API calls.
     * @param {string[]} errorMessages Array of error messages from API calls.
     */
    function showResult(successMessages, errorMessages) {
        elements.statusMessage.textContent = ''; // Clear the simple status message
        elements.resultBox.classList.remove('hidden');
        elements.resultBox.innerHTML = ''; // Clear previous results

        if (successMessages.length > 0) {
            const successDiv = document.createElement('div');
            successDiv.className = 'result-block success';
            successDiv.innerHTML = `<strong>Success:</strong><br>${successMessages.join('<br>')}`;
            elements.resultBox.appendChild(successDiv);
        }

        if (errorMessages.length > 0) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'result-block error';
            errorDiv.innerHTML = `<strong>Error:</strong><br>${errorMessages.join('<br>')}`;
            elements.resultBox.appendChild(errorDiv);
        }
    }

    /**
     * Updates the text and disabled state of the submit button based on selected targets.
     */
    function updateSubmitButtonState() {
        const toFlomo = elements.sendToFlomo.checked;
        const toObsidian = elements.sendToObsidian.checked;
        let text = 'Submit';

        if (toFlomo && toObsidian) {
            text = 'Submit to Both';
        } else if (toFlomo) {
            text = 'Submit to Flomo';
        } else if (toObsidian) {
            text = 'Submit to Obsidian';
        }
        
        elements.submitButton.textContent = text;
        // Disable the button if no target is selected.
        elements.submitButton.disabled = !toFlomo && !toObsidian;
    }

    // --- Initial Load ---
    // Start the application by loading config and setting up listeners.
    loadConfigAndSetup();
    setupEventListeners();
}); 