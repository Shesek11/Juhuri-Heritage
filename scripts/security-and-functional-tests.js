/**
 * Comprehensive System Test Suite
 * Run: node scripts/security-and-functional-tests.js
 */

const API_BASE = 'http://localhost:3002/api';

// Test results collector
const results = {
    passed: [],
    failed: [],
    warnings: []
};

// Helper for API calls
async function apiCall(method, endpoint, body = null, headers = {}) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...headers
        }
    };
    if (body) options.body = JSON.stringify(body);

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const data = await response.json().catch(() => ({}));
        return { status: response.status, data, ok: response.ok };
    } catch (err) {
        return { status: 0, data: null, ok: false, error: err.message };
    }
}

function log(type, test, message) {
    const icons = { pass: '✅', fail: '❌', warn: '⚠️', info: 'ℹ️' };
    console.log(`${icons[type] || ''} [${test}] ${message}`);
    if (type === 'pass') results.passed.push({ test, message });
    if (type === 'fail') results.failed.push({ test, message });
    if (type === 'warn') results.warnings.push({ test, message });
}

// ============================================
// FUNCTIONAL TESTS
// ============================================

async function testHealthEndpoint() {
    const res = await apiCall('GET', '/health');
    if (res.ok && res.data.status === 'healthy') {
        log('pass', 'Health', 'Server is healthy');
    } else {
        log('fail', 'Health', `Server health check failed: ${res.status}`);
    }
}

async function testDictionarySearch() {
    // Valid search
    let res = await apiCall('GET', '/dictionary/search?q=שלום');
    if (res.ok) {
        log('pass', 'Dictionary', 'Search endpoint works');
    } else {
        log('fail', 'Dictionary', `Search failed: ${res.status}`);
    }

    // Empty search should return results or handle gracefully
    res = await apiCall('GET', '/dictionary/search?q=');
    if (res.status !== 500) {
        log('pass', 'Dictionary', 'Empty search handled gracefully');
    } else {
        log('fail', 'Dictionary', 'Empty search causes server error');
    }
}

async function testCommentsEndpoint() {
    // GET comments for entry
    let res = await apiCall('GET', '/comments/1');
    if (res.ok || res.status === 404) {
        log('pass', 'Comments', 'GET comments works');
    } else {
        log('fail', 'Comments', `GET comments failed: ${res.status}`);
    }

    // POST without required fields
    res = await apiCall('POST', '/comments', {});
    if (res.status === 400) {
        log('pass', 'Comments', 'Missing fields rejected properly');
    } else {
        log('warn', 'Comments', 'Missing field validation may be weak');
    }
}

async function testRecordingsEndpoint() {
    let res = await apiCall('GET', '/recordings/1');
    if (res.ok || res.status === 404) {
        log('pass', 'Recordings', 'GET recordings works');
    } else {
        log('fail', 'Recordings', `GET recordings failed: ${res.status}`);
    }
}

async function testGamificationEndpoint() {
    let res = await apiCall('GET', '/gamification/stats/test-user');
    if (res.status !== 500) {
        log('pass', 'Gamification', 'Stats endpoint accessible');
    } else {
        log('fail', 'Gamification', 'Stats endpoint error');
    }
}

// ============================================
// SECURITY TESTS
// ============================================

async function testSQLInjection() {
    const payloads = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "1; SELECT * FROM users",
        "admin'--",
        "' UNION SELECT * FROM users --"
    ];

    for (const payload of payloads) {
        // Test in search query
        let res = await apiCall('GET', `/dictionary/search?q=${encodeURIComponent(payload)}`);
        if (res.status === 500) {
            log('fail', 'SQL Injection', `Search vulnerable to: ${payload.substring(0, 20)}...`);
        }

        // Test in comments
        res = await apiCall('POST', '/comments', {
            entryId: payload,
            content: 'test',
            guestName: 'test'
        });
        if (res.status === 500) {
            log('warn', 'SQL Injection', `Comments may be vulnerable to: ${payload.substring(0, 20)}...`);
        }
    }

    log('pass', 'SQL Injection', 'Basic SQL injection tests completed');
}

