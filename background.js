// Background service worker for The Tone Adjuster Chrome extension
// Handles AI session management, context menus, and text rewriting

class ToneAdjuster {
  constructor() {
    this.aiSession = null;
    this.isInitialized = false;
    this.sessionTimeout = null;
    this.sessionIdleTime = 5 * 60 * 1000; // 5 minutes
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
      // Check if LanguageModel AI is available
      if (!window.ai?.LanguageModel) {
        console.warn('Chrome AI LanguageModel not available');
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
          
          const result = await this.rewriteText(message.text, message.tone);
          
          if (!result || typeof result !== 'string' || result.trim().length === 0) {
            throw new Error('AI returned empty or invalid result');
          }
          
          sendResponse({ success: true, adjustedText: result });
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
      if (!window.ai?.LanguageModel) {
        return false;
      }
      
      // Check model availability
      const availability = await window.ai.LanguageModel.availability();
      return availability === 'readily' || availability === 'available';
    } catch (error) {
      console.error('AI availability check failed:', error);
      return false;
    }
  }

  async ensureSession() {
    if (!this.aiSession) {
      try {
        // Optimized parameters for Gemini Nano
        this.aiSession = await window.ai.LanguageModel.create({
          temperature: 0.6, // Balanced creativity and coherence
          topK: 3 // Focus on quality responses
        });
        
        console.log('AI session created successfully');
      } catch (error) {
        console.error('Failed to create AI session:', error);
        throw new Error('AI session creation failed');
      }
    }
    
    // Reset session timeout
    this.resetSessionTimeout();
    
    return this.aiSession;
  }

  resetSessionTimeout() {
    // Clear existing timeout
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
    }
    
    // Set new timeout to cleanup idle session
    this.sessionTimeout = setTimeout(() => {
      this.cleanupIdleSession();
    }, this.sessionIdleTime);
  }

  async cleanupIdleSession() {
    if (this.aiSession) {
      try {
        console.log('Cleaning up idle AI session');
        await this.aiSession.destroy();
        this.aiSession = null;
      } catch (error) {
        console.warn('Error cleaning up idle session:', error);
        this.aiSession = null; // Force cleanup even if destroy fails
      }
    }
    
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
      this.sessionTimeout = null;
    }
  }

  async rewriteText(text, tone) {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('No text provided');
      }

      // Check text length for context window optimization
      if (text.length > 3000) {
        console.warn('Text is long, may hit context limits');
      }

      const session = await this.ensureSession();
      
      // Create optimized prompt for the nano model
      const prompt = this.createPrompt(text, tone);
      
      console.log(`Rewriting text with ${tone} tone:`, text.substring(0, 50) + '...');
      
      const response = await session.prompt(prompt);
      
      if (!response || response.trim().length === 0) {
        throw new Error('Empty response from AI');
      }

      // Clean up response - remove common artifacts
      const cleanedResponse = this.cleanResponse(response, text);
      
      return cleanedResponse;
    } catch (error) {
      console.error('Text rewriting failed:', error);
      
      // If session failed, try to recreate it once
      if (this.aiSession && error.message.includes('session')) {
        try {
          this.aiSession.destroy();
          this.aiSession = null;
          
          // Retry once with new session
          const newSession = await this.ensureSession();
          const prompt = this.createPrompt(text, tone);
          const response = await newSession.prompt(prompt);
          
          if (response && response.trim().length > 0) {
            return this.cleanResponse(response, text);
          }
        } catch (retryError) {
          console.error('Retry also failed:', retryError);
        }
      }
      
      throw error;
    }
  }

  createPrompt(text, tone) {
    const prompts = {
      polish: `You are a professional writing editor with expertise in improving text clarity and impact. I need you to polish this text while preserving its original meaning and intent.

Please enhance the text by:
- Correcting any grammar, spelling, or punctuation errors
- Improving sentence flow and readability
- Choosing stronger, more precise vocabulary
- Maintaining the author's voice and style

Text to polish: "${text}"

Return only the improved version:`,
      
      formal: `You are a business communication specialist. I need you to transform this text into a professional, formal tone suitable for workplace or academic settings.

Please rewrite the text to be:
- Professional and respectful in tone
- Clear and direct in communication
- Appropriate for formal business or academic contexts
- Free from casual language or slang

Original text: "${text}"

Formal version:`,
      
      friendly: `You are a communication coach specializing in warm, approachable writing. I need you to rewrite this text to sound more friendly and welcoming while keeping the core message intact.

Please make the text:
- Warm and personable in tone
- Approachable and easy to connect with
- Positive and encouraging
- Natural and conversational

Text to make friendly: "${text}"

Friendly version:`,
      
      confident: `You are an assertiveness coach helping people communicate with more confidence. I need you to rewrite this text to project strength and certainty while remaining professional.

Please transform the text to be:
- Confident and self-assured
- Clear and decisive
- Free from hedging words like "maybe," "perhaps," "I think"
- Strong and authoritative without being aggressive

Text to strengthen: "${text}"

Confident version:`,
      
      concise: `You are an editor specializing in clear, concise communication. I need you to condense this text to its essential points while preserving all important information.

Please make the text:
- Brief and to-the-point
- Free from unnecessary words and filler
- Clear and direct
- Focused on key information only

Text to condense: "${text}"

Concise version:`,
      
      unhinged: `You are a creative writer with a talent for over-the-top, humorous expression. I need you to completely transform this text into something wildly exaggerated and entertaining.

Please rewrite the text to be:
- Dramatically exaggerated and theatrical
- Unexpectedly funny or absurd
- Creative and unconventional
- Energetic and chaotic while keeping the core message recognizable

Text to make unhinged: "${text}"

Unhinged version:`
    };

    return prompts[tone] || prompts.formal; // Fallback to formal
  }

  cleanResponse(response, originalText) {
    let cleaned = response.trim();
    
    // Remove common AI artifacts and labels
    const artifactPatterns = [
      /^(Here's the |Here is the )?([A-Z][a-z]+ version|[A-Z][a-z]+ text):?\s*/i,
      /^"(.*)"$/s, // Remove surrounding quotes
      /^\[(.*)\]$/s, // Remove surrounding brackets
      /^Answer:\s*/i,
      /^Response:\s*/i,
      /^Output:\s*/i
    ];
    
    for (const pattern of artifactPatterns) {
      const match = cleaned.match(pattern);
      if (match) {
        cleaned = match[1] || match[0].replace(pattern, '');
        break;
      }
    }
    
    // Ensure we don't return empty or just the original text
    cleaned = cleaned.trim();
    if (!cleaned || cleaned === originalText) {
      console.warn('Response cleaning resulted in empty or unchanged text');
      return response.trim(); // Return original response
    }
    
    return cleaned;
  }

  async cleanup() {
    console.log('Starting ToneAdjuster cleanup');
    
    // Clear session timeout
    if (this.sessionTimeout) {
      clearTimeout(this.sessionTimeout);
      this.sessionTimeout = null;
    }
    
    // Cleanup AI session
    if (this.aiSession) {
      try {
        await this.aiSession.destroy();
        console.log('AI session destroyed successfully');
      } catch (error) {
        console.warn('Error destroying AI session:', error);
      } finally {
        this.aiSession = null;
      }
    }
    
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