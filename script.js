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
let currentQuoteData = null; // Store quote for negotiation context

// Parse Quote Text to Beautiful HTML
function parseQuoteToHtml(quoteText) {
    // If the incoming text is wrapped in a quote-text-fallback div, strip the wrapper and decode simple HTML breaks
    if (typeof quoteText === 'string' && quoteText.includes('quote-text-fallback')) {
        const match = quoteText.match(/quote-text-fallback">([\s\S]*)<\/div>/i);
        if (match && match[1]) {
            quoteText = match[1]
                .replace(/<br\s*\/?\s*>/gi, '\n')
                .replace(/&nbsp;/gi, ' ')
                .replace(/&amp;/gi, '&')
                .replace(/&lt;/gi, '<')
                .replace(/&gt;/gi, '>')
                .trim();
        }
    }

    // Helper: extract with multiple regex options
    const extractValue = (text, patterns) => {
        if (!Array.isArray(patterns)) patterns = [patterns];
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) return match[1].trim();
        }
        return null;
    };

    // Extract quote details (support markdown headings and bold)
    const quoteId = extractValue(quoteText, [
        /###\s*Quote ID:\s*(\S+)/i,
        /\*\*Quote ID:\*\*\s*([^\n]+)/i,
        /Quote ID:\s*([^\n]+)/i
    ]) || 'Q-' + Date.now().toString().slice(-6);

    const quoteDate = extractValue(quoteText, [
        /\*\*Date:\*\*\s*([^\n]+)/i,
        /Date:\s*([^\n]+)/i
    ]) || new Date().toLocaleDateString();

    // Customer Info
    const customerName = extractValue(quoteText, [
        /\*\*Name:\*\*\s*([^\n]+)/i,
        /Name:\s*([^\n]+)/i
    ]) || formData.contactName || 'N/A';

    const customerEmail = extractValue(quoteText, [
        /\*\*Email:\*\*\s*([^\n]+)/i,
        /Email:\s*([^\n]+)/i
    ]) || formData.contactEmail || 'N/A';

    const customerAddress = extractValue(quoteText, [
        /\*\*Address:\*\*\s*([^\n]+)/i,
        /Address:\s*([^\n]+)/i
    ]) || formData.address || 'N/A';

    // Service Details
    const buildingType = extractValue(quoteText, [
        /\*\*Building Type:\*\*\s*([^\n]+)/i,
        /Building Type:\s*([^\n]+)/i
    ]) || formData.buildingType || 'N/A';

    const elevatorBrand = extractValue(quoteText, [
        /\*\*Elevator Brand:\*\*\s*([^\n]+)/i,
        /Elevator Brand:\s*([^\n]+)/i,
        /for\s+(Otis|Schindler|Kone|ThyssenKrupp|Mitsubishi)\s+Elevator/i
    ]) || formData.elevatorBrand || 'N/A';

    const floors = extractValue(quoteText, [
        /\*\*Floors:\*\*\s*([^\n]+)/i,
        /Floors:\s*([^\n]+)/i
    ]) || formData.floors || 'N/A';

    const serviceType = extractValue(quoteText, [
        /\*\*Service Type:\*\*\s*([^\n]+)/i,
        /Service Type:\s*([^\n]+)/i,
        /Itemized Quote for\s+([^\n]+)/i
    ]) || formData.serviceType || 'Service';

    const urgency = extractValue(quoteText, [
        /\*\*Urgency:\*\*\s*([^\n]+)/i,
        /Urgency:\s*([^\n]+)/i
    ]) || (quoteText.toLowerCase().includes('emergency') ? 'Emergency' : formData.urgency) || 'Normal';

    // Detect currency
    const currencyMatch = quoteText.match(/\(([A-Z]{3})\)/i) || quoteText.match(/\b(PKR|EUR|GBP|USD)\b/i) || quoteText.match(/\$/i);
    const currency = currencyMatch ? (currencyMatch[1] || currencyMatch[0]).toUpperCase().replace('$', 'USD') : 'USD';
    const currencySymbol = currency === 'PKR' ? 'PKR ' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';

    // Parse table rows for service breakdown (robust to bold headers)
    let serviceRows = '';
    let calculatedTotal = 0; // Sum subtotals from table
    const lines = quoteText.split('\n');
    let inTable = false;
    let headerParsed = false;
    let columnOrder = ['description', 'qty', 'unit', 'subtotal']; // default order

    for (const line of lines) {
        const trimmedLine = line.trim();

        // Detect table start and parse header order
        if (trimmedLine.startsWith('|') && trimmedLine.toLowerCase().includes('description')) {
            inTable = true;
            // Parse column headers to determine order
            const headers = trimmedLine.split('|').map(c => c.trim().toLowerCase()).filter(c => c);
            columnOrder = headers.map(h => {
                if (h.includes('desc') || h.includes('item') || h.includes('service')) return 'description';
                if (h.includes('qty') || h.includes('quantity')) return 'qty';
                if (h.includes('unit') || h.includes('price') || h.includes('rate')) return 'unit';
                if (h.includes('sub') || h.includes('total') || h.includes('amount')) return 'subtotal';
                return 'unknown';
            });
            continue;
        }

        // Skip separator line (dashes)
        if (trimmedLine.match(/^\|[\s\-:|]+\|$/)) {
            headerParsed = true;
            continue;
        }

        // Parse table rows
        if (inTable && headerParsed && trimmedLine.startsWith('|')) {
            const cols = trimmedLine.split('|').map(c => c.trim()).filter(c => c);

            if (cols.length >= 3) {
                // Map columns based on detected order
                let desc = '', qty = '1', unitPrice = '-', subtotal = '-';
                cols.forEach((col, idx) => {
                    const colType = columnOrder[idx] || 'unknown';
                    const cleanCol = col.replace(/\*\*/g, '').trim();
                    if (colType === 'description') desc = cleanCol;
                    else if (colType === 'qty') qty = cleanCol;
                    else if (colType === 'unit') unitPrice = cleanCol;
                    else if (colType === 'subtotal') subtotal = cleanCol;
                });

                // Fallback if subtotal not found
                if (subtotal === '-' && unitPrice !== '-') subtotal = unitPrice;

                const firstCol = cols[0].toLowerCase();
                const isTotalRow = firstCol.includes('total');
                const isSubtotalRow = firstCol.includes('subtotal');

                if (!isTotalRow && !isSubtotalRow && desc && desc.length > 2) {
                    // Add to calculated total (parse numeric value from subtotal)
                    const numericSubtotal = parseFloat(subtotal.replace(/[^\d.]/g, '')) || 0;
                    calculatedTotal += numericSubtotal;
                    
                    serviceRows += `
                        <tr>
                            <td class="service-desc">${desc}</td>
                            <td>${qty}</td>
                            <td>${unitPrice}</td>
                            <td><strong>${subtotal}</strong></td>
                        </tr>
                    `;
                }
            }
        }

        // End table detection when leaving table block
        if (inTable && headerParsed && !trimmedLine.startsWith('|') && trimmedLine.length > 0) {
            inTable = false;
        }
    }

    // Use calculated total from table subtotals, or fallback to 0
    const totalAmount = calculatedTotal > 0 ? calculatedTotal.toLocaleString() : '0';

    // If no table found, create a generic row
    if (!serviceRows) {
        serviceRows = `
            <tr>
                <td class="service-desc">${serviceType} - ${elevatorBrand} Elevator</td>
                <td>1</td>
                <td>${currencySymbol}${totalAmount}</td>
                <td><strong>${currencySymbol}${totalAmount}</strong></td>
            </tr>
        `;
    }

    // Extract terms (bullets or numbered)
    let termsHtml = '';
    const termsSection = quoteText.match(/Terms and Conditions[\s\S]*?((?:[-•]\s*[^\n]+\n?)+)/i)
        || quoteText.match(/Terms and Conditions[\s\S]*?(\d+\.\s*[^\n]+(?:\n\d+\.\s*[^\n]+)*)/i);
    if (termsSection) {
        const terms = termsSection[1].match(/(?:[-•]|\d+\.)\s*[^\n]+/g) || [];
        termsHtml = terms.map(t => `<li>${t.replace(/^(?:[-•]|\d+\.)\s*/, '')}</li>`).join('');
    }

    if (!termsHtml) {
        termsHtml = `
            <li>This quote is valid for 30 days from the date issued.</li>
            <li>Payment is due upon completion of service.</li>
            <li>All repairs and parts are guaranteed for 90 days post-service.</li>
        `;
    }

    // Determine urgency class
    const urgencyClass = urgency.toLowerCase().includes('emergency') ? 'danger' :
                         urgency.toLowerCase().includes('high') ? 'highlight' : '';

    return `
        <div class="quote-styled-container">
            <div class="quote-styled-header">
                <h3>
                    <ion-icon name="document-text"></ion-icon>
                    Service Quote
                </h3>
                <span class="quote-id">#${quoteId}</span>
            </div>

            <div class="quote-styled-body">
                <!-- Customer Section -->
                <div class="quote-section">
                    <div class="quote-section-title">
                        <ion-icon name="person-circle-outline"></ion-icon>
                        Customer Information
                    </div>
                    <div class="quote-info-grid">
                        <div class="quote-info-item">
                            <label>Name</label>
                            <div class="value">${customerName}</div>
                        </div>
                        <div class="quote-info-item">
                            <label>Email</label>
                            <div class="value highlight">${customerEmail}</div>
                        </div>
                        <div class="quote-info-item" style="grid-column: span 2;">
                            <label>Service Address</label>
                            <div class="value">${customerAddress}</div>
                        </div>
                    </div>
                </div>

                <!-- Service Details Section -->
                <div class="quote-section">
                    <div class="quote-section-title">
                        <ion-icon name="construct-outline"></ion-icon>
                        Service Details
                    </div>
                    <div class="quote-info-grid">
                        <div class="quote-info-item">
                            <label>Building Type</label>
                            <div class="value">${buildingType}</div>
                        </div>
                        <div class="quote-info-item">
                            <label>Elevator Brand</label>
                            <div class="value">${elevatorBrand}</div>
                        </div>
                        <div class="quote-info-item">
                            <label>Floors</label>
                            <div class="value">${floors}</div>
                        </div>
                        <div class="quote-info-item">
                            <label>Urgency</label>
                            <div class="value ${urgencyClass}">${urgency}</div>
                        </div>
                        <div class="quote-info-item" style="grid-column: span 2;">
                            <label>Service Type</label>
                            <div class="value">${serviceType.replace(/Emergency\s*/i, '')}</div>
                        </div>
                    </div>
                </div>

                <!-- Service Breakdown Section -->
                <div class="quote-section full-width">
                    <div class="quote-section-title">
                        <ion-icon name="list-outline"></ion-icon>
                        Itemized Service Breakdown
                    </div>
                    <table class="quote-service-table">
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th>Qty</th>
                                <th>Unit Price</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${serviceRows}
                        </tbody>
                    </table>

                    <div class="quote-total-section">
                        <div class="total-label">Total Amount</div>
                        <div class="total-amount">${currencySymbol}${totalAmount}</div>
                    </div>
                </div>

                <!-- Terms Section -->
                <div class="quote-section full-width">
                    <div class="quote-terms">
                        <div class="quote-terms-title">
                            <ion-icon name="shield-checkmark-outline"></ion-icon>
                            Terms & Conditions
                        </div>
                        <ol>
                            ${termsHtml}
                        </ol>
                    </div>
                </div>

                <div class="quote-contact-note full-width">
                    <ion-icon name="help-circle-outline" style="font-size: 1.25rem; vertical-align: middle; margin-right: 0.5rem;"></ion-icon>
                    Have questions? Use the chat to negotiate or get more details.
                </div>
            </div>
        </div>
    `;
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
    updateProgressBar(currentStep);
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
    // Add more validation as needed

    if (!isValid) {
        alert("Please fill in all required fields.");
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

// Submission
async function submitForm() {
    const btn = document.getElementById('submit-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="loading-spinner"></span> AI Generating Quote...';
    btn.disabled = true;

    // Show 3D elevator loader
    const hideLoader = showElevatorLoader();

    // Show skeleton loading in quote result area
    const quoteContainer = document.getElementById('quote-result');
    showSkeleton(quoteContainer);

    const webhookUrl = document.getElementById('webhookUrl').value;

    const payload = {
        source: 'web_smart_form',
        timestamp: new Date().toISOString(),
        data: formData
    };

    console.log("Submitting Payload to n8n:", payload);

    try {
        let quoteText = "Simulation: Quote would appear here if connected.";

        // Attempt to send to n8n if URL is valid
        if (webhookUrl && webhookUrl.includes('http')) {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                quoteText = await response.text();
                console.log("Raw Response from n8n:", quoteText); // Debug Log
            } else {
                console.error("n8n Error:", response.status, response.statusText);
                quoteText = `Error: Server returned ${response.status} ${response.statusText}`;
            }
        } else {
            // Simulate delay
            await new Promise(r => setTimeout(r, 2500));
        }

        // Hide loader
        hideLoader();

        // Show Success & Quote
        document.getElementById(`step-4`).classList.remove('active');
        document.getElementById(`step-success`).classList.add('active');

        // Launch confetti celebration
        launchConfetti();
        showToast('Quote generated successfully!', 'success');

        // Send push notification
        sendNotification('Quote Ready!', 'Your service quote has been generated.');

        // Render the result (Text or JSON)
        renderQuote(quoteText);

        // Save to history
        saveToHistory({ quoteText, formData: {...formData} });

        // Show status tracker
        const tracker = document.getElementById('statusTracker');
        if (tracker) {
            tracker.style.display = 'flex';
            updateStatusTracker(1);
        }

        // Start demo countdown (2 hours from now)
        const targetTime = new Date().getTime() + (2 * 60 * 60 * 1000);
        startCountdown(targetTime);

        // Show rating modal after 5 seconds
        setTimeout(() => openRatingModal(), 5000);

    } catch (error) {
        console.error(error);
        hideLoader();
        alert("Error communicating with AI service. Check console.");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function renderQuote(data) {
    const container = document.getElementById('quote-result');
    container.innerHTML = ''; // Clear previous

    let quoteJson = null;

    // 1. Try to parse JSON
    try {
        if (typeof data === 'object') {
            quoteJson = data;
        } else if (typeof data === 'string') {
            // Check if it looks like JSON
            if (data.trim().startsWith('{')) {
                quoteJson = JSON.parse(data);
            }
        }
    } catch (e) {
        console.warn("Could not parse quote as JSON, falling back to text.", e);
    }

    // SAVE for Negotiation Context
    currentQuoteData = quoteJson ? quoteJson : { output: data };
    console.log("Saved Quote Data for Negotiation:", currentQuoteData);

    // 2. Render JSON Card
    if (quoteJson && quoteJson.quote) {
        const currency = quoteText => `$${Number(quoteText).toLocaleString()}`;

        // Safe accessors
        const breakdowns = quoteJson.breakdown || {};
        const range = quoteJson.negotiation_range ? `(${currency(quoteJson.negotiation_range[0])} - ${currency(quoteJson.negotiation_range[1])})` : '';

        const html = `
            <div class="ai-badge">
                <ion-icon name="sparkles-outline"></ion-icon>
                AI Estimation Complete
            </div>
            
            <div class="quote-card">
                <div class="quote-header">
                    <div class="quote-title">
                        <ion-icon name="document-text-outline"></ion-icon>
                        Service Estimate
                    </div>
                    <div class="quote-date">${new Date().toLocaleDateString()}</div>
                </div>

                <div class="quote-body">
                    <div class="quote-row">
                        <span>Base Labour</span>
                        <span>${breakdowns.labour ? currency(breakdowns.labour) : '-'}</span>
                    </div>
                    <div class="quote-row">
                        <span>Parts & Materials</span>
                        <span>${breakdowns.parts ? currency(breakdowns.parts) : '-'}</span>
                    </div>
                     <div class="quote-row">
                        <span>Travel & Logistics</span>
                        <span>${breakdowns.travel ? currency(breakdowns.travel) : '-'}</span>
                    </div>
                    
                    <div class="quote-row total">
                        <span>Estimated Total</span>
                        <span class="total-amount">${currency(quoteJson.quote)}</span>
                    </div>
                     <div style="text-align: right; font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem;">
                        ${range ? `Negotiation Range: ${range}` : ''}
                    </div>
                </div>

                <div class="quote-actions">
                    <button class="btn btn-primary" id="btn-accept-json">
                        Accept Quote
                    </button>
                    <button class="btn btn-ghost" onclick="initiateNegotiation()">
                        Negotiate
                    </button>
                </div>
            </div>
        `;
        container.innerHTML = html;

        // Attach event listener with closure to access data
        document.getElementById('btn-accept-json').onclick = (e) => acceptQuote(e, quoteJson);

    }
    // 3. Render Text Fallback (with enhanced parsing)
    else {
        const parsedQuoteHtml = parseQuoteToHtml(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
        container.innerHTML = `
            <div class="ai-badge">
                <ion-icon name="sparkles-outline"></ion-icon>
                AI Response Received
            </div>
            <div class="quote-card">
                ${parsedQuoteHtml}
                 <div class="quote-actions">
                    <button class="btn btn-success" id="btn-accept-text">
                        <ion-icon name="checkmark-circle-outline"></ion-icon> Accept Quote
                    </button>
                    <button class="btn btn-ghost" onclick="initiateNegotiation()">
                        <ion-icon name="chatbubbles-outline"></ion-icon> Negotiate
                    </button>
                </div>
            </div>
        `;

        // Attach event listener
        document.getElementById('btn-accept-text').onclick = (e) => acceptQuote(e, { text_content: data });
    }
}

async function acceptQuote(event, quoteDetails) {
    const btn = event.target.closest('button'); // Ensure we get the button even if icon is clicked
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Creating Job...';
    btn.disabled = true;

    // Use the specific Job Webhook URL
    const jobWebhookUrl = document.getElementById('jobWebhookUrl').value;

    const jobPayload = {
        source: 'web_quote_acceptance',
        timestamp: new Date().toISOString(),
        customer_data: formData,
        accepted_quote: quoteDetails
    };

    console.log("Sending Job Creation Payload to:", jobWebhookUrl);

    try {
        if (jobWebhookUrl && jobWebhookUrl.includes('http')) {
            const res = await fetch(jobWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(jobPayload)
            });
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
        } else {
            await new Promise(r => setTimeout(r, 1500));
        }

        // Show Final Success State
        const container = document.getElementById('quote-result');
        container.innerHTML = `
            <div class="glass-panel" style="text-align: center; padding: 3rem; animation: fadeIn 0.5s ease;">
                <div style="width: 80px; height: 80px; background: rgba(16, 185, 129, 0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                     <ion-icon name="briefcase" style="font-size: 3rem; color: var(--success);"></ion-icon>
                </div>
                <h2 style="margin-bottom: 0.5rem;">Job Created Successfully!</h2>
                <p style="color: var(--text-muted); margin-bottom: 2rem;">
                    Technician blocked for <strong>${formData.address}</strong>. <br>
                    Confirmation sent to <strong>${formData.contactEmail}</strong>.
                </p>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <a href="#" class="btn btn-ghost" onclick="location.reload()">Start New Request</a>
                </div>
            </div>
        `;

    } catch (e) {
        console.warn("Webhook failed or simulation mode:", e);
        // Fallback: Show the UI anyway so the user can see the template
        // alert(`Note: Webhook connection failed (${e.message}), but showing the Job Template below for preview.`);
    }

    // Generate a Mock Job ID
    const jobId = 'JOB-' + Math.floor(1000 + Math.random() * 9000);
    const techName = "Alex Rivera"; // Mock tech assignment

    // Show Job Template / Work Order UI
    const container = document.getElementById('quote-result');
    container.innerHTML = `
        <div class="glass-panel" style="text-align: left; padding: 0; overflow: hidden; animation: fadeIn 0.5s ease;">
            
            <!-- Ticket Header -->
            <div style="background: rgba(16, 185, 129, 0.1); padding: 1.5rem; border-bottom: 1px solid var(--border-glass); display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <div style="background: var(--success); color: #000; padding: 0.5rem; border-radius: 50%;">
                        <ion-icon name="briefcase" style="font-size: 1.5rem;"></ion-icon>
                    </div>
                    <div>
                        <h2 style="font-size: 1.25rem; margin: 0;">Job Created</h2>
                        <div style="font-size: 0.85rem; color: var(--success); font-weight: 600;">#${jobId} • DISPATCHED</div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.8rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 1px;">Estimated Arrival</div>
                    <div style="font-size: 1.1rem; font-weight: 600;">2 Hours</div>
                </div>
            </div>

            <!-- Ticket Body -->
            <div style="padding: 2rem;">
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                    <div>
                        <label style="display: block; font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">Technician Assigned</label>
                        <div style="display: flex; align-items: center; gap: 0.8rem;">
                            <div style="width: 40px; height: 40px; background: var(--bg-surface); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border-glass);">
                                <ion-icon name="person" style="color: var(--text-muted);"></ion-icon>
                            </div>
                            <div>
                                <div style="font-weight: 600;">${techName}</div>
                                <div style="font-size: 0.8rem; color: var(--primary);">Senior Mechanic</div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label style="display: block; font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">Service Location</label>
                        <div style="font-weight: 500;">${formData.address}</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">
                            ${formData.buildingType} • ${formData.elevatorBrand} (x${formData.floors})
                        </div>
                    </div>
                </div>

                <div style="background: var(--bg-surface); padding: 1rem; border-radius: var(--radius-sm); border: 1px solid var(--border-glass); margin-bottom: 2rem;">
                    <label style="display: block; font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem;">Scope of Work</label>
                    <p style="font-size: 0.95rem; line-height: 1.6;">
                        <strong>${formData.serviceType} (${formData.urgency})</strong><br>
                        ${formData.description || 'No additional details provided.'}
                    </p>
                </div>

                <!-- Debug / Developer Tools -->
                <div style="border-top: 1px dashed var(--border-glass); padding-top: 1.5rem;">
                    <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 1rem;">
                        <ion-icon name="code-slash-outline" style="vertical-align: middle;"></ion-icon> 
                        Developer Payload (Sent to n8n)
                    </p>
                    <div style="position: relative;">
                        <pre style="background: rgba(0,0,0,0.3); padding: 1rem; border-radius: var(--radius-sm); font-size: 0.8rem; color: var(--accent-glow); overflow-x: auto;">${JSON.stringify(jobPayload, null, 2)}</pre>
                        <button class="btn btn-ghost" 
                            style="position: absolute; top: 0.5rem; right: 0.5rem; font-size: 0.7rem; padding: 0.25rem 0.5rem;"
                            onclick="navigator.clipboard.writeText(JSON.stringify(${JSON.stringify(jobPayload).replace(/"/g, '&quot;')}, null, 2)); this.innerText='Copied!'; setTimeout(()=>this.innerText='Copy JSON', 2000);">
                            Copy JSON
                        </button>
                    </div>
                </div>

            </div>

             <div style="background: rgba(0,0,0,0.2); padding: 1.5rem; text-align: center; border-top: 1px solid var(--border-glass);">
                <button class="btn btn-primary" onclick="location.reload()">Start New Request</button>
            </div>
        </div>
    `;
}

// Chat Widget Logic
let isNegotiating = false;
let chatExpanded = false;

function toggleChat(forceExpand) {
    const widget = document.getElementById('chat-widget');
    if (!widget) return;

    const shouldExpand = forceExpand === true ? true : !widget.classList.contains('expanded');
    chatExpanded = shouldExpand;
    widget.classList.toggle('collapsed', !shouldExpand);
    widget.classList.toggle('expanded', shouldExpand);

    if (shouldExpand) {
        const input = document.getElementById('chat-input');
        if (input) input.focus();
    }
}

function initiateNegotiation() {
    toggleChat(true);
    isNegotiating = true;
    document.getElementById('chat-input').focus();
    addMessage("I'm looking to discuss the pricing for this quote.", 'user');

    // Simulate initial system response or just wait for user input
    setTimeout(() => {
        addMessage("Understood. I can help with that. What price point were you looking for?", 'bot');
    }, 600);
}

function handleChatKey(e) {
    if (e.key === 'Enter') sendChatMessage();
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    // Add User Message
    addMessage(text, 'user');
    input.value = '';

    // Mode 1: Negotiation (Real Webhook)
    if (isNegotiating) {
        const negUrl = document.getElementById('negotiationWebhookUrl').value;
        const chatContainer = document.getElementById('chat-messages');

        // Add loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'message bot';
        loadingDiv.innerHTML = '<ion-icon name="ellipsis-horizontal" style="animation: pulse 1s infinite;"></ion-icon>';
        chatContainer.appendChild(loadingDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        try {
            const res = await fetch(negUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    quote_data: currentQuoteData,
                    timestamp: new Date().toISOString()
                })
            });

            chatContainer.removeChild(loadingDiv); // Remove loader

            if (res.ok) {
                const reply = await res.text(); // Expecting text response from n8n
                // Auto-detect if JSON wrapped
                let displayText = reply;
                try {
                    const json = JSON.parse(reply);
                    if (json.output) displayText = json.output;
                    if (json.text) displayText = json.text;
                } catch (e) { }

                addMessage(displayText, 'bot');
            } else {
                addMessage("I'm having trouble connecting to the negotiation service.", 'bot');
            }

        } catch (e) {
            if (loadingDiv.parentNode) chatContainer.removeChild(loadingDiv);
            addMessage("Connection error. Please try again.", 'bot');
            console.error(e);
        }

        return;
    }

    // Mode 2: Standard/Mock (Simulation)
    const typingDelay = Math.random() * 1000 + 500;
    setTimeout(() => {
        const responses = [
            "I can certainly help with that. Could you provide your location?",
            "I've noted that. Is this an emergency?",
            "Let me check our technician availability.",
            "I'm connecting to our scheduling system, one moment."
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

// ============================================
// NEW ENHANCEMENTS
// ============================================

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initRippleEffect();
    initScrollToTop();
    initKeyboardShortcuts();
    loadThemePreference();
});

// Animated Background Particles
function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 15 + 's';
        particle.style.animationDuration = (15 + Math.random() * 10) + 's';
        particle.style.width = (4 + Math.random() * 4) + 'px';
        particle.style.height = particle.style.width;
        container.appendChild(particle);
    }
}

// Button Ripple Effect
function initRippleEffect() {
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn');
        if (!btn) return;
        
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    });
}

