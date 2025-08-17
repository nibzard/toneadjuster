// Background service worker for The Tone Adjuster Chrome extension
// Handles context menus and delegates AI operations to content scripts

// Import settings storage module
try {
  importScripts('settings-storage.js');
  console.log('✅ Settings storage module loaded successfully');
} catch (error) {
  console.error('❌ Failed to load settings storage module:', error);
}

class ToneAdjuster {
  constructor() {
    this.isInitialized = false;
    this.settings = null;
    this.contextMenuListenerAdded = false;
    this.contextMenuCreating = false;
    this.toneOptions = {
      polish: 'Polish',
      engaging: 'Engaging',
      friendly: 'Friendly',
      confident: 'Confident',
      concise: 'Concise',
      unhinged: 'Unhinged'
    };
    
    // Listen for settings changes
    settingsStorage.addListener((newSettings) => {
      this.settings = newSettings;
      this.onSettingsChanged(newSettings);
    });
  }

  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🚀 Background script initializing...');
    
    try {
      // Check if settingsStorage is available
      if (typeof settingsStorage === 'undefined') {
        console.error('❌ settingsStorage is not available - using default settings');
        this.settings = {
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
      } else {
        // Load settings first
        this.settings = await settingsStorage.getSettings();
        console.log('✅ Settings loaded:', this.settings);
      }
      
      // Create context menu items (respecting settings)
      await this.createContextMenus();
      
      // Set up message listener with proper async handling
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        // Handle message asynchronously and ensure response is sent
        this.handleMessage(message, sender, sendResponse).catch(error => {
          console.error('Unhandled message error:', error);
          if (sendResponse) {
            sendResponse({ success: false, error: error.message });
          }
        });
        return true; // Keep message channel open for async response
      });

