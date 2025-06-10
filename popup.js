document.addEventListener('DOMContentLoaded', function() {
    const statsButton = document.getElementById('statsButton');
    
    statsButton.addEventListener('click', async () => {
        try {
            // Get the current active tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Get the current URL
            const url = new URL(tab.url);
            
            // Extract the itinerary ID from the URL
            // The URL format is something like: /flights/itinerary/NI733f37a7f1-7f46-4dcc-8373-250610225426/info
            const pathParts = url.pathname.split('/');
            const itineraryId = pathParts[3]; // The itinerary ID is the 4th part of the path
            
            // Determine which stats URL to use based on domain
            let statsUrl;
            if (url.hostname.startsWith('www.cleartrip')) {
                statsUrl = `http://statsui.cleartripcorp.me/#/air/${itineraryId}`;
                chrome.tabs.create({ url: statsUrl });
            } else if (url.hostname.startsWith('me.cleartrip')) {
                statsUrl = `http://statsui.cleartrip.sa/#/air/${itineraryId}`;
                chrome.tabs.update(tab.id, { url: statsUrl });
            } else {
                alert('This extension works only on Cleartrip itinerary pages');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error processing the URL. Please make sure you are on a valid itinerary page.');
        }
    });
});
