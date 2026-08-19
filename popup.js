/**
 * Popup UI for Cleartrip Stats Extension
 */

function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message status-${type}`;
    statusEl.hidden = !message;
}

function setEnvBadge(isQa) {
    const prodBadge = document.getElementById('prodBadge');
    const qaBadge = document.getElementById('qaBadge');

    prodBadge.classList.toggle('active', isQa === false);
    qaBadge.classList.toggle('active', isQa === true);
}

function setUrlButtonState(canOpenFromUrl, hostname, updateStatus = true) {
    const urlButton = document.getElementById('statsButton');
    urlButton.disabled = !canOpenFromUrl;

    if (updateStatus && !canOpenFromUrl) {
        showStatus(`Stats from URL unavailable on ${hostname || 'this page'}. Use Open Prod/QA for manual IDs.`, 'info');
    }
}

async function openStatsWithStatus(itineraryId, isQa, successMessage) {
    try {
        await StatsExtension.openStats(itineraryId, isQa);
        showStatus(successMessage, 'success');
        await renderHistory();
    } catch (error) {
        console.error('Error opening stats page:', error);
        showStatus(error.message || 'Failed to open stats page', 'error');
    }
}

async function handleUrlBasedNavigation() {
    const urlButton = document.getElementById('statsButton');
    urlButton.disabled = true;
    showStatus('Opening stats from current tab...', 'info');

    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const { itineraryId, isQa } = await StatsExtension.resolveItineraryIdFromTab(tab);
        await StatsExtension.openStats(itineraryId, isQa);
        showStatus(`Opened ${isQa ? 'QA' : 'PROD'} stats for ${itineraryId}`, 'success');
        await renderHistory();
    } catch (error) {
        console.error('Navigation error:', error);
        showStatus(error.message || 'Failed to process the URL', 'error');
    } finally {
        await refreshTabState({ updateStatus: false });
    }
}

async function refreshTabState({ updateStatus = true } = {}) {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.url) {
            setUrlButtonState(false, null, updateStatus);
            setEnvBadge(null);
            return;
        }

        const url = new URL(tab.url);
        const detection = StatsExtension.detectFromTab(tab.url, url.hostname);
        const itineraryInput = document.getElementById('itineraryInput');

        if (detection.itineraryId && !itineraryInput.value.trim()) {
            itineraryInput.value = detection.itineraryId;
        }

        setEnvBadge(detection.isQa);
        setUrlButtonState(detection.canOpenFromUrl, url.hostname, updateStatus);

        if (updateStatus && detection.canOpenFromUrl) {
            showStatus(
                `Detected ${detection.itineraryId} on ${detection.environmentLabel} (${url.hostname})`,
                'success'
            );
        }
    } catch (error) {
        console.error('Initialization error:', error);
        setUrlButtonState(false, null, updateStatus);
        setEnvBadge(null);
        if (updateStatus) {
            showStatus('Unable to read the current tab', 'error');
        }
    }
}

async function initializeFromActiveTab() {
    await refreshTabState({ updateStatus: true });
}

async function copyItineraryId() {
    const itineraryId = document.getElementById('itineraryInput').value.trim();
    if (!itineraryId) {
        showStatus('Nothing to copy — enter an itinerary ID first', 'error');
        return;
    }

    try {
        await navigator.clipboard.writeText(itineraryId);
        showStatus('Itinerary ID copied', 'success');
    } catch (error) {
        console.error('Copy failed:', error);
        showStatus('Failed to copy itinerary ID', 'error');
    }
}

function truncateId(itineraryId) {
    if (itineraryId.length <= 18) {
        return itineraryId;
    }
    return `${itineraryId.slice(0, 10)}...${itineraryId.slice(-6)}`;
}

async function renderHistory() {
    const historyList = document.getElementById('historyList');
    const history = await StatsExtension.getHistory();

    historyList.innerHTML = '';

    if (history.length === 0) {
        historyList.innerHTML = '<li class="history-empty">No recent opens yet</li>';
        return;
    }

    history.forEach((entry) => {
        const item = document.createElement('li');
        item.className = 'history-item';

        const label = document.createElement('span');
        label.className = 'history-label';
        label.textContent = `${truncateId(entry.itineraryId)} · ${entry.isQa ? 'QA' : 'PROD'}`;

        const openButton = document.createElement('button');
        openButton.type = 'button';
        openButton.className = 'history-open-btn';
        openButton.textContent = 'Open';
        openButton.addEventListener('click', () => {
            document.getElementById('itineraryInput').value = entry.itineraryId;
            openStatsWithStatus(
                entry.itineraryId,
                entry.isQa,
                `Reopened ${entry.isQa ? 'QA' : 'PROD'} stats for ${entry.itineraryId}`
            );
        });

        item.append(label, openButton);
        historyList.appendChild(item);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const elements = {
        urlButton: document.getElementById('statsButton'),
        prodButton: document.getElementById('statsCorpButton'),
        qaButton: document.getElementById('statsSaButton'),
        copyButton: document.getElementById('copyIdButton'),
        itineraryInput: document.getElementById('itineraryInput')
    };

    const missingElements = Object.entries(elements)
        .filter(([, el]) => !el)
        .map(([name]) => name);

    if (missingElements.length > 0) {
        console.error('Missing required elements:', missingElements.join(', '));
        showStatus('Popup failed to initialize', 'error');
        return;
    }

    elements.urlButton.addEventListener('click', handleUrlBasedNavigation);
    elements.copyButton.addEventListener('click', copyItineraryId);

    elements.prodButton.addEventListener('click', () => {
        const itineraryId = elements.itineraryInput.value.trim();
        if (!itineraryId) {
            showStatus('Please enter an itinerary ID', 'error');
            return;
        }
        openStatsWithStatus(itineraryId, false, `Opened PROD stats for ${itineraryId}`);
    });

    elements.qaButton.addEventListener('click', () => {
        const itineraryId = elements.itineraryInput.value.trim();
        if (!itineraryId) {
            showStatus('Please enter an itinerary ID', 'error');
            return;
        }
        openStatsWithStatus(itineraryId, true, `Opened QA stats for ${itineraryId}`);
    });

    initializeFromActiveTab();
    renderHistory();
});
