/**
 * Tone Adjuster Chrome Extension - Content Script
 * Handles text selection detection, UI injection, and tone adjustment workflow
 */

import DOMPurify from 'dompurify';

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
        console.log('🚀 Tone Adjuster content script initializing...');
        this.attachEventListeners();
        this.injectStyles();
        console.log('✅ Tone Adjuster content script initialized successfully');
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
        // Create content container
        const container = document.createElement('div');
        
        // Create header
        const header = document.createElement('div');
        header.className = 'tooltip-header';
        
        const title = document.createElement('span');
        title.className = 'tooltip-title';
        title.textContent = 'Adjust Tone';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.title = 'Close';
        closeBtn.innerHTML = '&times;';
        
        header.appendChild(title);
        header.appendChild(closeBtn);
        
        // Create tone buttons container
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'tone-buttons';
        
        this.tones.forEach(tone => {
            const button = document.createElement('button');
            button.className = 'tone-btn';
            button.dataset.tone = tone.id;
            button.title = `Adjust to ${tone.label} tone`;
            
            const icon = document.createElement('span');
            icon.className = 'tone-icon';
            icon.textContent = tone.icon;
            
            const label = document.createElement('span');
            label.className = 'tone-label';
            label.textContent = tone.label;
            
            button.appendChild(icon);
            button.appendChild(label);
            buttonsContainer.appendChild(button);
        });
        
        // Create processing state
        const processingState = document.createElement('div');
        processingState.className = 'processing-state';
        processingState.style.display = 'none';
        
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        
        const processingText = document.createElement('span');
        processingText.className = 'processing-text';
        processingText.textContent = 'Adjusting tone...';
        
        processingState.appendChild(spinner);
        processingState.appendChild(processingText);
        
        // Create preview section
        const previewSection = document.createElement('div');
        previewSection.className = 'preview-section';
        previewSection.style.display = 'none';
        
        const previewHeader = document.createElement('div');
        previewHeader.className = 'preview-header';
        
        const previewTitle = document.createElement('span');
        previewTitle.className = 'preview-title';
        previewTitle.textContent = 'Preview';
        
        previewHeader.appendChild(previewTitle);
        
        const previewContent = document.createElement('div');
        previewContent.className = 'preview-content';
        
        const previewActions = document.createElement('div');
        previewActions.className = 'preview-actions';
        
        const acceptBtn = document.createElement('button');
        acceptBtn.className = 'accept-btn';
        acceptBtn.textContent = 'Accept';
        
        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'reject-btn';
        rejectBtn.textContent = 'Try Again';
        
        previewActions.appendChild(acceptBtn);
        previewActions.appendChild(rejectBtn);
        
        previewSection.appendChild(previewHeader);
        previewSection.appendChild(previewContent);
        previewSection.appendChild(previewActions);
        
        // Assemble all parts
        container.appendChild(header);
        container.appendChild(buttonsContainer);
        container.appendChild(processingState);
        container.appendChild(previewSection);
        
        return container;
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
            
            // Sanitize the adjusted text before displaying (though textContent should be safe)
            const sanitizedText = DOMPurify.sanitize(adjustedText, { ALLOWED_TAGS: [] });
            previewContent.textContent = sanitizedText;
            
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
    console.log('🔄 Content script received message:', message.action, message);
    
    if (message.action === 'checkAiAvailability') {
        checkAiAvailability().then(available => {
            sendResponse({ available });
        }).catch(error => {
            console.error('Content script AI check failed:', error);
            sendResponse({ available: false });
        });
        return true; // Keep message channel open for async response
    } else if (message.action === 'rewriteTextWithAI') {
        console.log('🎭 Processing rewriteTextWithAI request...');
        (async () => {
            try {
                const result = await rewriteTextWithAI(message.text, message.tone);
                console.log('✅ Text rewriting successful:', result.substring(0, 100) + '...');
                sendResponse({ success: true, adjustedText: result });
            } catch (error) {
                console.error('❌ Content script text rewriting failed:', error);
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true; // Keep message channel open for async response
    } else if (message.action === 'replaceText') {
        // Handle text replacement in the current page
        console.log('Received replaceText request:', message);
        try {
            // For now, just log this - in a full implementation we'd replace text in the DOM
            console.log(`Replace "${message.originalText}" with "${message.newText}" (${message.tone} tone)`);
            sendResponse({ success: true });
        } catch (error) {
            console.error('Text replacement failed:', error);
            sendResponse({ success: false, error: error.message });
        }
        return false; // Synchronous response
    } else if (message.action === 'error') {
        // Handle error messages from background script
        console.error('Background script error:', message.message);
        // Could show user notification here
        return false; // No response needed
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
        
        // Reset session on any failure (following sample extension pattern)
        console.log('Prompt failed, resetting session');
        await resetAISession(tone);
        
        // Try once more with fresh session
        try {
            const retrySession = await ensureAISession(tone);
            const prompt = createPrompt(text, tone);
            const response = await retrySession.prompt(prompt);
            
            if (response && response.trim().length > 0) {
                console.log('Retry succeeded after session reset');
                return cleanResponse(response, text);
            }
        } catch (retryError) {
            console.error('Retry also failed:', retryError);
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
            
            // Create session with tone-specific parameters and system prompts
            aiSessions[sessionKey] = await LanguageModel.create({
                temperature: toneConfig.temperature,
                topK: toneConfig.topK,
                initialPrompts: getInitialPrompts(tone)
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

function getInitialPrompts(tone) {
    const systemPrompts = {
        polish: [
            { 
                role: 'system', 
                content: `You are an expert text editor that polishes text to perfection.
Follow these rules:
1. Think step-by-step internally to identify grammar, clarity, and flow issues.
2. Fix all grammatical errors while preserving the original meaning.
3. Improve sentence structure and word choice for maximum clarity.
4. Always output only the polished text. Never explain your changes.`
            },
            // Example 1
            { role: 'user', content: "Rewrite in a polished tone: 'Their going to the store tommorrow for buying groceries.'" },
            { role: 'assistant', content: "They're going to the store tomorrow to buy groceries." },
            // Example 2
            { role: 'user', content: "Rewrite in a polished tone: 'The meeting what we had yesterday it was really productive and we got alot done.'" },
            { role: 'assistant', content: "Yesterday's meeting was highly productive, and we accomplished a great deal." },
            // Example 3
            { role: 'user', content: "Rewrite in a polished tone: 'I seen the report you sended me and I think its good but needs few changes.'" },
            { role: 'assistant', content: "I've reviewed the report you sent, and while it's good, it requires a few modifications." }
        ],
        
        formal: [
            { 
                role: 'system', 
                content: `You are a professional communication specialist that transforms text into formal business language.
Follow these rules:
1. Think step-by-step internally to identify casual elements and replace them with formal alternatives.
2. Use professional vocabulary and complete sentences.
3. Maintain respectful, courteous tone appropriate for business or academic contexts.
4. Always output only the formal text. Never explain your reasoning.`
            },
            // Example 1
            { role: 'user', content: "Rewrite in a formal tone: 'Hey, can you check this out when you get a chance?'" },
            { role: 'assistant', content: "Could you please review this document at your earliest convenience?" },
            // Example 2
            { role: 'user', content: "Rewrite in a formal tone: 'Thanks for the help! Really appreciate it.'" },
            { role: 'assistant', content: "Thank you for your valuable assistance. Your support is greatly appreciated." },
            // Example 3
            { role: 'user', content: "Rewrite in a formal tone: 'Sorry for the late reply, I was swamped with work.'" },
            { role: 'assistant', content: "I apologize for the delayed response due to an exceptionally high workload." }
        ],
        
        friendly: [
            { 
                role: 'system', 
                content: `You are a warm communication coach that makes text sound friendly and approachable.
Follow these rules:
1. Think step-by-step internally to identify opportunities for warmth and friendliness.
2. Use conversational language, contractions, and positive expressions.
3. Add a personal touch while maintaining the core message.
4. Always output only the friendly text. Never explain your approach.`
            },
            // Example 1
            { role: 'user', content: "Rewrite in a friendly tone: 'Your request has been processed.'" },
            { role: 'assistant', content: "Great news! We've processed your request." },
            // Example 2
            { role: 'user', content: "Rewrite in a friendly tone: 'The deadline is tomorrow at 5 PM.'" },
            { role: 'assistant', content: "Just a friendly reminder that we're aiming for tomorrow at 5 PM!" },
            // Example 3
            { role: 'user', content: "Rewrite in a friendly tone: 'I disagree with your proposal.'" },
            { role: 'assistant', content: "I see where you're coming from, but I have a different perspective on this proposal." }
        ],
        
        confident: [
            { 
                role: 'system', 
                content: `You are a confidence coach that transforms uncertain text into decisive, assertive language.
Follow these rules:
1. Think step-by-step internally to identify and eliminate uncertainty markers.
2. Replace tentative language with strong, definitive statements.
3. Use active voice and powerful verbs.
4. Always output only the confident text. Never explain your changes.`
            },
            // Example 1
            { role: 'user', content: "Rewrite in a confident tone: 'I think maybe we could try implementing this solution.'" },
            { role: 'assistant', content: "We will implement this solution." },
            // Example 2
            { role: 'user', content: "Rewrite in a confident tone: 'I'm not sure, but I believe the data might support our hypothesis.'" },
            { role: 'assistant', content: "The data clearly supports our hypothesis." },
            // Example 3
            { role: 'user', content: "Rewrite in a confident tone: 'Perhaps we should consider possibly moving forward with the project?'" },
            { role: 'assistant', content: "We're moving forward with the project." }
        ],
        
        concise: [
            { 
                role: 'system', 
                content: `You are a concise writing expert that eliminates unnecessary words while preserving meaning.
Follow these rules:
1. Think step-by-step internally to identify redundant words and phrases.
2. Remove filler words, redundancies, and unnecessary elaboration.
3. Keep only essential information and core message.
4. Always output only the concise text. Never explain your edits.`
            },
            // Example 1
            { role: 'user', content: "Rewrite in a concise tone: 'I wanted to reach out to you to see if you might be available for a meeting sometime next week.'" },
            { role: 'assistant', content: "Are you available to meet next week?" },
            // Example 2
            { role: 'user', content: "Rewrite in a concise tone: 'In my opinion, I think that we should probably start working on the project as soon as possible.'" },
            { role: 'assistant', content: "We should start the project immediately." },
            // Example 3
            { role: 'user', content: "Rewrite in a concise tone: 'The reason why I'm writing this email is to inform you about the fact that the meeting has been rescheduled.'" },
            { role: 'assistant', content: "The meeting has been rescheduled." }
        ],
        
        unhinged: [
            { 
                role: 'system', 
                content: `You are an expert text rewriter that adjusts tone to be "unhinged".
Follow these rules:
1. Think step-by-step internally to decide how to exaggerate, destabilize, and intensify the tone.
2. Use unexpected metaphors, dramatic language, and a sense of urgency or chaos.
3. Transform mundane statements into wildly exaggerated proclamations.
4. Always output only the rewritten text. Never explain your reasoning.`
            },
            // Example 1
            { role: 'user', content: "Rewrite in an unhinged tone: 'I am slightly annoyed by the delay.'" },
            { role: 'assistant', content: "My soul is clawing at the walls because time itself has betrayed me!" },
            // Example 2
            { role: 'user', content: "Rewrite in an unhinged tone: 'I am happy about the new coffee shop opening.'" },
            { role: 'assistant', content: "The caffeine gods have descended and my bloodstream is already vibrating in prophecy!" },
            // Example 3
            { role: 'user', content: "Rewrite in an unhinged tone: 'I think my neighbor might be avoiding me.'" },
            { role: 'assistant', content: "My neighbor has initiated a cold war of avoidance and I'm spiraling into the void of social rejection!" },
            // Example 4
            { role: 'user', content: "Rewrite in an unhinged tone: 'The meeting went well.'" },
            { role: 'assistant', content: "THE MEETING WAS A LEGENDARY CONVERGENCE OF MINDS THAT SHATTERED THE VERY FABRIC OF CORPORATE REALITY!" }
        ]
    };
    
    return systemPrompts[tone] || [
        { 
            role: 'system', 
            content: 'You are a helpful text rewriting assistant. Improve the given text while preserving its original meaning and intent. Always output only the rewritten text.'
        }
    ];
}

function getToneParameters(tone, defaultParams) {
    const baseTemp = defaultParams.defaultTemperature || 0.8;
    const baseTopK = defaultParams.defaultTopK || 8;
    const maxTemp = defaultParams.maxTemperature || 2.0;
    const maxTopK = defaultParams.maxTopK || 40;
    
    const configs = {
        // Lower creativity - focus on correctness
        polish: {
            temperature: Math.max(Math.min(baseTemp * 0.3, maxTemp), 0.1),
            topK: Math.max(Math.min(baseTopK - 5, maxTopK), 1)
        },
        
        // Moderate creativity - structured but varied
        formal: {
            temperature: Math.max(Math.min(baseTemp * 0.5, maxTemp), 0.2),
            topK: Math.max(Math.min(baseTopK - 3, maxTopK), 2)
        },
        
        // Moderate-high creativity - warm variations
        friendly: {
            temperature: Math.min(baseTemp * 0.8, maxTemp),
            topK: Math.min(baseTopK, maxTopK)
        },
        
        // Lower creativity - decisive and direct
        confident: {
            temperature: Math.max(Math.min(baseTemp * 0.4, maxTemp), 0.2),
            topK: Math.max(Math.min(baseTopK - 4, maxTopK), 2)
        },
        
        // Very low creativity - precise reduction
        concise: {
            temperature: Math.max(Math.min(baseTemp * 0.2, maxTemp), 0.1),
            topK: Math.max(Math.min(baseTopK - 6, maxTopK), 1)
        },
        
        // Maximum creativity - wild and varied
        unhinged: {
            temperature: Math.min(baseTemp * 1.5, maxTemp),
            topK: Math.min(baseTopK + 5, maxTopK)
        }
    };
    
    return configs[tone] || {
        temperature: Math.min(baseTemp, maxTemp),
        topK: Math.min(baseTopK, maxTopK)
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

async function resetAISession(tone) {
    const sessionKey = tone || 'default';
    
    if (aiSessions[sessionKey]) {
        try {
            await aiSessions[sessionKey].destroy();
        } catch (error) {
            console.error(`Error destroying session ${sessionKey}:`, error);
        }
        delete aiSessions[sessionKey];
    }
    
    // Clear timeout
    if (sessionTimeouts[sessionKey]) {
        clearTimeout(sessionTimeouts[sessionKey]);
        delete sessionTimeouts[sessionKey];
    }
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
    // Use consistent format matching the examples in getInitialPrompts
    const toneLabels = {
        polish: 'polished',
        formal: 'formal', 
        friendly: 'friendly',
        confident: 'confident',
        concise: 'concise',
        unhinged: 'unhinged'
    };
    
    const toneLabel = toneLabels[tone] || 'improved';
    return `Rewrite in a ${toneLabel} tone: '${text}'`;
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