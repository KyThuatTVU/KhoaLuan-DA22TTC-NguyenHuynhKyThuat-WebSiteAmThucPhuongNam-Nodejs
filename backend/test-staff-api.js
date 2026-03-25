/**
 * Test script để kiểm tra API staff
 */

const http = require('http');

function testAPI(path, method = 'GET') {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`\n${method} ${path}`);
                console.log(`Status: ${res.statusCode}`);
                try {
                    const json = JSON.parse(data);
                    console.log('Response:', JSON.stringify(json, null, 2));
                    resolve(json);
                } catch (e) {
                    console.log('Response:', data);
                    resolve(data);
                }
            });
        });

        req.on('error', (error) => {
            console.error(`Error testing ${path}:`, error.message);
            reject(error);
        });

        req.end();
    });
}

async function runTests() {
    console.log('=== Testing Staff API ===\n');
    
    try {
        // Test 1: Get all staff
        await testAPI('/api/staff', 'GET');
        
        // Test 2: Test login
        console.log('\n--- Testing Login ---');
        const loginReq = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/staff/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                console.log(`Status: ${res.statusCode}`);
                console.log('Response:', JSON.parse(data));
            });
        });
        
        loginReq.write(JSON.stringify({
            tai_khoan: 'admin',
            mat_khau: 'admin123'
        }));
        loginReq.end();
        
    } catch (error) {
        console.error('Test failed:', error);
    }
}

runTests();
