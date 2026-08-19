const StatsExtension = {
    CONFIG: {
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
    },

    ITINERARY_ID_PATTERN: /NIX[a-f0-9]+(?:-[a-f0-9]+){4}/i,

    DOMAIN_ENVIRONMENT: {
        qa: ['me.cleartrip.ae', 'me.cleartrip.sa', 'me.flyin.com'],
        prod: ['www.cleartrip.ae', 'www.cleartrip.sa', 'www.flyin.com']
    },

    HISTORY_KEY: 'recentStatsHistory',
    MAX_HISTORY: 10,

    extractItineraryId(urlString) {
        const match = urlString.match(this.ITINERARY_ID_PATTERN);
        if (!match) {
            throw new Error('Itinerary ID not found in URL');
        }

        const itineraryId = match[0];
        return itineraryId.includes('_') ? itineraryId.split('_')[0] : itineraryId;
    },

    isSupportedHostname(hostname) {
        return this.DOMAIN_ENVIRONMENT.qa.includes(hostname)
            || this.DOMAIN_ENVIRONMENT.prod.includes(hostname);
    },

    isQaEnvironment(hostname) {
        if (this.DOMAIN_ENVIRONMENT.qa.includes(hostname)) {
            return true;
        }
        if (this.DOMAIN_ENVIRONMENT.prod.includes(hostname)) {
            return false;
        }
        throw new Error(`Unsupported domain: ${hostname}`);
    },

    buildStatsUrl(itineraryId, isQa) {
        const baseUrl = isQa
            ? this.CONFIG.domains.cleartrip.qa
            : this.CONFIG.domains.cleartrip.prod;
        return `https://${baseUrl}${this.CONFIG.domains.cleartrip.paths.air}${itineraryId}`;
    },

    detectFromTab(tabUrl, hostname) {
        const supported = this.isSupportedHostname(hostname);
        const hasNixId = this.ITINERARY_ID_PATTERN.test(tabUrl);
        const isFlyin = hostname.includes('flyin.com');

        let hasPid = false;
        try {
            hasPid = new URL(tabUrl).searchParams.has('pid');
        } catch {
            hasPid = false;
        }

        let isQa = null;
        if (supported) {
            isQa = this.isQaEnvironment(hostname);
        }

        let itineraryId = null;
        if (hasNixId) {
            itineraryId = this.extractItineraryId(tabUrl);
        }

        const canOpenFromUrl = supported && (hasNixId || (isFlyin && hasPid));

        return {
            supported,
            isQa,
            itineraryId,
            hasNixId,
            isFlyin,
            canOpenFromUrl,
            environmentLabel: isQa === null ? null : (isQa ? 'QA' : 'PROD')
        };
    },

    async resolveItineraryIdFromTab(tab) {
        const url = new URL(tab.url);
        const detection = this.detectFromTab(tab.url, url.hostname);

        if (!detection.supported) {
            throw new Error(`Unsupported domain: ${url.hostname}`);
        }

        if (detection.itineraryId) {
            return {
                itineraryId: detection.itineraryId,
                isQa: detection.isQa
            };
        }

        if (detection.isFlyin) {
            const pid = url.searchParams.get('pid');
            if (!pid) {
                throw new Error('Itinerary ID not found in URL');
            }

            const auditDomain = detection.isQa
                ? this.CONFIG.domains.flyin.qa
                : this.CONFIG.domains.flyin.prod;

            const response = await fetch(
                `https://${auditDomain}${this.CONFIG.domains.flyin.endpoints.audit}?pid=${encodeURIComponent(pid)}`
            );
            if (!response.ok) {
                throw new Error('Failed to fetch audit details');
            }

            const auditData = await response.json();
            if (!auditData?.itineraryId) {
                throw new Error('itineraryId not found in audit response');
            }

            return {
                itineraryId: auditData.itineraryId,
                isQa: detection.isQa
            };
        }

        throw new Error('Itinerary ID not found in URL');
    },

    async addToHistory(itineraryId, isQa) {
        const result = await chrome.storage.local.get(this.HISTORY_KEY);
        const history = result[this.HISTORY_KEY] || [];
        const entry = {
            itineraryId,
            isQa,
            openedAt: Date.now()
        };

        const filtered = history.filter((item) => item.itineraryId !== itineraryId || item.isQa !== isQa);
        filtered.unshift(entry);

        await chrome.storage.local.set({
            [this.HISTORY_KEY]: filtered.slice(0, this.MAX_HISTORY)
        });
    },

    async getHistory() {
        const result = await chrome.storage.local.get(this.HISTORY_KEY);
        return result[this.HISTORY_KEY] || [];
    },

    async openStats(itineraryId, isQa) {
        if (!itineraryId) {
            throw new Error('Itinerary ID is required');
        }

        const url = this.buildStatsUrl(itineraryId, isQa);
        await chrome.tabs.create({ url });
        await this.addToHistory(itineraryId, isQa);
        return url;
    },

    async openStatsFromActiveTab() {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.url) {
            throw new Error('No active tab found');
        }

        const { itineraryId, isQa } = await this.resolveItineraryIdFromTab(tab);
        return this.openStats(itineraryId, isQa);
    },

    updateBadgeForTab(tabId, tabUrl, hostname) {
        if (!tabId || tabId < 0) {
            return;
        }

        const detection = this.detectFromTab(tabUrl, hostname);
        if (detection.supported && detection.hasNixId) {
            chrome.action.setBadgeText({ tabId, text: '✓' });
            chrome.action.setBadgeBackgroundColor({ tabId, color: '#4CAF50' });
            return;
        }

        chrome.action.setBadgeText({ tabId, text: '' });
    }
};
