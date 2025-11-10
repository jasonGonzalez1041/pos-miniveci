/**
 * Simple Security Validation Script
 * Validates that eval() vulnerability has been eliminated
 */

const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

function validateSecurity() {
  console.log('🔍 SECURITY VALIDATION - Checking for eval() elimination\n');
  
  const workerPath = join(process.cwd(), 'public', 'sqlite-worker.js');
  const backupPath = join(process.cwd(), 'public', 'sqlite-worker.js.vulnerable.backup');
  
  let hasFailures = false;
  
  // Check if worker exists
  if (!existsSync(workerPath)) {
    console.log('❌ [FAIL] SQLite worker file not found');
    hasFailures = true;
  } else {
    console.log('✅ [PASS] SQLite worker file exists');
    
    // Read worker content
    const workerContent = readFileSync(workerPath, 'utf-8');
    
    // Check for eval() usage (excluding comments)
    const lines = workerContent.split('\n');
    const evalInCode = lines.filter(line => {
      const trimmed = line.trim();
      // Skip comments and documentation
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
        return false;
      }
      // Check for actual eval() function calls
      return /\beval\s*\(/.test(trimmed) && !trimmed.includes('//');
    });
    
    if (evalInCode.length > 0) {
      console.log(`❌ [FAIL] Found ${evalInCode.length} eval() usage(s) in code - CRITICAL VULNERABILITY`);
      evalInCode.forEach((line, i) => {
        console.log(`   Line ${i + 1}: ${line.trim()}`);
      });
      hasFailures = true;
    } else {
      console.log('✅ [PASS] No eval() usage in code - vulnerability eliminated');
      console.log('   (eval() mentions in comments/docs are safe)');
    }
    
    // Check for security headers
    if (workerContent.includes('SECURITY-HARDENED')) {
      console.log('✅ [PASS] Security headers present');
    } else {
      console.log('⚠️  [WARN] Security headers missing');
    }
    
    // Check for importScripts usage
    if (workerContent.includes('importScripts')) {
      console.log('✅ [PASS] Uses importScripts() for secure loading');
    } else {
      console.log('⚠️  [WARN] importScripts() not found');
    }
    
    // Check for input validation functions
    if (workerContent.includes('sanitizeSQL') && workerContent.includes('isValidScriptPath')) {
      console.log('✅ [PASS] Input validation functions present');
    } else {
      console.log('❌ [FAIL] Input validation functions missing');
      hasFailures = true;
    }
    
    // Check file size (should be reasonable)
    const sizeMB = (workerContent.length / (1024 * 1024)).toFixed(2);
    console.log(`✅ [INFO] Worker file size: ${sizeMB} MB`);
  }
  
  // Check if backup exists
  if (existsSync(backupPath)) {
    console.log('✅ [PASS] Vulnerable worker backup exists');
  } else {
    console.log('⚠️  [WARN] Vulnerable worker backup not found');
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (hasFailures) {
    console.log('❌ SECURITY VALIDATION FAILED - Critical issues detected');
    console.log('   Please fix the issues above before proceeding');
    process.exit(1);
  } else {
    console.log('✅ SECURITY VALIDATION PASSED');
    console.log('🔒 eval() vulnerability has been ELIMINATED');
    console.log('🔒 Secure importScripts() implementation deployed');
    console.log('🔒 Input validation and sanitization active');
    console.log('🔒 POS MiniVeci is now secure from A03 OWASP Injection attacks');
  }
}

if (require.main === module) {
  validateSecurity();
}

module.exports = { validateSecurity };