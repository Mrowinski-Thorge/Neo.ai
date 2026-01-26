/**
 * NeoAI - Main Application Controller
 * Handles screen navigation, state management, model loading, and chat
 */

// ============================================
// State Management
// ============================================

const AppState = {
    currentScreen: 'onboarding',
    onboardingComplete: false,
    modelLoaded: false,
    modelLoading: false,
    messages: [],
    isGenerating: false,
};

// Load persisted state
function loadState() {
    const saved = localStorage.getItem('neoai_state');
    if (saved) {
        const parsed = JSON.parse(saved);
        AppState.onboardingComplete = parsed.onboardingComplete || false;
        AppState.messages = parsed.messages || [];
    }
}

// Save state to localStorage
function saveState() {
    localStorage.setItem('neoai_state', JSON.stringify({
        onboardingComplete: AppState.onboardingComplete,
        messages: AppState.messages,
    }));
}

// ============================================
// Screen Navigation
// ============================================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
        AppState.currentScreen = screenId;
        
        // Re-initialize icons when showing screen
        if (typeof lucide !== 'undefined') {
            setTimeout(() => lucide.createIcons(), 50);
        }
    }
}

// ============================================
// Onboarding Logic
// ============================================

function initOnboarding() {
    const continueBtn = document.getElementById('onboarding-continue');
    
    if (continueBtn) {
        continueBtn.addEventListener('click', () => {
            AppState.onboardingComplete = true;
            saveState();
            showScreen('model-loader');
            startModelLoading();
        });
    }
}

// ============================================
// Model Loading with Transformers.js
// ============================================

let generator = null;
let tokenizer = null;

async function startModelLoading() {
    const progressFill = document.getElementById('progress-fill');
    const progressPercent = document.getElementById('progress-percent');
    const progressStatus = document.getElementById('progress-status');
    const progressDetail = document.getElementById('progress-detail');
    const cancelBtn = document.getElementById('cancel-load');

    AppState.modelLoading = true;
    
    // Update status
    if (progressStatus) progressStatus.textContent = 'Lade Transformers.js...';
    if (progressDetail) progressDetail.textContent = 'Initialisiere...';

    // Cancel button handler
    let cancelled = false;
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            if (confirm('Download abbrechen?')) {
                cancelled = true;
                location.reload();
            }
        });
    }

    try {
        // Dynamic import of Transformers.js
        const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.0-alpha.19');
        
        if (cancelled) return;
        
        // Configure environment
        env.allowLocalModels = false;
        env.useBrowserCache = true;

        const MODEL_ID = 'onnx-community/Qwen2.5-0.5B-Instruct';
        
        if (progressStatus) progressStatus.textContent = 'Lade Modell...';
        
        // Create pipeline with progress callback
        generator = await pipeline('text-generation', MODEL_ID, {
            dtype: 'q4',
            device: 'webgpu',
            progress_callback: (progress) => {
                if (cancelled) return;
                
                if (progress.status === 'progress') {
                    const percent = Math.round(progress.progress || 0);
                    if (progressFill) progressFill.style.width = `${percent}%`;
                    if (progressPercent) progressPercent.textContent = `${percent}%`;
                    if (progressDetail && progress.file) {
                        progressDetail.textContent = progress.file;
                    }
                } else if (progress.status === 'initiate') {
                    if (progressStatus) progressStatus.textContent = 'Initialisiere...';
                    if (progressDetail && progress.file) {
                        progressDetail.textContent = progress.file;
                    }
                } else if (progress.status === 'download') {
                    if (progressStatus) progressStatus.textContent = 'Lade herunter...';
                } else if (progress.status === 'done') {
                    if (progressDetail && progress.file) {
                        progressDetail.textContent = `✓ ${progress.file}`;
                    }
                }
            }
        });

        if (cancelled) return;

        // Finalize
        if (progressFill) progressFill.style.width = '100%';
        if (progressPercent) progressPercent.textContent = '100%';
        if (progressStatus) progressStatus.textContent = 'Fertig!';
        if (progressDetail) progressDetail.textContent = 'Modell bereit';

        AppState.modelLoaded = true;
        AppState.modelLoading = false;
        saveState();

        // Transition to chat
        setTimeout(() => {
            showScreen('home');
            initChat();
        }, 500);

    } catch (error) {
        console.error('Model loading failed:', error);
        
        if (progressStatus) progressStatus.textContent = 'Fehler!';
        if (progressDetail) progressDetail.textContent = error.message || 'Unbekannter Fehler';
        
        // Show retry option
        if (cancelBtn) {
            cancelBtn.textContent = 'Erneut versuchen';
            cancelBtn.onclick = () => location.reload();
        }
    }
}

// ============================================
// Chat Interface Logic
// ============================================

function initChat() {
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const messagesContainer = document.getElementById('chat-messages');
    const welcomeEl = document.getElementById('chat-welcome');

    // Load existing messages
    renderMessages();

    // Auto-resize textarea
    if (chatInput) {
        chatInput.addEventListener('input', () => {
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
            
            // Enable/disable send button
            if (sendBtn) {
                sendBtn.disabled = !chatInput.value.trim() || AppState.isGenerating;
            }
        });

        // Handle Enter key
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (chatInput.value.trim() && !AppState.isGenerating) {
                    handleSendMessage();
                }
            }
        });
    }

    // Form submit
    if (chatForm) {
        chatForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!AppState.isGenerating) {
                handleSendMessage();
            }
        });
    }
}

