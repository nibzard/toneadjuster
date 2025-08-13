/**
 * Test page JavaScript for Tone Adjuster Chrome Extension
 * Provides debugging and testing functionality with console logging
 */

// Debug console state
let autoScroll = true;
let logCounter = 0;

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    logToConsole('🚀 Test page loaded', 'info');
    checkAiStatus();
    
    // Set up content script communication if we're in extension context
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        logToConsole('📱 Extension context detected', 'info');
    } else {
        logToConsole('🌐 Regular web page context detected', 'warn');
    }
    
    // Set up button event listeners
    setupEventListeners();
});

// Set up all button event listeners
function setupEventListeners() {
    // AI Status section
    const refreshAiStatusBtn = document.getElementById('refreshAiStatusBtn');
    const testDirectApiBtn = document.getElementById('testDirectApiBtn');
    
    // Tone adjustment section  
    const testToneAdjustmentBtn = document.getElementById('testToneAdjustmentBtn');
    const clearResultsBtn = document.getElementById('clearResultsBtn');
    
    // Debug console section
    const clearConsoleBtn = document.getElementById('clearConsoleBtn');
    const toggleAutoScrollBtn = document.getElementById('toggleAutoScrollBtn');
    
    // Add event listeners
    if (refreshAiStatusBtn) {
        refreshAiStatusBtn.addEventListener('click', checkAiStatus);
    }
    
    if (testDirectApiBtn) {
        testDirectApiBtn.addEventListener('click', testDirectApi);
    }
    
    if (testToneAdjustmentBtn) {
        testToneAdjustmentBtn.addEventListener('click', testToneAdjustment);
    }
    
    if (clearResultsBtn) {
        clearResultsBtn.addEventListener('click', clearResults);
    }
    
    if (clearConsoleBtn) {
        clearConsoleBtn.addEventListener('click', clearConsole);
    }
    
    if (toggleAutoScrollBtn) {
        toggleAutoScrollBtn.addEventListener('click', toggleAutoScroll);
    }
    
    logToConsole('🔧 Event listeners set up successfully', 'info');
}

// Enhanced console logging
function logToConsole(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    
    // Log to browser console
    switch(type) {
        case 'error':
            console.error(logEntry);
            break;
        case 'warn':
            console.warn(logEntry);
            break;
        case 'success':
            console.log(`✅ ${logEntry}`);
            break;
        default:
            console.log(logEntry);
    }
    
    // Log to debug console on page
    const consoleDiv = document.getElementById('consoleLog');
    if (consoleDiv) {
        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        entry.textContent = `${++logCounter}: ${logEntry}`;
        consoleDiv.appendChild(entry);
        
        if (autoScroll) {
            consoleDiv.scrollTop = consoleDiv.scrollHeight;
        }
    }
}

// AI Status Check
async function checkAiStatus() {
    const statusSpan = document.getElementById('aiStatus');
    const resultDiv = document.getElementById('statusResult');
    
    logToConsole('🔍 Checking AI status...', 'info');
    statusSpan.textContent = 'Checking...';
    statusSpan.className = 'status-indicator status-offline';
    
    try {
        // Check if LanguageModel is available
        logToConsole('Checking if LanguageModel global is available...', 'info');
        
        if (typeof LanguageModel === 'undefined') {
            throw new Error('LanguageModel global not available');
        }
        
        logToConsole('✅ LanguageModel global found', 'success');
        
        // Check availability
        const availability = await LanguageModel.availability();
        logToConsole(`AI availability status: ${availability}`, 'info');
        
        if (availability === 'readily' || availability === 'available') {
            statusSpan.textContent = 'Online';
            statusSpan.className = 'status-indicator status-online';
            
            resultDiv.textContent = `AI is available (${availability})`;
            resultDiv.className = 'result success';
            resultDiv.style.display = 'block';
            
            logToConsole('🎉 AI is ready for use!', 'success');
        } else {
            throw new Error(`AI not ready: ${availability}`);
        }
        
    } catch (error) {
        statusSpan.textContent = 'Offline';
        statusSpan.className = 'status-indicator status-offline';
        
        resultDiv.textContent = `Error: ${error.message}`;
        resultDiv.className = 'result error';
        resultDiv.style.display = 'block';
        
        logToConsole(`❌ AI status check failed: ${error.message}`, 'error');
    }
}

