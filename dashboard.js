document.addEventListener('DOMContentLoaded', () => {
    fetch('index.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            renderDashboard(data);
        })
        .catch(error => {
            console.error('Error fetching or parsing dashboard data:', error);
            document.querySelector('main.container').innerHTML = `<p class="error-message">Failed to load dashboard data. Please check back later.</p>`;
        });
});

function renderDashboard(data) {
    // 1. Update Last Updated Timestamp
    const lastUpdated = new Date(data.generated).toLocaleString();
    document.getElementById('last-updated').textContent = `Last updated: ${lastUpdated}`;

    // 2. Render Overall Statistics
    const statsSection = document.getElementById('overall-stats');
    document.getElementById('total-runs').textContent = data.stats.totalRuns;
    document.getElementById('total-branches').textContent = data.stats.totalBranches;
    document.getElementById('success-rate').textContent = `${data.stats.successRate}%`;

    // 3. Render Branches Summary
    const branchesContainer = document.getElementById('branches-container');
    branchesContainer.innerHTML = ''; // Clear previous content

    for (const branchName in data.branches) {
        const branchData = data.branches[branchName];
        const branchCard = document.createElement('div');
        branchCard.className = 'branch-card';

        const lastRun = branchData.runs[0]; // Assuming runs are sorted by timestamp descending
        const statusBadgeClass = lastRun.status === 'success' ? 'status-success' :
                                 lastRun.status === 'failed' ? 'status-failed' : 'status-warning';

        branchCard.innerHTML = `
            <div class="branch-header">
                <span>${branchName}</span>
                <span class="status-badge ${statusBadgeClass}">${lastRun.status.toUpperCase()}</span>
            </div>
            <div class="branch-content">
                <div class="summary-stats">
                    <div class="summary-item">
                        <span class="value">${branchData.totalRuns}</span>
                        <span class="label">Total Runs</span>
                    </div>
                    <div class="summary-item">
                        <span class="value">${branchData.successfulRuns}</span>
                        <span class="label">Successful</span>
                    </div>
                    <div class="summary-item">
                        <span class="value">${((branchData.successfulRuns / branchData.totalRuns) * 100 || 0).toFixed(1)}%</span>
                        <span class="label">Success Rate</span>
                    </div>
                </div>
                <h4>Latest Runs:</h4>
                <div class="table-responsive">
                    <table class="test-runs-table">
                        <thead>
                            <tr>
                                <th>Run #</th>
                                <th>Status</th>
                                <th>Timestamp</th>
                                <th>Duration</th>
                                <th>Error</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${branchData.runs.map(run => {
                                const runStatusClass = run.status === 'success' ? 'status-success' :
                                                       run.status === 'failed' ? 'status-failed' : 'status-warning';
                                const runStatusIcon = run.status === 'success' ? '✅' :
                                                      run.status === 'failed' ? '❌' : '⚠️';
                                return `
                                    <tr>
                                        <td>#${run.runNumber}</td>
                                        <td class="${runStatusClass}">${runStatusIcon} ${run.status}</td>
                                        <td>${new Date(run.timestamp).toLocaleString()}</td>
                                        <td>${run.duration ? `${run.duration}s` : 'N/A'}</td>
                                        <td>${run.error ? `<pre class="text-red-600 overflow-x-auto">${run.error}</pre>` : '-'}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        branchesContainer.appendChild(branchCard);
    }

    // 4. Render Folder Structure
    const folderStructureContent = document.getElementById('folder-structure-content');
    folderStructureContent.innerHTML = ''; // Clear previous content

    if (data.branches.main && data.branches.main.folderStructure) {
        function renderFolder(folder, level = 0) {
            let html = `<ul>`;
            for (const key in folder) {
                if (key === 'description' || key === 'structure') continue; // Skip description and nested structure for direct rendering
                const item = folder[key];
                html += `<li>`;
                html += `<span>${key}</span>`;
                if (typeof item === 'object' && item !== null && item.description) {
                    html += `<span class="description">- ${item.description}</span>`;
                }
                if (typeof item === 'object' && item !== null && item.structure) {
                    html += renderFolder(item.structure, level + 1);
                }
                html += `</li>`;
            }
            html += `</ul>`;
            return html;
        }
        folderStructureContent.innerHTML = renderFolder(data.branches.main.folderStructure);
    } else {
        folderStructureContent.innerHTML = `<p>Folder structure data not available for the 'main' branch.</p>`;
    }
}

// Back to Top button functionality
window.addEventListener('scroll', function() {
    const btn = document.getElementById('back-to-top');
    if (window.scrollY > 300) {
        btn.style.display = 'block';
    } else {
        btn.style.display = 'none';
    }
});

document.getElementById('back-to-top').addEventListener('click', function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});