async function testXSS() {
    const payloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        '"><script>alert("XSS")</script>',
        "javascript:alert('XSS')",
        '<svg onload=alert("XSS")>'
    ];

    for (const payload of payloads) {
        // Test in comments
        let res = await apiCall('POST', '/comments', {
            entryId: 1,
            content: payload,
            guestName: 'XSS Test'
        });

        // Check if payload is stored/returned as-is (would need sanitization on frontend)
        if (res.ok) {
            log('warn', 'XSS', 'Payload accepted - ensure frontend sanitizes output');
        }
    }

    log('info', 'XSS', 'XSS payloads tested - verify frontend sanitization');
}

async function testPathTraversal() {
    const payloads = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc/passwd'
    ];

    for (const payload of payloads) {
        // Test in any file-related endpoints
        let res = await apiCall('GET', `/recordings/${encodeURIComponent(payload)}`);
        if (res.status === 200) {
            log('fail', 'Path Traversal', `Possible vulnerability with: ${payload}`);
        }
    }

    log('pass', 'Path Traversal', 'Path traversal tests completed');
}

async function testAuthBypass() {
    // Test admin endpoints without auth
    let res = await apiCall('GET', '/comments/admin/pending');
    if (res.ok && res.data.comments) {
        log('warn', 'Auth Bypass', 'Admin pending comments accessible without auth');
    } else {
        log('pass', 'Auth Bypass', 'Admin endpoints properly protected or empty');
    }

    res = await apiCall('GET', '/recordings/admin/pending');
    if (res.ok && res.data.recordings) {
        log('warn', 'Auth Bypass', 'Admin pending recordings accessible without auth');
    }

    // Test approve without auth
    res = await apiCall('POST', '/comments/999/approve');
    if (res.ok) {
        log('warn', 'Auth Bypass', 'Comment approval may not require auth');
    }
}

async function testRateLimiting() {
    // Send rapid requests
    const startTime = Date.now();
    const requests = [];

    for (let i = 0; i < 20; i++) {
        requests.push(apiCall('GET', '/dictionary/search?q=test'));
    }

    const responses = await Promise.all(requests);
    const blocked = responses.filter(r => r.status === 429).length;

    if (blocked > 0) {
        log('pass', 'Rate Limiting', `${blocked}/20 requests blocked`);
    } else {
        log('warn', 'Rate Limiting', 'No rate limiting detected - consider implementing');
    }
}

async function testInputValidation() {
    // Very long input
    const longString = 'A'.repeat(100000);
    let res = await apiCall('POST', '/comments', {
        entryId: 1,
        content: longString,
        guestName: 'test'
    });
    if (res.status === 400 || res.status === 413) {
        log('pass', 'Input Validation', 'Long input rejected');
    } else if (res.ok) {
        log('warn', 'Input Validation', 'Very long input accepted - verify limits');
    }

    // Invalid types
    res = await apiCall('POST', '/comments', {
        entryId: 'not-a-number',
        content: 123,
        guestName: null
    });
    if (res.status === 400) {
        log('pass', 'Input Validation', 'Invalid types rejected');
    } else {
        log('warn', 'Input Validation', 'Type validation may be weak');
    }
}

async function testCORS() {
    // This would need to be tested from browser
    log('info', 'CORS', 'CORS must be tested from browser with different origin');
}

// ============================================
// MAIN
// ============================================

async function runAllTests() {
    console.log('\n🔍 Starting Comprehensive System Tests...\n');
    console.log('='.repeat(50));

    console.log('\n📋 FUNCTIONAL TESTS\n');
    await testHealthEndpoint();
    await testDictionarySearch();
    await testCommentsEndpoint();
    await testRecordingsEndpoint();
    await testGamificationEndpoint();

    console.log('\n🔐 SECURITY TESTS\n');
    await testSQLInjection();
    await testXSS();
    await testPathTraversal();
    await testAuthBypass();
    await testRateLimiting();
    await testInputValidation();
    await testCORS();

    console.log('\n' + '='.repeat(50));
    console.log('\n📊 SUMMARY\n');
    console.log(`✅ Passed: ${results.passed.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`⚠️ Warnings: ${results.warnings.length}`);

    if (results.failed.length > 0) {
        console.log('\n❌ FAILED TESTS:');
        results.failed.forEach(f => console.log(`   - ${f.test}: ${f.message}`));
    }

    if (results.warnings.length > 0) {
        console.log('\n⚠️ WARNINGS:');
        results.warnings.forEach(w => console.log(`   - ${w.test}: ${w.message}`));
    }

    console.log('\n');
}

runAllTests();
