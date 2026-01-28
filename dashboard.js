// Global variable to store dashboard data for access by different functions
window.dashboardData = null;
let currentFilters = {};
let currentSort = 'date-desc';

document.addEventListener('DOMContentLoaded', () => {
    // Initial load of the dashboard
    loadDashboard();

    // Auto-refresh every 2 minutes for real-time updates
    setInterval(loadDashboard, 120000);

    // Refresh when tab becomes active (if it was hidden)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            loadDashboard();
        }
    });

    // Chart toggle event listeners (for 7d, 30d, 90d periods)
    document.querySelectorAll('.chart-toggle').forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from siblings
            this.parentNode.querySelectorAll('.chart-toggle').forEach(btn =>
                btn.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
            
            // Re-render the success trend chart based on the selected period
            // Note: Current data structure doesn't support historical daily data,
            // so this is a placeholder for future enhancement.
            const period = this.dataset.period;
            console.log('Chart period changed to:', period);
            if (window.dashboardData) {
                 renderSuccessTrendChart(window.dashboardData, period);
            }
        });
    });

    // Filter and Sort event listeners
    document.getElementById('filter-apply').addEventListener('click', applyFilters);
    document.getElementById('filter-reset').addEventListener('click', resetFilters);
    document.getElementById('sort-order').addEventListener('change', applyFilters); // Re-apply filters on sort change

    // Preset filter buttons
    document.getElementById('failed-preset-button').addEventListener('click', () => applyPreset('failed'));
    document.getElementById('low-coverage-preset-button').addEventListener('click', () => applyPreset('low-coverage'));
    document.getElementById('recent-activity-preset-button').addEventListener('click', () => applyPreset('recent'));
});

/**
 * Main function to load and render the dashboard data.
 * Handles loading states, error states, and data processing.
 */
