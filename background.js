// Background service worker for The Tone Adjuster Chrome extension
// Handles context menus and delegates AI operations to content scripts

class ToneAdjuster {
  constructor() {
    this.isInitialized = false;
    this.toneOptions = {
      polish: 'Polish',
      formal: 'Formal',
      friendly: 'Friendly',
      confident: 'Confident',
      concise: 'Concise',
      unhinged: 'Unhinged'
    };
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Create context menu items
      this.createContextMenus();
      
      // Set up message listener
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        this.handleMessage(message, sender, sendResponse);
        return true; // Keep message channel open for async response
      });

      this.isInitialized = true;
      console.log('Tone Adjuster initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Tone Adjuster:', error);
    }
  }

  createContextMenus() {
    // Check if contextMenus permission exists
    if (!chrome.contextMenus) {
      console.warn('Context menus permission not available');
      return;
    }
    
    // Remove existing menus first
    chrome.contextMenus.removeAll(() => {
      // Create parent menu
      chrome.contextMenus.create({
        id: 'tone-adjuster-parent',
        title: 'Adjust Tone',
        contexts: ['selection']
      });

      // Create submenu items for each tone
      Object.entries(this.toneOptions).forEach(([key, label]) => {
        chrome.contextMenus.create({
          id: `tone-${key}`,
          parentId: 'tone-adjuster-parent',
          title: label,
          contexts: ['selection']
        });
      });
    });

    // Handle context menu clicks
    chrome.contextMenus.onClicked.addListener((info, tab) => {
      this.handleContextMenuClick(info, tab);
    });
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
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'rewriteTextWithAI',
        text: selectedText,
        tone: toneType
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

  async handleMessage(message, sender, sendResponse) {
    try {
      // Validate message structure
      if (!message || typeof message !== 'object') {
        throw new Error('Invalid message format');
      }

      if (!message.action || typeof message.action !== 'string') {
        throw new Error('Missing or invalid action');
      }

      switch (message.action) {
        case 'rewriteText':
          // Validate input parameters
          if (!message.text || typeof message.text !== 'string' || message.text.trim().length === 0) {
            throw new Error('Invalid or empty text provided');
          }
          
          if (!message.tone || typeof message.tone !== 'string') {
            throw new Error('Invalid tone specified');
          }

          if (message.text.length > 5000) {
            throw new Error('Text too long (max 5000 characters)');
          }
          
          // Delegate text rewriting to content script where AI API is available
          try {
            const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!activeTab) {
              throw new Error('No active tab found');
            }

            const response = await chrome.tabs.sendMessage(activeTab.id, {
              action: 'rewriteTextWithAI',
              text: message.text,
              tone: message.tone
            });

            if (!response || !response.success) {
              throw new Error(response?.error || 'Failed to rewrite text');
            }

            sendResponse({ success: true, adjustedText: response.adjustedText });
          } catch (error) {
            console.error('Failed to delegate text rewriting:', error);
            throw error;
          }
          break;
          
        case 'checkAiAvailability':
          const available = await this.checkAiAvailability();
          sendResponse({ available: Boolean(available) });
          break;
          
        default:
          throw new Error(`Unknown action: ${message.action}`);
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
      
      sendResponse({ success: false, error: errorMessage });
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

      const response = await chrome.tabs.sendMessage(activeTab.id, {
        action: 'checkAiAvailability'
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
        chrome.contextMenus.removeAll();
      }
    } catch (error) {
      console.warn('Error removing context menus:', error);
    }
    
    // Reset initialization state
    this.isInitialized = false;
    
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