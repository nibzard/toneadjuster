// Background service worker for The Tone Adjuster Chrome extension
// Handles AI session management, context menus, and text rewriting

class ToneAdjuster {
  constructor() {
    this.aiSession = null;
    this.isInitialized = false;
    this.toneOptions = {
      formal: 'Formal',
      friendly: 'Friendly', 
      confident: 'Confident',
      concise: 'Concise',
      empathetic: 'Empathetic'
    };
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Check if Chrome AI is available
      if (!('ai' in chrome) || !chrome.ai || !chrome.ai.createSession) {
        console.warn('Chrome AI not available');
        return;
      }

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

      // Rewrite text with selected tone
      const rewrittenText = await this.rewriteText(selectedText, toneType);
      
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
      switch (message.action) {
        case 'rewriteText':
          const result = await this.rewriteText(message.text, message.tone);
          sendResponse({ success: true, text: result });
          break;
          
        case 'checkAiAvailability':
          const available = await this.checkAiAvailability();
          sendResponse({ available });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async checkAiAvailability() {
    try {
      if (!('ai' in chrome) || !chrome.ai || !chrome.ai.createSession) {
        return false;
      }
      
      // Try to create a test session to verify functionality
      const testSession = await chrome.ai.createSession();
      if (testSession) {
        testSession.destroy();
        return true;
      }
      return false;
    } catch (error) {
      console.error('AI availability check failed:', error);
      return false;
    }
  }

  async ensureSession() {
    if (!this.aiSession) {
      try {
        this.aiSession = await chrome.ai.createSession({
          temperature: 0.3,
          topK: 3
        });
      } catch (error) {
        console.error('Failed to create AI session:', error);
        throw new Error('AI session creation failed');
      }
    }
    return this.aiSession;
  }

  async rewriteText(text, tone) {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('No text provided');
      }

      const session = await this.ensureSession();
      
      // Create simple, direct prompt for the nano model
      const prompt = this.createPrompt(text, tone);
      
      console.log(`Rewriting text with ${tone} tone:`, text.substring(0, 50) + '...');
      
      const response = await session.prompt(prompt);
      
      if (!response || response.trim().length === 0) {
        throw new Error('Empty response from AI');
      }

      return response.trim();
    } catch (error) {
      console.error('Text rewriting failed:', error);
      
      // If session failed, try to recreate it
      if (this.aiSession) {
        try {
          this.aiSession.destroy();
        } catch (destroyError) {
          console.warn('Failed to destroy session:', destroyError);
        }
        this.aiSession = null;
      }
      
      throw error;
    }
  }

  createPrompt(text, tone) {
    // Simple, direct prompts suitable for nano model
    const prompts = {
      formal: `Rewrite this text in a formal, professional tone: ${text}`,
      friendly: `Rewrite this text in a friendly, warm tone: ${text}`,
      confident: `Rewrite this text in a confident, assertive tone: ${text}`,
      concise: `Rewrite this text to be more concise and brief: ${text}`,
      empathetic: `Rewrite this text in an empathetic, understanding tone: ${text}`
    };

    return prompts[tone] || prompts.formal;
  }

  cleanup() {
    if (this.aiSession) {
      try {
        this.aiSession.destroy();
        this.aiSession = null;
      } catch (error) {
        console.warn('Error during cleanup:', error);
      }
    }
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