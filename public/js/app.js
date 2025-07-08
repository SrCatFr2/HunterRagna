// Ragnarok Hunt - Enhanced Frontend Application
class RagnarokHunt {
    constructor() {
        this.socket = io();
        this.currentResults = [];
        this.currentFilter = 'all';
        this.isHunting = false;
        this.engineStatusMap = new Map(); // Cambiado de engineStatus a engineStatusMap
        this.searchStartTime = null;

        this.initializeElements();
        this.bindEvents();
        this.setupSocketListeners();
        this.initializeInterface();

        console.log('Ragnarok Hunt Interface Initialized');
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
        this.engineStatusElement = document.getElementById('engine-status'); // Renombrado para evitar conflicto

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

        // Control elements
        this.exportJsonBtn = document.getElementById('export-json');
        this.exportCsvBtn = document.getElementById('export-csv');
        this.clearBtn = document.getElementById('clear-results');
        this.advancedBtn = document.getElementById('advanced-options');
        this.closeOptionsBtn = document.getElementById('close-options');
        this.connectionStatus = document.getElementById('connection-status');
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
        this.clearBtn.addEventListener('click', () => this.clearResults());

        // Modal controls
        this.advancedBtn.addEventListener('click', () => this.showOptionsModal());
        this.closeOptionsBtn.addEventListener('click', () => this.hideOptionsModal());

        // Click outside modal to close
        this.optionsModal.addEventListener('click', (e) => {
            if (e.target === this.optionsModal) {
                this.hideOptionsModal();
            }
        });

        // Keyboard shortcuts
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
                }
            }
            if (e.key === 'Escape') {
                this.hideOptionsModal();
            }
        });

        // Auto-save form data
        this.keywordInput.addEventListener('input', () => {
            localStorage.setItem('ragnarok_keyword', this.keywordInput.value);
        });

        this.numResultsInput.addEventListener('change', () => {
            localStorage.setItem('ragnarok_count', this.numResultsInput.value);
        });
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            this.updateConnectionStatus(true);
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
    }

    initializeInterface() {
        // Restore saved form data
        const savedKeyword = localStorage.getItem('ragnarok_keyword');
        const savedCount = localStorage.getItem('ragnarok_count');

        if (savedKeyword) this.keywordInput.value = savedKeyword;
        if (savedCount) this.numResultsInput.value = savedCount;

        // Hide loading modal initially
        this.loadingModal.style.display = 'none';
        this.optionsModal.style.display = 'none';
    }

    updateConnectionStatus(connected) {
        const indicator = this.connectionStatus.querySelector('i');
        const text = this.connectionStatus.querySelector('span');

        if (connected) {
            this.connectionStatus.className = 'status-indicator online';
            text.textContent = 'Online';
        } else {
            this.connectionStatus.className = 'status-indicator offline';
            text.textContent = 'Offline';
        }
    }

    startHunt() {
        if (this.isHunting) return;

        const keyword = this.keywordInput.value.trim();
        const numResults = parseInt(this.numResultsInput.value);

        if (!keyword || numResults < 5 || numResults > 100) {
            this.showNotification('Please enter a valid search term and count (5-100)', 'error');
            return;
        }

        this.isHunting = true;
        this.currentResults = [];
        this.searchStartTime = Date.now();
        this.engineStatusMap.clear(); // Usar engineStatusMap en lugar de engineStatus

        this.showLoading('Initializing hunt protocol...');
        this.disableForm();
        this.showStatusSection();

        this.socket.emit('start_hunt', { keyword, numResults });
    }

    onHuntStarted(data) {
        this.updateStatus(`Hunt started for "${data.keyword}" - Parallel search initiated`, 'info');
        this.updateProgress(0, 'Starting parallel search engines...');
        this.hideLoading();
    }

    onEngineStart(data) {
        this.engineStatusMap.set(data.engine, { status: 'searching', count: 0 });
        this.updateEngineStatusDisplay();
    }

    onUrlFound(data) {
        // Update engine count
        if (this.engineStatusMap.has(data.engine)) {
            const engine = this.engineStatusMap.get(data.engine);
            engine.count++;
            this.engineStatusMap.set(data.engine, engine);
        }

        const progress = Math.min((data.total / data.target) * 50, 50); // 50% for search phase
        this.updateProgress(progress, `URLs found: ${data.total}/${data.target}`);
        this.updateEngineStatusDisplay();
    }

    onEngineComplete(data) {
        if (this.engineStatusMap.has(data.engine)) {
            const engine = this.engineStatusMap.get(data.engine);
            engine.status = 'complete';
            this.engineStatusMap.set(data.engine, engine);
        }
        this.updateEngineStatusDisplay();
    }

    onSearchComplete(data) {
        this.updateStatus('Search phase complete - Starting analysis...', 'success');
        this.updateProgress(50, 'Initializing site analysis...');
    }

    updateAnalysisProgress(data) {
        const searchProgress = 50;
        const analysisProgress = Math.round((data.current / data.total) * 50); // 50% for analysis
        const totalProgress = searchProgress + analysisProgress;

        this.updateProgress(totalProgress, `Analyzing ${data.current}/${data.total}: ${data.domain}`);
    }

    onSiteAnalyzed(data) {
        this.currentResults.push(data);

        if (this.currentFilter === 'all' || this.matchesFilter(data, this.currentFilter)) {
            this.addResultToList(data);
        }

        this.updateTabCounts();
    }

    onHuntComplete(data) {
        this.isHunting = false;
        this.enableForm();

        this.currentResults = data.results;
        this.updateProgress(100, 'Hunt completed successfully!');
        this.updateStatus('Analysis complete - Results ready for review', 'success');

        this.showResults(data.results, data.summary);
        this.playCompletionSound();

        // Show completion time
        const elapsed = ((Date.now() - this.searchStartTime) / 1000).toFixed(1);
        this.showNotification(`Hunt completed in ${elapsed}s`, 'success');
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
                    <div class="summary-number">${summary.payment}</div>
                    <div class="summary-label">Payment Gateways</div>
                </div>
                <div class="summary-item fade-in-up">
                    <div class="summary-number">${summary.cloudflare + summary.captcha}</div>
                    <div class="summary-label">Protected Sites</div>
                </div>
                <div class="summary-item fade-in-up">
                    <div class="summary-number">${summary.highRelevance}</div>
                    <div class="summary-label">High Relevance</div>
                </div>
                <div class="summary-item fade-in-up">
                    <div class="summary-number">${summary.averageTime.toFixed(1)}s</div>
                    <div class="summary-label">Avg Response</div>
                </div>
                <div class="summary-item fade-in-up">
                    <div class="summary-number">${summary.avgRelevance.toFixed(1)}</div>
                    <div class="summary-label">Avg Relevance</div>
                </div>
            </div>
        `;
    }

    updateTabCounts() {
        const allCount = document.getElementById('count-all');
        const cleanCount = document.getElementById('count-clean');
        const paymentCount = document.getElementById('count-payment');
        const protectedCount = document.getElementById('count-protected');
        const relevantCount = document.getElementById('count-relevant');

        if (allCount) allCount.textContent = this.currentResults.length;
        if (cleanCount) cleanCount.textContent = this.currentResults.filter(r => r.isClean).length;
        if (paymentCount) paymentCount.textContent = this.currentResults.filter(r => r.payment?.detected).length;
        if (protectedCount) protectedCount.textContent = this.currentResults.filter(r => r.cloudflare?.detected || r.captcha?.detected).length;
        if (relevantCount) relevantCount.textContent = this.currentResults.filter(r => r.relevanceScore >= 10).length;
    }

    renderResults() {
        const filteredResults = this.getFilteredResults();
        this.resultsList.innerHTML = '';

        if (filteredResults.length === 0) {
            this.resultsList.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>No results found</h3>
                    <p>Try adjusting your filter criteria</p>
                </div>
            `;
            return;
        }

        filteredResults.forEach((result, index) => {
            setTimeout(() => {
                this.addResultToList(result);
            }, index * 50); // Staggered animation
        });
    }

    addResultToList(result) {
        const resultElement = document.createElement('div');
        resultElement.className = 'result-item slide-in-right';

        const badges = this.generateBadges(result);
        const details = this.generateDetails(result);

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

            <div class="result-details">
                ${details}
            </div>
        `;

        this.resultsList.appendChild(resultElement);
    }

    generateBadges(result) {
        const badges = [];

        if (result.isClean) {
            badges.push('<span class="badge clean"><i class="fas fa-shield-check"></i> Clean</span>');
        }

        if (result.cloudflare?.detected) {
            badges.push('<span class="badge cloudflare"><i class="fas fa-cloud"></i> Cloudflare</span>');
        }

        if (result.captcha?.detected) {
            badges.push('<span class="badge captcha"><i class="fas fa-robot"></i> CAPTCHA</span>');
        }

        if (result.payment?.detected) {
            badges.push(`<span class="badge payment"><i class="fas fa-credit-card"></i> Payment (${result.payment.score}/10)</span>`);
        }

        if (result.relevanceScore >= 10) {
            badges.push('<span class="badge relevant"><i class="fas fa-star"></i> Relevant</span>');
        }

        return badges.join('');
    }

    generateDetails(result) {
        const details = [
            { label: 'Status', value: result.status, icon: 'fas fa-info-circle' },
            { label: 'Response Time', value: `${result.timeElapsed}s`, icon: 'fas fa-clock' },
            { label: 'Relevance Score', value: `${result.relevanceScore}/20`, icon: 'fas fa-chart-line' },
            { label: 'Server', value: result.server || 'Unknown', icon: 'fas fa-server' },
            { label: 'SSL', value: result.hasSSL ? 'Yes' : 'No', icon: 'fas fa-lock' },
            { label: 'Category', value: this.capitalizeFirst(result.category || 'general'), icon: 'fas fa-tag' }
        ];

        if (result.payment?.detected && result.payment.details?.processors?.length > 0) {
            details.push({
                label: 'Payment Processors',
                value: result.payment.details.processors.slice(0, 2).join(', '),
                icon: 'fas fa-credit-card'
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

    switchTab(filter) {
        this.tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });

        this.currentFilter = filter;
        this.renderResults();
    }

    getFilteredResults() {
        switch (this.currentFilter) {
            case 'clean':
                return this.currentResults.filter(r => r.isClean);
            case 'payment':
                return this.currentResults.filter(r => r.payment?.detected);
            case 'protected':
                return this.currentResults.filter(r => r.cloudflare?.detected || r.captcha?.detected);
            case 'relevant':
                return this.currentResults.filter(r => r.relevanceScore >= 10);
            default:
                return this.currentResults;
        }
    }

    matchesFilter(result, filter) {
        switch (filter) {
            case 'clean': return result.isClean;
            case 'payment': return result.payment?.detected;
            case 'protected': return result.cloudflare?.detected || result.captcha?.detected;
            case 'relevant': return result.relevanceScore >= 10;
            default: return true;
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
            this.downloadFile(dataStr, `ragnarok_hunt_${this.currentFilter}_${timestamp}.json`, 'application/json');
        } else if (format === 'csv') {
            const csvData = this.convertToCSV(filteredResults);
            this.downloadFile(csvData, `ragnarok_hunt_${this.currentFilter}_${timestamp}.csv`, 'text/csv');
        }

        this.showNotification(`Results exported as ${format.toUpperCase()}`, 'success');
    }

    convertToCSV(results) {
        const headers = [
            'URL', 'Title', 'Status', 'Response Time', 'Relevance Score',
            'Clean', 'Cloudflare', 'CAPTCHA', 'Payment Gateway', 'Server', 'Category'
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
            result.payment?.detected ? `Yes (${result.payment.score}/10)` : 'No',
            result.server || 'Unknown',
            result.category || 'general'
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        return csvContent;
    }

    clearResults() {
        if (confirm('Are you sure you want to clear all results?')) {
            this.currentResults = [];
            this.resultsList.innerHTML = '';
            this.resultsSection.style.display = 'none';
            this.updateProgress(0, 'System ready for new hunt...');
            this.updateStatus('System ready - Configure search parameters above', 'info');
            this.showNotification('Results cleared', 'success');
        }
    }

    // UI Helper Methods
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
        this.progressPercent.textContent = `${percentage}%`;

        if (text) {
            this.progressLabel.textContent = text;
        }
    }

    updateEngineStatusDisplay() {
        if (this.engineStatusMap.size === 0) {
            this.engineStatusElement.style.display = 'none';
            return;
        }

        this.engineStatusElement.style.display = 'block';
        this.engineStatusElement.innerHTML = Array.from(this.engineStatusMap.entries())
            .map(([engine, data]) => `
                <div class="engine-item">
                    <span class="engine-name">${engine}</span>
                    <span class="engine-count">${data.count}</span>
                </div>
            `).join('');
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

    showOptionsModal() {
        this.optionsModal.style.display = 'flex';
    }

    hideOptionsModal() {
        this.optionsModal.style.display = 'none';
    }

    disableForm() {
        this.startHuntBtn.disabled = true;
        this.startHuntBtn.innerHTML = `
            <i class="fas fa-spinner fa-spin"></i>
            <span>Hunting...</span>
        `;
        this.keywordInput.disabled = true;
        this.numResultsInput.disabled = true;
    }

    enableForm() {
        this.startHuntBtn.disabled = false;
        this.startHuntBtn.innerHTML = `
            <i class="fas fa-rocket"></i>
            <span>Start Analysis</span>
        `;
        this.keywordInput.disabled = false;
        this.numResultsInput.disabled = false;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;

        const icon = this.getStatusIcon(type);
        notification.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
        `;

        // Styles
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

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    playCompletionSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
            oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.2); // G5

            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.4);
        } catch (e) {
            // Audio not supported, ignore
        }
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
}

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
    new RagnarokHunt();
});

// Add CSS animations for notifications
const notificationStyles = `
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
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);
