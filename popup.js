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

/**
 * Extracts the itinerary ID from a Cleartrip URL
 * @param {string} pathname - The pathname from the URL
 * @returns {string} The extracted itinerary ID
 * @throws {Error} If the URL format is invalid
 */
function extractItineraryId(pathname) {
    const pathParts = pathname.split('/');
    if (pathParts.length < 4) {
        throw new Error('Invalid URL format: Path too short');
    }
    
    let itineraryId = pathParts[3];
    return itineraryId.includes('_') ? itineraryId.split('_')[0] : itineraryId;
}

/**
 * Gets the appropriate stats URL based on the domain and environment
 * @param {string} hostname - The hostname from the URL
 * @param {string} itineraryId - The itinerary ID
 * @returns {string} The stats URL
 * @throws {Error} If the domain is not supported
 */
function getStatsUrl(hostname, itineraryId) {
    const isQa = hostname.startsWith('me.');
    const baseUrl = isQa ? CONFIG.domains.cleartrip.qa : CONFIG.domains.cleartrip.prod;
    return `http://${baseUrl}${CONFIG.domains.cleartrip.paths.air}${itineraryId}`;
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
        const url = `http://${baseUrl}${CONFIG.domains.cleartrip.paths.air}${itineraryId}`;
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
        
        // Handle Flyin domains
        if (url.hostname.includes('flyin.com')) {
            const pid = url.searchParams.get('pid');
            if (!pid) {
                throw new Error('PID not found in URL');
            }

            const isQa = url.hostname.startsWith('me.flyin.com');
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
        
        // Handle Cleartrip domains
        const itineraryId = extractItineraryId(url.pathname);
        const statsUrl = getStatsUrl(url.hostname, itineraryId);
        chrome.tabs.create({ url: statsUrl });
        
    } catch (error) {
        console.error('Navigation error:', error);
        ale=rt(`Error: ${error.message || 'Failed to process the URL'}`);
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
