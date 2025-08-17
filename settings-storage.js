/**
 * Centralized Settings Storage Module for Tone Adjuster
 * Provides consistent settings management across all extension components
 */

// Default settings configuration
const DEFAULT_SETTINGS = {
    // General Settings
    defaultTone: 'polish',
    autoAccept: false,
    showTooltip: true,
    enableContextMenu: true,
    
    // AI Behavior
    creativity: 0.8,
    sessionTimeout: 10, // minutes
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

// Settings validation rules
const VALIDATION_RULES = {
    defaultTone: {
        type: 'string',
        allowedValues: ['polish', 'engaging', 'friendly', 'confident', 'concise', 'unhinged']
    },
    autoAccept: { type: 'boolean' },
    showTooltip: { type: 'boolean' },
    enableContextMenu: { type: 'boolean' },
    creativity: { 
        type: 'number', 
        min: 0.1, 
        max: 2.0 
    },
    sessionTimeout: { 
        type: 'number', 
        min: 1, 
        max: 60 
    },
    maxTextLength: { 
        type: 'number', 
        min: 100, 
        max: 50000 
    },
    theme: {
        type: 'string',
        allowedValues: ['system', 'light', 'dark']
    },
    animationsEnabled: { type: 'boolean' },
    compactMode: { type: 'boolean' },
    enableTelemetry: { type: 'boolean' },
    debugMode: { type: 'boolean' }
};

class SettingsStorage {
    constructor() {
        this.cache = null;
        this.listeners = new Set();
        this.initializeStorageListener();
    }

    /**
     * Initialize storage change listener
     */
    initializeStorageListener() {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.onChanged.addListener((changes, namespace) => {
                if (namespace === 'sync') {
                    this.handleStorageChanges(changes);
                }
            });
        }
    }

    /**
     * Handle storage changes and notify listeners
     */
    handleStorageChanges(changes) {
        const settingsChanged = Object.keys(changes).some(key => 
            DEFAULT_SETTINGS.hasOwnProperty(key)
        );

        if (settingsChanged) {
            this.cache = null; // Invalidate cache
            this.notifyListeners();
        }
    }

    /**
     * Add a listener for settings changes
     */
    addListener(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notify all listeners of settings changes
     */
    notifyListeners() {
        this.getSettings().then(settings => {
            this.listeners.forEach(callback => {
                try {
                    callback(settings);
                } catch (error) {
                    console.error('Settings listener error:', error);
                }
            });
        });
    }

    /**
     * Validate a single setting value
     */
    validateSetting(key, value) {
        const rule = VALIDATION_RULES[key];
        if (!rule) return value;

        // Type validation
        if (typeof value !== rule.type) {
            console.warn(`Invalid type for setting ${key}: expected ${rule.type}, got ${typeof value}`);
            return DEFAULT_SETTINGS[key];
        }

        // Range validation for numbers
        if (rule.type === 'number') {
            if (rule.min !== undefined && value < rule.min) {
                console.warn(`Setting ${key} below minimum: ${value} < ${rule.min}`);
                return rule.min;
            }
            if (rule.max !== undefined && value > rule.max) {
                console.warn(`Setting ${key} above maximum: ${value} > ${rule.max}`);
                return rule.max;
            }
        }

        // Allowed values validation
        if (rule.allowedValues && !rule.allowedValues.includes(value)) {
            console.warn(`Invalid value for setting ${key}: ${value}`);
            return DEFAULT_SETTINGS[key];
        }

        return value;
    }

    /**
     * Validate all settings
     */
    validateSettings(settings) {
        const validated = {};
        
        for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
            if (settings.hasOwnProperty(key)) {
                validated[key] = this.validateSetting(key, settings[key]);
            } else {
                validated[key] = defaultValue;
            }
        }

        return validated;
    }

    /**
     * Get all settings with caching
     */
    async getSettings() {
        if (this.cache) {
            return this.cache;
        }

        try {
            const result = await chrome.storage.sync.get(DEFAULT_SETTINGS);
            const validated = this.validateSettings(result);
            this.cache = validated;
            return validated;
        } catch (error) {
            console.error('Failed to load settings:', error);
            return { ...DEFAULT_SETTINGS };
        }
    }

    /**
     * Get a specific setting
     */
    async getSetting(key, fallback = null) {
        try {
            const settings = await this.getSettings();
            return settings[key] !== undefined ? settings[key] : (fallback || DEFAULT_SETTINGS[key]);
        } catch (error) {
            console.error(`Failed to get setting ${key}:`, error);
            return fallback || DEFAULT_SETTINGS[key];
        }
    }

    /**
     * Set a specific setting
     */
    async setSetting(key, value) {
        try {
            const validatedValue = this.validateSetting(key, value);
            await chrome.storage.sync.set({ [key]: validatedValue });
            
            // Update cache
            if (this.cache) {
                this.cache[key] = validatedValue;
            }
            
            return true;
        } catch (error) {
            console.error(`Failed to set setting ${key}:`, error);
            return false;
        }
    }

    /**
     * Set multiple settings
     */
    async setSettings(settings) {
        try {
            const validated = this.validateSettings(settings);
            await chrome.storage.sync.set(validated);
            
            // Update cache
            if (this.cache) {
                Object.assign(this.cache, validated);
            }
            
            return true;
        } catch (error) {
            console.error('Failed to set settings:', error);
            return false;
        }
    }

    /**
     * Reset settings to defaults
     */
    async resetSettings() {
        try {
            await chrome.storage.sync.set(DEFAULT_SETTINGS);
            this.cache = { ...DEFAULT_SETTINGS };
            return true;
        } catch (error) {
            console.error('Failed to reset settings:', error);
            return false;
        }
    }

    /**
     * Clear cache (force reload from storage)
     */
    clearCache() {
        this.cache = null;
    }

    /**
     * Get default settings
     */
    getDefaults() {
        return { ...DEFAULT_SETTINGS };
    }

    /**
     * Check if a setting exists
     */
    hasSetting(key) {
        return DEFAULT_SETTINGS.hasOwnProperty(key);
    }

    /**
     * Get settings for AI configuration
     */
    async getAISettings() {
        const settings = await this.getSettings();
        return {
            creativity: settings.creativity,
            sessionTimeout: settings.sessionTimeout * 60 * 1000, // Convert to milliseconds
            maxTextLength: settings.maxTextLength,
            debugMode: settings.debugMode
        };
    }

    /**
     * Get UI preferences
     */
    async getUISettings() {
        const settings = await this.getSettings();
        return {
            theme: settings.theme,
            animationsEnabled: settings.animationsEnabled,
            compactMode: settings.compactMode,
            showTooltip: settings.showTooltip
        };
    }

    /**
     * Get behavior settings
     */
    async getBehaviorSettings() {
        const settings = await this.getSettings();
        return {
            defaultTone: settings.defaultTone,
            autoAccept: settings.autoAccept,
            enableContextMenu: settings.enableContextMenu,
            enableTelemetry: settings.enableTelemetry
        };
    }

    /**
     * Export settings as JSON
     */
    async exportSettings() {
        const settings = await this.getSettings();
        return {
            ...settings,
            exportTimestamp: new Date().toISOString(),
            version: '1.3.2'
        };
    }

    /**
     * Import settings from exported data
     */
    async importSettings(exportedData) {
        try {
            // Remove metadata
            const { exportTimestamp, version, ...settings } = exportedData;
            
            const success = await this.setSettings(settings);
            if (success) {
                console.log(`Settings imported from version ${version || 'unknown'}`);
            }
            return success;
        } catch (error) {
            console.error('Failed to import settings:', error);
            return false;
        }
    }

    /**
     * Check if settings have been customized
     */
    async hasCustomSettings() {
        const settings = await this.getSettings();
        return JSON.stringify(settings) !== JSON.stringify(DEFAULT_SETTINGS);
    }

    /**
     * Get storage usage information
     */
    async getStorageInfo() {
        try {
            const usage = await chrome.storage.sync.getBytesInUse();
            const quota = chrome.storage.sync.QUOTA_BYTES;
            return {
                used: usage,
                total: quota,
                percentage: Math.round((usage / quota) * 100)
            };
        } catch (error) {
            console.error('Failed to get storage info:', error);
            return { used: 0, total: 0, percentage: 0 };
        }
    }
}

// Create singleton instance
const settingsStorage = new SettingsStorage();

// Export for use in different contexts
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = { SettingsStorage, settingsStorage, DEFAULT_SETTINGS };
} else if (typeof window !== 'undefined') {
    // Browser environment
    window.SettingsStorage = SettingsStorage;
    window.settingsStorage = settingsStorage;
    window.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
}

// Also make it available globally for extension contexts
if (typeof globalThis !== 'undefined') {
    globalThis.SettingsStorage = SettingsStorage;
    globalThis.settingsStorage = settingsStorage;
    globalThis.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
}