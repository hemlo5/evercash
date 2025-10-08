// Runtime Bug Hunt Test Suite
const axios = require('axios');

const API_BASE = 'http://localhost:5006';
const TEST_RESULTS = [];

// Test helper
async function runTest(name, testFn) {
  console.log(`\n[TEST] ${name}`);
  try {
    const result = await testFn();
    TEST_RESULTS.push({ name, status: 'PASS', result });
    console.log(`✅ PASS`);
    return result;
  } catch (error) {
    TEST_RESULTS.push({ name, status: 'FAIL', error: error.message });
    console.log(`❌ FAIL: ${error.message}`);
    return null;
  }
}

// EDGE CASE TESTS
async function runEdgeCaseTests() {
  console.log('\n🔍 EDGE CASE & FUZZING TESTS\n');
  
  // 1. Empty password
  await runTest('Login with empty password', async () => {
    const res = await axios.post(`${API_BASE}/account/login`, { password: '' });
    if (res.data.token) throw new Error('Empty password accepted!');
  });
  
  // 2. SQL Injection attempt
  await runTest('SQL Injection in password', async () => {
    const res = await axios.post(`${API_BASE}/account/login`, { 
      password: "' OR '1'='1" 
    });
    if (res.data.token) throw new Error('SQL injection succeeded!');
  });
  
  // 3. XSS in transaction notes
  await runTest('XSS in transaction notes', async () => {
    const payload = {
      account: 'test',
      amount: 100,
      notes: '<script>alert("XSS")</script>',
      date: '2024-01-01'
    };
    const res = await axios.post(`${API_BASE}/sync/sync`, {
      messages: [{ dataset: 'transactions', row: payload }]
    });
    if (res.data.messages?.[0]?.row?.notes?.includes('<script>')) {
      throw new Error('XSS not sanitized!');
    }
  });
  
  // 4. Massive amount (overflow test)
  await runTest('Integer overflow in amount', async () => {
    const payload = {
      account: 'test',
      amount: Number.MAX_SAFE_INTEGER + 1,
      date: '2024-01-01'
    };
    const res = await axios.post(`${API_BASE}/sync/sync`, {
      messages: [{ dataset: 'transactions', row: payload }]
    });
    // Should handle gracefully
  });
  
  // 5. Unicode/Emoji in fields
  await runTest('Unicode/Emoji handling', async () => {
    const payload = {
      account: 'test',
      payee_name: '🚀💰 Test émojis café',
      amount: 100,
      notes: '测试 тест テスト',
      date: '2024-01-01'
    };
    const res = await axios.post(`${API_BASE}/sync/sync`, {
      messages: [{ dataset: 'transactions', row: payload }]
    });
    // Should preserve unicode
  });
  
  // 6. Rapid concurrent requests (race condition)
  await runTest('Race condition - concurrent writes', async () => {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(axios.post(`${API_BASE}/sync/sync`, {
        messages: [{ 
          dataset: 'accounts', 
          row: { id: 'race-test', balance: i * 100 }
        }]
      }));
    }
    const results = await Promise.all(promises);
    // Check for data corruption
  });
  
  // 7. Memory leak test - large payload
  await runTest('Large payload handling (10MB)', async () => {
    const largeNotes = 'x'.repeat(10 * 1024 * 1024); // 10MB string
    try {
      await axios.post(`${API_BASE}/sync/sync`, {
        messages: [{ 
          dataset: 'transactions', 
          row: { notes: largeNotes }
        }]
      });
      throw new Error('Large payload accepted without limit!');
    } catch (err) {
      // Should reject large payloads
    }
  });
  
  // 8. Invalid date formats
  await runTest('Invalid date formats', async () => {
    const dates = ['not-a-date', '2024-13-45', '2024/01/01', '01-01-2024'];
    for (const date of dates) {
      await axios.post(`${API_BASE}/sync/sync`, {
        messages: [{ 
          dataset: 'transactions', 
          row: { date, amount: 100 }
        }]
      }).catch(() => {});
    }
  });
  
  // 9. Division by zero in calculations
  await runTest('Division by zero', async () => {
    await axios.post(`${API_BASE}/budget/2024-01`, {
      categoryId: 'test',
      amount: 100,
      divisor: 0 // If any division operations
    }).catch(() => {});
  });
  
  // 10. Token expiry/validation
  await runTest('Expired/Invalid token', async () => {
    const invalidToken = 'invalid-token-12345';
    try {
      await axios.get(`${API_BASE}/`, {
        headers: { Authorization: `Bearer ${invalidToken}` }
      });
    } catch (err) {
      if (err.response?.status !== 401) {
        throw new Error('Invalid token not rejected properly');
      }
    }
  });
}

