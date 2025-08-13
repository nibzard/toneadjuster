/**
 * Tone Adjuster Chrome Extension - Content Script
 * Handles text selection detection, UI injection, and tone adjustment workflow
 */

class ToneAdjuster {
    constructor() {
        this.currentSelection = null;
        this.selectedText = '';
        this.targetElement = null;
        this.selectionRange = null;
        this.tooltip = null;
        this.isProcessing = false;
        
        // Tone options
        this.tones = [
            { id: 'polish', label: 'Polish', icon: '💎' },
            { id: 'formal', label: 'Formal', icon: '📋' },
            { id: 'friendly', label: 'Friendly', icon: '😊' },
            { id: 'confident', label: 'Confident', icon: '💪' },
            { id: 'concise', label: 'Concise', icon: '⚡' },
            { id: 'unhinged', label: 'Unhinged', icon: '🤪' }
        ];
        
        this.init();
    }
    
    init() {
        this.attachEventListeners();
        this.injectStyles();
    }
    
    attachEventListeners() {
        // Text selection events
        document.addEventListener('mouseup', this.handleSelection.bind(this));
        document.addEventListener('keyup', this.handleSelection.bind(this));
        
        // Hide tooltip on scroll or click outside
        document.addEventListener('scroll', this.hideTooltip.bind(this), true);
        document.addEventListener('mousedown', this.handleClickOutside.bind(this));
        
        // Handle window resize
        window.addEventListener('resize', this.hideTooltip.bind(this));
    }
    
    injectStyles() {
        if (document.getElementById('tone-adjuster-styles')) return;
        
        const link = document.createElement('link');
        link.id = 'tone-adjuster-styles';
        link.rel = 'stylesheet';
        link.href = chrome.runtime.getURL('content-styles.css');
        document.head.appendChild(link);
    }
    
    handleSelection(event) {
        // Debounce selection handling
        clearTimeout(this.selectionTimeout);
        this.selectionTimeout = setTimeout(() => {
            this.processSelection(event);
        }, 100);
    }
    
    processSelection(event) {
        const selection = window.getSelection();
        
        // Hide existing tooltip
        this.hideTooltip();
        
        // Check if there's a valid selection
        if (!selection || selection.rangeCount === 0) {
            return;
        }
        
        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();
        
        // Only show tooltip for meaningful text selections
        if (!selectedText || selectedText.length < 3) {
            return;
        }
        
        // Check if selection is in an editable element
        const targetElement = this.getEditableElement(range.commonAncestorContainer);
        if (!targetElement) {
            return;
        }
        
        // Store selection details
        this.currentSelection = selection;
        this.selectedText = selectedText;
        this.targetElement = targetElement;
        this.selectionRange = range.cloneRange();
        
        // Show tooltip near the selection
        this.showTooltip(range);
    }
    
    getEditableElement(node) {
        // Traverse up the DOM to find an editable element
        let current = node;
        
        while (current && current !== document) {
            if (current.nodeType === Node.ELEMENT_NODE) {
                const tagName = current.tagName.toLowerCase();
                
                // Check for input/textarea elements
                if (tagName === 'input' || tagName === 'textarea') {
                    const type = current.type || '';
                    // Only text-based inputs
                    if (tagName === 'textarea' || 
                        ['text', 'email', 'password', 'search', 'url'].includes(type)) {
                        return current;
                    }
                }
                
                // Check for contenteditable elements
                if (current.contentEditable === 'true') {
                    return current;
                }
            }
            
            current = current.parentNode;
        }
        
        return null;
    }
    
    showTooltip(range) {
        // Create tooltip element
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tone-adjuster-tooltip';
        this.tooltip.appendChild(this.createTooltipContent());
        
        // Add to DOM
        document.body.appendChild(this.tooltip);
        
        // Position tooltip
        this.positionTooltip(range);
        
        // Attach event listeners
        this.attachTooltipListeners();
        
        // Animate in
        requestAnimationFrame(() => {
            this.tooltip.classList.add('visible');
        });
    }
    