async function loadDashboard() {
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const dashboardEl = document.getElementById('dashboard');

    try {
        // Show loading state, hide error and dashboard
        loadingEl.classList.remove('hidden');
        errorEl.classList.add('hidden');
        dashboardEl.classList.add('hidden');

        const response = await fetch('./index.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        window.dashboardData = data; // Store data globally

        // Hide loading and show dashboard
        loadingEl.classList.add('hidden');
        dashboardEl.classList.remove('hidden');

        // Update all dashboard sections
        updateKPIStats(data);
        renderDeploymentOverview(data); // Render deployment status
        renderSuccessTrendChart(data); // Initial render for success trend
        renderCoverageCards(data);
        renderBranchPerformance(data);

        console.log('Dashboard loaded successfully:', data);

    } catch (error) {
        console.error('Error loading dashboard:', error);

        // Show error state, hide loading and dashboard
        loadingEl.classList.add('hidden');
        errorEl.classList.remove('hidden');

        // Auto-retry after 30 seconds if an error occurred during fetch
        setTimeout(loadDashboard, 30000);
    }
}

/**
 * Updates the Key Performance Indicator (KPI) statistics.
 * @param {object} data - The dashboard data.
 */
function updateKPIStats(data) {
    document.getElementById('total-runs').textContent = data.stats?.totalRuns || 0;
    
    // Use 1 decimal place for success rate if it's not a whole number
    const rawSuccess = data.stats?.successRate || 0;
    document.getElementById('success-rate').textContent = 
        (rawSuccess % 1 === 0 ? rawSuccess : rawSuccess.toFixed(1)) + '%';

    // Update the Last Updated text in the header
    if (data.generated) {
        const date = new Date(data.generated);
        document.getElementById('lastUpdated').textContent = date.toLocaleString();
    }
}

/**
 * Helper function to format relative time.
 * @param {number} diffMinutes - Difference in minutes.
 * @returns {string} Formatted relative time string.
 */
function formatRelativeTime(diffMinutes) {
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`;
    return `${Math.floor(diffMinutes / 1440)} days ago`;
}

/**
 * Updates a trend indicator element with appropriate class and text.
 * @param {HTMLElement} element - The DOM element to update.
 * @param {number} value - The current value.
 * @param {number} goodThreshold - Value above which is considered good.
 * @param {number} warningThreshold - Value below which is considered warning.
 */
function updateTrendIndicator(element, value, goodThreshold, warningThreshold) {
    if (value >= goodThreshold) {
        element.className = 'kpi-trend positive';
        element.innerHTML = '<span>🚀 Excellent</span>';
    } else if (value >= warningThreshold) {
        element.className = 'kpi-trend stable';
        element.innerHTML = '<span>📊 Stable</span>';
    } else {
        element.className = 'kpi-trend warning';
        element.innerHTML = '<span>📉 Needs Attention</span>';
    }
}

/**
 * Renders deployment status cards based on specific branches.
 * This is a conceptual render, you might adjust which branches are "critical".
 * @param {object} data - The dashboard data.
 */
function renderDeploymentOverview(data) {
    const container = document.getElementById('deployment-overview-cards');
    if (!container) return;
    container.innerHTML = ''; // Clear previous content

    const criticalBranches = ['main', 'release-v1.0']; // Example critical branches
    const deploymentData = criticalBranches.map(branchName => {
        const branch = data.branches[branchName];
        if (!branch || !branch.latestRun) {
            return {
                name: branchName,
                status: 'unknown',
                timestamp: 'N/A',
                actor: 'N/A',
                commit: 'N/A',
                url: '#'
            };
        }
        return {
            name: branchName,
            status: branch.latestRun.status,
            timestamp: new Date(branch.latestRun.timestamp).toLocaleString(),
            actor: branch.latestRun.actor,
            commit: branch.latestRun.shortCommit,
            url: branch.latestRun.workflowUrl // Assuming workflowUrl exists in your JSON
        };
    });

    deploymentData.forEach(dep => {
        const statusClass = dep.status === 'success' ? 'success' : 'failed';
        container.innerHTML += `
            <div class="deployment-card">
                <div class="deployment-header">
                    <h3 class="text-lg">${dep.name} Branch</h3>
                    <span class="deployment-badge ${statusClass}">
                        <span class="badge-indicator"></span> ${dep.status.toUpperCase()}
                    </span>
                </div>
                <div class="deployment-details">
                    <p>Last deployment: ${dep.timestamp} by ${dep.actor}</p>
                    <p>Commit: ${dep.commit}</p>
                </div>
                <div class="deployment-actions">
                    <a href="${dep.url}" target="_blank" class="action-btn">View Workflow</a>
                    <button class="action-btn secondary">Release Notes</button>
                </div>
            </div>
        `;
    });
}


/**
 * Renders the success rate trend chart using SVG.
 * @param {object} data - The dashboard data.
 * @param {string} [period='30d'] - The period to display (e.g., '7d', '30d', '90d').
 */
function renderSuccessTrendChart(data, period = '30d') {
    const svg = document.getElementById('success-trend-chart');
    if (!svg) return;
    svg.innerHTML = ''; // Clear previous content

    // Set viewbox based on actual size or default
    const width = svg.clientWidth || 800;
    const height = svg.clientHeight || 300;
    const margin = { top: 20, right: 40, bottom: 40, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Filter runs based on period (currently just takes recent runs, actual date filtering needs more data in JSON)
    let allPoints = [];
    Object.values(data.branches || {}).forEach(branch => {
        // Collect all success rates over time, assuming `runs` are sorted latest first
        const runsToConsider = branch.runs.slice(0, 30); // Take a max of 30 runs for simple trend
        runsToConsider.forEach((run, index) => {
            allPoints.push({
                x: runsToConsider.length - 1 - index, // X-axis as index from oldest to newest
                y: run.status === 'success' ? 100 : 0, // Convert status to 0/100
                run: run.runNumber,
                branch: branch.name || 'N/A', // Add branch name for tooltip
                timestamp: run.timestamp
            });
        });
    });

    if (allPoints.length === 0) {
        // Display a message if no data is available
        svg.innerHTML = `<text x="${width / 2}" y="${height / 2}" font-size="1.2em" fill="var(--text-muted)" text-anchor="middle">No sufficient data for trend chart.</text>`;
        return;
    }

    // Sort by timestamp (oldest first for chart rendering)
    allPoints.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Scale X to fit chart width
    const minX = 0;
    const maxX = allPoints.length > 1 ? Math.max(...allPoints.map(p => p.x)) : 0; // If only one point, max X is 0
    const xScale = (x) => (x / Math.max(maxX, 1)) * chartWidth;

    // Scale Y to fit chart height (0% to 100%)
    const yScale = (y) => chartHeight - (y / 100) * chartHeight;

    // Path for the line and area
    const linePath = allPoints.map((p, i) => `${xScale(p.x)},${yScale(p.y)}`).join(' L');
    const areaPath = `M0,${chartHeight} L${linePath} L${xScale(maxX)},${chartHeight} Z`;

    svg.innerHTML = `
        <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style="stop-color:var(--primary-blue);stop-opacity:0.3" />
                <stop offset="100%" style="stop-color:var(--primary-blue);stop-opacity:0.05" />
            </linearGradient>
        </defs>
        <g transform="translate(${margin.left},${margin.top})">
            <!-- Grid Lines (Y-axis) -->
            ${[0, 25, 50, 75, 100].map(y => `
                <line class="chart-grid" x1="0" y1="${yScale(y)}" x2="${chartWidth}" y2="${yScale(y)}"></line>
                <text class="chart-label" x="-10" y="${yScale(y) + 4}" text-anchor="end">${y}%</text>
            `).join('')}
            
            <!-- Axes -->
            <line class="chart-axis" x1="0" y1="${chartHeight}" x2="${chartWidth}" y2="${chartHeight}"></line>
            <line class="chart-axis" x1="0" y1="0" x2="0" y2="${chartHeight}"></line>

            <!-- Data Area -->
            <path class="chart-area" d="${areaPath}" fill="url(#areaGradient)"></path>
            
            <!-- Data Line -->
            <path class="chart-line" d="M${linePath}"></path>
            
            <!-- Data Points -->
            ${allPoints.map(p => `
                <circle class="chart-point" cx="${xScale(p.x)}" cy="${yScale(p.y)}" r="4"
                    data-run="${p.run}" data-branch="${p.branch}" data-status="${p.y === 100 ? 'Success' : 'Failed'}"
                    data-date="${new Date(p.timestamp).toLocaleString()}">
                </circle>
            `).join('')}
        </g>
    `;

    // Add tooltip interactivity to the chart points
    addChartInteractivity(svg);
}

/**
 * Creates or retrieves a global tooltip element for chart interactivity.
 * @returns {HTMLElement} The tooltip DOM element.
 */
function createTooltip() {
    let tooltip = document.getElementById('chart-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'chart-tooltip';
        tooltip.className = 'tooltip';
        document.body.appendChild(tooltip);
    }
    return tooltip;
}

/**
 * Adds mouseover/mouseout interactivity to chart points for tooltips.
 * @param {SVGElement} svg - The SVG chart element.
 */
function addChartInteractivity(svg) {
    const tooltip = createTooltip();
    const points = svg.querySelectorAll('.chart-point');

    points.forEach(point => {
        point.addEventListener('mouseenter', (e) => {
            const run = e.target.dataset.run;
            const branch = e.target.dataset.branch;
            const status = e.target.dataset.status;
            const date = e.target.dataset.date;

            tooltip.innerHTML = `
                <strong>Run #${run} (${branch})</strong><br>
                Status: ${status}<br>
                Date: ${date}
            `;

            // Position the tooltip near the mouse/point
            const rect = e.target.getBoundingClientRect();
            // Adjust for scrolling
            tooltip.style.left = (rect.left + window.scrollX + (rect.width / 2) - (tooltip.offsetWidth / 2)) + 'px';
            tooltip.style.top = (rect.top + window.scrollY - tooltip.offsetHeight - 10) + 'px'; // 10px above point
            tooltip.classList.add('visible');
        });

        point.addEventListener('mouseleave', () => {
            tooltip.classList.remove('visible');
        });
    });
}

/**
 * Renders coverage metric cards.
 * @param {object} data - The dashboard data.
 */
/**
 * Renders coverage with decimal precision.
 */
function renderCoverageCards(data) {
    const container = document.getElementById('coverage-metrics-grid');
    if (!container || !data.latestRun?.coverage) return;

    const coverage = data.latestRun.coverage;
    const metrics = [
        { label: 'Lines', value: coverage.lines, target: 80 },
        { label: 'Functions', value: coverage.functions, target: 80 },
        { label: 'Branches', value: coverage.branches, target: 80 }
    ];

    container.innerHTML = metrics.map(m => `
        <div class="coverage-card">
            <div class="metric-info">
                <span class="metric-label">${m.label}</span>
                <span class="metric-value ${m.value < m.target ? 'warning' : 'success'}">
                    ${m.value.toFixed(2)}%
                </span>
            </div>
            <div class="progress-bar-bg">
                <div class="progress-bar-fill" style="width: ${m.value}%"></div>
            </div>
        </div>
    `).join('');
}
/**
 * Renders individual branch performance cards.
 * @param {object} data - The dashboard data.
 */
function renderBranchPerformance(data) {
    const container = document.getElementById('branch-performance');
    if (!container) return;

    const branches = data.branches || {};
    let filteredBranches = Object.entries(branches);

    // Apply filtering and sorting
    filteredBranches = applyAllFiltersAndSorting(filteredBranches);

    container.innerHTML = filteredBranches.map(([branchName, branchData]) => {
        const performance = {
            totalRuns: branchData.totalRuns || 0,
            successfulRuns: branchData.successfulRuns || 0,
            successRate: branchData.totalRuns > 0 ?
                Math.round((branchData.successfulRuns / branchData.totalRuns) * 100) : 0
        };

        const latestRun = branchData.latestRun;
        const statusClass = latestRun?.status === 'success' ? 'status-success' :
                            latestRun?.status === 'failed' ? 'status-failed' : 'status-warning';

        const trendIcon = performance.successRate >= 90 ? '📈' :
                          performance.successRate >= 70 ? '📊' : '📉';

        // Prepare data for mini chart (last 10 runs for trend visualization)
        const recentRuns = (branchData.runs || []).slice(0, 10).reverse();
        // Ensure there are at least two points for a line, otherwise display no trend data
        const miniChartPoints = recentRuns.length > 1 ? recentRuns.map((run, index) => ({
            x: (index / (recentRuns.length - 1)) * 300, // Scale x to 300px width
            y: run.status === 'success' ? 20 : 40 // Y for success/failure visual
        })) : [];

        return `
            <div class="performance-card mb-2" onclick="toggleBranchDetails('${branchName}')">
                <div class="performance-header">
                    <div class="branch-title">
                        <div class="branch-name-large">
                            🌿 ${branchName}
                            <div class="status-indicator ${statusClass}">
                                <div class="status-pulse"></div>
                                ${(latestRun?.status || 'unknown').toUpperCase()}
                            </div>
                        </div>
                    </div>
                    <div class="performance-metrics">
                        <div class="metric-item">
                            <div class="metric-value">${performance.totalRuns}</div>
                            <div class="metric-label">Total Runs</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-value">${performance.successRate}%</div>
                            <div class="metric-label">Success Rate</div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-value">${trendIcon}</div>
                            <div class="metric-label">Trend</div>
                        </div>
                    </div>
                </div>
                <div class="performance-chart">
                    <svg class="mini-chart" viewBox="0 0 300 60">
                        ${miniChartPoints.length > 1 ? `
                            <path class="mini-chart-area" d="M0,60 ${miniChartPoints.map(p => `L${p.x},${p.y}`).join(' ')} L300,60 Z" fill="var(--primary-blue)" fill-opacity="0.1"/>
                            <path class="mini-chart-line" d="M${miniChartPoints.map(p => `${p.x},${p.y}`).join(' L')}" stroke="var(--accent-blue)" stroke-width="1.5" fill="none"/>
                        ` : '<text x="150" y="30" text-anchor="middle" class="chart-label">No trend data</text>'}
                    </svg>
                </div>
            </div>
        `;
    }).join('');
}


/**
 * Toggles the visibility of branch details and loads them if not already rendered.
 * @param {string} branchName - The name of the branch.
 */
function toggleBranchDetails(branchName) {
    // Hide any currently visible branch detail section
    document.querySelectorAll('.branch-detail-expanded').forEach(section => {
        if (section.id !== `branch-details-${branchName}`) {
            section.classList.add('hidden');
            section.classList.remove('branch-detail-expanded');
        }
    });

    let section = document.getElementById(`branch-details-${branchName}`);

    // If the section doesn't exist, create it from the template
    if (!section) {
        const template = document.getElementById('branch-details-template');
        if (!template) {
            console.error('Branch details template not found.');
            return;
        }
        section = template.cloneNode(true);
        section.id = `branch-details-${branchName}`;
        section.classList.remove('hidden', 'branch-detail-template');
        section.classList.add('branch-detail'); // Add back the base class

        // Append it just after the branch performance section or main dashboard div
        document.getElementById('dashboard').appendChild(section);
    }

    const alreadyRendered = section.getAttribute('data-rendered') === 'true';

    if (!alreadyRendered) {
        const branchData = window.dashboardData?.branches?.[branchName];
        const body = section.querySelector('#branch-detail-body');
        const nameSpan = section.querySelector('#branch-detail-name');
        
        if (nameSpan) nameSpan.textContent = branchName; // Set the branch name in the header

        if (branchData && body) {
            body.innerHTML = '<div class="branch-loading text-muted">Loading test runs...</div>';
            setTimeout(() => { // Simulate delay for better UX
                renderBranchDetails(branchName, branchData, body);
                section.setAttribute('data-rendered', 'true');
                section.classList.toggle('hidden');
                section.classList.toggle('branch-detail-expanded');
            }, 300);
        }
    } else {
        section.classList.toggle('hidden');
        section.classList.toggle('branch-detail-expanded');
    }
}

/**
 * Renders the detailed list of runs for a specific branch.
 * @param {string} branchName - The name of the branch.
 * @param {object} branchData - The data for the specific branch.
 * @param {HTMLElement} container - The container element to render into.
 */
function renderBranchDetails(branchName, branchData, container) {
    if (!container) return;

    const runs = branchData.runs || [];

    if (runs.length === 0) {
        container.innerHTML = '<div class="text-muted">No test runs available for this branch.</div>';
        return;
    }

    // Sort runs from newest to oldest for display in detail view
    const sortedRuns = [...runs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    container.innerHTML = `
        <table class="w-full text-sm">
            <thead>
                <tr>
                    <th class="text-left p-2">Run #</th>
                    <th class="text-left p-2">Status</th>
                    <th class="text-left p-2">Date</th>
                    <th class="text-left p-2">Duration</th>
                    <th class="text-left p-2">Error (if any)</th>
                </tr>
            </thead>
            <tbody>
                ${sortedRuns.map(run => {
                    const statusBadge = run.status === 'success' ? '✅' :
                                        run.status === 'failed' ? '❌' : '⚠️';
                    const statusClass = run.status === 'success' ? 'status-success' :
                                        run.status === 'failed' ? 'status-failed' : 'status-warning';
                    return `
                        <tr>
                            <td class="p-2" data-label="Run #">#${run.runNumber}</td>
                            <td class="p-2 ${statusClass}" data-label="Status">${statusBadge} ${run.status}</td>
                            <td class="p-2" data-label="Date">${new Date(run.timestamp).toLocaleString()}</td>
                            <td class="p-2" data-label="Duration">${run.duration || 'N/A'}s</td>
                            <td class="p-2" data-label="Error (if any)">${run.error ? `<pre class="text-red-600 overflow-x-auto">${run.error}</pre>` : '-'}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    container.querySelector('table').classList.remove('hidden'); // Show the table
}


/**
 * Applies filters and sorting to the branch data.
 * @param {Array<[string, object]>} branchesArray - Array of [branchName, branchData] tuples.
 * @returns {Array<[string, object]>} Filtered and sorted array.
 */
function applyAllFiltersAndSorting(branchesArray) {
    let filtered = [...branchesArray]; // Create a mutable copy

    const search = document.getElementById('search-input').value.toLowerCase();
    const status = document.getElementById('status-filter').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    currentSort = document.getElementById('sort-order').value; // Update global sort preference

    // Filtering logic
    filtered = filtered.filter(([branchName, branchData]) => {
        const latestRun = branchData.latestRun;
        if (!latestRun) return false; // Skip branches without runs

        // Search filter (branch name, commit, actor)
        const searchMatch = !search ||
                            branchName.toLowerCase().includes(search) ||
                            (latestRun.commit && latestRun.commit.toLowerCase().includes(search)) ||
                            (latestRun.actor && latestRun.actor.toLowerCase().includes(search));

        // Status filter
        const statusMatch = !status || latestRun.status === status;

        // Date range filter
        const runDate = new Date(latestRun.timestamp);
        const startDateMatch = !startDate || runDate >= new Date(startDate);
        const endDateMatch = !endDate || runDate <= new Date(endDate);

        return searchMatch && statusMatch && startDateMatch && endDateMatch;
    });

    // Sorting logic
    filtered.sort(([, aData], [, bData]) => {
        const aLatest = aData.latestRun;
        const bLatest = bData.latestRun;

        if (!aLatest || !bLatest) return 0; // Should not happen after filtering, but for safety

        switch (currentSort) {
            case 'date-desc':
                return new Date(bLatest.timestamp).getTime() - new Date(aLatest.timestamp).getTime();
            case 'date-asc':
                return new Date(aLatest.timestamp).getTime() - new Date(bLatest.timestamp).getTime();
            case 'success-rate-desc':
                const aRate = aData.totalRuns > 0 ? (aData.successfulRuns / aData.totalRuns) : 0;
                const bRate = bData.totalRuns > 0 ? (bData.successfulRuns / bData.totalRuns) : 0;
                return bRate - aRate;
            case 'success-rate-asc':
                const aRateAsc = aData.totalRuns > 0 ? (aData.successfulRuns / aData.totalRuns) : 0;
                const bRateAsc = bData.totalRuns > 0 ? (bData.successfulRuns / bData.totalRuns) : 0;
                return aRateAsc - bRateAsc;
            case 'coverage-desc':
                const aCoverage = aLatest.coverage ? (aLatest.coverage.lines + aLatest.coverage.functions + aLatest.coverage.branches + aLatest.coverage.statements) / 4 : 0;
                const bCoverage = bLatest.coverage ? (bLatest.coverage.lines + bLatest.coverage.functions + bLatest.coverage.branches + bLatest.coverage.statements) / 4 : 0;
                return bCoverage - aCoverage;
            case 'coverage-asc':
                const aCoverageAsc = aLatest.coverage ? (aLatest.coverage.lines + aLatest.coverage.functions + aLatest.coverage.branches + aLatest.coverage.statements) / 4 : 0;
                const bCoverageAsc = bLatest.coverage ? (bLatest.coverage.lines + bLatest.coverage.functions + bLatest.coverage.branches + bLatest.coverage.statements) / 4 : 0;
                return aCoverageAsc - bCoverageAsc;
            default:
                return 0;
        }
    });

    return filtered;
}

/**
 * Applies a predefined filter preset and then re-renders the dashboard.
 * @param {string} preset - The preset to apply ('failed', 'low-coverage', 'recent').
 */
function applyPreset(preset) {
    resetFilters(); // Start with a clean slate

    if (preset === 'failed') {
        document.getElementById('status-filter').value = 'failed';
    } else if (preset === 'low-coverage') {
        document.getElementById('sort-order').value = 'coverage-asc';
    } else if (preset === 'recent') {
        document.getElementById('sort-order').value = 'date-desc';
    }
    // Now trigger the main filtering/rendering
    applyFilters();
}

/**
 * Resets all filter and sort inputs to their default values.
 */
function resetFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('status-filter').value = '';
    document.getElementById('start-date').value = '';
    document.getElementById('end-date').value = '';
    document.getElementById('sort-order').value = 'date-desc';
    currentSort = 'date-desc'; // Reset global sort preference
    // Re-render after resetting
    applyFilters();
}

/**
 * Main filter function that re-renders relevant sections after filtering/sorting.
 * For now, it re-renders branch performance, but can be expanded.
 */
function applyFilters() {
    if (window.dashboardData) {
        // Only re-render the section affected by filters/sort,
        // which is primarily the branch performance cards.
        renderBranchPerformance(window.dashboardData);
    }
    console.log('Filters and sorting applied and dashboard re-rendered.');
}