// Test Direct API Access
async function testDirectApi() {
    logToConsole('🧪 Testing direct API access...', 'info');
    
    try {
        // Test LanguageModel.params()
        logToConsole('Testing LanguageModel.params()...', 'info');
        const params = await LanguageModel.params();
        logToConsole(`Model params: ${JSON.stringify(params)}`, 'info');
        
        // Test session creation
        logToConsole('Testing session creation...', 'info');
        const session = await LanguageModel.create({
            temperature: 0.7,
            topK: 3
        });
        logToConsole('✅ Session created successfully', 'success');
        
        // Test simple prompt
        logToConsole('Testing simple prompt...', 'info');
        const response = await session.prompt('Say "Hello from Gemini Nano!"');
        logToConsole(`Prompt response: "${response}"`, 'success');
        
        // Cleanup
        await session.destroy();
        logToConsole('✅ Session destroyed', 'info');
        
        // Show result
        const resultDiv = document.getElementById('statusResult');
        resultDiv.textContent = `Direct API test successful!\nResponse: "${response}"`;
        resultDiv.className = 'result success';
        resultDiv.style.display = 'block';
        
    } catch (error) {
        logToConsole(`❌ Direct API test failed: ${error.message}`, 'error');
        
        const resultDiv = document.getElementById('statusResult');
        resultDiv.textContent = `Direct API test failed: ${error.message}`;
        resultDiv.className = 'result error';
        resultDiv.style.display = 'block';
    }
}

// Tone Adjustment Test
async function testToneAdjustment() {
    const textInput = document.getElementById('testText');
    const toneSelect = document.getElementById('testTone');
    const resultDiv = document.getElementById('toneResult');
    
    const text = textInput.value.trim();
    const tone = toneSelect.value;
    
    if (!text) {
        logToConsole('❌ No text provided for tone adjustment', 'error');
        return;
    }
    
    logToConsole(`🎭 Testing tone adjustment: ${tone} tone`, 'info');
    logToConsole(`Input text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`, 'info');
    
    try {
        // Use direct API call for test page (more reliable and appropriate)
        logToConsole('🔗 Using direct LanguageModel API (test page has direct access)...', 'info');
        await testDirectToneAdjustment(text, tone);
        
        resultDiv.style.display = 'block';
        
    } catch (error) {
        logToConsole(`❌ Tone adjustment failed: ${error.message}`, 'error');
        
        resultDiv.textContent = `Error adjusting tone: ${error.message}`;
        resultDiv.className = 'result error';
        resultDiv.style.display = 'block';
    }
}

// Direct tone adjustment using improved prompting system
async function testDirectToneAdjustment(text, tone) {
    // Try to use content script system first (which has the new prompts)
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
        logToConsole('🔗 Using content script with improved prompting system...', 'info');
        
        try {
            const response = await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Timeout waiting for content script'));
                }, 15000);
                
                chrome.runtime.sendMessage({
                    action: 'rewriteText',
                    text: text,
                    tone: tone
                }, (response) => {
                    clearTimeout(timeout);
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });
            
            if (response && response.success) {
                logToConsole('✅ Content script tone adjustment successful', 'success');
                return response.adjustedText;
            } else {
                throw new Error(response?.error || 'Content script rewriting failed');
            }
        } catch (error) {
            logToConsole(`⚠️ Content script failed, falling back to direct API: ${error.message}`, 'warn');
        }
    }
    
    // Fallback to direct API with improved prompts
    logToConsole('🔗 Using direct LanguageModel API with improved prompting...', 'info');
    
    const session = await LanguageModel.create({
        temperature: 0.6,
        topK: 3
    });
    
    // Use the same consistent format as the content script
    const prompt = `Rewrite in a ${tone} tone: '${text}'`;
    logToConsole(`Using prompt: "${prompt}"`, 'info');
    
    const response = await session.prompt(prompt);
    await session.destroy();
    
    logToConsole('✅ Direct API tone adjustment successful', 'success');
    
    const resultDiv = document.getElementById('toneResult');
    resultDiv.textContent = `Original: "${text}"\n\nAdjusted (${tone}): "${response}"`;
    resultDiv.className = 'result success';
    
    return response;
}

// Utility functions
function clearResults() {
    const results = document.querySelectorAll('.result');
    results.forEach(result => {
        result.style.display = 'none';
        result.textContent = '';
    });
    logToConsole('🧹 Results cleared', 'info');
}

function clearConsole() {
    const consoleDiv = document.getElementById('consoleLog');
    if (consoleDiv) {
        consoleDiv.innerHTML = '';
        logCounter = 0;
    }
    console.clear();
    logToConsole('🧹 Console cleared', 'info');
}

function toggleAutoScroll() {
    autoScroll = !autoScroll;
    logToConsole(`📜 Auto-scroll ${autoScroll ? 'enabled' : 'disabled'}`, 'info');
}

// Extension messaging helpers
if (typeof chrome !== 'undefined' && chrome.runtime) {
    // Listen for extension messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        logToConsole(`📨 Received message: ${JSON.stringify(message)}`, 'info');
        return true;
    });
}

// Error handling
window.addEventListener('error', (event) => {
    logToConsole(`💥 JavaScript error: ${event.message}`, 'error');
    logToConsole(`   at ${event.filename}:${event.lineno}:${event.colno}`, 'error');
});

window.addEventListener('unhandledrejection', (event) => {
    logToConsole(`💥 Unhandled promise rejection: ${event.reason}`, 'error');
});

// Page visibility change detection
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        logToConsole('👁️ Page hidden', 'info');
    } else {
        logToConsole('👁️ Page visible', 'info');
    }
});