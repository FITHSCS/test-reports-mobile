const fs = require('fs');

// Read existing data or create new structure
let data;
try {
  data = JSON.parse(fs.readFileSync('index.json', 'utf8'));
} catch (error) {
  console.log('Creating new index.json structure');
  data = {
    // Initialize top-level metadata here for new data
    generated: new Date().toISOString(),
    projectName: "FITHSCS Mobile App",
    repository: "https://github.com/FITHSCS/mobile",
    stats: { totalRuns: 0, totalBranches: 0, successRate: 0 },
    branches: {},
    latestRun: null // Will be populated below
  };
}

// Current run data from GitHub Actions environment variables
const currentRun = {
  runNumber: process.env.GITHUB_RUN_NUMBER,
  status: process.env.TEST_STATUS || 'unknown',
  timestamp: new Date().toISOString(),
  duration: Math.floor(Math.random() * 60) + 20, // Placeholder for actual duration
  error: process.env.TEST_STATUS === 'failed' ? 'Test execution failed - check logs for details' : null,
  // NEW: Include coverage data passed from the 'test' job outputs
  coverage: {
    lines: parseFloat(process.env.COVERAGE_LINES || '0'),
    functions: parseFloat(process.env.COVERAGE_FUNCTIONS || '0'),
    branches: parseFloat(process.env.COVERAGE_BRANCHES || '0'),
    statements: parseFloat(process.env.COVERAGE_STATEMENTS || '0')
  }
};

const branchName = process.env.GITHUB_REF_NAME;

// Initialize branch data if it doesn't exist
if (!data.branches[branchName]) {
  data.branches[branchName] = {
    totalRuns: 0,
    successfulRuns: 0,
    runs: [],
    folderStructure: {} // Initialize folder structure to prevent undefined errors
  };
}

// Add current run to branch data (unshift adds to the beginning for latest first)
data.branches[branchName].runs.unshift(currentRun);
data.branches[branchName].totalRuns++;

if (currentRun.status === 'success') {
  data.branches[branchName].successfulRuns++;
}

// Keep only last 10 runs per branch to prevent data file from growing indefinitely
data.branches[branchName].runs = data.branches[branchName].runs.slice(0, 10);

// Add folder structure for main branch if it's the main branch and structure doesn't exist or is empty
if (branchName === 'main' && (!data.branches[branchName].folderStructure || Object.keys(data.branches[branchName].folderStructure).length === 0)) {
  data.branches[branchName].folderStructure = {
    app: {
      description: "Main application modules and features",
      structure: {
        "navigation": { description: "Main app tabs with navigation" },
        "delivery": { description: "Delivery management screens" }
      }
    },
    components: {
      description: "Reusable UI components",
      structure: {
        "battery": { description: "Battery status components" },
        "common": { description: "Common UI elements" },
        "delivery": { description: "Delivery-specific components" },
        "ePickup": { description: "Electronic pickup components" },
        "ePod": { description: "Electronic proof of delivery" },
        "map": { description: "Map integration components" },
        "scanner": { description: "QR/Barcode scanning components" },
        "ui": { description: "Core UI components" },
        "__tests__": { description: "Component unit tests" }
      }
    },
    services: {
      description: "Business logic and external integrations",
      structure: {
        "api": { description: "API integration services" },
        "database": { description: "Local database operations" },
        "sync": { description: "Data synchronization logic" }
      }
    },
    redux: {
      description: "State management with Redux Toolkit"
    },
    hooks: {
      description: "Custom React hooks"
    },
    utils: {
      description: "Utility functions and helpers"
    }
  };
}

// Update overall stats by iterating through all branches
const allBranchesKeys = Object.keys(data.branches);
data.stats.totalBranches = allBranchesKeys.length;
data.stats.totalRuns = allBranchesKeys.reduce((sum, branchKey) => sum + data.branches[branchKey].totalRuns, 0);

const totalSuccessful = allBranchesKeys.reduce((sum, branchKey) => sum + data.branches[branchKey].successfulRuns, 0);
data.stats.successRate = data.stats.totalRuns > 0 ? 
  parseFloat(((totalSuccessful / data.stats.totalRuns) * 100).toFixed(1)) : 0; // Ensure 1 decimal place

// Update top-level latestRun metadata for the dashboard header
data.latestRun = {
  runNumber: process.env.GITHUB_RUN_NUMBER,
  branch: branchName,
  commit: process.env.GITHUB_SHA,
  shortCommit: process.env.GITHUB_SHA.substring(0, 7),
  actor: process.env.GITHUB_ACTOR,
  timestamp: new Date().toISOString(),
  status: process.env.TEST_STATUS || 'unknown',
  workflowUrl: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,
  coverage: currentRun.coverage // Include coverage in latestRun
};

// Write the updated data back to index.json
fs.writeFileSync('index.json', JSON.stringify(data, null, 2));
console.log('Updated index.json with new test run data including coverage.');
