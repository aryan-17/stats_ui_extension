document.addEventListener('DOMContentLoaded', function() {
    // Get all buttons using their class names
    const urlButton = document.querySelector('.btn-secondary');
    const prodButton = document.querySelector('.btn-primary:first-child');
    const qaButton = document.querySelector('.btn-primary:last-child');
    const itineraryInput = document.getElementById('itineraryInput');
    const statsButton = document.getElementById('statsButton');

    if (!urlButton || !prodButton || !qaButton || !itineraryInput || !statsButton) {
        console.error('One or more required elements not found');
        return;
    }

    // Handle URL-based button click
    urlButton.addEventListener('click', async () => {
        try {
            // Get the current active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Get the current URL
            const url = new URL(tab.url);
            
            // Extract the itinerary ID from the URL
            const pathParts = url.pathname.split('/');
            if (pathParts.length >= 4) {
                let itineraryId = pathParts[3];
                if (itineraryId.includes('_')) {
                    itineraryId = itineraryId.split('_')[0];
                }
                
                // Determine which stats URL to use based on domain
                let statsUrl;
                if (url.hostname.startsWith('www.cleartrip')) {
                    statsUrl = `http://statsui.cleartripcorp.me/#/air/${itineraryId}`;
                } else if (url.hostname.startsWith('me.cleartrip')) {
                    statsUrl = `http://statsui.cleartrip.sa/#/air/${itineraryId}`;
                } else {
                    throw new Error('Not on a Cleartrip domain');
                }
                
                // Open the stats page in a new tab
                chrome.tabs.create({ url: statsUrl });
            } else {
                throw new Error('Invalid URL format');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error processing the URL. Please make sure you are on a valid itinerary page.');
        }
    });

    // Handle manual input buttons
    prodButton.addEventListener('click', () => {
        try {
            const itineraryId = itineraryInput.value.trim();
            if (!itineraryId) {
                alert('Please enter an itinerary ID');
                return;
            }
            const statsUrl = `http://statsui.cleartripcorp.me/#/air/${itineraryId}`;
            chrome.tabs.create({ url: statsUrl });
        } catch (error) {
            console.error('Error:', error);
            alert('Error opening stats page');
        }
    });

    qaButton.addEventListener('click', () => {
        try {
            const itineraryId = itineraryInput.value.trim();
            if (!itineraryId) {
                alert('Please enter an itinerary ID');
                return;
            }
            const statsUrl = `http://statsui.cleartrip.sa/#/air/${itineraryId}`;
            chrome.tabs.create({ url: statsUrl });
        } catch (error) {
            console.error('Error:', error);
            alert('Error opening stats page');
        }
    });
});