    createTooltipContent() {
        const toneButtons = this.tones.map(tone => `
            <button class="tone-btn" data-tone="${tone.id}" title="Adjust to ${tone.label} tone">
                <span class="tone-icon">${tone.icon}</span>
                <span class="tone-label">${tone.label}</span>
            </button>
        `).join('');
        
        return `
            <div class="tooltip-header">
                <span class="tooltip-title">Adjust Tone</span>
                <button class="close-btn" title="Close">&times;</button>
            </div>
            <div class="tone-buttons">
                ${toneButtons}
            </div>
            <div class="processing-state" style="display: none;">
                <div class="spinner"></div>
                <span class="processing-text">Adjusting tone...</span>
            </div>
            <div class="preview-section" style="display: none;">
                <div class="preview-header">
                    <span class="preview-title">Preview</span>
                </div>
                <div class="preview-content"></div>
                <div class="preview-actions">
                    <button class="accept-btn">Accept</button>
                    <button class="reject-btn">Try Again</button>
                </div>
            </div>
        `;
    }
    
    positionTooltip(range) {
        const rect = range.getBoundingClientRect();
        const tooltip = this.tooltip;
        
        // Initial positioning above the selection
        let top = rect.top + window.scrollY - tooltip.offsetHeight - 10;
        let left = rect.left + window.scrollX + (rect.width / 2) - (tooltip.offsetWidth / 2);
        
        // Ensure tooltip stays within viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        // Horizontal bounds checking
        if (left < 10) {
            left = 10;
        } else if (left + tooltip.offsetWidth > viewportWidth - 10) {
            left = viewportWidth - tooltip.offsetWidth - 10;
        }
        
        // Vertical bounds checking - if not enough space above, show below
        if (top < 10) {
            top = rect.bottom + window.scrollY + 10;
            tooltip.classList.add('below');
        }
        
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    }
    
    attachTooltipListeners() {
        if (!this.tooltip) return;
        
        // Close button
        const closeBtn = this.tooltip.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', this.hideTooltip.bind(this));
        }
        
