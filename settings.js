/**
 * Settings Manager for Tone Adjuster Chrome Extension
 * Handles settings storage, validation, and UI interactions
 */

class SettingsManager {
    constructor() {
        this.defaultSettings = {
            // General Settings
            defaultTone: 'polish',
            autoAccept: false,
            showTooltip: true,
            enableContextMenu: true,
            
            // AI Behavior
            creativity: 0.8,
            sessionTimeout: 10,
            maxTextLength: 5000,
            
            // Interface
            theme: 'system',
            animationsEnabled: true,
            compactMode: false,
            
            // Privacy & Data
            enableTelemetry: false,
            
            // Advanced
            debugMode: false
        };
        
        this.settings = { ...this.defaultSettings };
        this.isLoading = false;
        this.hasUnsavedChanges = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.loadSettings();
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        this.elements = {
            // Navigation
            backButton: document.getElementById('backButton'),
            saveButton: document.getElementById('saveButton'),
            helpButton: document.getElementById('helpButton'),
            
            // General Settings
            defaultTone: document.getElementById('defaultTone'),
            autoAccept: document.getElementById('autoAccept'),
            showTooltip: document.getElementById('showTooltip'),
            enableContextMenu: document.getElementById('enableContextMenu'),
            
            // AI Behavior
            creativity: document.getElementById('creativity'),
            creativityValue: document.getElementById('creativityValue'),
            sessionTimeout: document.getElementById('sessionTimeout'),
            maxTextLength: document.getElementById('maxTextLength'),
            
            // Interface
            theme: document.getElementById('theme'),
            animationsEnabled: document.getElementById('animationsEnabled'),
            compactMode: document.getElementById('compactMode'),
            
            // Privacy & Data
            enableTelemetry: document.getElementById('enableTelemetry'),
            
            // Advanced
            debugMode: document.getElementById('debugMode'),
            resetSettings: document.getElementById('resetSettings'),
            exportSettings: document.getElementById('exportSettings'),
            importSettings: document.getElementById('importSettings'),
            importFile: document.getElementById('importFile'),
            
            // UI Elements
            messageContainer: document.getElementById('messageContainer'),
            versionNumber: document.getElementById('versionNumber')
        };
    }

    /**
     * Setup event listeners for all interactive elements
     */
    setupEventListeners() {
        // Navigation
        this.elements.backButton.addEventListener('click', () => this.handleBackClick());
        this.elements.saveButton.addEventListener('click', () => this.saveSettings());
        this.elements.helpButton.addEventListener('click', () => this.openHelp());
        
        // General Settings
        this.elements.defaultTone.addEventListener('change', () => this.handleSettingChange('defaultTone'));
        this.elements.autoAccept.addEventListener('change', () => this.handleSettingChange('autoAccept'));
        this.elements.showTooltip.addEventListener('change', () => this.handleSettingChange('showTooltip'));
        this.elements.enableContextMenu.addEventListener('change', () => this.handleSettingChange('enableContextMenu'));
        
        // AI Behavior
        this.elements.creativity.addEventListener('input', () => this.handleCreativityChange());
        this.elements.sessionTimeout.addEventListener('change', () => this.handleSettingChange('sessionTimeout'));
        this.elements.maxTextLength.addEventListener('change', () => this.handleSettingChange('maxTextLength'));
        
        // Interface
        this.elements.theme.addEventListener('change', () => this.handleThemeChange());
        this.elements.animationsEnabled.addEventListener('change', () => this.handleSettingChange('animationsEnabled'));
        this.elements.compactMode.addEventListener('change', () => this.handleCompactModeChange());
        
        // Privacy & Data
        this.elements.enableTelemetry.addEventListener('change', () => this.handleSettingChange('enableTelemetry'));
        
        // Advanced
        this.elements.debugMode.addEventListener('change', () => this.handleSettingChange('debugMode'));
        this.elements.resetSettings.addEventListener('click', () => this.handleResetSettings());
        this.elements.exportSettings.addEventListener('click', () => this.exportSettings());
        this.elements.importSettings.addEventListener('click', () => this.elements.importFile.click());
        this.elements.importFile.addEventListener('change', (e) => this.importSettings(e));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Before unload warning
        window.addEventListener('beforeunload', (e) => this.handleBeforeUnload(e));
    }

