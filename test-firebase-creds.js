#!/usr/bin/env node

/**
 * Test Firebase credentials parsing
 */

const fs = require('fs');
const path = require('path');

// Load .env.local file
const envFilePath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envFilePath, 'utf-8');

// Use regex to extract the JSON (handles multiline)
const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT_JSON='([\s\S]*?)'\n/);

if (!match || !match[1]) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT_JSON not found in .env.local');
  process.exit(1);
}

const jsonStr = match[1];

console.log('📋 Raw JSON length:', jsonStr.length, 'characters');

try {
  const serviceAccount = JSON.parse(jsonStr);
  
  console.log('\n✅ JSON parsed successfully!');
  console.log('   Project ID:', serviceAccount.project_id);
  console.log('   Client Email:', serviceAccount.client_email);
  console.log('   Has Private Key:', !!serviceAccount.private_key);
  
  // Check private key format
  const originalKeyLength = serviceAccount.private_key.length;
  console.log('   Private Key Length:', originalKeyLength);
  
  // Fix escaped newlines
  const fixedPrivateKey = serviceAccount.private_key.replace(/\\n/g, '\n');
  const fixedKeyLength = fixedPrivateKey.length;
  console.log('   After newline fix:', fixedKeyLength);
  
  // Check PEM format
  if (fixedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    console.log('   ✅ Has BEGIN marker');
  } else {
    console.log('   ❌ Missing BEGIN marker');
  }
  
  if (fixedPrivateKey.includes('-----END PRIVATE KEY-----')) {
    console.log('   ✅ Has END marker');
  } else {
    console.log('   ❌ Missing END marker');
  }
  
  // Count approximately how many newlines there are
  const newlineCount = (fixedPrivateKey.match(/\n/g) || []).length;
  console.log('   Newlines in key:', newlineCount);
  
  console.log('\n✅ Credentials appear valid!');
  
} catch (error) {
  console.error('\n❌ JSON parsing error:', error.message);
  console.log('\n📝 First 200 chars of JSON:');
  console.log(jsonStr.substring(0, 200));
  process.exit(1);
}