        // Tone adjustment buttons
        const toneButtons = this.tooltip.querySelectorAll('.tone-btn');
        toneButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tone = e.currentTarget.dataset.tone;
                this.adjustTone(tone);
            });
        });
        
        // Preview action buttons
        const acceptBtn = this.tooltip.querySelector('.accept-btn');
        const rejectBtn = this.tooltip.querySelector('.reject-btn');
        
        if (acceptBtn) {
            acceptBtn.addEventListener('click', this.acceptAdjustment.bind(this));
        }
        
        if (rejectBtn) {
            rejectBtn.addEventListener('click', this.showToneButtons.bind(this));
        }
    }
    
    async adjustTone(tone) {
        if (this.isProcessing) return;
        
        this.isProcessing = true;
        this.showProcessingState();
        
        try {
            // Validate inputs
            if (!this.selectedText || this.selectedText.trim().length === 0) {
                throw new Error('No text selected');
            }
            
            if (!tone || typeof tone !== 'string') {
                throw new Error('Invalid tone specified');
            }
            
            // Send message to background script for AI processing
            const response = await chrome.runtime.sendMessage({
                action: 'rewriteText',
                text: this.selectedText,
                tone: tone
            });
            
            if (!response) {
                throw new Error('No response received from background script');
            }
            
            if (response.success) {
                if (!response.adjustedText) {
                    throw new Error('No adjusted text received');
                }
                this.showPreview(response.adjustedText, tone);
            } else {
                this.showError(response.error || 'Failed to adjust tone');
            }
        } catch (error) {
            console.error('Tone adjustment error:', error);
            
            // Provide user-friendly error messages
            let errorMessage = 'Unable to adjust tone';
            if (error.message.includes('No text selected')) {
                errorMessage = 'Please select some text first';
            } else if (error.message.includes('connect')) {
                errorMessage = 'Connection error - please try again';
            } else if (error.message.includes('timeout')) {
                errorMessage = 'Request timed out - please try again';
            }
            
            this.showError(errorMessage);
        } finally {
            this.isProcessing = false;
        }
    }
    
    showProcessingState() {
        if (!this.tooltip) return;
        
        const toneButtons = this.tooltip.querySelector('.tone-buttons');
        const processingState = this.tooltip.querySelector('.processing-state');
        
        if (toneButtons && processingState) {
            toneButtons.style.display = 'none';
            processingState.style.display = 'flex';
        }
    }
    
    showPreview(adjustedText, tone) {
        if (!this.tooltip) return;
        
        const processingState = this.tooltip.querySelector('.processing-state');
        const previewSection = this.tooltip.querySelector('.preview-section');
        const previewContent = this.tooltip.querySelector('.preview-content');
        
        if (processingState && previewSection && previewContent) {
            processingState.style.display = 'none';
            previewSection.style.display = 'block';
            previewContent.textContent = adjustedText;
            
            // Store adjusted text for potential acceptance
            this.adjustedText = adjustedText;
            this.adjustedTone = tone;
        }
    }
    
    showToneButtons() {
        if (!this.tooltip) return;
        
        const toneButtons = this.tooltip.querySelector('.tone-buttons');
        const processingState = this.tooltip.querySelector('.processing-state');
        const previewSection = this.tooltip.querySelector('.preview-section');
        
        if (toneButtons) {
            toneButtons.style.display = 'grid';
        }
        
        if (processingState) {
            processingState.style.display = 'none';
        }
        
        if (previewSection) {
            previewSection.style.display = 'none';
        }
    }
    
    showError(errorMessage) {
        if (!this.tooltip) return;
        
        const processingState = this.tooltip.querySelector('.processing-state');
        
        if (processingState) {
            // Clear existing content safely
            processingState.textContent = '';
            
            const errorState = document.createElement('div');
            errorState.className = 'error-state';
            
            const errorIcon = document.createElement('span');
            errorIcon.className = 'error-icon';
            errorIcon.textContent = '⚠️';
            
            const errorText = document.createElement('span');
            errorText.className = 'error-text';
            errorText.textContent = errorMessage;
            
            const retryBtn = document.createElement('button');
            retryBtn.className = 'retry-btn';
            retryBtn.textContent = 'Try Again';
            retryBtn.addEventListener('click', this.showToneButtons.bind(this));
            
            errorState.appendChild(errorIcon);
            errorState.appendChild(errorText);
            errorState.appendChild(retryBtn);
            
            processingState.appendChild(errorState);
        }
    }
    
    acceptAdjustment() {
        if (!this.adjustedText || !this.selectionRange) return;
        
        try {
            // Replace the selected text with adjusted text
            this.replaceSelectedText(this.adjustedText);
            this.hideTooltip();
            
            // Show success feedback
            this.showSuccessFeedback();
        } catch (error) {
            console.error('Failed to replace text:', error);
            this.showError('Failed to replace text');
        }
    }
    
    replaceSelectedText(newText) {
        if (!this.selectionRange || !this.targetElement) return;
        
        // Handle different types of editable elements
        const tagName = this.targetElement.tagName.toLowerCase();
        
        if (tagName === 'input' || tagName === 'textarea') {
            // For input/textarea elements
            const start = this.targetElement.selectionStart;
            const end = this.targetElement.selectionEnd;
            const value = this.targetElement.value;
            
            this.targetElement.value = 
                value.substring(0, start) + 
                newText + 
                value.substring(end);
            
            // Set cursor position after replaced text
            const newCursorPos = start + newText.length;
            this.targetElement.setSelectionRange(newCursorPos, newCursorPos);
            
            // Trigger input event for any listeners
            this.targetElement.dispatchEvent(new Event('input', { bubbles: true }));
        } else {
            // For contenteditable elements
            this.selectionRange.deleteContents();
            this.selectionRange.insertNode(document.createTextNode(newText));
            
            // Clear selection and position cursor
            const selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(this.selectionRange);
            selection.collapseToEnd();
        }
        
        // Focus the element
        this.targetElement.focus();
    }
    
    showSuccessFeedback() {
        const feedback = document.createElement('div');
        feedback.className = 'tone-adjuster-success';
        
        const successIcon = document.createElement('span');
        successIcon.className = 'success-icon';
        successIcon.textContent = '✓';
        
        const successText = document.createElement('span');
        successText.className = 'success-text';
        successText.textContent = 'Tone adjusted successfully';
        
        feedback.appendChild(successIcon);
        feedback.appendChild(successText);
        
        document.body.appendChild(feedback);
        
        // Position near the target element
        const rect = this.targetElement.getBoundingClientRect();
        feedback.style.left = `${rect.left + window.scrollX}px`;
        feedback.style.top = `${rect.bottom + window.scrollY + 5}px`;
        
        // Animate in and out
        requestAnimationFrame(() => {
            feedback.classList.add('visible');
        });
        
        setTimeout(() => {
            feedback.classList.remove('visible');
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, 2000);
    }
    
    handleClickOutside(event) {
        if (this.tooltip && !this.tooltip.contains(event.target)) {
            // Don't hide if clicking on the selected text
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                if (range.toString().trim() === this.selectedText) {
                    return;
                }
            }
            
            this.hideTooltip();
        }
    }
    
    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.classList.remove('visible');
            
            setTimeout(() => {
                if (this.tooltip && this.tooltip.parentNode) {
                    this.tooltip.parentNode.removeChild(this.tooltip);
                }
                this.tooltip = null;
            }, 200);
        }
        
        // Reset state
        this.currentSelection = null;
        this.selectedText = '';
        this.targetElement = null;
        this.selectionRange = null;
        this.adjustedText = null;
        this.adjustedTone = null;
        this.isProcessing = false;
    }
}

