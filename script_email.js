// State Management
let currentStep = 1;
const totalSteps = 4;
const formData = {
    buildingType: '',
    elevatorBrand: '',
    floors: '',
    serviceType: '',
    urgency: '',
    address: '',
    contactName: '',
    contactEmail: '',
    visitDate: '',
    description: ''
};

// ============================================
// THEME & UI FEATURES
// ============================================

// Dark/Light Mode Toggle
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    showToast(`${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} mode enabled`, 'info');
}

// Load saved theme
(function() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
})();

// Multi-Language Support
const translations = {
    en: {
        serviceRequest: 'Service Request',
        subtitle: 'AI-powered dispatch & quotation system. Tell us what you need, and we\'ll handle the logistics.',
        buildingInfo: 'Building Information',
        aiActive: 'AI Agent Active',
        draftSaved: 'Draft saved',
        quoteHistory: 'Quote History',
        rateService: 'Rate Our Service'
    },
    ur: {
        serviceRequest: 'سروس کی درخواست',
        subtitle: 'AI سے چلنے والا ڈسپیچ اور کوٹیشن سسٹم۔ ہمیں بتائیں آپ کو کیا چاہیے۔',
        buildingInfo: 'عمارت کی معلومات',
        aiActive: 'AI ایجنٹ فعال',
        draftSaved: 'ڈرافٹ محفوظ',
        quoteHistory: 'کوٹ کی تاریخ',
        rateService: 'ہماری سروس کی درجہ بندی کریں'
    },
    ar: {
        serviceRequest: 'طلب خدمة',
        subtitle: 'نظام إرسال وعروض أسعار مدعوم بالذكاء الاصطناعي. أخبرنا بما تحتاجه.',
        buildingInfo: 'معلومات المبنى',
        aiActive: 'وكيل AI نشط',
        draftSaved: 'تم حفظ المسودة',
        quoteHistory: 'سجل العروض',
        rateService: 'قيم خدمتنا'
    },
    es: {
        serviceRequest: 'Solicitud de Servicio',
        subtitle: 'Sistema de despacho y cotización impulsado por IA. Dinos qué necesitas.',
        buildingInfo: 'Información del Edificio',
        aiActive: 'Agente IA Activo',
        draftSaved: 'Borrador guardado',
        quoteHistory: 'Historial de Cotizaciones',
        rateService: 'Califica Nuestro Servicio'
    }
};

function changeLanguage(lang) {
    document.documentElement.setAttribute('data-lang', lang);
    localStorage.setItem('preferredLanguage', lang);
    
    const t = translations[lang] || translations['en'];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) el.textContent = t[key];
    });
    
    showToast(`Language changed to ${lang.toUpperCase()}`, 'info');
}

// Color Theme Support
function changeColorTheme(theme) {
    document.documentElement.setAttribute('data-color-theme', theme);
    localStorage.setItem('colorTheme', theme);
    showToast(`Theme changed to ${theme}`, 'info');
}

