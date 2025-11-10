/**
 * Simple Worker Compilation Script
 * 
 * Compiles TypeScript worker to JavaScript manually for immediate deployment
 */

const { execSync } = require('child_process');
const { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } = require('fs');
const { join } = require('path');

function compileAndReplaceWorker() {
  console.log('[BUILD] Compiling secure SQLite worker...');
  
  try {
    // Clean previous builds to prevent security violations
    console.log('[BUILD] 🧹 Cleaning previous builds...');
    const tempDir = join(process.cwd(), 'temp-worker');
    const outWorker = join(process.cwd(), 'out', 'sqlite-worker.js');
    
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    if (existsSync(outWorker)) {
      rmSync(outWorker, { force: true });
    }
    
    // Create output directory
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }
    
    // Use tsc directly with inline config
    execSync(`npx tsc src/workers/sqlite-worker.ts --target ES2022 --module ESNext --lib ES2022,WebWorker --strict --outDir temp-worker --moduleResolution bundler --skipLibCheck`, {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    // Read compiled worker
    const compiledPath = join(tempDir, 'sqlite-worker.js');
    if (!existsSync(compiledPath)) {
      throw new Error('Compilation failed - output file not found');
    }
    
    let workerCode = readFileSync(compiledPath, 'utf-8');
    
    // Add security headers
    const securityHeader = `// SECURITY-HARDENED SQLite Worker - NO eval() USAGE
// 🔒 Replaces vulnerable eval() with secure importScripts()
// 🔒 TypeScript branded types for input validation
// 🔒 Runtime SQL injection prevention
// Generated: ${new Date().toISOString()}

'use strict';

`;
    
    const finalCode = securityHeader + workerCode;
    
    // Write to public directory
    const outputPath = join(process.cwd(), 'public', 'sqlite-worker.js');
    writeFileSync(outputPath, finalCode);
    
    // Verify security - Check for actual eval() usage (not in comments/docs)
    console.log('[BUILD] 🔍 Scanning for security violations...');
    const lines = finalCode.split('\n');
    const vulnerableLines = [];
    
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      // Skip documentation comments, JSDoc, and security headers
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
        return;
      }
      // Check for actual eval() calls or eslint disables
      if (trimmed.includes('eval(') || trimmed.includes('eslint-disable-next-line no-eval')) {
        vulnerableLines.push({ line: index + 1, code: trimmed });
      }
    });
    
    if (vulnerableLines.length > 0) {
      console.error('SECURITY VIOLATION: eval() found in executable code!');
      vulnerableLines.forEach(({ line, code }) => {
        console.error(`Line ${line}: ${code}`);
      });
      throw new Error('SECURITY VIOLATION: eval() found in output!');
    }
    
    console.log('[BUILD] ✅ Secure worker compiled successfully');
    console.log('[BUILD] ✅ No eval() usage detected');
    console.log('[BUILD] ✅ Security headers added');
    
    // Cleanup temp directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
      console.log('[BUILD] 🧹 Temporary files cleaned');
    }
    
  } catch (error) {
    console.error('[BUILD] ❌ Compilation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  compileAndReplaceWorker();
}

module.exports = { compileAndReplaceWorker };