      this.isInitialized = true;
      console.log('Tone Adjuster initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Tone Adjuster:', error);
    }
  }

  async createContextMenus() {
    // Check if contextMenus permission exists
    if (!chrome.contextMenus) {
      console.warn('Context menus permission not available');
      return;
    }
    
    // Prevent multiple simultaneous context menu creation attempts
    if (this.contextMenuCreating) {
      console.log('Context menu creation already in progress, skipping...');
      return;
    }
    
    this.contextMenuCreating = true;
    
    try {
      console.log('Starting context menu creation/recreation...');
      
      // Remove existing menus first and wait for completion with timeout
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for context menu removal'));
        }, 5000);
        
        chrome.contextMenus.removeAll(() => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            console.warn('Error removing context menus:', chrome.runtime.lastError.message);
          } else {
            console.log('Context menus removed successfully');
          }
          resolve();
        });
      });

      // Add a small delay to ensure cleanup is complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Only create context menus if enabled in settings
      if (this.settings && this.settings.enableContextMenu !== false) {
        console.log('Creating context menus...');
        
        // Create parent menu and wait for completion
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Timeout creating parent menu'));
          }, 5000);
          
          chrome.contextMenus.create({
            id: 'tone-adjuster-parent',
            title: 'Adjust Tone',
            contexts: ['selection']
          }, () => {
            clearTimeout(timeout);
            if (chrome.runtime.lastError) {
              console.error('Error creating parent menu:', chrome.runtime.lastError.message);
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              console.log('Parent menu created successfully');
              resolve();
            }
          });
        });

        // Create submenu items sequentially to avoid race conditions
        for (const [key, label] of Object.entries(this.toneOptions)) {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error(`Timeout creating ${key} menu`));
            }, 5000);
            
            chrome.contextMenus.create({
              id: `tone-${key}`,
              parentId: 'tone-adjuster-parent',
              title: label,
              contexts: ['selection']
            }, () => {
              clearTimeout(timeout);
              if (chrome.runtime.lastError) {
                console.error(`Error creating ${key} menu:`, chrome.runtime.lastError.message);
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                console.log(`Menu item '${key}' created successfully`);
                resolve();
              }
            });
          });
        }
        
        console.log('All context menus created successfully');
      } else {
        console.log('Context menus disabled by user settings');
      }

      // Add click listener only once
      if (!this.contextMenuListenerAdded) {
        chrome.contextMenus.onClicked.addListener((info, tab) => {
          this.handleContextMenuClick(info, tab);
        });
        this.contextMenuListenerAdded = true;
        console.log('Context menu click listener added');
      }

    } catch (error) {
      console.error('Failed to create context menus:', error);
      // Don't throw the error to prevent breaking initialization
    } finally {
      this.contextMenuCreating = false;
    }
  }

  async handleContextMenuClick(info, tab) {
    const toneType = info.menuItemId.replace('tone-', '');
    
    if (!this.toneOptions[toneType]) return;

    try {
      // Get selected text
      const selectedText = info.selectionText;
      if (!selectedText || selectedText.trim().length === 0) {
        console.warn('No text selected');
        return;
      }

      // Rewrite text with selected tone via content script
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Context menu timeout - content script did not respond'));
        }, 30000); // 30 second timeout for context menu operations

        chrome.tabs.sendMessage(tab.id, {
          action: 'rewriteTextWithAI',
          text: selectedText,
          tone: toneType
        }, (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            console.error('Chrome runtime error:', chrome.runtime.lastError.message);
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!response) {
            reject(new Error('No response received from content script'));
          } else {
            resolve(response);
          }
        });
      });

      const rewrittenText = response?.success ? response.adjustedText : null;
      
      if (rewrittenText) {
        // Send result to content script
        chrome.tabs.sendMessage(tab.id, {
          action: 'replaceText',
          originalText: selectedText,
          newText: rewrittenText,
          tone: toneType
        });
      }
    } catch (error) {
      console.error('Error handling context menu click:', error);
      // Send error to content script
      chrome.tabs.sendMessage(tab.id, {
        action: 'error',
        message: 'Failed to adjust text tone'
      });
    }
  }

  /**
   * Handle settings changes
   */
  async onSettingsChanged(newSettings) {
    console.log('Settings changed:', newSettings);
    
    // Recreate context menus if the setting changed
    if (this.settings?.enableContextMenu !== newSettings.enableContextMenu) {
      await this.createContextMenus();
    }
    
    // Update other background script behavior based on settings
    if (newSettings.debugMode) {
      console.log('Debug mode enabled');
    }
  }

  async handleMessage(message, sender, sendResponse) {
    let hasResponded = false;
    
    // Helper function to ensure response is sent only once
    const safeResponse = (response) => {
      if (!hasResponded && sendResponse) {
        hasResponded = true;
        sendResponse(response);
      }
    };
    
    try {
      // Validate message structure
      if (!message || typeof message !== 'object') {
        throw new Error('Invalid message format');
      }

      if (!message.action || typeof message.action !== 'string') {
        throw new Error('Missing or invalid action');
      }

      switch (message.action) {
        case 'settingsChanged':
          // Handle settings change notification from settings page
          this.settings = message.settings;
          this.onSettingsChanged(message.settings);
          safeResponse({ success: true });
          break;
          
        case 'getSettings':
          // Provide current settings to other parts of the extension
          console.log('📋 getSettings request received');
          try {
            if (!this.settings) {
              console.log('⚠️ Settings not loaded, loading now...');
              if (typeof settingsStorage !== 'undefined') {
                this.settings = await settingsStorage.getSettings();
              } else {
                console.error('❌ settingsStorage not available, using defaults');
                this.settings = {
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
              }
            }
            console.log('✅ Responding with settings:', this.settings);
            safeResponse({ success: true, settings: this.settings });
          } catch (error) {
            console.error('❌ Error getting settings:', error);
            safeResponse({ success: false, error: error.message });
          }
          break;
        case 'rewriteText':
          // Validate input parameters
          if (!message.text || typeof message.text !== 'string' || message.text.trim().length === 0) {
            throw new Error('Invalid or empty text provided');
          }
          
          if (!message.tone || typeof message.tone !== 'string') {
            throw new Error('Invalid tone specified');
          }

          // Check text length against user settings
          const maxLength = this.settings?.maxTextLength || 5000;
          if (message.text.length > maxLength) {
            throw new Error(`Text too long (max ${maxLength} characters)`);
          }
          
          // Delegate text rewriting to content script where AI API is available
          try {
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!activeTab) {
              throw new Error('No active tab found');
            }

            const response = await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error('Message timeout - content script did not respond'));
              }, 60000); // 60 second timeout for AI operations

              chrome.tabs.sendMessage(activeTab.id, {
                action: 'rewriteTextWithAI',
                text: message.text,
                tone: message.tone,
                settings: this.settings
              }, (response) => {
                clearTimeout(timeout);
                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message));
                } else {
                  resolve(response);
                }
              });
            });

            if (!response || !response.success) {
              throw new Error(response?.error || 'Failed to rewrite text');
            }

            safeResponse({ success: true, adjustedText: response.adjustedText });
          } catch (error) {
            console.error('Failed to delegate text rewriting:', error);
            safeResponse({ success: false, error: error.message });
            return;
          }
          break;
          
        case 'checkAiAvailability':
          const available = await this.checkAiAvailability();
          safeResponse({ available: Boolean(available) });
          break;
          
        default:
          console.warn(`Unknown action: ${message.action}`);
          safeResponse({ success: false, error: `Unknown action: ${message.action}` });
          return;
      }
    } catch (error) {
      console.error('Error handling message:', error);
      
      // Provide user-friendly error messages
      let errorMessage = error.message;
      if (error.message.includes('session')) {
        errorMessage = 'AI session error - please try again';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error - check your connection';
      } else if (error.message.includes('quota')) {
        errorMessage = 'Rate limit reached - please wait before trying again';
      }
      
      safeResponse({ success: false, error: errorMessage });
    }
  }

  async checkAiAvailability() {
    try {
      // Delegate AI availability check to content script
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab) {
        console.warn('No active tab found for AI availability check');
        return false;
      }

      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('AI check timeout - content script did not respond'));
        }, 30000); // 30 second timeout for availability check

        chrome.tabs.sendMessage(activeTab.id, {
          action: 'checkAiAvailability'
        }, (response) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
      
      return response?.available || false;
    } catch (error) {
      console.error('AI availability check failed:', error);
      return false;
    }
  }


  async cleanup() {
    console.log('Starting ToneAdjuster cleanup');
    
    // Remove context menus
    try {
      if (chrome.contextMenus) {
        await new Promise((resolve) => {
          chrome.contextMenus.removeAll(() => {
            if (chrome.runtime.lastError) {
              console.warn('Error removing context menus during cleanup:', chrome.runtime.lastError.message);
            }
            resolve();
          });
        });
      }
    } catch (error) {
      console.warn('Error removing context menus:', error);
    }
    
    // Reset initialization state
    this.isInitialized = false;
    this.contextMenuListenerAdded = false;
    this.contextMenuCreating = false;
    
    console.log('ToneAdjuster cleanup completed');
  }
}

// Initialize the tone adjuster
const toneAdjuster = new ToneAdjuster();

// Initialize when service worker starts
chrome.runtime.onStartup.addListener(() => {
  toneAdjuster.initialize();
});

chrome.runtime.onInstalled.addListener(() => {
  toneAdjuster.initialize();
});

// Clean up when service worker is about to be terminated
chrome.runtime.onSuspend.addListener(() => {
  toneAdjuster.cleanup();
});

// Initialize immediately
toneAdjuster.initialize();