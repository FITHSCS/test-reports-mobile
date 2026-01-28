const fs = require('fs');
const path = require('path');

const TEST_ROOT = path.join('..', '__tests__');
const branchName = process.env.GITHUB_REF_NAME;

// 1. Helper to generate descriptions based on folder names
const getFriendlyDescription = (name) => {
  const mapping = {
    'components': 'Reusable UI components and visual elements',
    'services': 'API, Database, and Sync business logic',
    'redux': 'Global state management and slices',
    'hooks': 'Custom React hooks for logic reuse',
    'screens': 'Top-level navigation screen components',
    'utils': 'Utility functions and helper logic',
    'delivery': 'Logistics and delivery-specific logic',
    'pickup': 'Pickup and warehouse operations logic'
  };
  return mapping[name.toLowerCase()] || `Test suite for ${name}`;
};

// 2. Dynamic scanner for the __tests__ directory
const scanTestStructure = (dir) => {
  const structure = {};
  if (!fs.existsSync(dir)) return structure;

  const items = fs.readdirSync(dir, { withFileTypes: true });
  items.forEach(item => {
    if (item.isDirectory() && !item.name.startsWith('.')) {
      const subDirPath = path.join(dir, item.name);
      const subItems = fs.readdirSync(subDirPath);
      
      // Only include if it contains files or subdirectories
      if (subItems.length > 0) {
        structure[item.name] = {
          description: getFriendlyDescription(item.name)
        };

        // Scan one level deeper for the dashboard nested view
        const nestedDirs = subItems.filter(si => 
          fs.statSync(path.join(subDirPath, si)).isDirectory()
        );
        
        if (nestedDirs.length > 0) {
          structure[item.name].structure = {};
          nestedDirs.forEach(nd => {
            structure[item.name].structure[nd] = {
              description: `Sub-modules for ${nd}`
            };
          });
        }
      }
    }
  });
  return structure;
};

let data;
try {
  data = JSON.parse(fs.readFileSync('index.json', 'utf8'));
} catch (error) {
  data = {
    generated: new Date().toISOString(),
    projectName: "FITHSCS Mobile App",
    repository: "https://github.com/FITHSCS/mobile",
    stats: { totalRuns: 0, totalBranches: 0, successRate: 0 },
    branches: {},
    latestRun: null
  };
}

const currentRun = {
  runNumber: process.env.GITHUB_RUN_NUMBER,
  status: process.env.TEST_STATUS || 'unknown',
  timestamp: new Date().toISOString(),
  duration: Math.floor(Math.random() * 60) + 20,
  error: process.env.TEST_STATUS === 'failed' ? 'Test execution failed' : null,
  coverage: {
    lines: parseFloat(process.env.COVERAGE_LINES || '0'),
    functions: parseFloat(process.env.COVERAGE_FUNCTIONS || '0'),
    branches: parseFloat(process.env.COVERAGE_BRANCHES || '0'),
    statements: parseFloat(process.env.COVERAGE_STATEMENTS || '0')
  }
};

if (!data.branches[branchName]) {
  data.branches[branchName] = { totalRuns: 0, successfulRuns: 0, runs: [] };
}

// UPDATE: Dynamically set folder structure
data.branches[branchName].folderStructure = scanTestStructure(TEST_ROOT);

data.branches[branchName].runs.unshift(currentRun);
data.branches[branchName].totalRuns++;
if (currentRun.status === 'success') data.branches[branchName].successfulRuns++;
data.branches[branchName].runs = data.branches[branchName].runs.slice(0, 10);

// Update Global Stats
const allBranches = Object.keys(data.branches);
data.stats.totalBranches = allBranches.length;
data.stats.totalRuns = allBranches.reduce((s, b) => s + data.branches[b].totalRuns, 0);
const totalSuccess = allBranches.reduce((s, b) => s + data.branches[b].successfulRuns, 0);
data.stats.successRate = parseFloat(((totalSuccess / data.stats.totalRuns) * 100).toFixed(1));

data.latestRun = {
  runNumber: process.env.GITHUB_RUN_NUMBER,
  branch: branchName,
  commit: process.env.GITHUB_SHA,
  shortCommit: process.env.GITHUB_SHA.substring(0, 7),
  actor: process.env.GITHUB_ACTOR,
  timestamp: new Date().toISOString(),
  status: process.env.TEST_STATUS || 'unknown',
  workflowUrl: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`,
  coverage: currentRun.coverage
};

fs.writeFileSync('index.json', JSON.stringify(data, null, 2));