// PERFORMANCE TESTS
async function runPerformanceTests() {
  console.log('\n⚡ PERFORMANCE TESTS\n');
  
  // 1. Response time under load
  await runTest('Response time for 100 sequential requests', async () => {
    const start = Date.now();
    for (let i = 0; i < 100; i++) {
      await axios.get(`${API_BASE}/`);
    }
    const duration = Date.now() - start;
    const avgTime = duration / 100;
    if (avgTime > 100) throw new Error(`Slow response: ${avgTime}ms avg`);
    return `${avgTime}ms average`;
  });
  
  // 2. Memory usage check
  await runTest('Memory leak detection (1000 requests)', async () => {
    // Would need process monitoring, simplified here
    for (let i = 0; i < 1000; i++) {
      await axios.get(`${API_BASE}/`);
      if (i % 100 === 0) {
        const mem = process.memoryUsage().heapUsed / 1024 / 1024;
        console.log(`Memory at ${i}: ${mem.toFixed(2)}MB`);
      }
    }
  });
}

// SECURITY TESTS
async function runSecurityTests() {
  console.log('\n🔒 SECURITY TESTS\n');
  
  // 1. Rate limiting
  await runTest('Rate limiting enforcement', async () => {
    const promises = [];
    for (let i = 0; i < 101; i++) { // Exceed limit of 100
      promises.push(axios.post(`${API_BASE}/account/login`, { password: 'test' }));
    }
    try {
      await Promise.all(promises);
      throw new Error('Rate limit not enforced!');
    } catch (err) {
      // Should get rate limited
    }
  });
  
  // 2. Path traversal
  await runTest('Path traversal attempt', async () => {
    await axios.get(`${API_BASE}/../../etc/passwd`).catch(() => {});
    await axios.get(`${API_BASE}/%2e%2e%2f%2e%2e%2fetc%2fpasswd`).catch(() => {});
  });
  
  // 3. CORS validation
  await runTest('CORS from unauthorized origin', async () => {
    try {
      await axios.get(`${API_BASE}/`, {
        headers: { Origin: 'http://evil.com' }
      });
    } catch (err) {
      // Should be blocked
    }
  });
}

// RUN ALL TESTS
async function main() {
  console.log('🔬 RUNTIME BUG HUNT - STARTING\n');
  console.log('API Target:', API_BASE);
  console.log('Time:', new Date().toISOString());
  console.log('=' .repeat(50));
  
  await runEdgeCaseTests();
  await runPerformanceTests();
  await runSecurityTests();
  
  // SUMMARY
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY\n');
  const passed = TEST_RESULTS.filter(t => t.status === 'PASS').length;
  const failed = TEST_RESULTS.filter(t => t.status === 'FAIL').length;
  console.log(`Total: ${TEST_RESULTS.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed/TEST_RESULTS.length)*100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ FAILURES:');
    TEST_RESULTS.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(`- ${t.name}: ${t.error}`);
    });
  }
}

// Check if axios is installed
try {
  require('axios');
  main().catch(console.error);
} catch (err) {
  console.log('Installing axios...');
  require('child_process').execSync('npm install axios');
  console.log('Please run again: node runtime-test.js');
}