async function handleSendMessage() {
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const userMessage = chatInput.value.trim();

    if (!userMessage || !generator) return;

    // Clear input
    chatInput.value = '';
    chatInput.style.height = 'auto';
    if (sendBtn) sendBtn.disabled = true;

    // Hide welcome
    const welcomeEl = document.getElementById('chat-welcome');
    if (welcomeEl) welcomeEl.style.display = 'none';

    // Add user message
    addMessage('user', userMessage);
    
    // Show typing indicator
    showTypingIndicator();
    
    // Update status
    updateModelStatus('Generiert...', true);
    AppState.isGenerating = true;

    try {
        // Build conversation for the model
        const messages = buildConversation(userMessage);
        
        // Generate response
        const output = await generator(messages, {
            max_new_tokens: 512,
            temperature: 0.7,
            top_p: 0.9,
            do_sample: true,
        });

        // Extract assistant response
        let response = '';
        if (output && output[0] && output[0].generated_text) {
            const generated = output[0].generated_text;
            // Get last assistant message
            if (Array.isArray(generated)) {
                const lastMsg = generated[generated.length - 1];
                response = lastMsg?.content || '';
            } else {
                response = generated;
            }
        }

        // Remove typing indicator and add response
        hideTypingIndicator();
        if (response) {
            addMessage('assistant', response);
        } else {
            addMessage('assistant', 'Entschuldigung, ich konnte keine Antwort generieren.');
        }

    } catch (error) {
        console.error('Generation failed:', error);
        hideTypingIndicator();
        addMessage('assistant', 'Es ist ein Fehler aufgetreten. Bitte versuche es erneut.');
    }

    AppState.isGenerating = false;
    updateModelStatus('Bereit', false);
}

function buildConversation(userMessage) {
    // Build messages array for the model
    const messages = [
        { role: 'system', content: 'Du bist NeoAI, ein hilfreicher und freundlicher KI-Assistent. Antworte präzise und auf Deutsch.' }
    ];
    
    // Add recent conversation history (last 6 messages for context)
    const recentMessages = AppState.messages.slice(-6);
    for (const msg of recentMessages) {
        messages.push({
            role: msg.role,
            content: msg.content
        });
    }
    
    // Add current user message
    messages.push({ role: 'user', content: userMessage });
    
    return messages;
}

function addMessage(role, content) {
    const timestamp = new Date().toISOString();
    const message = { role, content, timestamp };
    
    AppState.messages.push(message);
    saveState();
    
    renderMessage(message);
    scrollToBottom();
}

function renderMessages() {
    const container = document.getElementById('chat-messages');
    const welcomeEl = document.getElementById('chat-welcome');
    
    if (!container) return;
    
    // Clear existing messages (except welcome)
    const existingMessages = container.querySelectorAll('.message');
    existingMessages.forEach(el => el.remove());
    
    // Hide/show welcome based on messages
    if (welcomeEl) {
        welcomeEl.style.display = AppState.messages.length === 0 ? 'flex' : 'none';
    }
    
    // Render all messages
    AppState.messages.forEach(msg => renderMessage(msg));
    scrollToBottom();
}

function renderMessage(message) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = `message message--${message.role}`;
    
    const time = new Date(message.timestamp).toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    messageEl.innerHTML = `
        <div class="message__bubble">${escapeHtml(message.content)}</div>
        <div class="message__time">${time}</div>
    `;
    
    container.appendChild(messageEl);
}

function showTypingIndicator() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    const indicator = document.createElement('div');
    indicator.id = 'typing-indicator';
    indicator.className = 'message message--assistant';
    indicator.innerHTML = `
        <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;
    container.appendChild(indicator);
    scrollToBottom();
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
}

function updateModelStatus(text, isLoading) {
    const statusEl = document.getElementById('model-status');
    if (statusEl) {
        const dot = statusEl.querySelector('.status-dot');
        statusEl.innerHTML = `<span class="status-dot ${isLoading ? 'status-dot--loading' : ''}"></span>${text}`;
    }
}

function scrollToBottom() {
    const container = document.getElementById('chat-messages');
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
}

// ============================================
// Settings & Data Management
// ============================================

function clearAllChats() {
    AppState.messages = [];
    saveState();
    renderMessages();
    console.log('Alle Chats gelöscht');
}

async function clearModelCache() {
    try {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
        
        // Also clear IndexedDB for transformers.js
        const databases = await indexedDB.databases();
        for (const db of databases) {
            if (db.name) {
                indexedDB.deleteDatabase(db.name);
            }
        }
        
        localStorage.removeItem('neoai_state');
        console.log('Cache gelöscht');
        return true;
    } catch (error) {
        console.error('Cache löschen fehlgeschlagen:', error);
        return false;
    }
}

function resetOnboarding() {
    AppState.onboardingComplete = false;
    AppState.modelLoaded = false;
    AppState.messages = [];
    generator = null;
    saveState();
    showScreen('onboarding');
}

// ============================================
// Application Initialization
// ============================================

function initApp() {
    // Load saved state
    loadState();
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Setup onboarding
    initOnboarding();
    
    // Determine which screen to show
    if (!AppState.onboardingComplete) {
        showScreen('onboarding');
    } else if (!AppState.modelLoaded || !generator) {
        showScreen('model-loader');
        startModelLoading();
    } else {
        showScreen('home');
        initChat();
    }
}

// Start app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);

// Export functions for global access
window.NeoAI = {
    showScreen,
    clearAllChats,
    clearModelCache,
    resetOnboarding,
    getState: () => AppState,
};
