importScripts('shared.js');

const CONTEXT_MENU_ID = 'open-stats-from-url';

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: CONTEXT_MENU_ID,
        title: 'Open Stats from URL',
        contexts: ['page']
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== CONTEXT_MENU_ID || !tab?.url) {
        return;
    }

    try {
        await StatsExtension.openStatsFromActiveTab();
    } catch (error) {
        console.error('Context menu navigation error:', error);
    }
});

chrome.commands.onCommand.addListener(async (command) => {
    if (command !== 'open-stats-from-url') {
        return;
    }

    try {
        await StatsExtension.openStatsFromActiveTab();
    } catch (error) {
        console.error('Shortcut navigation error:', error);
    }
});

function updateBadgeForTab(tab) {
    if (!tab?.id || !tab.url || !tab.url.startsWith('http')) {
        return;
    }

    try {
        const { hostname } = new URL(tab.url);
        StatsExtension.updateBadgeForTab(tab.id, tab.url, hostname);
    } catch (error) {
        console.error('Badge update error:', error);
    }
}

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
    try {
        const tab = await chrome.tabs.get(tabId);
        updateBadgeForTab(tab);
    } catch (error) {
        console.error('Tab activation badge error:', error);
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url || changeInfo.status === 'complete') {
        updateBadgeForTab(tab);
    }
});
