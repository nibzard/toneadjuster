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
            { id: 'formal', label: 'Formal', icon: '📋' },
            { id: 'friendly', label: 'Friendly', icon: '😊' },
            { id: 'confident', label: 'Confident', icon: '💪' },
            { id: 'concise', label: 'Concise', icon: '⚡' },
            { id: 'empathetic', label: 'Empathetic', icon: '🤝' }
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
        this.tooltip.innerHTML = this.createTooltipContent();
        
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
            // Send message to background script for AI processing
            const response = await chrome.runtime.sendMessage({
                action: 'rewriteText',
                text: this.selectedText,
                tone: tone
            });
            
            if (response.success) {
                this.showPreview(response.adjustedText, tone);
            } else {
                this.showError(response.error || 'Failed to adjust tone');
            }
        } catch (error) {
            console.error('Tone adjustment error:', error);
            this.showError('Unable to connect to tone adjustment service');
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
            processingState.innerHTML = `
                <div class="error-state">
                    <span class="error-icon">⚠️</span>
                    <span class="error-text">${errorMessage}</span>
                    <button class="retry-btn">Try Again</button>
                </div>
            `;
            
            const retryBtn = processingState.querySelector('.retry-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', this.showToneButtons.bind(this));
            }
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
        feedback.innerHTML = `
            <span class="success-icon">✓</span>
            <span class="success-text">Tone adjusted successfully</span>
        `;
        
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

// Initialize the Tone Adjuster when the page is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ToneAdjuster();
    });
} else {
    new ToneAdjuster();
}