// Toast Notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'checkmark-circle',
        error: 'close-circle',
        warning: 'warning',
        info: 'information-circle'
    };
    
    toast.innerHTML = `
        <ion-icon name="${icons[type] || icons.info}"></ion-icon>
        <span>${message}</span>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Scroll to Top
function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Scroll listener for scroll-to-top button
window.addEventListener('scroll', () => {
    const btn = document.getElementById('scrollTopBtn');
    const hint = document.querySelector('.shortcut-hint');
    
    if (btn) {
        btn.classList.toggle('show', window.scrollY > 300);
    }
    
    // Show shortcut hint near bottom
    if (hint) {
        const nearBottom = (window.innerHeight + window.scrollY) >= document.body.offsetHeight - 200;
        hint.classList.toggle('show', nearBottom);
    }
});

// Particles Background
function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.cssText = `
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation-delay: ${Math.random() * 20}s;
            animation-duration: ${15 + Math.random() * 10}s;
        `;
        container.appendChild(particle);
    }
}

// Keyboard Shortcuts
function toggleShortcuts() {
    const modal = document.getElementById('shortcutsModal');
    if (modal) modal.classList.toggle('show');
}

function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Don't trigger if typing in input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            if (e.key === 'Escape') {
                e.target.blur();
            }
            return;
        }
        
        if (e.key === '?') {
            e.preventDefault();
            toggleShortcuts();
        }
        
        if (e.altKey) {
            switch(e.key.toLowerCase()) {
                case 'n':
                    e.preventDefault();
                    if (currentStep < 4) nextStep(currentStep + 1);
                    break;
                case 'b':
                    e.preventDefault();
                    if (currentStep > 1) prevStep(currentStep - 1);
                    break;
                case 's':
                    e.preventDefault();
                    if (currentStep === 4) submitForm();
                    break;
                case 'c':
                    e.preventDefault();
                    toggleChat(true);
                    break;
                case 't':
                    e.preventDefault();
                    toggleTheme();
                    break;
            }
        }
    });
}

// Chat Widget Toggle
function toggleChat(forceOpen) {
    const widget = document.getElementById('chat-widget');
    if (!widget) return;
    
    if (forceOpen === true) {
        widget.classList.remove('collapsed');
    } else if (forceOpen === false) {
        widget.classList.add('collapsed');
    } else {
        widget.classList.toggle('collapsed');
    }
}

// Ripple Effect
function initRippleEffect() {
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            const rect = this.getBoundingClientRect();
            ripple.style.left = (e.clientX - rect.left) + 'px';
            ripple.style.top = (e.clientY - rect.top) + 'px';
            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });
}

// Form Navigation
function nextStep(step) {
    if (!validateStep(currentStep)) return;

    // Save current step data before moving
    saveStepData(currentStep);

    // Hide current
    document.getElementById(`step-${currentStep}`).classList.remove('active');

    // Show next
    currentStep = step;
    document.getElementById(`step-${currentStep}`).classList.add('active');

    // Update Progress Bar
    updateProgress();

    // If reaching review step, populate summary
    if (step === 4) {
        populateReview();
    }
}

function prevStep(step) {
    document.getElementById(`step-${currentStep}`).classList.remove('active');
    currentStep = step;
    document.getElementById(`step-${currentStep}`).classList.add('active');
    updateProgress();
}

function updateProgress() {
    for (let i = 1; i <= totalSteps; i++) {
        const el = document.getElementById(`progress-${i}`);
        if (i <= currentStep) {
            el.classList.add('active');
        } else {
            el.classList.remove('active');
        }
    }
    
    // Update progress bar fill
    const fill = document.getElementById('progressFill');
    if (fill) {
        fill.style.width = `${(currentStep / totalSteps) * 100}%`;
    }
}

// Validation & Data Saving
function selectOption(field, value, element) {
    // Visual selection logic
    const container = element.parentElement;
    const options = container.getElementsByClassName('selection-card');
    for (let opt of options) {
        opt.classList.remove('selected');
    }
    element.classList.add('selected');

    // Set hidden input value
    const input = document.getElementById(field);
    if (input) input.value = value;

    // Update state
    formData[field] = value;
    
    // Auto-save draft
    saveDraft();
}

function saveStepData(step) {
    if (step === 1) {
        formData.buildingType = document.getElementById('buildingType').value;
        formData.elevatorBrand = document.getElementById('elevatorBrand').value;
        formData.floors = document.getElementById('floors').value;
    } else if (step === 2) {
        formData.serviceType = document.getElementById('serviceType').value;
        formData.urgency = document.getElementById('urgency').value;
    } else if (step === 3) {
        formData.address = document.getElementById('address').value;
        formData.visitDate = document.getElementById('visitDate').value;
        formData.contactName = document.getElementById('contactName').value;
        formData.contactEmail = document.getElementById('contactEmail').value;
        formData.description = document.getElementById('description').value;
    }
}

function validateStep(step) {
    let isValid = true;
    // Simple validation logic
    if (step === 1) {
        if (!document.getElementById('buildingType').value) isValid = false;
        if (!document.getElementById('elevatorBrand').value) isValid = false;
        if (!document.getElementById('floors').value) isValid = false;
    }
    if (step === 3) {
        if (!document.getElementById('address').value) isValid = false;
        if (!document.getElementById('contactName').value) isValid = false;
        if (!document.getElementById('contactEmail').value) isValid = false;
    }

    if (!isValid) {
        showToast('Please fill in all required fields', 'warning');
    }
    return isValid;
}

function populateReview() {
    const summary = document.getElementById('review-summary');
    summary.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div>
                <label>Building</label>
                <div style="font-weight: 500;">${formData.buildingType} • ${formData.floors} Floors</div>
            </div>
            <div>
                <label>Equipment</label>
                <div style="font-weight: 500;">${formData.elevatorBrand}</div>
            </div>
            <div>
                <label>Service</label>
                <div style="font-weight: 500;">${formData.serviceType}</div>
            </div>
             <div>
                <label>Urgency</label>
                <div style="font-weight: 500; color: ${formData.urgency === 'Emergency' ? 'var(--danger)' : 'var(--text-main)'}">${formData.urgency}</div>
            </div>
            <div style="grid-column: span 2;">
                <label>Location & Date</label>
                <div style="font-weight: 500;">${formData.address}</div>
                <div style="font-size: 0.9rem; color: var(--accent);">${formData.visitDate ? new Date(formData.visitDate).toLocaleDateString() : 'ASAP'}</div>
            </div>
            <div style="grid-column: span 2;">
                <label>Contact</label>
                <div style="font-weight: 500;">${formData.contactName} (${formData.contactEmail})</div>
            </div>
        </div>
    `;
}