    /**
     * Load settings from Chrome storage
     */
    async loadSettings() {
        this.isLoading = true;
        this.showMessage('Loading settings...', 'info');
        
        try {
            const result = await chrome.storage.sync.get(this.defaultSettings);
            this.settings = { ...this.defaultSettings, ...result };
            this.populateUI();
            this.hideMessage();
            console.log('Settings loaded:', this.settings);
        } catch (error) {
            console.error('Failed to load settings:', error);
            this.showMessage('Failed to load settings. Using defaults.', 'error');
            this.populateUI();
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Save settings to Chrome storage
     */
    async saveSettings() {
        if (this.isLoading) return;
        
        this.showMessage('Saving settings...', 'info');
        this.elements.saveButton.disabled = true;
        
        try {
            await chrome.storage.sync.set(this.settings);
            this.hasUnsavedChanges = false;
            this.updateSaveButtonState();
            this.showMessage('Settings saved successfully!', 'success');
            
            // Notify other parts of the extension about settings change
            this.notifySettingsChanged();
            
            console.log('Settings saved:', this.settings);
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showMessage('Failed to save settings. Please try again.', 'error');
        } finally {
            this.elements.saveButton.disabled = false;
        }
    }

    /**
     * Populate UI with current settings values
     */
    populateUI() {
        // General Settings
        this.elements.defaultTone.value = this.settings.defaultTone;
        this.elements.autoAccept.checked = this.settings.autoAccept;
        this.elements.showTooltip.checked = this.settings.showTooltip;
        this.elements.enableContextMenu.checked = this.settings.enableContextMenu;
        
        // AI Behavior
        this.elements.creativity.value = this.settings.creativity;
        this.elements.creativityValue.textContent = this.settings.creativity;
        this.elements.sessionTimeout.value = this.settings.sessionTimeout;
        this.elements.maxTextLength.value = this.settings.maxTextLength;
        
        // Interface
        this.elements.theme.value = this.settings.theme;
        this.elements.animationsEnabled.checked = this.settings.animationsEnabled;
        this.elements.compactMode.checked = this.settings.compactMode;
        
        // Privacy & Data
        this.elements.enableTelemetry.checked = this.settings.enableTelemetry;
        
        // Advanced
        this.elements.debugMode.checked = this.settings.debugMode;
        
        // Apply theme and compact mode
        this.applyTheme();
        this.applyCompactMode();
        this.applyAnimations();
    }

    /**
     * Handle individual setting changes
     */
    handleSettingChange(settingKey) {
        if (this.isLoading) return;
        
        const element = this.elements[settingKey];
        let value;
        
        if (element.type === 'checkbox') {
            value = element.checked;
        } else if (element.type === 'range' || element.type === 'number') {
            value = parseFloat(element.value);
        } else {
            value = element.value;
        }
        
        this.settings[settingKey] = value;
        this.hasUnsavedChanges = true;
        this.updateSaveButtonState();
        
        console.log(`Setting changed: ${settingKey} = ${value}`);
    }

    /**
     * Handle creativity slider changes
     */
    handleCreativityChange() {
        const value = parseFloat(this.elements.creativity.value);
        this.elements.creativityValue.textContent = value.toFixed(1);
        this.settings.creativity = value;
        this.hasUnsavedChanges = true;
        this.updateSaveButtonState();
    }

    /**
     * Handle theme changes
     */
    handleThemeChange() {
        this.handleSettingChange('theme');
        this.applyTheme();
    }

    /**
     * Handle compact mode changes
     */
    handleCompactModeChange() {
        this.handleSettingChange('compactMode');
        this.applyCompactMode();
    }

    /**
     * Apply theme to the UI
     */
    applyTheme() {
        const theme = this.settings.theme;
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        
        if (theme !== 'system') {
            document.body.classList.add(`theme-${theme}`);
        }
    }

    /**
     * Apply compact mode to the UI
     */
    applyCompactMode() {
        if (this.settings.compactMode) {
            document.body.classList.add('compact-mode');
        } else {
            document.body.classList.remove('compact-mode');
        }
    }

    /**
     * Apply animation preferences
     */
    applyAnimations() {
        if (!this.settings.animationsEnabled) {
            document.body.classList.add('no-animations');
        } else {
            document.body.classList.remove('no-animations');
        }
    }

    /**
     * Update save button state based on changes
     */
    updateSaveButtonState() {
        const saveButton = this.elements.saveButton;
        const buttonText = saveButton.querySelector('.button-text');
        
        if (this.hasUnsavedChanges) {
            saveButton.classList.add('has-changes');
            if (buttonText) buttonText.textContent = 'Save*';
        } else {
            saveButton.classList.remove('has-changes');
            if (buttonText) buttonText.textContent = 'Save';
        }
    }

    /**
     * Handle back button click
     */
    handleBackClick() {
        if (this.hasUnsavedChanges) {
            const proceed = confirm('You have unsaved changes. Are you sure you want to go back?');
            if (!proceed) return;
        }
        
        window.close();
    }

    /**
     * Handle reset settings
     */
    async handleResetSettings() {
        const confirmed = confirm(
            'Are you sure you want to reset all settings to their default values? This action cannot be undone.'
        );
        
        if (!confirmed) return;
        
        this.settings = { ...this.defaultSettings };
        this.populateUI();
        this.hasUnsavedChanges = true;
        this.updateSaveButtonState();
        this.showMessage('Settings reset to defaults. Click Save to apply.', 'info');
    }

    /**
     * Export settings to JSON file
     */
    exportSettings() {
        const dataStr = JSON.stringify(this.settings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `tone-adjuster-settings-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.showMessage('Settings exported successfully!', 'success');
    }

    /**
     * Import settings from JSON file
     */
    async importSettings(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const text = await file.text();
            const importedSettings = JSON.parse(text);
            
            // Validate imported settings
            const validatedSettings = this.validateSettings(importedSettings);
            
            this.settings = { ...this.defaultSettings, ...validatedSettings };
            this.populateUI();
            this.hasUnsavedChanges = true;
            this.updateSaveButtonState();
            
            this.showMessage('Settings imported successfully! Click Save to apply.', 'success');
        } catch (error) {
            console.error('Failed to import settings:', error);
            this.showMessage('Failed to import settings. Please check the file format.', 'error');
        }
        
        // Clear the file input
        event.target.value = '';
    }

    /**
     * Validate imported settings
     */
    validateSettings(settings) {
        const validated = {};
        
        for (const [key, defaultValue] of Object.entries(this.defaultSettings)) {
            if (settings.hasOwnProperty(key)) {
                const value = settings[key];
                const expectedType = typeof defaultValue;
                
                if (typeof value === expectedType) {
                    // Additional validation for specific settings
                    if (key === 'creativity' && (value < 0.1 || value > 2.0)) {
                        validated[key] = defaultValue;
                    } else if (key === 'defaultTone' && !['polish', 'engaging', 'friendly', 'confident', 'concise', 'unhinged'].includes(value)) {
                        validated[key] = defaultValue;
                    } else {
                        validated[key] = value;
                    }
                } else {
                    validated[key] = defaultValue;
                }
            }
        }
        
        return validated;
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(event) {
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 's':
                    event.preventDefault();
                    this.saveSettings();
                    break;
                case 'r':
                    if (event.shiftKey) {
                        event.preventDefault();
                        this.handleResetSettings();
                    }
                    break;
            }
        }
        
        if (event.key === 'Escape') {
            this.handleBackClick();
        }
    }

    /**
     * Handle before unload warning
     */
    handleBeforeUnload(event) {
        if (this.hasUnsavedChanges) {
            event.preventDefault();
            event.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return event.returnValue;
        }
    }

    /**
     * Open help page
     */
    openHelp() {
        chrome.tabs.create({
            url: 'https://developer.chrome.com/docs/extensions/ai/prompt-api'
        });
    }

    /**
     * Show message to user
     */
    showMessage(text, type = 'info') {
        const messageContainer = this.elements.messageContainer;
        
        // Clear existing messages
        messageContainer.innerHTML = '';
        
        const message = document.createElement('div');
        message.className = `message message-${type}`;
        message.textContent = text;
        
        messageContainer.appendChild(message);
        
        // Auto-hide success and info messages
        if (type === 'success' || type === 'info') {
            setTimeout(() => {
                if (message.parentNode) {
                    message.remove();
                }
            }, 3000);
        }
    }

    /**
     * Hide message
     */
    hideMessage() {
        this.elements.messageContainer.innerHTML = '';
    }

    /**
     * Notify other parts of the extension about settings changes
     */
    notifySettingsChanged() {
        // Send message to background script
        chrome.runtime.sendMessage({
            action: 'settingsChanged',
            settings: this.settings
        }).catch(error => {
            console.log('Background script not available:', error);
        });
        
        // Send message to all content scripts
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'settingsChanged',
                    settings: this.settings
                }).catch(() => {
                    // Ignore errors for tabs that don't have content scripts
                });
            });
        });
    }

    /**
     * Get current settings (for external access)
     */
    getCurrentSettings() {
        return { ...this.settings };
    }
}

// Storage utility functions for use by other parts of the extension
window.SettingsStorage = {
    /**
     * Get all settings
     */
    async getSettings() {
        const defaultSettings = {
            defaultTone: 'polish',
            autoAccept: false,
            showTooltip: true,
            enableContextMenu: true,
            creativity: 0.8,
            sessionTimeout: 10,
            maxTextLength: 5000,
            theme: 'system',
            animationsEnabled: true,
            compactMode: false,
            enableTelemetry: false,
            debugMode: false
        };
        
        try {
            const result = await chrome.storage.sync.get(defaultSettings);
            return { ...defaultSettings, ...result };
        } catch (error) {
            console.error('Failed to load settings:', error);
            return defaultSettings;
        }
    },

    /**
     * Get a specific setting
     */
    async getSetting(key, defaultValue = null) {
        try {
            const result = await chrome.storage.sync.get({ [key]: defaultValue });
            return result[key];
        } catch (error) {
            console.error(`Failed to load setting ${key}:`, error);
            return defaultValue;
        }
    },

    /**
     * Set a specific setting
     */
    async setSetting(key, value) {
        try {
            await chrome.storage.sync.set({ [key]: value });
            return true;
        } catch (error) {
            console.error(`Failed to save setting ${key}:`, error);
            return false;
        }
    },

    /**
     * Set multiple settings
     */
    async setSettings(settings) {
        try {
            await chrome.storage.sync.set(settings);
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }
};

// Initialize settings manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SettingsManager();
});

// Handle popup being opened
window.addEventListener('load', () => {
    // Focus first interactive element for accessibility
    const firstFocusable = document.querySelector('button, input, select');
    if (firstFocusable) {
        firstFocusable.focus();
    }
});