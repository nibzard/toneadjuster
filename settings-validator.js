/**
 * Settings Validator for Tone Adjuster
 * Provides validation utilities for settings across the extension
 */

// Default settings schema with validation rules
const SETTINGS_SCHEMA = {
    // General Settings
    defaultTone: {
        type: 'string',
        default: 'polish',
        allowedValues: ['polish', 'engaging', 'friendly', 'confident', 'concise', 'unhinged'],
        description: 'Default tone for tone adjustment'
    },
    autoAccept: {
        type: 'boolean',
        default: false,
        description: 'Automatically accept tone suggestions without preview'
    },
    showTooltip: {
        type: 'boolean',
        default: true,
        description: 'Show tooltip when text is selected'
    },
    enableContextMenu: {
        type: 'boolean',
        default: true,
        description: 'Enable right-click context menu'
    },
    
    // AI Behavior
    creativity: {
        type: 'number',
        default: 0.8,
        min: 0.1,
        max: 2.0,
        step: 0.1,
        description: 'AI creativity level (temperature)'
    },
    sessionTimeout: {
        type: 'number',
        default: 10,
        min: 1,
        max: 60,
        unit: 'minutes',
        description: 'AI session timeout duration'
    },
    maxTextLength: {
        type: 'number',
        default: 5000,
        min: 100,
        max: 50000,
        step: 100,
        description: 'Maximum text length to process'
    },
    
    // Interface
    theme: {
        type: 'string',
        default: 'system',
        allowedValues: ['system', 'light', 'dark'],
        description: 'UI theme preference'
    },
    animationsEnabled: {
        type: 'boolean',
        default: true,
        description: 'Enable UI animations and transitions'
    },
    compactMode: {
        type: 'boolean',
        default: false,
        description: 'Use compact UI layout'
    },
    
    // Privacy & Data
    enableTelemetry: {
        type: 'boolean',
        default: false,
        description: 'Share anonymous usage statistics'
    },
    
    // Advanced
    debugMode: {
        type: 'boolean',
        default: false,
        description: 'Enable debug logging'
    }
};

class SettingsValidator {
    constructor() {
        this.schema = SETTINGS_SCHEMA;
    }

    /**
     * Validate a single setting value
     */
    validateSetting(key, value) {
        const schema = this.schema[key];
        if (!schema) {
            console.warn(`Unknown setting: ${key}`);
            return { isValid: false, error: `Unknown setting: ${key}`, value: undefined };
        }

        try {
            // Type validation
            if (typeof value !== schema.type) {
                return {
                    isValid: false,
                    error: `Invalid type for ${key}: expected ${schema.type}, got ${typeof value}`,
                    value: schema.default
                };
            }

            // Range validation for numbers
            if (schema.type === 'number') {
                if (schema.min !== undefined && value < schema.min) {
                    return {
                        isValid: false,
                        error: `${key} below minimum: ${value} < ${schema.min}`,
                        value: schema.min
                    };
                }
                if (schema.max !== undefined && value > schema.max) {
                    return {
                        isValid: false,
                        error: `${key} above maximum: ${value} > ${schema.max}`,
                        value: schema.max
                    };
                }
            }

            // Allowed values validation
            if (schema.allowedValues && !schema.allowedValues.includes(value)) {
                return {
                    isValid: false,
                    error: `Invalid value for ${key}: ${value}. Allowed: ${schema.allowedValues.join(', ')}`,
                    value: schema.default
                };
            }

            return { isValid: true, value: value };

        } catch (error) {
            return {
                isValid: false,
                error: `Validation error for ${key}: ${error.message}`,
                value: schema.default
            };
        }
    }

    /**
     * Validate all settings in an object
     */
    validateSettings(settings) {
        const validated = {};
        const errors = [];

        for (const [key, schema] of Object.entries(this.schema)) {
            if (settings.hasOwnProperty(key)) {
                const result = this.validateSetting(key, settings[key]);
                validated[key] = result.value;
                if (!result.isValid) {
                    errors.push(result.error);
                }
            } else {
                validated[key] = schema.default;
            }
        }

        return {
            isValid: errors.length === 0,
            settings: validated,
            errors: errors
        };
    }

    /**
     * Get default settings
     */
    getDefaults() {
        const defaults = {};
        for (const [key, schema] of Object.entries(this.schema)) {
            defaults[key] = schema.default;
        }
        return defaults;
    }

    /**
     * Get schema for a specific setting
     */
    getSchema(key) {
        return this.schema[key] || null;
    }

    /**
     * Get full schema
     */
    getFullSchema() {
        return { ...this.schema };
    }

    /**
     * Check if a setting exists in schema
     */
    hasSetting(key) {
        return this.schema.hasOwnProperty(key);
    }

    /**
     * Get setting description
     */
    getDescription(key) {
        const schema = this.schema[key];
        return schema ? schema.description : null;
    }

    /**
     * Get setting constraints (min, max, allowedValues, etc.)
     */
    getConstraints(key) {
        const schema = this.schema[key];
        if (!schema) return null;

        const constraints = {
            type: schema.type,
            default: schema.default
        };

        if (schema.min !== undefined) constraints.min = schema.min;
        if (schema.max !== undefined) constraints.max = schema.max;
        if (schema.step !== undefined) constraints.step = schema.step;
        if (schema.allowedValues) constraints.allowedValues = [...schema.allowedValues];
        if (schema.unit) constraints.unit = schema.unit;

        return constraints;
    }

    /**
     * Migrate settings from old version
     */
    migrateSettings(oldSettings, fromVersion, toVersion) {
        console.log(`Migrating settings from ${fromVersion} to ${toVersion}`);
        
        // For now, just validate and return current settings
        // In the future, this could handle version-specific migrations
        const result = this.validateSettings(oldSettings);
        
        if (!result.isValid) {
            console.warn('Settings migration had validation errors:', result.errors);
        }
        
        return result.settings;
    }

    /**
     * Export settings with metadata
     */
    exportSettings(settings, includeDefaults = false) {
        const exported = {
            version: '1.3.2',
            exportDate: new Date().toISOString(),
            settings: includeDefaults ? { ...this.getDefaults(), ...settings } : settings
        };

        return exported;
    }

    /**
     * Import settings with validation
     */
    importSettings(exportedData) {
        try {
            if (!exportedData || typeof exportedData !== 'object') {
                throw new Error('Invalid export data format');
            }

            const settings = exportedData.settings || exportedData;
            const result = this.validateSettings(settings);

            return {
                success: result.isValid,
                settings: result.settings,
                errors: result.errors,
                importedFrom: exportedData.version || 'unknown'
            };

        } catch (error) {
            return {
                success: false,
                settings: this.getDefaults(),
                errors: [error.message],
                importedFrom: 'unknown'
            };
        }
    }
}

// Create singleton instance
const settingsValidator = new SettingsValidator();

// Export for different environments
if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = { SettingsValidator, settingsValidator, SETTINGS_SCHEMA };
} else if (typeof window !== 'undefined') {
    // Browser environment
    window.SettingsValidator = SettingsValidator;
    window.settingsValidator = settingsValidator;
    window.SETTINGS_SCHEMA = SETTINGS_SCHEMA;
}

// Also make it available globally for extension contexts
if (typeof globalThis !== 'undefined') {
    globalThis.SettingsValidator = SettingsValidator;
    globalThis.settingsValidator = settingsValidator;
    globalThis.SETTINGS_SCHEMA = SETTINGS_SCHEMA;
}