// 3D Elevator Loader
function showElevatorLoader() {
    const loader = document.getElementById('elevatorLoader');
    if (loader) {
        loader.classList.add('show');
        let floor = 1;
        const floorNum = document.getElementById('floorNum');
        const interval = setInterval(() => {
            floor = floor >= 3 ? 1 : floor + 1;
            if (floorNum) floorNum.textContent = floor;
        }, 700);
        
        return () => {
            clearInterval(interval);
            loader.classList.remove('show');
        };
    }
    return () => {};
}

// Confetti
function launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const confetti = [];
    const colors = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
    
    for (let i = 0; i < 150; i++) {
        confetti.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            r: Math.random() * 6 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            speed: Math.random() * 3 + 2,
            angle: Math.random() * Math.PI * 2,
            spin: Math.random() * 0.2 - 0.1
        });
    }
    
    let animationFrame;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        confetti.forEach((c, i) => {
            c.y += c.speed;
            c.x += Math.sin(c.angle) * 2;
            c.angle += c.spin;
            
            ctx.beginPath();
            ctx.fillStyle = c.color;
            ctx.fillRect(c.x, c.y, c.r, c.r * 1.5);
            
            if (c.y > canvas.height) {
                confetti[i] = { ...c, x: Math.random() * canvas.width, y: -20 };
            }
        });
        
        animationFrame = requestAnimationFrame(draw);
    }
    
    draw();
    setTimeout(() => {
        cancelAnimationFrame(animationFrame);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 5000);
}