// Theme Toggle
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    showToast(newTheme === 'light' ? 'Light mode enabled' : 'Dark mode enabled', 'info');
}

function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

// Toast Notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const icons = {
        success: 'checkmark-circle',
        error: 'close-circle',
        warning: 'warning',
        info: 'information-circle'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<ion-icon name="${icons[type]}"></ion-icon> ${message}`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Scroll to Top
function initScrollToTop() {
    const btn = document.getElementById('scrollTopBtn');
    const shortcutHint = document.querySelector('.shortcut-hint');
    
    window.addEventListener('scroll', () => {
        // Show scroll-to-top button when scrolled down
        if (window.scrollY > 300) {
            if (btn) btn.classList.add('show');
        } else {
            if (btn) btn.classList.remove('show');
        }
        
        // Show shortcut hint when near bottom of page
        const scrollHeight = document.documentElement.scrollHeight;
        const scrollTop = window.scrollY;
        const clientHeight = window.innerHeight;
        const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
        
        if (isNearBottom) {
            if (shortcutHint) shortcutHint.classList.add('show');
        } else {
            if (shortcutHint) shortcutHint.classList.remove('show');
        }
    });
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Keyboard Shortcuts
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

function toggleShortcuts() {
    const modal = document.getElementById('shortcutsModal');
    if (modal) modal.classList.toggle('show');
}

// Progress Bar Update
function updateProgressBar(step) {
    const fill = document.getElementById('progressFill');
    if (fill) {
        fill.style.width = (step * 25) + '%';
    }
}

// Confetti Effect
function launchConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const confetti = [];
    const colors = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];
    
    for (let i = 0; i < 150; i++) {
        confetti.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            r: Math.random() * 6 + 4,
            d: Math.random() * 150,
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.random() * 10 - 5,
            tiltAngle: 0,
            tiltAngleInc: Math.random() * 0.1 + 0.05
        });
    }
    
    let animationFrame;
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        confetti.forEach((c, i) => {
            ctx.beginPath();
            ctx.fillStyle = c.color;
            ctx.fillRect(c.x, c.y, c.r, c.r * 1.5);
            
            c.y += Math.cos(c.d) + 3;
            c.x += Math.sin(c.d);
            c.tiltAngle += c.tiltAngleInc;
            c.tilt = Math.sin(c.tiltAngle) * 12;
            
            if (c.y > canvas.height) {
                confetti[i] = {
                    ...c,
                    x: Math.random() * canvas.width,
                    y: -20
                };
            }
        });
        
        animationFrame = requestAnimationFrame(draw);
    }
    
    draw();
    
    // Stop after 5 seconds
    setTimeout(() => {
        cancelAnimationFrame(animationFrame);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }, 5000);
}

// Quote Actions
function printQuote() {
    showToast('Opening print dialog...', 'info');
    window.print();
}

function downloadPDF() {
    showToast('Preparing PDF download...', 'info');
    // Create a printable version
    const quoteContent = document.getElementById('quote-result').innerHTML;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Service Quote</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 2rem; }
                .quote-styled-container { max-width: 800px; margin: 0 auto; }
                .quote-styled-header { background: #7c3aed; color: white; padding: 1rem; }
                table { width: 100%; border-collapse: collapse; }
                th, td { padding: 0.5rem; border: 1px solid #ddd; text-align: left; }
                th { background: #7c3aed; color: white; }
            </style>
        </head>
        <body>${quoteContent}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
    showToast('PDF generated!', 'success');
}

function copyQuote() {
    const quoteEl = document.getElementById('quote-result');
    if (!quoteEl) return;
    
    const text = quoteEl.innerText;
    navigator.clipboard.writeText(text).then(() => {
        showToast('Quote copied to clipboard!', 'success');
    }).catch(() => {
        showToast('Failed to copy', 'error');
    });
}

// Share Menu
function toggleShareMenu() {
    const menu = document.getElementById('shareMenu');
    if (menu) menu.classList.toggle('show');
}

function shareVia(platform) {
    const quoteEl = document.getElementById('quote-result');
    const text = quoteEl ? encodeURIComponent(quoteEl.innerText.substring(0, 500) + '...') : '';
    const url = encodeURIComponent(window.location.href);
    
    let shareUrl = '';
    switch(platform) {
        case 'email':
            shareUrl = `mailto:?subject=Service Quote&body=${text}`;
            break;
        case 'whatsapp':
            shareUrl = `https://wa.me/?text=${text}`;
            break;
        case 'linkedin':
            shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
            break;
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
            break;
    }
    
    if (shareUrl) {
        window.open(shareUrl, '_blank');
        showToast(`Sharing via ${platform}...`, 'info');
    }
    
    toggleShareMenu();
}

