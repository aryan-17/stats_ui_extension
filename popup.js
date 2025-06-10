document.addEventListener('DOMContentLoaded', function() {
    const statsButton = document.getElementById('statsButton');
    
    statsButton.addEventListener('click', async () => {
        try {
            // Get the current active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Get the current URL
            const url = new URL(tab.url);
            
            // Get itinerary ID from input if provided, otherwise extract from URL
            let itineraryId = itineraryInput.value.trim();
            
            if (!itineraryId) {
                // Extract from URL if no input provided
                const pathParts = url.pathname.split('/');
                if (pathParts.length >= 4) {
                    itineraryId = pathParts[3];
                    if (itineraryId.includes('_')) {
                        itineraryId = itineraryId.split('_')[0];
                    }
                } else {
                    throw new Error('No itinerary ID provided and URL format is invalid');
                }
            }
            
            // Validate the itinerary ID
            if (!itineraryId) {
                throw new Error('Please enter an itinerary ID or be on a valid itinerary page');
            }

            // Always use cleartripcorp.me for manual inputs
            let statsUrl;
            if (itineraryInput.value.trim()) {
                // If input is provided, use cleartripcorp.me
                statsUrl = `http://statsui.cleartripcorp.me/#/air/${itineraryId}`;
            } else {
                // If no input, use domain-based URL
                if (url.hostname.startsWith('www.cleartrip')) {
                    statsUrl = `http://statsui.cleartripcorp.me/#/air/${itineraryId}`;
                } else if (url.hostname.startsWith('me.cleartrip')) {
                    statsUrl = `http://statsui.cleartrip.sa/#/air/${itineraryId}`;
                } else {
                    throw new Error('Not on a Cleartrip domain');
                }
            }
            
            // Open the stats page in a new tab
            chrome.tabs.create({ url: statsUrl });
        } catch (error) {
            console.error('Error:', error);
            alert('Error processing the URL. Please make sure you are on a valid itinerary page.');
        }
    });
});
