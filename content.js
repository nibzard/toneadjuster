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
    console.log('Content script received message:', message);
    
    if (message.action === 'checkAiAvailability') {
        checkAiAvailability().then(available => {
            sendResponse({ available });
        }).catch(error => {
            console.error('Content script AI check failed:', error);
            sendResponse({ available: false });
        });
        return true; // Keep message channel open for async response
    } else if (message.action === 'rewriteTextWithAI') {
        (async () => {
            try {
                const result = await rewriteTextWithAI(message.text, message.tone);
                sendResponse({ success: true, adjustedText: result });
            } catch (error) {
                console.error('Content script text rewriting failed:', error);
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true; // Keep message channel open for async response
    } else {
        // Handle unknown actions
        console.warn('Unknown action received:', message.action);
        sendResponse({ success: false, error: 'Unknown action: ' + message.action });
        return false; // Don't keep channel open for unknown actions
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
let aiSessions = {}; // Store different sessions by tone type
let sessionTimeouts = {};
const sessionIdleTime = 5 * 60 * 1000; // 5 minutes

async function rewriteTextWithAI(text, tone) {
    try {
        if (!text || text.trim().length === 0) {
            throw new Error('No text provided');
        }

        const session = await ensureAISession(tone);
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
        if (aiSessions[tone] && error.message.includes('session')) {
            try {
                aiSessions[tone].destroy();
                delete aiSessions[tone];
                
                // Retry once with new session
                const newSession = await ensureAISession(tone);
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

async function ensureAISession(tone) {
    const sessionKey = tone || 'default';
    
    if (!aiSessions[sessionKey]) {
        try {
            // Check availability first
            const available = await checkAiAvailability();
            if (!available) {
                throw new Error('AI not available');
            }
            
            // Get default parameters
            const params = await LanguageModel.params();
            
            // Configure parameters based on tone
            const toneConfig = getToneParameters(tone, params);
            
            // Create session with tone-specific parameters
            aiSessions[sessionKey] = await LanguageModel.create({
                temperature: toneConfig.temperature,
                topK: toneConfig.topK
            });
            
            console.log(`AI session created for ${tone} tone:`, toneConfig);
        } catch (error) {
            console.error('Failed to create AI session:', error);
            throw new Error('AI session creation failed: ' + error.message);
        }
    }
    
    // Reset session timeout for this specific session
    resetSessionTimeout(sessionKey);
    
    return aiSessions[sessionKey];
}

function getToneParameters(tone, defaultParams) {
    const baseTemp = defaultParams.defaultTemperature || 0.8;
    const baseTopK = defaultParams.defaultTopK || 8;
    
    const configs = {
        // Lower creativity - focus on correctness
        polish: {
            temperature: Math.max(baseTemp * 0.3, 0.1),
            topK: Math.max(baseTopK - 5, 1)
        },
        
        // Moderate creativity - structured but varied
        formal: {
            temperature: Math.max(baseTemp * 0.5, 0.2),
            topK: Math.max(baseTopK - 3, 2)
        },
        
        // Moderate-high creativity - warm variations
        friendly: {
            temperature: Math.max(baseTemp * 0.8, 0.4),
            topK: baseTopK
        },
        
        // Lower creativity - decisive and direct
        confident: {
            temperature: Math.max(baseTemp * 0.4, 0.2),
            topK: Math.max(baseTopK - 4, 2)
        },
        
        // Very low creativity - precise reduction
        concise: {
            temperature: Math.max(baseTemp * 0.2, 0.1),
            topK: Math.max(baseTopK - 6, 1)
        },
        
        // Maximum creativity - wild and varied
        unhinged: {
            temperature: Math.max(baseTemp * 1.5, 1.2),
            topK: Math.min(baseTopK + 5, 40)
        }
    };
    
    return configs[tone] || {
        temperature: baseTemp,
        topK: baseTopK
    };
}

function resetSessionTimeout(sessionKey) {
    // Clear existing timeout for this session
    if (sessionTimeouts[sessionKey]) {
        clearTimeout(sessionTimeouts[sessionKey]);
    }
    
    // Set new timeout to cleanup idle session
    sessionTimeouts[sessionKey] = setTimeout(() => {
        cleanupIdleSession(sessionKey);
    }, sessionIdleTime);
}

async function cleanupIdleSession(sessionKey) {
    if (aiSessions[sessionKey]) {
        try {
            console.log(`Cleaning up idle AI session: ${sessionKey}`);
            await aiSessions[sessionKey].destroy();
            delete aiSessions[sessionKey];
        } catch (error) {
            console.warn(`Error cleaning up idle session ${sessionKey}:`, error);
            delete aiSessions[sessionKey]; // Force cleanup even if destroy fails
        }
    }
    
    if (sessionTimeouts[sessionKey]) {
        clearTimeout(sessionTimeouts[sessionKey]);
        delete sessionTimeouts[sessionKey];
    }
}

function createPrompt(text, tone) {
    const prompts = {
        // Zero-shot with clear instruction - simple task
        polish: `Fix grammar and improve clarity: "${text}"`,
        
        // Few-shot with 2 examples - needs style guidance  
        formal: `Rewrite formally:
Example: "Hey, can you check this?" → "Could you please review this document?"
Example: "Thanks!" → "Thank you for your assistance."
Text: "${text}"
Formal version:`,

        // Zero-shot with specific instruction
        friendly: `Rewrite with warm, friendly tone: "${text}"`,
        
        // Few-shot with 2 examples - needs behavior change
        confident: `Remove uncertainty, make decisive:
Example: "I think maybe we could try..." → "We will implement..."
Example: "I'm not sure, but perhaps..." → "The solution is..."
Text: "${text}"
Confident version:`,
        
        // Zero-shot - clear objective task
        concise: `Shorten while keeping meaning: "${text}"`,
        
        // Few-shot - creative task needs examples
        unhinged: `Make wildly exaggerated:
Example: "Good meeting" → "LEGENDARY GATHERING OF BRILLIANT MINDS!"
Example: "Please review" → "BEHOLD THIS MAGNIFICENT DOCUMENT!"
Text: "${text}"
Exaggerated:`
    };

    return prompts[tone] || prompts.formal; // Fallback to formal
}

function cleanResponse(response, originalText) {
    let cleaned = response.trim();
    
    // Remove surrounding quotes if present
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.slice(1, -1);
    }
    
    // Remove any remaining "Output:" prefix that might appear
    cleaned = cleaned.replace(/^Output:\s*/i, '');
    
    // Take only the first line/paragraph if there are multiple
    const lines = cleaned.split('\n');
    if (lines.length > 1 && lines[0].trim().length > 0) {
        cleaned = lines[0].trim();
    }
    
    // Ensure we don't return empty text
    if (!cleaned || cleaned.length < 3) {
        console.warn('Response cleaning resulted in very short text, using original response');
        return response.trim();
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