// Close share menu on outside click
document.addEventListener('click', (e) => {
    const menu = document.getElementById('shareMenu');
    const shareBtn = e.target.closest('[onclick*="toggleShareMenu"]');
    if (menu && !menu.contains(e.target) && !shareBtn) {
        menu.classList.remove('show');
    }
});

// Skeleton Loading
function showSkeleton(container) {
    container.innerHTML = `
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text" style="width: 90%"></div>
        <div class="skeleton skeleton-text" style="width: 75%"></div>
        <div class="skeleton skeleton-card"></div>
        <div class="skeleton skeleton-text" style="width: 60%"></div>
    `;
}

// ============================================
// ADVANCED FEATURES
// ============================================

// Multi-Language Support
const translations = {
    en: {
        serviceRequest: 'Service Request',
        subtitle: 'AI-powered dispatch & quotation system. Tell us what you need, and we\'ll handle the logistics.',
        buildingInfo: 'Building Information',
        aiActive: 'AI Agent Active',
        draftSaved: 'Draft saved',
        quoteHistory: 'Quote History',
        signQuote: 'Sign to Accept Quote',
        rateService: 'Rate Our Service',
        techArriving: 'Technician Arriving'
    },
    ur: {
        serviceRequest: 'سروس کی درخواست',
        subtitle: 'AI سے چلنے والا ڈسپیچ اور کوٹیشن سسٹم۔ ہمیں بتائیں آپ کو کیا چاہیے۔',
        buildingInfo: 'عمارت کی معلومات',
        aiActive: 'AI ایجنٹ فعال',
        draftSaved: 'ڈرافٹ محفوظ',
        quoteHistory: 'کوٹ کی تاریخ',
        signQuote: 'قبول کرنے کے لیے دستخط کریں',
        rateService: 'ہماری سروس کی درجہ بندی کریں',
        techArriving: 'ٹیکنیشن آ رہا ہے'
    },
    ar: {
        serviceRequest: 'طلب خدمة',
        subtitle: 'نظام إرسال وعروض أسعار مدعوم بالذكاء الاصطناعي. أخبرنا بما تحتاجه.',
        buildingInfo: 'معلومات المبنى',
        aiActive: 'وكيل AI نشط',
        draftSaved: 'تم حفظ المسودة',
        quoteHistory: 'سجل العروض',
        signQuote: 'وقّع لقبول العرض',
        rateService: 'قيم خدمتنا',
        techArriving: 'الفني في الطريق'
    },
    es: {
        serviceRequest: 'Solicitud de Servicio',
        subtitle: 'Sistema de despacho y cotización impulsado por IA. Dinos qué necesitas.',
        buildingInfo: 'Información del Edificio',
        aiActive: 'Agente IA Activo',
        draftSaved: 'Borrador guardado',
        quoteHistory: 'Historial de Cotizaciones',
        signQuote: 'Firmar para Aceptar',
        rateService: 'Califica Nuestro Servicio',
        techArriving: 'Técnico en Camino'
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

// Auto-Save Drafts
let draftSaveTimeout;
function saveDraft() {
    const draft = {
        ...formData,
        timestamp: Date.now()
    };
    localStorage.setItem('formDraft', JSON.stringify(draft));
    
    const indicator = document.getElementById('draftIndicator');
    if (indicator) {
        indicator.style.display = 'inline-flex';
        setTimeout(() => indicator.style.display = 'none', 3000);
    }
}

function loadDraft() {
    const draft = localStorage.getItem('formDraft');
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
        el.addEventListener('input', () => {
            clearTimeout(draftSaveTimeout);
            draftSaveTimeout = setTimeout(saveDraft, 2000);
        });
    });
}

