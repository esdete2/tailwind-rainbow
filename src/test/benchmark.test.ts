import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { TailwindRainbowAPI } from '../extension';

interface BenchmarkMeasurement {
  operation: string;
  duration: number;
  timestamp: number;
  documentSize: number;
  languageId: string;
}

/**
 * Dedicated benchmark test suite for performance measurement
 * Uses realistic content and multiple iterations for reliable metrics
 */
suite('Benchmark Test Suite', function () {
  let api: TailwindRainbowAPI;
  let doc: vscode.TextDocument;
  let editor: vscode.TextEditor;
  let measurements: BenchmarkMeasurement[] = [];

  // Helper function to measure api.getTokenRanges performance
  function measureTokenRanges(testEditor: vscode.TextEditor): Map<string, vscode.Range[]> {
    const startTime = performance.now();
    const timestamp = Date.now();
    const documentSize = testEditor.document.getText().length;
    const languageId = testEditor.document.languageId;

    const result = api.getTokenRanges(testEditor);

    const duration = performance.now() - startTime;
    measurements.push({
      operation: 'getTokenRanges',
      duration,
      timestamp,
      documentSize,
      languageId,
    });

    return result;
  }

  // Realistic HTML content from example.html
  const benchmarkContent = `<!-- Responsive -->
<div class="sm:flex md:grid lg:inline xl:hidden 2xl:contents"></div>

<!-- Pseudo-elements -->
<div class="before:content-['*'] after:content-['>']"></div>

<!-- Interactive states -->
<button class="hover:bg-blue-500 focus:ring active:scale-95"></button>

<!-- Relational states -->
<div class="group-hover/edit:visible group-focus:outline-none group-active:scale-95"></div>

<div class="peer-hover:translate-x-1 peer-focus:border-blue-500 peer-active:scale-95"></div>

<!-- Modes -->
<div class="dark:bg-gray-800"></div>

<!-- Form states -->
<input class="placeholder:text-neutral-300 checked:bg-blue-500 valid:border-green-500" />

<input class="invalid:border-red-500 disabled:opacity-50 required:required" />

<!-- Selection states -->
<div class="first:rounded-t-md last:rounded-b-md only:rounded-md odd:bg-gray-100 even:bg-gray-200"></div>

<!-- Additional complex patterns -->
<div class="hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-600"></div>
<div class="lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1"></div>
<div class="*:bg-blue-500 **:text-white [&.active]:bg-red-500"></div>
<div class="min-[640px]:text-sm max-[767px]:hidden"></div>
<div class="supports-[display:grid]:grid supports-[backdrop-filter]:backdrop-blur"></div>
<div class="min-[1920px]:max-w-sm max-sm:w-full"></div>
<div class="dark:sm:hover:before:focus:text-blue-500"></div>
<div class="!before:content-['*'] after:content-['>>']"></div>
<div class="lg:hover:bg-red-500 active:text-black"></div>
<div class="!before:content-['test'] hover:text-xl"></div>`;

  // Update test file content
  async function updateBenchmarkFile(content: string): Promise<void> {
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
    edit.replace(doc.uri, fullRange, content);
    await vscode.workspace.applyEdit(edit);

    // Wait for document to update
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  suiteSetup(async () => {
    const extension = vscode.extensions.getExtension('esdete.tailwind-rainbow');
    if (!extension) {
      throw new Error('Extension not found');
    }
    api = await extension.activate();

    doc = await vscode.workspace.openTextDocument({
      content: benchmarkContent,
      language: 'html',
    });
    editor = await vscode.window.showTextDocument(doc);
  });

  setup(async () => {
    // Ensure our main editor is active and ready
    if (!editor || editor.document.isClosed) {
      editor = await vscode.window.showTextDocument(doc);
    }

    // Reset content for each test
    await updateBenchmarkFile(benchmarkContent);
  });

  test('should benchmark tokenizer performance with multiple iterations', async function () {
    this.timeout(30000);

    const iterations = 100;
    console.log(`Running ${iterations} iterations for benchmark measurement...`);

    for (let i = 0; i < iterations; i++) {
      const tokenRanges = measureTokenRanges(editor);
      assert.ok(tokenRanges.size > 0, 'Should find prefix ranges');

      if ((i + 1) % 20 === 0) {
        console.log(`  Completed ${i + 1}/${iterations} iterations`);
      }
    }

    console.log(`Completed ${iterations} benchmark iterations`);
  });

  test('should benchmark with varying document sizes', async function () {
    this.timeout(30000);

    const baseContent = benchmarkContent;
    const sizes = [1, 2, 5, 10];

    console.log('Testing performance with varying document sizes...');

    for (const multiplier of sizes) {
      const repeatedContent = Array(multiplier).fill(baseContent).join('\n\n');
      await updateBenchmarkFile(repeatedContent);

      console.log(`  Testing with ${multiplier}x content (${repeatedContent.length} chars)`);

      for (let i = 0; i < 10; i++) {
        const tokenRanges = measureTokenRanges(editor);
        assert.ok(tokenRanges.size > 0, 'Should find prefix ranges');
      }
    }

    console.log('Completed varying document size tests');
  });

  test('should benchmark with different language files', async function () {
    this.timeout(30000);

    const testCases = [
      {
        language: 'javascript',
        content: `
const Button = tw\`
  bg-blue-500 hover:bg-blue-600
  text-white font-bold py-2 px-4 rounded
  lg:text-xl md:p-6 sm:p-4
\`;

const className = "hover:bg-red-500 focus:ring-2 sm:opacity-75";
        `.trim(),
      },
      {
        language: 'typescript',
        content: `
interface Props {
  className?: string;
}

const Component: React.FC<Props> = ({ className }) => (
  <div className={\`base-class hover:bg-blue-600 focus:ring-2 \${className}\`}>
    <span className="sm:text-sm lg:text-lg">Content</span>
  </div>
);
        `.trim(),
      },
      {
        language: 'css',
        content: `
.btn {
  @apply bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded;
}

.responsive-grid {
  @apply grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4;
}

@media (max-width: 640px) {
  .mobile-only {
    @apply block sm:hidden p-4 focus:outline-none;
  }
}
        `.trim(),
      },
    ];

    console.log('Testing performance with different language files...');

    for (const testCase of testCases) {
      console.log(`  Testing ${testCase.language} file...`);

      const langDoc = await vscode.workspace.openTextDocument({
        content: testCase.content,
        language: testCase.language,
      });
      const langEditor = await vscode.window.showTextDocument(langDoc);

      for (let i = 0; i < 20; i++) {
        measureTokenRanges(langEditor);
      }

      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
    }

    console.log('Completed different language file tests');
  });

  function calculateStats(durations: number[]) {
    const sorted = [...durations].sort((a, b) => a - b);
    const count = durations.length;
    const totalTime = durations.reduce((sum, d) => sum + d, 0);

    return {
      count,
      totalTime,
      averageTime: totalTime / count,
      minTime: sorted[0],
      maxTime: sorted[sorted.length - 1],
      p95Time: sorted[Math.floor(sorted.length * 0.95)],
      p99Time: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  function getBranchName(): string {
    try {
      const { execSync } = require('child_process');
      return execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  function getCommitHash(): string {
    try {
      const { execSync } = require('child_process');
      return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  suiteTeardown(async function () {
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (measurements.length === 0) {
      console.log('No benchmark measurements collected');
      return;
    }

    const durations = measurements.map((m) => m.duration);
    const stats = calculateStats(durations);

    console.log('\n=== Benchmark Results ===');
    console.log(`Total measurements: ${stats.count}`);
    console.log(`Average time: ${stats.averageTime.toFixed(3)}ms`);
    console.log(`Min time: ${stats.minTime.toFixed(3)}ms`);
    console.log(`Max time: ${stats.maxTime.toFixed(3)}ms`);
    console.log(`P95 time: ${stats.p95Time.toFixed(3)}ms`);
    console.log(`P99 time: ${stats.p99Time.toFixed(3)}ms`);

    // Generate timestamped benchmark file
    const timestamp = new Date().toISOString().replace(/[:.-]/g, '').replace('T', '_').substring(0, 15);
    const branch = getBranchName();
    const commit = getCommitHash();

    const benchmarkData = {
      metadata: {
        timestamp: new Date().toISOString(),
        branch,
        commit,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      summary: {
        totalMeasurements: stats.count,
        averageTime: stats.averageTime,
        minTime: stats.minTime,
        maxTime: stats.maxTime,
        p95Time: stats.p95Time,
        p99Time: stats.p99Time,
      },
    };

    const filename = `benchmark-${branch}-${timestamp}.json`;
    const benchmarkDir = path.join(process.cwd(), 'benchmark');

    if (!fs.existsSync(benchmarkDir)) {
      fs.mkdirSync(benchmarkDir, { recursive: true });
    }

    const filepath = path.join(benchmarkDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(benchmarkData, null, 2));

    console.log(`Benchmark results saved to: benchmark/${filename}`);
    console.log(`Branch: ${branch} (${commit})`);
  });
});
