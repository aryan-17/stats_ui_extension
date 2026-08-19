/**
 * Configuration constants for the application
 */
const CONFIG = {
    domains: {
        cleartrip: {
            prod: 'statsui.cleartripcorp.me',
            qa: 'statsui.cleartrip.sa',
            paths: {
                air: '/#/air/'
            }
        },
        flyin: {
            prod: 'www.flyin.com',
            qa: 'me.flyin.com',
            endpoints: {
                audit: '/audit'
            }
        }
    }
};

const ITINERARY_ID_PATTERN = /NIX[a-f0-9]+(?:-[a-f0-9]+){4}/i;

const DOMAIN_ENVIRONMENT = {
    qa: ['me.cleartrip.ae', 'me.cleartrip.sa', 'me.flyin.com'],
    prod: ['www.cleartrip.ae', 'www.cleartrip.sa', 'www.flyin.com']
};

/**
 * Extracts the itinerary ID from a URL by matching the NIX prefix
 * @param {string} urlString - The full URL
 * @returns {string} The extracted itinerary ID
 * @throws {Error} If the itinerary ID is not found
 */
function extractItineraryId(urlString) {
    const match = urlString.match(ITINERARY_ID_PATTERN);
    if (!match) {
        throw new Error('Itinerary ID not found in URL');
    }

    const itineraryId = match[0];
    return itineraryId.includes('_') ? itineraryId.split('_')[0] : itineraryId;
}

/**
 * Determines QA vs PROD from the page hostname
 * @param {string} hostname - The hostname from the URL
 * @returns {boolean} true for QA, false for PROD
 * @throws {Error} If the hostname is not a supported Cleartrip/Flyin domain
 */
function isQaEnvironment(hostname) {
    if (DOMAIN_ENVIRONMENT.qa.includes(hostname)) {
        return true;
    }
    if (DOMAIN_ENVIRONMENT.prod.includes(hostname)) {
        return false;
    }
    throw new Error(`Unsupported domain: ${hostname}`);
}

/**
 * Handles opening the stats page for a given itinerary ID
 * @param {string} itineraryId - The itinerary ID
 * @param {boolean} isQa - Whether to use QA environment
 */
function openStatsPage(itineraryId, isQa) {
    try {
        if (!itineraryId) {
            throw new Error('Itinerary ID is required');
        }
        const baseUrl = isQa ? CONFIG.domains.cleartrip.qa : CONFIG.domains.cleartrip.prod;
        const url = `https://${baseUrl}${CONFIG.domains.cleartrip.paths.air}${itineraryId}`;
        chrome.tabs.create({ url });
    } catch (error) {
        console.error('Error opening stats page:', error);
        alert(`Error: ${error.message || 'Failed to open stats page'}`);
    }
}

/**
 * Handles the URL-based stats page opening
 */
async function handleUrlBasedNavigation() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const url = new URL(tab.url);
        const isQa = isQaEnvironment(url.hostname);

        if (ITINERARY_ID_PATTERN.test(tab.url)) {
            openStatsPage(extractItineraryId(tab.url), isQa);
            return;
        }

        // Legacy Flyin: resolve itinerary ID via pid query param
        if (url.hostname.includes('flyin.com')) {
            const pid = url.searchParams.get('pid');
            if (!pid) {
                throw new Error('Itinerary ID not found in URL');
            }

            const auditDomain = isQa ? CONFIG.domains.flyin.qa : CONFIG.domains.flyin.prod;
            const response = await fetch(`https://${auditDomain}${CONFIG.domains.flyin.endpoints.audit}?pid=${encodeURIComponent(pid)}`);
            if (!response.ok) {
                throw new Error('Failed to fetch audit details');
            }

            const auditData = await response.json();
            if (!auditData?.itineraryId) {
                throw new Error('itineraryId not found in audit response');
            }

            openStatsPage(auditData.itineraryId, isQa);
            return;
        }

        throw new Error('Itinerary ID not found in URL');
        
    } catch (error) {
        console.error('Navigation error:', error);
        alert(`Error: ${error.message || 'Failed to process the URL'}`);
    }
}

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Get DOM elements
    const elements = {
        urlButton: document.querySelector('.btn-secondary'),
        prodButton: document.querySelector('.btn-primary:first-child'),
        qaButton: document.querySelector('.btn-primary:last-child'),
        itineraryInput: document.getElementById('itineraryInput')
    };

    // Validate required elements
    const missingElements = Object.entries(elements)
        .filter(([_, el]) => !el)
        .map(([name]) => name);
        
    if (missingElements.length > 0) {
        console.error('Missing required elements:', missingElements.join(', '));
        return;
    }

    // Set up event listeners
    elements.urlButton.addEventListener('click', handleUrlBasedNavigation);
    
    elements.prodButton.addEventListener('click', () => {
        const itineraryId = elements.itineraryInput.value.trim();
        if (!itineraryId) {
            alert('Please enter an itinerary ID');
            return;
        }
        openStatsPage(itineraryId, false);
    });

    elements.qaButton.addEventListener('click', () => {
        const itineraryId = elements.itineraryInput.value.trim();
        if (!itineraryId) {
            alert('Please enter an itinerary ID');
            return;
        }
        openStatsPage(itineraryId, true);
    });
});
