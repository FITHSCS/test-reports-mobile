const fs = require('fs');

// Read existing data or create new structure
let data;
try {
  data = JSON.parse(fs.readFileSync('index.json', 'utf8'));
} catch (error) {
  console.log('Creating new index.json structure');
  data = {
    stats: { totalRuns: 0, totalBranches: 0, successRate: 0 },
    branches: {}
  };
}

// Current run data from GitHub Actions
const currentRun = {
  runNumber: process.env.GITHUB_RUN_NUMBER,
  status: process.env.TEST_STATUS || 'unknown',
  timestamp: new Date().toISOString(),
  duration: Math.floor(Math.random() * 60) + 20, // Placeholder
  error: process.env.TEST_STATUS === 'failed' ? 'Test execution failed - check logs for details' : null
};

const branchName = process.env.GITHUB_REF_NAME;

// Initialize branch data if it doesn't exist
if (!data.branches[branchName]) {
  data.branches[branchName] = {
    totalRuns: 0,
    successfulRuns: 0,
    runs: []
  };
}

// Add current run to branch data
data.branches[branchName].runs.unshift(currentRun);
data.branches[branchName].totalRuns++;

if (currentRun.status === 'success') {
  data.branches[branchName].successfulRuns++;
}

// Keep only last 10 runs per branch
data.branches[branchName].runs = data.branches[branchName].runs.slice(0, 10);

// Add folder structure for main branch if it doesn't exist
if (branchName === 'main' && !data.branches[branchName].folderStructure) {
  data.branches[branchName].folderStructure = {
    src: {
      description: "Source code directory",
      structure: {
        components: { description: "React Native components" },
        screens: { description: "App screens" },
        services: { description: "API and service functions" },
        utils: { description: "Utility functions" }
      }
    },
    tests: {
      description: "Test files",
      structure: {
        unit: { description: "Unit tests" },
        integration: { description: "Integration tests" },
        e2e: { description: "End-to-end tests" }
      }
    },
    docs: { description: "Documentation files" },
    config: { description: "Configuration files" }
  };
}

// Update overall stats
const allBranches = Object.keys(data.branches);
data.stats.totalBranches = allBranches.length;
data.stats.totalRuns = allBranches.reduce((sum, branch) => sum + data.branches[branch].totalRuns, 0);

const totalSuccessful = allBranches.reduce((sum, branch) => sum + data.branches[branch].successfulRuns, 0);
data.stats.successRate = data.stats.totalRuns > 0 ? 
  Math.round((totalSuccessful / data.stats.totalRuns) * 100 * 10) / 10 : 0;

// Update metadata
data.generated = new Date().toISOString(); // Initialize generated timestamp for new data
data.projectName = "FITHSCS Mobile App";
data.repository = "https://github.com/FITHSCS/mobile";
data.latestRun = {
  runNumber: process.env.GITHUB_RUN_NUMBER,
  branch: branchName,
  commit: process.env.GITHUB_SHA,
  shortCommit: process.env.GITHUB_SHA.substring(0, 7),
  actor: process.env.GITHUB_ACTOR,
  timestamp: new Date().toISOString(),
  status: process.env.TEST_STATUS || 'unknown',
  workflowUrl: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
};

// Write updated data
fs.writeFileSync('index.json', JSON.stringify(data, null, 2));
console.log('Updated index.json with new test run data');
