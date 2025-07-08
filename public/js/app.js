// Ragnarok Hunt Ultra - Enhanced Frontend Application

class RagnarokHuntUltra {
    constructor() {
        this.socket = io();
        this.currentResults = [];
        this.currentFilter = 'all';
        this.isHunting = false;
        this.engineStatusMap = new Map();
        this.searchStartTime = null;
        this.realTimeStats = {
            totalFound: 0,
            cleanSites: 0,
            paymentGates: 0,
            protectedSites: 0,
            uniqueDomains: 0
        };
        this.initializeElements();
        this.bindEvents();
        this.setupSocketListeners();
        this.initializeInterface();
        this.loadSystemStats();
        console.log('Ragnarok Hunt Ultra Interface Initialized');
    }

    initializeElements() {
        // Form elements
        this.huntForm = document.getElementById('hunt-form');
        this.keywordInput = document.getElementById('keyword');
        this.numResultsInput = document.getElementById('numResults');
        this.startHuntBtn = document.getElementById('start-hunt');

        // Status elements
        this.statusSection = document.getElementById('status-section');
        this.statusMessage = document.getElementById('status-message');
        this.progressFill = document.getElementById('progress-fill');
        this.progressPercent = document.getElementById('progress-percent');
        this.progressLabel = document.getElementById('progress-label');
        this.engineStatusElement = document.getElementById('engine-status');

        // Real-time stats elements
        this.realTimeStatsElement = document.getElementById('realtime-stats');
        this.engineGridElement = document.getElementById('engine-grid');

        // Results elements
        this.resultsSection = document.getElementById('results-section');
        this.summarySection = document.getElementById('summary-section');
        this.resultsList = document.getElementById('results-list');
        this.tabButtons = document.querySelectorAll('.tab-btn');

        // Modal elements
        this.loadingModal = document.getElementById('loading-modal');
        this.loadingMessage = document.getElementById('loading-message');
        this.loadingStats = document.getElementById('loading-stats');
        this.optionsModal = document.getElementById('options-modal');
        this.statsModal = document.getElementById('stats-modal');

        // Control elements
        this.exportJsonBtn = document.getElementById('export-json');
        this.exportCsvBtn = document.getElementById('export-csv');
        this.exportAdvancedBtn = document.getElementById('export-advanced');
        this.clearBtn = document.getElementById('clear-results');
        this.clearCacheBtn = document.getElementById('clear-cache');
        this.advancedBtn = document.getElementById('advanced-options');
        this.systemStatsBtn = document.getElementById('system-stats');
        this.closeOptionsBtn = document.getElementById('close-options');
        this.closeStatsBtn = document.getElementById('close-stats');
        this.connectionStatus = document.getElementById('connection-status');

        // Filter controls
        this.sortSelect = document.getElementById('sort-select');
        this.searchFilter = document.getElementById('search-filter');
        this.confidenceSlider = document.getElementById('confidence-slider');
        this.relevanceSlider = document.getElementById('relevance-slider');
    }

