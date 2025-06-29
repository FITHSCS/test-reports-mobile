// Dynamic Dashboard Script with JSON Loading
let dashboardData = null;
const DATA_URL = 'index.json'; // Path to your JSON file

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    loadDashboardData();
});

// Load dashboard data from JSON file
async function loadDashboardData() {
    try {
        showLoadingState(true);
        
        const response = await fetch(DATA_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        dashboardData = await response.json();
        
        // Validate data structure
        if (!validateDashboardData(dashboardData)) {
            throw new Error('Invalid dashboard data structure');
        }
        
        initializeDashboard();
        showLoadingState(false);
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showErrorState(error.message);
    }
}

// Validate the loaded data structure
function validateDashboardData(data) {
    const requiredFields = ['generated', 'projectName', 'latestRun', 'stats', 'branches'];
    return requiredFields.every(field => data && data.hasOwnProperty(field));
}

// Show/hide loading state
function showLoadingState(show) {
    let loadingOverlay = document.getElementById('loadingOverlay');
    
    if (show) {
        if (!loadingOverlay) {
            loadingOverlay = document.createElement('div');
            loadingOverlay.id = 'loadingOverlay';
            loadingOverlay.className = 'loading-overlay';
            loadingOverlay.innerHTML = `
                <div class="loading-content">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Loading dashboard data...</div>
                </div>
            `;
            document.body.appendChild(loadingOverlay);
        }
        loadingOverlay.style.display = 'flex';
    } else {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
}

// Show error state
function showErrorState(errorMessage) {
    showLoadingState(false);
    
    const errorOverlay = document.createElement('div');
    errorOverlay.className = 'error-overlay';
    errorOverlay.innerHTML = `
        <div class="error-content">
            <div class="error-icon">⚠️</div>
            <div class="error-title">Failed to Load Dashboard Data</div>
            <div class="error-message">${errorMessage}</div>
            <div class="error-actions">
                <button onclick="location.reload()" class="retry-btn">Retry</button>
                <button onclick="loadFallbackData()" class="fallback-btn">Load Demo Data</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(errorOverlay);
}

// Load fallback demo data if JSON fails to load
function loadFallbackData() {
    dashboardData = {
        "generated": new Date().toISOString(),
        "projectName": "FITHSCS Mobile App (Demo)",
        "repository": "https://github.com/FITHSCS/mobile",
        "latestRun": {
            "runNumber": "66",
            "branch": "main",
            "commit": "a147232e328b3bbee44bf53a43c2864de3a30583",
            "shortCommit": "a147232",
            "actor": "brukGit",
            "timestamp": new Date().toISOString(),
            "status": "success",
            "workflowUrl": "https://github.com/FITHSCS/mobile/actions/runs/15953406112",
            "coverage": {
                "lines": 7.28,
                "functions": 8.7,
                "branches": 6,
                "statements": 7.46
            }
        },
        "stats": {
            "totalRuns": 59,
            "totalBranches": 7,
            "successRate": 89.8
        },
        "branches": {
            "main": {
                "totalRuns": 37,
                "successfulRuns": 34,
                "runs": [
                    {
                        "runNumber": "66",
                        "status": "success",
                        "timestamp": new Date(Date.now() - 3600000).toISOString(),
                        "duration": 71,
                        "error": null,
                        "coverage": {
                            "lines": 7.28,
                            "functions": 8.7,
                            "branches": 6,
                            "statements": 7.46
                        }
                    }
                ]
            },
            "develop": {
                "totalRuns": 12,
                "successfulRuns": 10,
                "runs": [
                    {
                        "runNumber": "46",
                        "status": "success",
                        "timestamp": new Date(Date.now() - 7200000).toISOString(),
                        "duration": 43,
                        "error": null
                    }
                ]
            }
        }
    };
    
    document.querySelector('.error-overlay').remove();
    initializeDashboard();
    showNotification('Loaded demo data successfully', 'success');
}

function initializeDashboard() {
    if (!dashboardData) {
        console.error('No dashboard data available');
        return;
    }
    
    updateLastUpdated();
    updateKPICards();
    renderBranchTable();
    renderTimeline();
    createCoverageChart();
}

// Update KPI cards with dynamic data
function updateKPICards() {
    const latestRun = dashboardData.latestRun;
    const stats = dashboardData.stats;
    
    // Update test coverage
    const coverageElement = document.querySelector('.kpi-card.critical .kpi-value');
    if (coverageElement) {
        coverageElement.textContent = `${latestRun.coverage.statements}%`;
    }
    
    // Update build status
    const buildStatusElement = document.querySelector('.kpi-card.success .kpi-value');
    if (buildStatusElement) {
        buildStatusElement.textContent = `${stats.successRate}%`;
    }
    
    // Update active branches
    const branchesElement = document.querySelector('.kpi-card.info .kpi-value');
    if (branchesElement) {
        branchesElement.textContent = stats.totalBranches;
    }
    
    // Update total runs
    const runsElements = document.querySelectorAll('.kpi-card.info .kpi-value');
    if (runsElements.length > 1) {
        runsElements[1].textContent = stats.totalRuns;
    }
}

function updateLastUpdated() {
    const lastUpdatedElement = document.getElementById('lastUpdated');
    const timestamp = new Date(dashboardData.generated);
    lastUpdatedElement.textContent = formatDateTime(timestamp);
}

function formatDateTime(date) {
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    });
}

function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
}

function calculateSuccessRate(successfulRuns, totalRuns) {
    return totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0;
}

function renderBranchTable() {
    const tableBody = document.getElementById('branchTableBody');
    const branches = dashboardData.branches;
    
    let tableHTML = '';
    
    Object.entries(branches).forEach(([branchName, branchData]) => {
        const successRate = calculateSuccessRate(branchData.successfulRuns || 0, branchData.totalRuns || 0);
        const latestRun = branchData.runs && branchData.runs[0];
        const lastRunTime = latestRun ? formatRelativeTime(new Date(latestRun.timestamp)) : 'N/A';
        const duration = latestRun ? formatDuration(latestRun.duration) : 'N/A';
        const status = latestRun ? latestRun.status : 'unknown';
        
        tableHTML += `
            <tr data-branch="${branchName}">
                <td><strong>${branchName}</strong></td>
                <td>
                    <div class="success-rate">
                        <span>${successRate}%</span>
                        <div class="success-bar">
                            <div class="success-fill" style="width: ${successRate}%"></div>
                        </div>
                    </div>
                </td>
                <td>${branchData.totalRuns || 0}</td>
                <td>${lastRunTime}</td>
                <td>
                    <div class="status-cell">
                        <div class="status-dot ${status}"></div>
                        <span style="text-transform: capitalize;">${status}</span>
                    </div>
                </td>
                <td>${duration}</td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = tableHTML;
}

function formatRelativeTime(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

function renderTimeline() {
    const timelineContainer = document.getElementById('timelineContainer');
    const allRuns = [];
    
    // Collect all runs from all branches
    Object.entries(dashboardData.branches).forEach(([branchName, branchData]) => {
        if (branchData.runs) {
            branchData.runs.forEach(run => {
                allRuns.push({
                    ...run,
                    branch: branchName
                });
            });
        }
    });
    
    // Sort by timestamp (most recent first)
    allRuns.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Take only the most recent 10 runs
    const recentRuns = allRuns.slice(0, 10);
    
    let timelineHTML = '';
    
    recentRuns.forEach(run => {
        const time = formatRelativeTime(new Date(run.timestamp));
        const errorText = run.error ? ` - ${run.error}` : '';
        
        timelineHTML += `
            <div class="timeline-item">
                <div class="timeline-dot ${run.status}"></div>
                <div class="timeline-content">
                    <div class="timeline-info">
                        <div class="timeline-title">
                            Run #${run.runNumber} on ${run.branch}
                        </div>
                        <div class="timeline-details">
                            ${run.status === 'success' ? 'Build completed successfully' : 'Build failed'}${errorText}
                        </div>
                    </div>
                    <div class="timeline-time">${time}</div>
                </div>
            </div>
        `;
    });
    
    timelineContainer.innerHTML = timelineHTML;
}

function createCoverageChart() {
    const canvas = document.getElementById('coverageChart');
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    canvas.width = 400;
    canvas.height = 250;
    
    const coverage = dashboardData.latestRun.coverage;
    const target = 80;
    
    // Chart data
    const metrics = [
        { label: 'Lines', current: coverage.lines, target: target, color: '#dc3545' },
        { label: 'Functions', current: coverage.functions, target: target, color: '#fd7e14' },
        { label: 'Branches', current: coverage.branches, target: target, color: '#ffc107' },
        { label: 'Statements', current: coverage.statements, target: target, color: '#6f42c1' }
    ];
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Chart dimensions
    const chartX = 60;
    const chartY = 30;
    const chartWidth = 300;
    const chartHeight = 180;
    const barHeight = 30;
    const barSpacing = 15;
    
    // Draw title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('Coverage Metrics vs 80% Target', chartX, 20);
    
    // Draw bars
    metrics.forEach((metric, index) => {
        const y = chartY + (index * (barHeight + barSpacing));
        
        // Draw background bar (target)
        ctx.fillStyle = '#e9ecef';
        ctx.fillRect(chartX + 80, y, chartWidth - 80, barHeight);
        
        // Draw current coverage bar
        const currentWidth = ((metric.current / 100) * (chartWidth - 80));
        ctx.fillStyle = metric.color;
        ctx.fillRect(chartX + 80, y, currentWidth, barHeight);
        
        // Draw target line
        const targetX = chartX + 80 + ((target / 100) * (chartWidth - 80));
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(targetX, y);
        ctx.lineTo(targetX, y + barHeight);
        ctx.stroke();
        
        // Draw labels
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(metric.label, chartX + 70, y + barHeight / 2 + 4);
        
        // Draw percentage
        ctx.textAlign = 'left';
        ctx.fillText(`${metric.current.toFixed(1)}%`, chartX + 85 + currentWidth, y + barHeight / 2 + 4);
    });
    
    // Draw legend
    ctx.fillStyle = '#666';
    ctx.font = '10px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Target: 80%', chartX + 250, chartY + chartHeight + 20);
    
    // Draw target line in legend
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(chartX + 240, chartY + chartHeight + 16);
    ctx.lineTo(chartX + 248, chartY + chartHeight + 16);
    ctx.stroke();
}

function filterBranch(branchName) {
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Filter table rows
    const rows = document.querySelectorAll('[data-branch]');
    rows.forEach(row => {
        const rowBranch = row.getAttribute('data-branch');
        if (branchName === 'all' || rowBranch === branchName) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function filterTimeline(status) {
    // Update active button
    document.querySelectorAll('.legend-item').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Filter timeline items
    const timelineItems = document.querySelectorAll('.timeline-item');
    timelineItems.forEach(item => {
        const itemStatus = item.getAttribute('data-status');
        
        if (status === 'all' || itemStatus === status) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

async function refreshData() {
    const button = event.target;
    const originalText = button.textContent;
    
    button.textContent = 'Refreshing...';
    button.disabled = true;
    
    try {
        await loadDashboardData();
        showNotification('Dashboard data refreshed successfully', 'success');
    } catch (error) {
        console.error('Error refreshing data:', error);
        showNotification('Failed to refresh data', 'error');
    } finally {
        button.textContent = originalText;
        button.disabled = false;
    }
}

function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#d4edda' : '#f8d7da'};
        color: ${type === 'success' ? '#155724' : '#721c24'};
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        max-width: 300px;
        animation: slideIn 0.3s ease;
    `;
    
    // Notification content styles
    notification.querySelector('.notification-content').style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 15px;
    `;
    
    // Close button styles
    notification.querySelector('button').style.cssText = `
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        padding: 0;
        color: inherit;
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// Add CSS for loading and error states
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .loading-overlay, .error-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }
    
    .loading-content, .error-content {
        text-align: center;
        padding: 40px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        max-width: 400px;
        width: 90%;
    }
    
    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #e3e3e3;
        border-top: 4px solid #007bff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .loading-text {
        color: #666;
        font-size: 16px;
    }
    
    .error-icon {
        font-size: 48px;
        margin-bottom: 20px;
    }
    
    .error-title {
        font-size: 24px;
        font-weight: bold;
        color: #dc3545;
        margin-bottom: 10px;
    }
    
    .error-message {
        color: #666;
        margin-bottom: 30px;
        line-height: 1.5;
    }
    
    .error-actions {
        display: flex;
        gap: 15px;
        justify-content: center;
    }
    
    .retry-btn, .fallback-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
    }
    
    .retry-btn {
        background: #007bff;
        color: white;
    }
    
    .retry-btn:hover {
        background: #0056b3;
    }
    
    .fallback-btn {
        background: #6c757d;
        color: white;
    }
    
    .fallback-btn:hover {
        background: #545b62;
    }
`;
document.head.appendChild(additionalStyles);

// Auto-refresh every 5 minutes
setInterval(() => {
    if (document.visibilityState === 'visible' && dashboardData) {
        refreshData();
    }
}, 300000); // 5 minutes

// Update relative times every minute
setInterval(() => {
    if (dashboardData) {
        renderTimeline();
        renderBranchTable();
    }
}, 60000); // 1 minute