// Quote History
function saveToHistory(quoteData) {
    let history = JSON.parse(localStorage.getItem('quoteHistory') || '[]');
    history.unshift({
        ...quoteData,
        id: Date.now(),
        date: new Date().toLocaleDateString(),
        service: formData.serviceType || 'Service',
        amount: extractTotalFromQuote()
    });
    history = history.slice(0, 20); // Keep last 20
    localStorage.setItem('quoteHistory', JSON.stringify(history));
    renderHistory();
}

function extractTotalFromQuote() {
    const quoteEl = document.getElementById('quote-result');
    if (!quoteEl) return 'N/A';
    const text = quoteEl.innerText;
    const match = text.match(/Total[:\s]*[\$£€]?([\d,]+\.?\d*)/i);
    return match ? '$' + match[1] : 'N/A';
}

function renderHistory() {
    const list = document.getElementById('historyList');
    if (!list) return;
    
    const history = JSON.parse(localStorage.getItem('quoteHistory') || '[]');
    
    if (history.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No quotes yet</p>';
        return;
    }
    
    list.innerHTML = history.map(item => `
        <div class="history-item" onclick="viewHistoryItem(${item.id})">
            <div class="date">${item.date}</div>
            <div class="service">${item.service}</div>
            <div class="amount">${item.amount}</div>
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
    if (confirm('Clear all quote history?')) {
        localStorage.removeItem('quoteHistory');
        renderHistory();
        showToast('History cleared', 'info');
    }
}

function viewHistoryItem(id) {
    const history = JSON.parse(localStorage.getItem('quoteHistory') || '[]');
    const item = history.find(h => h.id === id);
    if (item) {
        showToast('Viewing quote from ' + item.date, 'info');
        toggleHistoryPanel();
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
        
        recognition.onerror = (e) => {
            console.error('Speech recognition error:', e);
            stopVoiceInput();
            showToast('Voice recognition error', 'error');
        };
        
        recognition.onend = () => {
            stopVoiceInput();
        };
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

// QR Code Generator
function showQRCode() {
    const modal = document.getElementById('qrModal');
    const qrContainer = document.getElementById('qrcode');
    
    if (modal && qrContainer) {
        qrContainer.innerHTML = '';
        
        // Create quote URL or summary
        const quoteData = {
            id: 'Q-' + Date.now().toString().slice(-6),
            service: formData.serviceType,
            date: new Date().toISOString()
        };
        const qrData = window.location.href + '?quote=' + encodeURIComponent(JSON.stringify(quoteData));
        
        // Generate QR code
        if (typeof QRCode !== 'undefined') {
            new QRCode(qrContainer, {
                text: qrData,
                width: 200,
                height: 200,
                colorDark: '#000000',
                colorLight: '#ffffff'
            });
        } else {
            qrContainer.innerHTML = '<p>QR Code library not loaded</p>';
        }
        
        modal.classList.add('show');
    }
}

function closeQRModal() {
    const modal = document.getElementById('qrModal');
    if (modal) modal.classList.remove('show');
}

// Signature Pad
let signatureCanvas, signatureCtx;
let isDrawing = false;

function initSignaturePad() {
    signatureCanvas = document.getElementById('signatureCanvas');
    if (!signatureCanvas) return;
    
    signatureCtx = signatureCanvas.getContext('2d');
    signatureCtx.strokeStyle = '#000';
    signatureCtx.lineWidth = 2;
    signatureCtx.lineCap = 'round';
    
    signatureCanvas.addEventListener('mousedown', startDrawing);
    signatureCanvas.addEventListener('mousemove', draw);
    signatureCanvas.addEventListener('mouseup', stopDrawing);
    signatureCanvas.addEventListener('mouseout', stopDrawing);
    
    // Touch support
    signatureCanvas.addEventListener('touchstart', e => {
        e.preventDefault();
        startDrawing(e.touches[0]);
    });
    signatureCanvas.addEventListener('touchmove', e => {
        e.preventDefault();
        draw(e.touches[0]);
    });
    signatureCanvas.addEventListener('touchend', stopDrawing);
}

function startDrawing(e) {
    isDrawing = true;
    const rect = signatureCanvas.getBoundingClientRect();
    signatureCtx.beginPath();
    signatureCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e) {
    if (!isDrawing) return;
    const rect = signatureCanvas.getBoundingClientRect();
    signatureCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    signatureCtx.stroke();
}

function stopDrawing() {
    isDrawing = false;
}

function openSignatureModal() {
    const modal = document.getElementById('signatureModal');
    if (modal) {
        modal.classList.add('show');
        initSignaturePad();
    }
}

function closeSignatureModal() {
    const modal = document.getElementById('signatureModal');
    if (modal) modal.classList.remove('show');
}

function clearSignature() {
    if (signatureCtx && signatureCanvas) {
        signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    }
}

function saveSignature() {
    if (!signatureCanvas) return;
    
    const dataUrl = signatureCanvas.toDataURL('image/png');
    const signatureDisplay = document.getElementById('signatureDisplay');
    const savedSignature = document.getElementById('savedSignature');
    const signBtn = document.querySelector('.signature-section .btn-success');
    
    if (signatureDisplay && savedSignature) {
        savedSignature.src = dataUrl;
        signatureDisplay.style.display = 'flex';
        if (signBtn) signBtn.style.display = 'none';
    }
    
    localStorage.setItem('lastSignature', dataUrl);
    closeSignatureModal();
    showToast('Quote accepted and signed!', 'success');
    
    // Show status tracker
    const tracker = document.getElementById('statusTracker');
    if (tracker) tracker.style.display = 'flex';
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
    
    const ratingData = {
        rating: currentRating,
        feedback: feedback,
        date: new Date().toISOString()
    };
    
    // Store locally (in real app, send to server)
    let ratings = JSON.parse(localStorage.getItem('ratings') || '[]');
    ratings.push(ratingData);
    localStorage.setItem('ratings', JSON.stringify(ratings));
    
    closeRatingModal();
    showToast(`Thank you for your ${currentRating}-star rating!`, 'success');
}

// Countdown Timer
let countdownInterval;

function startCountdown(targetTime) {
    const widget = document.getElementById('countdownWidget');
    if (widget) widget.style.display = 'block';
    
    clearInterval(countdownInterval);
    
    countdownInterval = setInterval(() => {
        const now = new Date().getTime();
        const distance = targetTime - now;
        
        if (distance < 0) {
            clearInterval(countdownInterval);
            document.getElementById('countdownHours').textContent = '00';
            document.getElementById('countdownMinutes').textContent = '00';
            document.getElementById('countdownSeconds').textContent = '00';
            showToast('Technician should be arriving now!', 'success');
            return;
        }
        
        const hours = Math.floor(distance / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        document.getElementById('countdownHours').textContent = hours.toString().padStart(2, '0');
        document.getElementById('countdownMinutes').textContent = minutes.toString().padStart(2, '0');
        document.getElementById('countdownSeconds').textContent = seconds.toString().padStart(2, '0');
    }, 1000);
}

// Calendar Integration
function addToCalendar() {
    const event = {
        title: 'Elevator Service Appointment',
        description: `Service Type: ${formData.serviceType}\nBuilding: ${formData.buildingType}\nAddress: ${formData.address}`,
        location: formData.address,
        startDate: formData.visitDate || new Date().toISOString().split('T')[0],
        duration: 2 // hours
    };
    
    // Create ICS file content
    const startDate = new Date(event.startDate + 'T09:00:00');
    const endDate = new Date(startDate.getTime() + event.duration * 60 * 60 * 1000);
    
    const formatDate = (date) => {
        return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${event.title}
DESCRIPTION:${event.description.replace(/\n/g, '\\n')}
LOCATION:${event.location}
END:VEVENT
END:VCALENDAR`;
    
    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'elevator-service.ics';
    a.click();
    URL.revokeObjectURL(url);
    
    showToast('Calendar event downloaded!', 'success');
}

// Export to Excel
function exportToExcel() {
    const quoteEl = document.getElementById('quote-result');
    if (!quoteEl) return;
    
    // Create CSV content
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Service Quote Export\n\n';
    csvContent += `Date,${new Date().toLocaleDateString()}\n`;
    csvContent += `Customer,${formData.contactName}\n`;
    csvContent += `Email,${formData.contactEmail}\n`;
    csvContent += `Address,${formData.address}\n\n`;
    csvContent += 'Service Details\n';
    csvContent += `Building Type,${formData.buildingType}\n`;
    csvContent += `Service Type,${formData.serviceType}\n`;
    csvContent += `Urgency,${formData.urgency}\n`;
    csvContent += `Total,${extractTotalFromQuote()}\n`;
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'quote-export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Excel/CSV exported!', 'success');
}

