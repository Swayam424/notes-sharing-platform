import http from 'node:http';
import { fork } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TOTAL_REQUESTS = 10000;
const CONCURRENCY = 200; // 200 simultaneous in-flight connections to avoid OS ephemeral port limits

const ENDPOINTS = [
  '/api/health',
  '/api/subjects',
  '/api/notes',
  '/api/pyqs',
  '/api/contributors/leaderboard'
];

// High-performance HTTP agent with keep-alive
const agent = new http.Agent({
  keepAlive: true,
  maxSockets: CONCURRENCY,
  maxFreeSockets: 50,
  timeout: 10000
});

async function waitForServer(port = 3001, maxRetries = 30) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/api/health`, { agent: false }, (res) => {
          if (res.statusCode === 200) resolve();
          else reject(new Error(`Status ${res.statusCode}`));
        });
        req.on('error', reject);
        req.setTimeout(1000, () => req.destroy());
      });
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  return false;
}

function getRandomIp() {
  const b = Math.floor(Math.random() * 250) + 1;
  const c = Math.floor(Math.random() * 250) + 1;
  const d = Math.floor(Math.random() * 250) + 1;
  return `10.${b}.${c}.${d}`;
}

async function sendRequest(index) {
  const endpoint = ENDPOINTS[index % ENDPOINTS.length];
  const simulatedIp = getRandomIp();
  const startTime = performance.now();

  return new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3001,
      path: endpoint,
      method: 'GET',
      agent,
      headers: {
        'X-Forwarded-For': simulatedIp,
        'Connection': 'keep-alive',
        'User-Agent': `LoadTest-Customer-${index}`
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const duration = performance.now() - startTime;
        resolve({
          status: res.statusCode,
          duration,
          error: null
        });
      });
    });

    req.on('error', (err) => {
      const duration = performance.now() - startTime;
      resolve({
        status: 0,
        duration,
        error: err.code || err.message
      });
    });

    req.setTimeout(8000, () => {
      req.destroy();
      const duration = performance.now() - startTime;
      resolve({
        status: 408,
        duration,
        error: 'ETIMEDOUT'
      });
    });

    req.end();
  });
}

async function run() {
  console.log('================================================================');
  console.log(`🚀 STARTING STRESS TEST: 10,000 CUSTOMERS SIMULTANEOUS ACCESS`);
  console.log(`Total Requests: ${TOTAL_REQUESTS}`);
  console.log(`Concurrent Workers: ${CONCURRENCY}`);
  console.log('================================================================\n');

  console.log('[1/4] Spawning Atelier Node.js Server...');
  const serverPath = path.resolve(process.cwd(), 'server', 'src', 'server.js');
  const serverProc = fork(serverPath, [], { stdio: 'pipe' });

  let serverOutput = '';
  serverProc.stdout.on('data', (d) => { serverOutput += d.toString(); });
  serverProc.stderr.on('data', (d) => { serverOutput += d.toString(); });

  let serverCrashed = false;
  serverProc.on('exit', (code, signal) => {
    serverCrashed = true;
    console.error(`\n🚨 SERVER CRASHED! Exit code: ${code}, Signal: ${signal}`);
  });

  const ready = await waitForServer(3001);
  if (!ready) {
    console.error('❌ Failed to connect to server on port 3001.');
    console.error('Server output:\n', serverOutput);
    serverProc.kill();
    process.exit(1);
  }
  console.log('✅ Server online and accepting connections on port 3001.\n');

  console.log('[2/4] Firing 10,000 simulated customer requests...');
  const overallStart = performance.now();

  const results = [];
  let completed = 0;
  let cursor = 0;

  async function worker() {
    while (cursor < TOTAL_REQUESTS) {
      const idx = cursor++;
      const result = await sendRequest(idx);
      results.push(result);
      completed++;
      if (completed % 2000 === 0) {
        const elapsed = ((performance.now() - overallStart) / 1000).toFixed(1);
        console.log(`   ➔ Completed ${completed} / ${TOTAL_REQUESTS} requests (${elapsed}s elapsed)`);
      }
    }
  }

  // Spawn pool of concurrency workers
  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  const totalTimeSeconds = (performance.now() - overallStart) / 1000;
  console.log('\n[3/4] Checking server health after 10,000 requests...');

  let postHealth = null;
  try {
    postHealth = await new Promise((resolve, reject) => {
      const req = http.get('http://127.0.0.1:3001/api/health', { agent: false }, (res) => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => resolve(JSON.parse(b)));
      });
      req.on('error', reject);
    });
  } catch (e) {
    postHealth = null;
  }

  console.log('[4/4] Compiling Load & Stress Analytics...\n');

  // Kill server process
  serverProc.kill('SIGINT');

  // Stats calculation
  const statusCounts = {};
  const errorCounts = {};
  const latencies = [];

  for (const r of results) {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    if (r.error) {
      errorCounts[r.error] = (errorCounts[r.error] || 0) + 1;
    }
    latencies.push(r.duration);
  }

  latencies.sort((a, b) => a - b);
  const sum = latencies.reduce((a, b) => a + b, 0);
  const mean = (sum / latencies.length).toFixed(2);
  const p50 = latencies[Math.floor(latencies.length * 0.50)].toFixed(2);
  const p95 = latencies[Math.floor(latencies.length * 0.95)].toFixed(2);
  const p99 = latencies[Math.floor(latencies.length * 0.99)].toFixed(2);
  const min = latencies[0].toFixed(2);
  const max = latencies[latencies.length - 1].toFixed(2);
  const rps = (TOTAL_REQUESTS / totalTimeSeconds).toFixed(1);

  console.log('================================================================');
  console.log('📊 10,000 CUSTOMER LOAD TEST BENCHMARK RESULTS');
  console.log('================================================================');
  console.log(`Server Survived Crash? : ${!serverCrashed && postHealth ? '✅ YES (STABLE & RESPONDING)' : '❌ NO (CRASHED / UNRESPONSIVE)'}`);
  console.log(`Total Requests Handled : ${TOTAL_REQUESTS}`);
  console.log(`Total Time Elapsed     : ${totalTimeSeconds.toFixed(2)} seconds`);
  console.log(`Throughput             : ${rps} Requests / Second (RPS)`);
  console.log(`\nLatency Percentiles:`);
  console.log(`  Min Latency          : ${min} ms`);
  console.log(`  P50 (Median) Latency : ${p50} ms`);
  console.log(`  Mean Average Latency : ${mean} ms`);
  console.log(`  P95 Latency          : ${p95} ms`);
  console.log(`  P99 Latency          : ${p99} ms`);
  console.log(`  Max Latency          : ${max} ms`);
  console.log(`\nHTTP Response Code Distribution:`);
  for (const [code, count] of Object.entries(statusCounts)) {
    console.log(`  HTTP ${code}            : ${count} (${((count / TOTAL_REQUESTS) * 100).toFixed(1)}%)`);
  }
  if (Object.keys(errorCounts).length > 0) {
    console.log(`\nConnection Errors:`);
    for (const [err, count] of Object.entries(errorCounts)) {
      console.log(`  ${err} : ${count}`);
    }
  }
  if (postHealth) {
    console.log(`\nPost-Test Server Health & Memory:`);
    console.log(`  Database Status      : ${postHealth.database}`);
    console.log(`  Uptime               : ${postHealth.uptimeSeconds}s`);
    console.log(`  RSS Memory           : ${postHealth.memory.rssMb} MB`);
    console.log(`  Heap Used            : ${postHealth.memory.heapUsedMb} MB`);
    console.log(`  Heap Total           : ${postHealth.memory.heapTotalMb} MB`);
  }
  console.log('================================================================\n');

  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal load test runner error:', err);
  process.exit(1);
});