    bindEvents() {
        // Form submission
        this.huntForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.startHunt();
        });

        // Tab switching
        this.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.filter);
            });
        });

        // Export functionality
        this.exportJsonBtn.addEventListener('click', () => this.exportResults('json'));
        this.exportCsvBtn.addEventListener('click', () => this.exportResults('csv'));
        this.exportAdvancedBtn.addEventListener('click', () => this.exportResults('advanced'));
        this.clearBtn.addEventListener('click', () => this.clearResults());
        this.clearCacheBtn.addEventListener('click', () => this.clearCache());

        // Modal controls
        this.advancedBtn.addEventListener('click', () => this.showOptionsModal());
        this.systemStatsBtn.addEventListener('click', () => this.showStatsModal());
        this.closeOptionsBtn.addEventListener('click', () => this.hideOptionsModal());
        this.closeStatsBtn.addEventListener('click', () => this.hideStatsModal());

        // Filter controls
        this.sortSelect.addEventListener('change', () => this.renderResults());
        this.searchFilter.addEventListener('input', () => this.renderResults());
        this.confidenceSlider.addEventListener('input', () => this.renderResults());
        this.relevanceSlider.addEventListener('input', () => this.renderResults());

        // Click outside modals to close
        [this.optionsModal, this.statsModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideOptionsModal();
                    this.hideStatsModal();
                }
            });
        });

        // Enhanced keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'Enter':
                        e.preventDefault();
                        if (!this.isHunting) this.startHunt();
                        break;
                    case 'k':
                        e.preventDefault();
                        this.keywordInput.focus();
                        break;
                    case 's':
                        e.preventDefault();
                        this.exportResults('json');
                        break;
                    case 'f':
                        e.preventDefault();
                        this.searchFilter.focus();
                        break;
                    case 'r':
                        e.preventDefault();
                        this.clearResults();
                        break;
                    case 'i':
                        e.preventDefault();
                        this.showStatsModal();
                        break;
                }
            }
            if (e.key === 'Escape') {
                this.hideOptionsModal();
                this.hideStatsModal();
            }
        });

        // Auto-save form data
        this.keywordInput.addEventListener('input', () => {
            localStorage.setItem('ragnarok_keyword', this.keywordInput.value);
        });

        this.numResultsInput.addEventListener('change', () => {
            localStorage.setItem('ragnarok_count', this.numResultsInput.value);
        });

        // Real-time filter updates
        this.searchFilter.addEventListener('input', debounce(() => {
            this.renderResults();
        }, 300));
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            this.updateConnectionStatus(true);
            this.loadSystemStats();
        });

        this.socket.on('disconnect', () => {
            this.updateConnectionStatus(false);
        });

        this.socket.on('hunt_started', (data) => {
            this.onHuntStarted(data);
        });

        this.socket.on('search_status', (data) => {
            this.updateStatus(data.message, data.type);
        });

        this.socket.on('search_engine_start', (data) => {
            this.onEngineStart(data);
        });

        this.socket.on('url_found', (data) => {
            this.onUrlFound(data);
        });

        this.socket.on('search_engine_complete', (data) => {
            this.onEngineComplete(data);
        });

        this.socket.on('search_complete', (data) => {
            this.onSearchComplete(data);
        });

        this.socket.on('analysis_progress', (data) => {
            this.updateAnalysisProgress(data);
        });

        this.socket.on('site_analyzed', (data) => {
            this.onSiteAnalyzed(data);
        });

        this.socket.on('hunt_complete', (data) => {
            this.onHuntComplete(data);
        });

        this.socket.on('hunt_error', (data) => {
            this.onHuntError(data);
        });

        this.socket.on('cache_cleared', (data) => {
            this.showNotification(data.message, 'success');
            this.loadSystemStats();
        });
    }

    initializeInterface() {
        // Restore saved form data
        const savedKeyword = localStorage.getItem('ragnarok_keyword');
        const savedCount = localStorage.getItem('ragnarok_count');
        
        if (savedKeyword) this.keywordInput.value = savedKeyword;
        if (savedCount) this.numResultsInput.value = savedCount;

        // Hide modals initially
        this.loadingModal.style.display = 'none';
        this.optionsModal.style.display = 'none';
        this.statsModal.style.display = 'none';

        // Initialize real-time stats display
        this.updateRealTimeStats();
        
        // Show welcome message
        this.updateStatus('Ragnarok Hunt Ultra ready - 25+ search engines loaded', 'info');
    }

    async loadSystemStats() {
        try {
            const response = await fetch('/api/stats');
            const stats = await response.json();
            this.updateSystemStats(stats);
        } catch (error) {
            console.error('Failed to load system stats:', error);
        }
    }

    updateSystemStats(stats) {
        const statsContainer = document.getElementById('system-stats-content');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-number">${stats.searchEngines}</div>
                        <div class="stat-label">Search Engines</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${stats.cacheSize}</div>
                        <div class="stat-label">Cached Sites</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${stats.blacklistedDomains}</div>
                        <div class="stat-label">Blacklisted Domains</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${stats.config.searchDepth}</div>
                        <div class="stat-label">Search Depth</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${stats.config.maxConcurrentSearches}</div>
                        <div class="stat-label">Concurrent Searches</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${stats.config.maxConcurrentAnalysis}</div>
                        <div class="stat-label">Concurrent Analysis</div>
                    </div>
                </div>
            `;
        }
    }

    updateConnectionStatus(connected) {
        const indicator = this.connectionStatus.querySelector('i');
        const text = this.connectionStatus.querySelector('span');
        
        if (connected) {
            this.connectionStatus.className = 'status-indicator online';
            text.textContent = 'Ultra Online';
            indicator.className = 'fas fa-wifi';
        } else {
            this.connectionStatus.className = 'status-indicator offline';
            text.textContent = 'Offline';
            indicator.className = 'fas fa-wifi-slash';
        }
    }

    startHunt() {
        if (this.isHunting) return;

        const keyword = this.keywordInput.value.trim();
        const numResults = parseInt(this.numResultsInput.value);

        if (!keyword || numResults < 5 || numResults > 200) {
            this.showNotification('Please enter a valid search term and count (5-200)', 'error');
            return;
        }

        this.isHunting = true;
        this.currentResults = [];
        this.searchStartTime = Date.now();
        this.engineStatusMap.clear();
        this.realTimeStats = { totalFound: 0, cleanSites: 0, paymentGates: 0, protectedSites: 0, uniqueDomains: 0 };
        
        this.showLoading('Initializing ultra hunt protocol...');
        this.disableForm();
        this.showStatusSection();
        this.updateRealTimeStats();

        this.socket.emit('start_hunt', { keyword, numResults });
    }

    onHuntStarted(data) {
        this.updateStatus(`Ultra hunt started for "${data.keyword}" - ${data.searchEngines} engines across ${data.searchDepth} pages`, 'info');
        this.updateProgress(0, 'Launching parallel search matrix...');
        this.hideLoading();
        this.showEngineGrid();
    }

    onEngineStart(data) {
        this.engineStatusMap.set(data.engine, { 
            status: 'searching', 
            count: 0, 
            requests: 0, 
            errors: 0,
            startTime: Date.now()
        });
        this.updateEngineStatusDisplay();
    }

    onUrlFound(data) {
        // Update engine count
        if (this.engineStatusMap.has(data.engine)) {
            const engine = this.engineStatusMap.get(data.engine);
            engine.count++;
            this.engineStatusMap.set(data.engine, engine);
        }

        // Update real-time stats
        this.realTimeStats.totalFound = data.total;
        this.realTimeStats.uniqueDomains = data.uniqueDomains || this.realTimeStats.uniqueDomains;

        const progress = Math.min((data.total / data.target) * 50, 50);
        this.updateProgress(progress, `URLs found: ${data.total}/${data.target} from ${data.page} pages`);
        this.updateEngineStatusDisplay();
        this.updateRealTimeStats();
    }

    onEngineComplete(data) {
        if (this.engineStatusMap.has(data.engine)) {
            const engine = this.engineStatusMap.get(data.engine);
            engine.status = 'complete';
            engine.results = data.results;
            engine.requests = data.requests;
            engine.errors = data.errors;
            engine.endTime = Date.now();
            this.engineStatusMap.set(data.engine, engine);
        }
        this.updateEngineStatusDisplay();
    }

    onSearchComplete(data) {
        this.updateStatus(`Search matrix complete - ${data.total} URLs from ${data.uniqueDomains} domains - Starting deep analysis...`, 'success');
        this.updateProgress(50, 'Initializing ultra site analysis...');
        this.realTimeStats.uniqueDomains = data.uniqueDomains;
        this.updateRealTimeStats();
    }

    updateAnalysisProgress(data) {
        const searchProgress = 50;
        const analysisProgress = Math.round((data.current / data.total) * 50);
        const totalProgress = searchProgress + analysisProgress;

        this.updateProgress(totalProgress, `Analyzing ${data.current}/${data.total}: ${data.domain}`);
    }

    onSiteAnalyzed(data) {
        this.currentResults.push(data);
        
        // Update real-time stats
        this.realTimeStats.cleanSites = this.currentResults.filter(r => r.isClean).length;
        this.realTimeStats.paymentGates = this.currentResults.filter(r => r.payment?.detected).length;
        this.realTimeStats.protectedSites = this.currentResults.filter(r => r.cloudflare?.detected || r.captcha?.detected).length;

        if (this.matchesCurrentFilters(data)) {
            this.addResultToList(data);
        }

        this.updateTabCounts();
        this.updateRealTimeStats();
    }

    onHuntComplete(data) {
        this.isHunting = false;
        this.enableForm();
        this.currentResults = data.results;

        this.updateProgress(100, 'Ultra hunt completed successfully!');
        this.updateStatus('Deep analysis complete - Results optimized and ready', 'success');
        this.showResults(data.results, data.summary);
        this.playCompletionSound();

        const elapsed = ((Date.now() - this.searchStartTime) / 1000).toFixed(1);
        this.showNotification(`Ultra hunt completed in ${elapsed}s - ${data.summary.payment} payment gateways found!`, 'success');
    }

    onHuntError(data) {
        this.isHunting = false;
        this.hideLoading();
        this.enableForm();
        this.showNotification(`Hunt failed: ${data.error}`, 'error');
        this.updateProgress(0, 'Operation failed');
        this.updateStatus('Error occurred during hunt operation', 'error');
    }

    showResults(results, summary) {
        this.resultsSection.style.display = 'block';
        this.resultsSection.scrollIntoView({ behavior: 'smooth' });
        this.updateSummary(summary);
        this.updateTabCounts();
        this.renderResults();
    }

    updateSummary(summary) {
        this.summarySection.innerHTML = `
            <div class="summary-grid">
                <div class="summary-item fade-in-up">
                    <div class="summary-number">${summary.total}</div>
                    <div class="summary-label">Total Sites</div>
                </div>
                <div class="summary-item fade-in-up">
                    <div class="summary-number">${summary.clean}</div>
                    <div class="summary-label">Clean Sites</div>
                </div>
                <div class="summary-item fade-in-up">
                    <div class="summary-number highlight">${summary.payment}</div>
                    <div class="summary-label">Payment Gateways</div>
                </div>
                <div class="summary-item fade-in-up">
                    <div class="summary-number">${summary.highPaymentConfidence || 0}</div>
                    <div class="summary-label">High Confidence</div>
                </div>
                <div class="summary-item fade-in-up">
                    <div class="summary-number">${summary.uniqueDomains}</div>
                    <div class="summary-label">Unique Domains</div>
                </div>
                <div class="summary-item fade-in-up">
                    <div class="summary-number">${summary.fromCache || 0}</div>
                    <div class="summary-label">From Cache</div>
                </div>
                <div class="summary-item fade-in-up">
                    <div class="summary-number">${summary.averageTime.toFixed(1)}s</div>
                    <div class="summary-label">Avg Response</div>
                </div>
                <div class="summary-item fade-in-up">
                    <div class="summary-number">${(summary.avgPaymentConfidence * 100).toFixed(1)}%</div>
                    <div class="summary-label">Avg Confidence</div>
                </div>
            </div>
        `;
    }

    updateRealTimeStats() {
        if (this.realTimeStatsElement) {
            this.realTimeStatsElement.innerHTML = `
                <div class="realtime-stat">
                    <span class="stat-value">${this.realTimeStats.totalFound}</span>
                    <span class="stat-label">Found</span>
                </div>
                <div class="realtime-stat">
                    <span class="stat-value">${this.realTimeStats.paymentGates}</span>
                    <span class="stat-label">Payment</span>
                </div>
                <div class="realtime-stat">
                    <span class="stat-value">${this.realTimeStats.cleanSites}</span>
                    <span class="stat-label">Clean</span>
                </div>
                <div class="realtime-stat">
                    <span class="stat-value">${this.realTimeStats.uniqueDomains}</span>
                    <span class="stat-label">Domains</span>
                </div>
            `;
        }
    }

    showEngineGrid() {
        if (this.engineGridElement) {
            this.engineGridElement.style.display = 'grid';
        }
    }

    updateEngineStatusDisplay() {
        if (this.engineStatusMap.size === 0) {
            if (this.engineStatusElement) this.engineStatusElement.style.display = 'none';
            return;
        }

        if (this.engineStatusElement) {
            this.engineStatusElement.style.display = 'block';
            this.engineStatusElement.innerHTML = Array.from(this.engineStatusMap.entries())
                .map(([engine, data]) => {
                    const statusIcon = data.status === 'complete' ? 'fa-check-circle' : 'fa-spinner fa-spin';
                    const statusColor = data.status === 'complete' ? 'success' : 'info';
                    const duration = data.endTime ? ((data.endTime - data.startTime) / 1000).toFixed(1) + 's' : 'Running...';
                    
                    return `
                        <div class="engine-item ${statusColor}">
                            <div class="engine-header">
                                <span class="engine-name">${engine}</span>
                                <i class="fas ${statusIcon}"></i>
                            </div>
                            <div class="engine-stats">
                                <span class="engine-count">${data.count} URLs</span>
                                <span class="engine-duration">${duration}</span>
                            </div>
                            ${data.errors > 0 ? `<span class="engine-errors">${data.errors} errors</span>` : ''}
                        </div>
                    `;
                }).join('');
        }

        // Update engine grid if available
        if (this.engineGridElement) {
            this.engineGridElement.innerHTML = Array.from(this.engineStatusMap.entries())
                .map(([engine, data]) => {
                    const percentage = data.status === 'complete' ? 100 : Math.min((data.count / 10) * 100, 90);
                    return `
                        <div class="engine-card">
                            <div class="engine-name">${engine}</div>
                            <div class="engine-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${percentage}%"></div>
                                </div>
                                <span class="progress-text">${data.count}</span>
                            </div>
                        </div>
                    `;
                }).join('');
        }
    }

    updateTabCounts() {
        const counts = {
            all: this.currentResults.length,
            clean: this.currentResults.filter(r => r.isClean).length,
            payment: this.currentResults.filter(r => r.payment?.detected).length,
            protected: this.currentResults.filter(r => r.cloudflare?.detected || r.captcha?.detected).length,
            relevant: this.currentResults.filter(r => r.relevanceScore >= 15).length
        };

        Object.entries(counts).forEach(([filter, count]) => {
            const countElement = document.getElementById(`count-${filter}`);
            if (countElement) countElement.textContent = count;
        });
    }

    renderResults() {
        const filteredResults = this.getFilteredResults();
        this.resultsList.innerHTML = '';

        if (filteredResults.length === 0) {
            this.resultsList.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search-minus"></i>
                    <h3>No results found</h3>
                    <p>Try adjusting your filter criteria or search parameters</p>
                </div>
            `;
            return;
        }

        // Sort results
        const sortedResults = this.sortResults(filteredResults);

        sortedResults.forEach((result, index) => {
            setTimeout(() => {
                this.addResultToList(result);
            }, index * 30); // Faster staggered animation
        });
    }

    sortResults(results) {
        const sortBy = this.sortSelect?.value || 'confidence';
        
        return results.sort((a, b) => {
            switch (sortBy) {
                case 'confidence':
                    return (b.payment?.confidence || 0) - (a.payment?.confidence || 0);
                case 'relevance':
                    return b.relevanceScore - a.relevanceScore;
                case 'response-time':
                    return a.timeElapsed - b.timeElapsed;
                case 'alphabetical':
                    return a.url.localeCompare(b.url);
                default:
                    return 0;
            }
        });
    }

    addResultToList(result) {
        const resultElement = document.createElement('div');
        resultElement.className = 'result-item slide-in-right';
        
        const badges = this.generateBadges(result);
        const details = this.generateDetails(result);
        const confidenceBar = this.generateConfidenceBar(result);

        resultElement.innerHTML = `
            <div class="result-header">
                <a href="${result.url}" target="_blank" class="result-url" rel="noopener noreferrer">
                    ${this.truncateUrl(result.url, 60)}
                </a>
                <div class="result-badges">
                    ${badges}
                </div>
            </div>
            <div class="result-title">
                ${result.title || 'No title available'}
            </div>
            ${confidenceBar}
            <div class="result-details">
                ${details}
            </div>
            ${result.fromCache ? '<div class="cache-indicator"><i class="fas fa-bolt"></i> From Cache</div>' : ''}
        `;

        this.resultsList.appendChild(resultElement);
    }

    generateBadges(result) {
        const badges = [];

        if (result.isClean) {
            badges.push('<span class="badge clean"><i class="fas fa-shield-check"></i> Clean</span>');
        }

        if (result.cloudflare?.detected) {
            badges.push(`<span class="badge cloudflare"><i class="fas fa-cloud"></i> Cloudflare (${(result.cloudflare.confidence * 100).toFixed(0)}%)</span>`);
        }

        if (result.captcha?.detected) {
            badges.push(`<span class="badge captcha"><i class="fas fa-robot"></i> CAPTCHA (${(result.captcha.confidence * 100).toFixed(0)}%)</span>`);
        }

        if (result.payment?.detected) {
            const confidence = (result.payment.confidence * 100).toFixed(0);
            badges.push(`<span class="badge payment"><i class="fas fa-credit-card"></i> Payment (${confidence}%)</span>`);
        }

        if (result.relevanceScore >= 15) {
            badges.push('<span class="badge relevant"><i class="fas fa-star"></i> High Relevance</span>');
        }

        if (result.hasSSL) {
            badges.push('<span class="badge ssl"><i class="fas fa-lock"></i> SSL</span>');
        }

        return badges.join('');
    }

    generateConfidenceBar(result) {
        if (!result.payment?.detected) return '';
        
        const confidence = result.payment.confidence * 100;
        const color = confidence >= 80 ? 'success' : confidence >= 60 ? 'warning' : 'info';
        
        return `
            <div class="confidence-bar">
                <div class="confidence-label">Payment Confidence: ${confidence.toFixed(0)}%</div>
                <div class="confidence-progress">
                    <div class="confidence-fill ${color}" style="width: ${confidence}%"></div>
                </div>
            </div>
        `;
    }

    generateDetails(result) {
        const details = [
            { label: 'Status', value: result.status, icon: 'fas fa-info-circle' },
            { label: 'Response Time', value: `${result.timeElapsed}s`, icon: 'fas fa-clock' },
            { label: 'Relevance Score', value: `${result.relevanceScore}/30`, icon: 'fas fa-chart-line' },
            { label: 'Server', value: result.server || 'Unknown', icon: 'fas fa-server' },
            { label: 'Category', value: this.capitalizeFirst(result.category || 'general'), icon: 'fas fa-tag' },
            { label: 'Language', value: result.language?.toUpperCase() || 'Unknown', icon: 'fas fa-language' }
        ];

        if (result.payment?.detected && result.payment.processors?.length > 0) {
            details.push({
                label: 'Payment Processors',
                value: result.payment.processors.slice(0, 3).join(', '),
                icon: 'fas fa-credit-card'
            });
        }

        if (result.payment?.detected && result.payment.score) {
            details.push({
                label: 'Payment Score',
                value: `${result.payment.score}/100`,
                icon: 'fas fa-chart-bar'
            });
        }

        return details.map(detail => `
            <div class="detail-item">
                <span class="detail-label">
                    <i class="${detail.icon}"></i>
                    ${detail.label}
                </span>
                <span class="detail-value">${detail.value}</span>
            </div>
        `).join('');
    }

    getFilteredResults() {
        let filtered = this.currentResults;

        // Apply tab filter
        switch (this.currentFilter) {
            case 'clean':
                filtered = filtered.filter(r => r.isClean);
                break;
            case 'payment':
                filtered = filtered.filter(r => r.payment?.detected);
                break;
            case 'protected':
                filtered = filtered.filter(r => r.cloudflare?.detected || r.captcha?.detected);
                break;
            case 'relevant':
                filtered = filtered.filter(r => r.relevanceScore >= 15);
                break;
        }

        // Apply search filter
        const searchTerm = this.searchFilter?.value?.toLowerCase();
        if (searchTerm) {
            filtered = filtered.filter(r => 
                r.url.toLowerCase().includes(searchTerm) ||
                (r.title || '').toLowerCase().includes(searchTerm) ||
                (r.mainUrl || '').toLowerCase().includes(searchTerm)
            );
        }

        // Apply confidence filter
        const minConfidence = this.confidenceSlider?.value || 0;
        if (minConfidence > 0) {
            filtered = filtered.filter(r => 
                (r.payment?.confidence || 0) * 100 >= minConfidence
            );
        }

        // Apply relevance filter
        const minRelevance = this.relevanceSlider?.value || 0;
        if (minRelevance > 0) {
            filtered = filtered.filter(r => r.relevanceScore >= minRelevance);
        }

        return filtered;
    }

    matchesCurrentFilters(result) {
        return this.getFilteredResults().includes(result);
    }

    clearCache() {
        if (confirm('Are you sure you want to clear the system cache? This will remove all cached results and blacklisted domains.')) {
            this.socket.emit('clear_cache');
        }
    }

    exportResults(format) {
        if (this.currentResults.length === 0) {
            this.showNotification('No results to export', 'error');
            return;
        }

        const filteredResults = this.getFilteredResults();
        const timestamp = new Date().toISOString().slice(0, 10);

        if (format === 'json') {
            const dataStr = JSON.stringify(filteredResults, null, 2);
            this.downloadFile(dataStr, `ragnarok_ultra_${this.currentFilter}_${timestamp}.json`, 'application/json');
        } else if (format === 'csv') {
            const csvData = this.convertToCSV(filteredResults);
            this.downloadFile(csvData, `ragnarok_ultra_${this.currentFilter}_${timestamp}.csv`, 'text/csv');
        } else if (format === 'advanced') {
            const advancedData = this.convertToAdvancedFormat(filteredResults);
            this.downloadFile(advancedData, `ragnarok_ultra_advanced_${timestamp}.json`, 'application/json');
        }

        this.showNotification(`Results exported as ${format.toUpperCase()}`, 'success');
    }

    convertToAdvancedFormat(results) {
        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                totalResults: results.length,
                version: 'Ragnarok Hunt Ultra 3.0.0',
                filter: this.currentFilter
            },
            summary: {
                totalSites: results.length,
                cleanSites: results.filter(r => r.isClean).length,
                paymentGateways: results.filter(r => r.payment?.detected).length,
                protectedSites: results.filter(r => r.cloudflare?.detected || r.captcha?.detected).length,
                averageConfidence: results.reduce((sum, r) => sum + (r.payment?.confidence || 0), 0) / results.length,
                averageRelevance: results.reduce((sum, r) => sum + r.relevanceScore, 0) / results.length
            },
            results: results.map(result => ({
                ...result,
                exportScore: (result.payment?.confidence || 0) * 10 + result.relevanceScore
            })).sort((a, b) => b.exportScore - a.exportScore)
        };

        return JSON.stringify(exportData, null, 2);
    }

    switchTab(filter) {
        this.tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        this.currentFilter = filter;
        this.renderResults();
    }

    showOptionsModal() {
        this.optionsModal.style.display = 'flex';
    }

    hideOptionsModal() {
        this.optionsModal.style.display = 'none';
    }

    showStatsModal() {
        this.statsModal.style.display = 'flex';
        this.loadSystemStats();
    }

    hideStatsModal() {
        this.statsModal.style.display = 'none';
    }

    // Enhanced UI helper methods with better animations and feedback

    updateStatus(message, type = 'info') {
        const icon = this.getStatusIcon(type);
        this.statusMessage.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
        `;
        this.statusMessage.className = `status-message ${type}`;
    }

    getStatusIcon(type) {
        const icons = {
            info: 'fas fa-info-circle',
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            error: 'fas fa-times-circle'
        };
        return icons[type] || icons.info;
    }

    updateProgress(percentage, text) {
        this.progressFill.style.width = `${percentage}%`;
        this.progressPercent.textContent = `${Math.round(percentage)}%`;
        if (text) {
            this.progressLabel.textContent = text;
        }
    }

    showStatusSection() {
        this.statusSection.style.display = 'block';
    }

    showLoading(message = 'Loading...') {
        this.loadingModal.style.display = 'flex';
        this.loadingMessage.textContent = message;
    }

    hideLoading() {
        this.loadingModal.style.display = 'none';
    }

    disableForm() {
        this.startHuntBtn.disabled = true;
        this.startHuntBtn.innerHTML = `
            <i class="fas fa-rocket fa-spin"></i>
            <span>Ultra Hunting...</span>
        `;
        this.keywordInput.disabled = true;
        this.numResultsInput.disabled = true;
    }

    enableForm() {
        this.startHuntBtn.disabled = false;
        this.startHuntBtn.innerHTML = `
            <i class="fas fa-rocket"></i>
            <span>Start Ultra Hunt</span>
        `;
        this.keywordInput.disabled = false;
        this.numResultsInput.disabled = false;
    }

    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        const icon = this.getStatusIcon(type);
        
        notification.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
            <button class="close-notification"><i class="fas fa-times"></i></button>
        `;

        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'error' ? 'var(--danger)' : 
                       type === 'success' ? 'var(--success)' : 
                       type === 'warning' ? 'var(--warning)' : 'var(--primary)',
            color: 'white',
            padding: 'var(--space-4) var(--space-5)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: '10000',
            animation: 'slideInRight 0.3s ease-out',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            fontWeight: '500',
            maxWidth: '400px'
        });

        const closeBtn = notification.querySelector('.close-notification');
        closeBtn.addEventListener('click', () => {
            this.removeNotification(notification);
        });

        document.body.appendChild(notification);

        setTimeout(() => {
            this.removeNotification(notification);
        }, duration);
    }

    removeNotification(notification) {
        notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    clearResults() {
        if (confirm('Are you sure you want to clear all results?')) {
            this.currentResults = [];
            this.resultsList.innerHTML = '';
            this.resultsSection.style.display = 'none';
            this.updateProgress(0, 'System ready for new ultra hunt...');
            this.updateStatus('Ultra system ready - Configure search parameters above', 'info');
            this.showNotification('Results cleared', 'success');
        }
    }

    // Utility methods
    convertToCSV(results) {
        const headers = [
            'URL', 'Title', 'Status', 'Response Time', 'Relevance Score',
            'Clean', 'Cloudflare', 'CAPTCHA', 'Payment Gateway', 'Payment Confidence',
            'Server', 'Category', 'Language', 'SSL', 'From Cache'
        ];

        const rows = results.map(result => [
            result.url,
            (result.title || '').replace(/"/g, '""'),
            result.status,
            result.timeElapsed,
            result.relevanceScore,
            result.isClean ? 'Yes' : 'No',
            result.cloudflare?.detected ? 'Yes' : 'No',
            result.captcha?.detected ? 'Yes' : 'No',
            result.payment?.detected ? 'Yes' : 'No',
            result.payment?.confidence ? `${(result.payment.confidence * 100).toFixed(1)}%` : 'N/A',
            result.server || 'Unknown',
            result.category || 'general',
            result.language || 'unknown',
            result.hasSSL ? 'Yes' : 'No',
            result.fromCache ? 'Yes' : 'No'
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        return csvContent;
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    truncateUrl(url, maxLength) {
        if (url.length <= maxLength) return url;
        return url.substring(0, maxLength - 3) + '...';
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    playCompletionSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Ultra completion sound sequence
            oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
            oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2); // G5
            oscillator.frequency.setValueAtTime(1047, audioContext.currentTime + 0.3); // C6

            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            // Audio not supported, ignore
        }
    }
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    new RagnarokHuntUltra();
});

// Enhanced CSS animations and styles
const enhancedStyles = `
@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes slideOutRight {
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}

@keyframes fadeInUp {
    from {
        transform: translateY(20px);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.no-results {
    text-align: center;
    padding: var(--space-12);
    color: var(--text-secondary);
}

.no-results i {
    font-size: 3rem;
    margin-bottom: var(--space-4);
    opacity: 0.5;
}

.no-results h3 {
    margin-bottom: var(--space-2);
    color: var(--text-primary);
}

.confidence-bar {
    margin: var(--space-2) 0;
}

.confidence-label {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin-bottom: var(--space-1);
}

.confidence-progress {
    height: 6px;
    background: var(--bg-secondary);
    border-radius: 3px;
    overflow: hidden;
}

.confidence-fill {
    height: 100%;
    transition: width 0.3s ease;
}

.confidence-fill.success {
    background: var(--success);
}

.confidence-fill.warning {
    background: var(--warning);
}

.confidence-fill.info {
    background: var(--info);
}

.cache-indicator {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    font-size: 0.75rem;
    color: var(--success);
    margin-top: var(--space-2);
}

.realtime-stats {
    display: flex;
    gap: var(--space-4);
    margin: var(--space-4) 0;
}

.realtime-stat {
    text-align: center;
}

.stat-value {
    display: block;
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--primary);
}

.stat-label {
    font-size: 0.75rem;
    color: var(--text-secondary);
    text-transform: uppercase;
}

.engine-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: var(--space-3);
    margin: var(--space-4) 0;
}

.engine-card {
    background: var(--bg-secondary);
    padding: var(--space-3);
    border-radius: var(--radius);
    border: 1px solid var(--border);
}

.engine-name {
    font-weight: 600;
    margin-bottom: var(--space-2);
    color: var(--text-primary);
}

.engine-progress {
    display: flex;
    align-items: center;
    gap: var(--space-2);
}

.progress-bar {
    flex: 1;
    height: 8px;
    background: var(--bg-tertiary);
    border-radius: 4px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: var(--primary);
    transition: width 0.3s ease;
}

.progress-text {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
}

.notification {
    border-left: 4px solid rgba(255, 255, 255, 0.3);
}

.close-notification {
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    padding: var(--space-1);
    margin-left: var(--space-2);
    opacity: 0.7;
    transition: opacity 0.2s;
}

.close-notification:hover {
    opacity: 1;
}

.summary-item.highlight .summary-number {
    color: var(--success);
    text-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
}

.engine-item {
    padding: var(--space-3);
    background: var(--bg-secondary);
    border-radius: var(--radius);
    border-left: 4px solid var(--primary);
    margin-bottom: var(--space-2);
}

.engine-item.success {
    border-left-color: var(--success);
}

.engine-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-1);
}

.engine-stats {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.engine-errors {
    color: var(--danger);
    font-size: 0.75rem;
    margin-top: var(--space-1);
}

.fade-in-up {
    animation: fadeInUp 0.6s ease-out;
}

.slide-in-right {
    animation: slideInRight 0.4s ease-out;
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = enhancedStyles;
document.head.appendChild(styleSheet);
