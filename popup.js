/**
 * Popup Script for Tone Adjuster Chrome Extension
 * Handles the extension popup interface and AI status checking
 */

class PopupManager {
    constructor() {
        this.elements = {};
        this.aiStatus = null;
        this.initializeElements();
        this.setupEventListeners();
        this.checkAIStatus();
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        this.elements = {
            statusIndicator: document.getElementById('statusIndicator'),
            statusDot: document.getElementById('statusDot'),
            statusText: document.getElementById('statusText'),
            statusSection: document.getElementById('statusSection'),
            statusCard: document.getElementById('statusCard'),
            statusIcon: document.getElementById('statusIcon'),
            statusTitle: document.getElementById('statusTitle'),
            statusMessage: document.getElementById('statusMessage'),
            actionsSection: document.getElementById('actionsSection'),
            toneButtons: document.querySelectorAll('.tone-button'),
            testButton: document.getElementById('testButton'),
            settingsButton: document.getElementById('settingsButton'),
            helpButton: document.getElementById('helpButton'),
            refreshButton: document.getElementById('refreshButton')
        };
    }

    /**
     * Setup event listeners for interactive elements
     */
    setupEventListeners() {
        // Tone buttons - demo functionality
        this.elements.toneButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const tone = button.dataset.tone;
                this.handleToneButtonClick(tone);
            });
        });

        // Footer buttons
        this.elements.testButton.addEventListener('click', () => {
            this.openTestPage();
        });

        this.elements.refreshButton.addEventListener('click', () => {
            this.handleRefreshClick();
        });

        this.elements.settingsButton.addEventListener('click', () => {
            this.handleSettingsClick();
        });

        this.elements.helpButton.addEventListener('click', () => {
            this.handleHelpClick();
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            this.handleKeyNavigation(e);
        });
    }

    /**
     * Check Chrome AI API availability
     */
    async checkAIStatus() {
        this.updateStatus('loading', 'Checking AI availability...', 'Connecting to Chrome AI');

        try {
            // Check if LanguageModel API is available (global object)
            if (typeof LanguageModel === 'undefined') {
                throw new Error('Chrome AI LanguageModel API not available');
            }

            // Check model availability
            const capabilities = await LanguageModel.availability();
            console.log('AI capabilities check:', capabilities);
            
            if (capabilities === 'no') {
                throw new Error('Chrome AI is not available on this device');
            }

            if (capabilities === 'after-download') {
                this.updateStatus('warning', 'AI model downloading...', 'Chrome is downloading the AI model. This may take a few minutes.');
                this.showDownloadProgress();
                return;
            }

            // Try to create a test session
            const session = await LanguageModel.create();
            await session.destroy();

            this.aiStatus = 'available';
            this.updateStatus('success', 'AI Ready', 'Chrome AI is available and ready to adjust your text tone');
            this.showActionsSection();

        } catch (error) {
            console.error('AI status check failed:', error);
            this.aiStatus = 'unavailable';
            this.updateStatus('error', 'AI Unavailable', this.getErrorMessage(error));
            this.showErrorHelp(error);
        }
    }

    /**
     * Update the status display
     */
    updateStatus(type, title, message) {
        // Update status indicator
        this.elements.statusDot.className = `status-dot ${type === 'success' ? 'online' : type === 'error' ? 'offline' : 'loading'}`;
        this.elements.statusText.textContent = type === 'success' ? 'Online' : type === 'error' ? 'Offline' : 'Loading...';

        // Update status card
        this.elements.statusCard.className = `status-card ${type}`;
        this.elements.statusTitle.textContent = title;
        this.elements.statusMessage.textContent = message;

        // Update status icon
        const icons = {
            loading: '⚡',
            success: '✅',
            error: '❌',
            warning: '⚠️'
        };
        this.elements.statusIcon.textContent = icons[type] || '⚡';

        // Add loading animation
        if (type === 'loading') {
            this.elements.statusIcon.classList.add('loading');
        } else {
            this.elements.statusIcon.classList.remove('loading');
        }
    }

    /**
     * Show the actions section when AI is available
     */
    showActionsSection() {
        this.elements.actionsSection.style.display = 'block';
    }

    /**
     * Show download progress for AI model
     */
    async showDownloadProgress() {
        let attempts = 0;
        const maxAttempts = 30; // 5 minutes max
        
        const checkProgress = async () => {
            attempts++;
            
            try {
                const capabilities = await LanguageModel.availability();
                
                if (capabilities === 'readily' || capabilities === 'available') {
                    this.updateStatus('success', 'AI Ready', 'Download complete! Chrome AI is now ready.');
                    this.showActionsSection();
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    throw new Error('Download timeout - please try again later');
                }
                
                // Update progress message
                const minutes = Math.floor(attempts / 6);
                this.updateStatus('warning', 'Downloading AI model...', 
                    `Download in progress (${minutes}m)... Please keep this tab open.`);
                
                setTimeout(checkProgress, 10000); // Check every 10 seconds
                
            } catch (error) {
                this.updateStatus('error', 'Download failed', 'Failed to download AI model. Please try again later.');
            }
        };
        
        setTimeout(checkProgress, 5000);
    }

    /**
     * Show error help information
     */
    showErrorHelp(error) {
        const errorHelp = document.createElement('div');
        errorHelp.className = 'error-message';
        
        let helpTitle = 'Troubleshooting';
        let helpText = 'Please try the following steps:';
        let steps = [];

        if (error.message.includes('not available')) {
            steps = [
                'Make sure you\'re using Chrome version 138 or later',
                'Enable "Experimental Web Platform features" in chrome://flags',
                'Check chrome://on-device-internals/ to verify Gemini Nano is loaded',
                'Restart your browser and try again'
            ];
        } else {
            steps = [
                'Check your internet connection',
                'Restart Chrome and try again',
                'Contact support if the issue persists'
            ];
        }

        // Create help content safely
        const title = document.createElement('h4');
        title.textContent = helpTitle;
        
        const text = document.createElement('p');
        text.textContent = helpText;
        
        const list = document.createElement('ul');
        list.style.cssText = 'margin-top: 8px; padding-left: 16px;';
        
        steps.forEach(step => {
            const listItem = document.createElement('li');
            listItem.style.cssText = 'font-size: 11px; margin-bottom: 4px;';
            listItem.textContent = step;
            list.appendChild(listItem);
        });
        
        errorHelp.appendChild(title);
        errorHelp.appendChild(text);
        errorHelp.appendChild(list);

        this.elements.statusSection.appendChild(errorHelp);
    }

    /**
     * Get user-friendly error message
     */
    getErrorMessage(error) {
        if (error.message.includes('not available')) {
            return 'Chrome AI requires Chrome 138+ and experimental features enabled.';
        }
        if (error.message.includes('after-download')) {
            return 'AI model needs to be downloaded first.';
        }
        return 'Unable to connect to Chrome AI. Please check your setup.';
    }

    /**
     * Handle tone button clicks
     */
    handleToneButtonClick(tone) {
        // Add visual feedback
        const button = document.querySelector(`[data-tone="${tone}"]`);
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
            button.style.transform = '';
        }, 150);

        // Show helpful message
        this.showToneInfo(tone);
    }

    /**
     * Show tone information
     */
    showToneInfo(tone) {
        const toneDescriptions = {
            formal: 'Perfect for business emails, reports, and professional communication.',
            friendly: 'Great for casual emails, social media, and personal messages.',
            confident: 'Ideal for presentations, proposals, and assertive communication.',
            concise: 'Best for quick messages, summaries, and clear instructions.',
            empathetic: 'Excellent for support messages, apologies, and sensitive topics.'
        };

        const message = toneDescriptions[tone] || 'Select text on any webpage and right-click to use this tone.';
        
        // Temporarily update status message
        const originalMessage = this.elements.statusMessage.textContent;
        this.elements.statusMessage.textContent = message;
        
        setTimeout(() => {
            this.elements.statusMessage.textContent = originalMessage;
        }, 3000);
    }

    /**
     * Handle refresh button click
     */
    handleRefreshClick() {
        this.elements.refreshButton.classList.add('spinning');
        this.elements.actionsSection.style.display = 'none';
        
        // Clear any error messages
        const errorMessages = document.querySelectorAll('.error-message');
        errorMessages.forEach(msg => msg.remove());
        
        setTimeout(() => {
            this.elements.refreshButton.classList.remove('spinning');
            this.checkAIStatus();
        }, 500);
    }

    /**
     * Handle settings button click
     */
    handleSettingsClick() {
        // For now, just show a message
        this.showTemporaryMessage('Settings panel coming soon!');
    }

    /**
     * Handle help button click
     */
    handleHelpClick() {
        // Open help in a new tab
        chrome.tabs.create({ 
            url: 'https://developer.chrome.com/docs/extensions/ai/prompt-api'
        });
    }

    /**
     * Open test page for debugging
     */
    openTestPage() {
        chrome.tabs.create({
            url: chrome.runtime.getURL('test.html')
        });
    }

    /**
     * Show temporary message
     */
    showTemporaryMessage(message) {
        const originalMessage = this.elements.statusMessage.textContent;
        this.elements.statusMessage.textContent = message;
        
        setTimeout(() => {
            this.elements.statusMessage.textContent = originalMessage;
        }, 2000);
    }

    /**
     * Handle keyboard navigation
     */
    handleKeyNavigation(e) {
        if (e.key === 'Escape') {
            window.close();
        }
        
        // Add more keyboard shortcuts as needed
        if (e.key === 'r' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            this.handleRefreshClick();
        }
    }

    /**
     * Get current tab information
     */
    async getCurrentTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            return tab;
        } catch (error) {
            console.error('Failed to get current tab:', error);
            return null;
        }
    }

    /**
     * Send message to content script
     */
    async sendMessageToContent(message) {
        const tab = await this.getCurrentTab();
        if (!tab) return;

        try {
            return await chrome.tabs.sendMessage(tab.id, message);
        } catch (error) {
            console.error('Failed to send message to content script:', error);
            return null;
        }
    }
}

// Initialize popup when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new PopupManager();
});

// Handle popup being opened
window.addEventListener('load', () => {
    // Focus management for accessibility
    const firstFocusable = document.querySelector('.tone-button, .footer-button');
    if (firstFocusable) {
        firstFocusable.focus();
    }
});

// Clean up when popup closes
window.addEventListener('beforeunload', () => {
    // Any cleanup needed
});