// 3D Elevator Loader
function showElevatorLoader() {
    const loader = document.getElementById('elevatorLoader');
    if (loader) {
        loader.classList.add('show');
        // Animate floor numbers
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

// Smart Autocomplete (remember previous entries)
function initAutocomplete() {
    const fieldsToRemember = ['contactName', 'contactEmail', 'address'];
    
    fieldsToRemember.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        // Load previous value
        const saved = localStorage.getItem('autocomplete_' + fieldId);
        if (saved && !field.value) {
            // Create suggestion
            field.setAttribute('placeholder', `Last: ${saved}`);
        }
        
        // Save on change
        field.addEventListener('blur', () => {
            if (field.value) {
                localStorage.setItem('autocomplete_' + fieldId, field.value);
            }
        });
    });
}

// Status Tracker
function updateStatusTracker(step) {
    for (let i = 1; i <= 4; i++) {
        const trackerStep = document.getElementById('tracker-' + i);
        if (trackerStep) {
            trackerStep.classList.remove('completed', 'active');
            if (i < step) trackerStep.classList.add('completed');
            if (i === step) trackerStep.classList.add('active');
        }
    }
    
    // Update lines
    const lines = document.querySelectorAll('.tracker-line');
    lines.forEach((line, index) => {
        line.classList.toggle('completed', index < step - 1);
    });
}

// Request Push Notification Permission
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                showToast('Notifications enabled!', 'success');
            }
        });
    }
}

function sendNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🛗</text></svg>'
        });
    }
}

// Initialize all advanced features
function initAdvancedFeatures() {
    // Load saved preferences
    const savedLang = localStorage.getItem('preferredLanguage');
    if (savedLang) {
        document.getElementById('langSelect').value = savedLang;
        changeLanguage(savedLang);
    }
    
    const savedColorTheme = localStorage.getItem('colorTheme');
    if (savedColorTheme) {
        document.getElementById('themeSelect').value = savedColorTheme;
        changeColorTheme(savedColorTheme);
    }
    
    // Init features
    loadDraft();
    initAutosave();
    initVoiceRecognition();
    initAutocomplete();
    renderHistory();
    requestNotificationPermission();
}

// Call on DOM ready
document.addEventListener('DOMContentLoaded', initAdvancedFeatures);
