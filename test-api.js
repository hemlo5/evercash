// Test script to verify Actual Budget API connection
// Run this with: node test-api.js

const fetch = require('node-fetch');

async function testConnection() {
  console.log('Testing connection to Actual Budget server...');
  
  try {
    // Test basic connection
    const response = await fetch('http://localhost:5006/');
    if (response.ok) {
      const data = await response.json();
      console.log('✓ Server is running:', data);
    } else {
      console.error('✗ Server responded with:', response.status);
    }
    
    // Test if needs bootstrap
    const bootstrapResponse = await fetch('http://localhost:5006/account/needs-bootstrap');
    const bootstrapData = await bootstrapResponse.json();
    console.log('Bootstrap status:', bootstrapData);
    
    // If you have a password, uncomment and test login:
    // const loginResponse = await fetch('http://localhost:5006/account/login', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ password: 'YOUR_PASSWORD' })
    // });
    // const loginData = await loginResponse.json();
    // console.log('Login response:', loginData);
    
  } catch (error) {
    console.error('✗ Failed to connect:', error.message);
    console.error('Make sure Actual Budget server is running with:');
    console.error('  npx @actual-app/api');
  }
}

testConnection();