// Add message listener for background script communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'checkAiAvailability') {
        checkAiAvailability().then(available => {
            sendResponse({ available });
        }).catch(error => {
            console.error('Content script AI check failed:', error);
            sendResponse({ available: false });
        });
        return true; // Keep message channel open for async response
    } else if (message.action === 'rewriteTextWithAI') {
        rewriteTextWithAI(message.text, message.tone).then(result => {
            sendResponse({ success: true, adjustedText: result });
        }).catch(error => {
            console.error('Content script text rewriting failed:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true; // Keep message channel open for async response
    }
});

// AI availability check function for content script
async function checkAiAvailability() {
    try {
        if (typeof LanguageModel === 'undefined') {
            console.log('LanguageModel global not available');
            return false;
        }
        
        // Check model availability
        const availability = await LanguageModel.availability();
        console.log('AI availability status:', availability);
        
        return availability === 'readily' || availability === 'available';
    } catch (error) {
        console.error('AI availability check failed:', error);
        return false;
    }
}

// AI text rewriting function for content script
let aiSession = null;
let sessionTimeout = null;
const sessionIdleTime = 5 * 60 * 1000; // 5 minutes

async function rewriteTextWithAI(text, tone) {
    try {
        if (!text || text.trim().length === 0) {
            throw new Error('No text provided');
        }

        const session = await ensureAISession();
        const prompt = createPrompt(text, tone);
        
        console.log(`Rewriting text with ${tone} tone:`, text.substring(0, 50) + '...');
        
        const response = await session.prompt(prompt);
        
        if (!response || response.trim().length === 0) {
            throw new Error('Empty response from AI');
        }

        // Clean up response - remove common artifacts
        const cleanedResponse = cleanResponse(response, text);
        
        return cleanedResponse;
    } catch (error) {
        console.error('Text rewriting failed:', error);
        
        // If session failed, try to recreate it once
        if (aiSession && error.message.includes('session')) {
            try {
                aiSession.destroy();
                aiSession = null;
                
                // Retry once with new session
                const newSession = await ensureAISession();
                const prompt = createPrompt(text, tone);
                const response = await newSession.prompt(prompt);
                
                if (response && response.trim().length > 0) {
                    return cleanResponse(response, text);
                }
            } catch (retryError) {
                console.error('Retry also failed:', retryError);
            }
        }
        
        throw error;
    }
}

async function ensureAISession() {
    if (!aiSession) {
        try {
            // Check availability first
            const available = await checkAiAvailability();
            if (!available) {
                throw new Error('AI not available');
            }
            
            // Create session with optimized parameters for Gemini Nano
            aiSession = await LanguageModel.create({
                temperature: 0.6, // Balanced creativity and coherence
                topK: 3 // Focus on quality responses
            });
            
            console.log('AI session created successfully');
        } catch (error) {
            console.error('Failed to create AI session:', error);
            throw new Error('AI session creation failed: ' + error.message);
        }
    }
    
    // Reset session timeout
    resetSessionTimeout();
    
    return aiSession;
}

function resetSessionTimeout() {
    // Clear existing timeout
    if (sessionTimeout) {
        clearTimeout(sessionTimeout);
    }
    
    // Set new timeout to cleanup idle session
    sessionTimeout = setTimeout(() => {
        cleanupIdleSession();
    }, sessionIdleTime);
}

async function cleanupIdleSession() {
    if (aiSession) {
        try {
            console.log('Cleaning up idle AI session');
            await aiSession.destroy();
            aiSession = null;
        } catch (error) {
            console.warn('Error cleaning up idle session:', error);
            aiSession = null; // Force cleanup even if destroy fails
        }
    }
    
    if (sessionTimeout) {
        clearTimeout(sessionTimeout);
        sessionTimeout = null;
    }
}

function createPrompt(text, tone) {
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

function cleanResponse(response, originalText) {
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

// Initialize the Tone Adjuster when the page is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ToneAdjuster();
    });
} else {
    new ToneAdjuster();
}