// Submission
async function submitForm() {
    const btn = document.getElementById('submit-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="loading-spinner"></span> Sending Request...';
    btn.disabled = true;

    // Show elevator loader
    const hideLoader = showElevatorLoader();

    // Trim whitespace to prevent hidden character errors
    const webhookUrl = document.getElementById('webhookUrl').value.trim();

    // Generate unique Quote ID
    const quoteId = `Q-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const payload = {
        source: 'web_smart_form_email',
        timestamp: new Date().toISOString(),
        quoteId: quoteId,
        customer_data: formData
    };

    console.log("Submitting Quote Request to n8n:", payload);

    try {
        // Send to n8n for quote generation and email sending
        if (webhookUrl && webhookUrl.includes('http')) {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                console.log("SUCCESS: Quote request received by n8n.");
            } else {
                console.error(`ERROR: n8n returned ${response.status} (${response.statusText})`);
                hideLoader();
                if (response.status === 404) {
                    showToast('n8n Error 404: Webhook not found. Execute workflow first.', 'error');
                } else {
                    showToast(`n8n Error ${response.status}: ${response.statusText}`, 'error');
                }
                btn.innerHTML = originalText;
                btn.disabled = false;
                return;
            }
        } else {
            console.warn("No valid webhook URL provided. Simulating response...");
            await new Promise(r => setTimeout(r, 2500));
        }

        // Hide loader
        hideLoader();

        // Show Success - Email Confirmation
        document.getElementById(`step-4`).classList.remove('active');
        document.getElementById(`step-success`).classList.add('active');

        // Launch confetti
        launchConfetti();
        showToast('Request submitted successfully!', 'success');

        // Show status tracker
        const tracker = document.getElementById('statusTracker');
        if (tracker) tracker.style.display = 'flex';

        // Save to history
        saveToHistory({ quoteId, formData: {...formData} });

        // Show simple confirmation message
        const container = document.getElementById('quote-result');
        container.innerHTML = `
            <div class="glass-panel" style="text-align: center; padding: 2rem; margin-bottom: 1.5rem;">
                <div style="width: 80px; height: 80px; background: rgba(59, 130, 246, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                     <ion-icon name="mail" style="font-size: 3rem; color: var(--primary);"></ion-icon>
                </div>
                <h3 style="margin-bottom: 0.5rem;">Quote Request Submitted!</h3>
                <p style="color: var(--text-muted); margin-bottom: 0.5rem;">
                    Reference: <strong style="color: var(--primary);">${quoteId}</strong>
                </p>
                <p style="color: var(--text-muted); margin-bottom: 1.5rem;">
                    Our AI is generating your personalized quote.
                </p>
                
                <div style="background: rgba(59, 130, 246, 0.1); padding: 1.5rem; border-radius: var(--radius-sm); margin-bottom: 1.5rem; border-left: 4px solid var(--primary);">
                    <p style="color: var(--accent); font-weight: 500; margin-bottom: 0.5rem;">
                        📧 Quote will be sent to: <strong>${formData.contactEmail}</strong>
                    </p>
                    <p style="font-size: 0.9rem; color: var(--text-muted);">
                        Please check your email in a few moments
                    </p>
                </div>

                <div style="background: rgba(0,0,0,0.2); padding: 1.5rem; border-radius: var(--radius-sm); text-align: left;">
                    <p style="font-size: 0.9rem; margin-bottom: 0.75rem; font-weight: 600;">📩 How to Respond:</p>
                    <ul style="font-size: 0.85rem; color: var(--text-muted); margin: 0; padding-left: 1.5rem; line-height: 1.8;">
                        <li>Simply <strong>reply to the quote email</strong> with your response</li>
                        <li>Type <strong>"ACCEPT"</strong> to confirm and schedule the service</li>
                        <li>Type <strong>"NEGOTIATE"</strong> to discuss pricing</li>
                        <li>Ask any <strong>questions</strong> for clarification</li>
                    </ul>
                </div>
            </div>
        `;

        // Show rating modal after delay
        setTimeout(() => openRatingModal(), 5000);

    } catch (error) {
        console.error(error);
        hideLoader();
        showToast('Error submitting request. Please try again.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Auto-Save Drafts
let draftSaveTimeout;
function saveDraft() {
    clearTimeout(draftSaveTimeout);
    draftSaveTimeout = setTimeout(() => {
        const draft = { ...formData, timestamp: Date.now() };
        localStorage.setItem('formDraft_email', JSON.stringify(draft));
        
        const indicator = document.getElementById('draftIndicator');
        if (indicator) {
            indicator.style.display = 'inline-flex';
            setTimeout(() => indicator.style.display = 'none', 3000);
        }
    }, 2000);
}

function loadDraft() {
    const draft = localStorage.getItem('formDraft_email');
    if (draft) {
        const data = JSON.parse(draft);
        Object.keys(data).forEach(key => {
            if (formData.hasOwnProperty(key)) {
                formData[key] = data[key];
                const input = document.getElementById(key);
                if (input) input.value = data[key];
            }
        });
        showToast('Draft restored from previous session', 'info');
    }
}

function initAutosave() {
    document.querySelectorAll('input, select, textarea').forEach(el => {
        el.addEventListener('input', saveDraft);
    });
}

// Quote History
function saveToHistory(quoteData) {
    let history = JSON.parse(localStorage.getItem('quoteHistory_email') || '[]');
    history.unshift({
        ...quoteData,
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        service: formData.serviceType || 'Service'
    });
    history = history.slice(0, 20);
    localStorage.setItem('quoteHistory_email', JSON.stringify(history));
    renderHistory();
}

function renderHistory() {
    const list = document.getElementById('historyList');
    if (!list) return;
    
    const history = JSON.parse(localStorage.getItem('quoteHistory_email') || '[]');
    
    if (history.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No requests yet</p>';
        return;
    }
    
    list.innerHTML = history.map(item => `
        <div class="history-item">
            <div class="date">${item.date}</div>
            <div class="service">${item.service}</div>
            <div class="amount" style="color: var(--primary);">${item.quoteId}</div>
        </div>
    `).join('');
}

function toggleHistoryPanel() {
    const panel = document.getElementById('historyPanel');
    if (panel) {
        panel.classList.toggle('show');
        renderHistory();
    }
}

function clearHistory() {
    if (confirm('Clear all request history?')) {
        localStorage.removeItem('quoteHistory_email');
        renderHistory();
        showToast('History cleared', 'info');
    }
}

// Voice Input
let recognition;
let isRecording = false;

function initVoiceRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onresult = (e) => {
            let transcript = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                transcript += e.results[i][0].transcript;
            }
            const desc = document.getElementById('description');
            if (desc) desc.value = transcript;
        };
        
        recognition.onerror = () => stopVoiceInput();
        recognition.onend = () => stopVoiceInput();
    }
}

function toggleVoiceInput() {
    if (!recognition) {
        showToast('Voice input not supported in this browser', 'warning');
        return;
    }
    
    if (isRecording) {
        stopVoiceInput();
    } else {
        startVoiceInput();
    }
}

function startVoiceInput() {
    recognition.start();
    isRecording = true;
    
    const btn = document.getElementById('voiceBtn');
    const status = document.getElementById('voiceStatus');
    
    if (btn) btn.classList.add('recording');
    if (status) status.style.display = 'flex';
    
    showToast('Listening... Speak now', 'info');
}

function stopVoiceInput() {
    if (recognition) recognition.stop();
    isRecording = false;
    
    const btn = document.getElementById('voiceBtn');
    const status = document.getElementById('voiceStatus');
    
    if (btn) btn.classList.remove('recording');
    if (status) status.style.display = 'none';
}

// Rating System
let currentRating = 0;

function setRating(rating) {
    currentRating = rating;
    const stars = document.querySelectorAll('#starRating ion-icon');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.setAttribute('name', 'star');
            star.classList.add('active');
        } else {
            star.setAttribute('name', 'star-outline');
            star.classList.remove('active');
        }
    });
}

function openRatingModal() {
    const modal = document.getElementById('ratingModal');
    if (modal) modal.classList.add('show');
}

function closeRatingModal() {
    const modal = document.getElementById('ratingModal');
    if (modal) modal.classList.remove('show');
}

function submitRating() {
    const feedback = document.getElementById('ratingFeedback')?.value || '';
    
    let ratings = JSON.parse(localStorage.getItem('ratings') || '[]');
    ratings.push({ rating: currentRating, feedback, date: new Date().toISOString() });
    localStorage.setItem('ratings', JSON.stringify(ratings));
    
    closeRatingModal();
    showToast(`Thank you for your ${currentRating}-star rating!`, 'success');
}

// Chat Widget Logic
function handleChatKey(e) {
    if (e.key === 'Enter') sendChatMessage();
}

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    input.value = '';

    const typingDelay = Math.random() * 1000 + 500;
    setTimeout(() => {
        const responses = [
            "I can help with that. Please submit the service request form to receive a detailed quote via email.",
            "For elevator service requests, please fill out the form and we'll email you a quote within minutes.",
            "Our AI will generate a personalized quote. Please complete the form to get started.",
            "To receive pricing, please submit the service request and check your email for the quote."
        ];
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        addMessage(randomResponse, 'bot');
    }, typingDelay);
}

function addMessage(text, sender) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    div.innerText = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

async function testConnection(event) {
    event.preventDefault();
    const url = document.getElementById('webhookUrl').value.trim();
    if (!url) {
        showToast('Please enter a Webhook URL first', 'warning');
        return;
    }

    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<ion-icon name="sync" class="loading"></ion-icon> Testing...';
    btn.disabled = true;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: true, timestamp: new Date().toISOString() })
        });

        if (res.status === 404) {
            showToast('Connection Failed (404). Execute workflow in n8n first.', 'error');
        } else if (res.status === 200 || res.status === 201) {
            showToast('SUCCESS! Webhook is working!', 'success');
        } else {
            showToast(`Unexpected Status: ${res.status}`, 'warning');
        }
    } catch (e) {
        showToast('Connection Error. Check network or n8n server.', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// Initialize all features
function initAdvancedFeatures() {
    const savedLang = localStorage.getItem('preferredLanguage');
    if (savedLang) {
        const langSelect = document.getElementById('langSelect');
        if (langSelect) langSelect.value = savedLang;
        changeLanguage(savedLang);
    }
    
    const savedColorTheme = localStorage.getItem('colorTheme');
    if (savedColorTheme) {
        const themeSelect = document.getElementById('themeSelect');
        if (themeSelect) themeSelect.value = savedColorTheme;
        changeColorTheme(savedColorTheme);
    }
    
    loadDraft();
    initAutosave();
    initVoiceRecognition();
    initParticles();
    initRippleEffect();
    initKeyboardShortcuts();
    renderHistory();
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initAdvancedFeatures);
