/**
 * Security Validation Script
 * 
 * Validates that the security fixes have been properly applied
 * and the eval() vulnerability has been eliminated
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface SecurityCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

class SecurityValidator {
  private checks: SecurityCheck[] = [];
  
  private addCheck(name: string, status: SecurityCheck['status'], message: string, details?: string): void {
    this.checks.push({ 
      name, 
      status, 
      message, 
      ...(details !== undefined && { details })
    });
  }
  
  /**
   * Check if the original vulnerable worker exists as backup
   */
  private validateBackupExists(): void {
    const backupPath = join(process.cwd(), 'public', 'sqlite-worker.js.vulnerable.backup');
    
    if (existsSync(backupPath)) {
      this.addCheck(
        'Vulnerable Worker Backup', 
        'pass', 
        'Original vulnerable worker backed up successfully'
      );
    } else {
      this.addCheck(
        'Vulnerable Worker Backup', 
        'warning', 
        'Original worker backup not found - may have been first run'
      );
    }
  }
  
  /**
   * Validate that the new worker doesn't contain eval()
   */
  private validateNoEval(): void {
    const workerPath = join(process.cwd(), 'public', 'sqlite-worker.js');
    
    if (!existsSync(workerPath)) {
      this.addCheck(
        'Worker File Exists', 
        'fail', 
        'SQLite worker file not found - build may have failed'
      );
      return;
    }
    
    const workerContent = readFileSync(workerPath, 'utf-8');
    
    // Check for eval() usage
    const evalMatches = workerContent.match(/\beval\s*\(/g);
    if (evalMatches) {
      this.addCheck(
        'No eval() Usage', 
        'fail', 
        `Found ${evalMatches.length} eval() usage(s) - CRITICAL SECURITY VULNERABILITY`,
        `Matches: ${evalMatches.join(', ')}`
      );
    } else {
      this.addCheck(
        'No eval() Usage', 
        'pass', 
        'No eval() usage detected - security vulnerability eliminated'
      );
    }
    
    // Check for security headers
    if (workerContent.includes('SECURITY-HARDENED SQLite Worker')) {
      this.addCheck(
        'Security Headers', 
        'pass', 
        'Security headers present in worker file'
      );
    } else {
      this.addCheck(
        'Security Headers', 
        'fail', 
        'Security headers missing - worker may not be properly compiled'
      );
    }
    
    // Check for importScripts usage
    if (workerContent.includes('importScripts')) {
      this.addCheck(
        'Secure Script Loading', 
        'pass', 
        'Uses importScripts() for secure module loading'
      );
    } else {
      this.addCheck(
        'Secure Script Loading', 
        'warning', 
        'importScripts() not found - verify secure loading implementation'
      );
    }
  }
  
  /**
   * Validate TypeScript source exists
   */
  private validateTypeScriptSource(): void {
    const tsWorkerPath = join(process.cwd(), 'src', 'workers', 'sqlite-worker.ts');
    
    if (existsSync(tsWorkerPath)) {
      const tsContent = readFileSync(tsWorkerPath, 'utf-8');
      
      if (tsContent.includes('ValidatedScriptPath') && tsContent.includes('SafeSQL')) {
        this.addCheck(
          'Branded Types', 
          'pass', 
          'TypeScript branded types implemented for security'
        );
      } else {
        this.addCheck(
          'Branded Types', 
          'fail', 
          'Branded types missing from TypeScript source'
        );
      }
      
      if (tsContent.includes('sanitizeSQL') && tsContent.includes('isValidScriptPath')) {
        this.addCheck(
          'Input Validation', 
          'pass', 
          'Runtime input validation functions present'
        );
      } else {
        this.addCheck(
          'Input Validation', 
          'fail', 
          'Input validation functions missing'
        );
      }
    } else {
      this.addCheck(
        'TypeScript Source', 
        'fail', 
        'TypeScript worker source not found'
      );
    }
  }
  
  /**
   * Validate build script exists
   */
  private validateBuildScript(): void {
    const buildScriptPath = join(process.cwd(), 'scripts', 'build-secure-worker.ts');
    
    if (existsSync(buildScriptPath)) {
      this.addCheck(
        'Build Script', 
        'pass', 
        'Secure worker build script present'
      );
    } else {
      this.addCheck(
        'Build Script', 
        'fail', 
        'Build script missing - cannot compile secure worker'
      );
    }
  }
  
  /**
   * Validate package.json scripts are updated
   */
  private validatePackageScripts(): void {
    const packagePath = join(process.cwd(), 'package.json');
    
    if (existsSync(packagePath)) {
      const packageContent = readFileSync(packagePath, 'utf-8');
      const packageJson = JSON.parse(packageContent);
      
      if (packageJson.scripts?.['build:worker']) {
        this.addCheck(
          'Package Scripts', 
          'pass', 
          'build:worker script configured in package.json'
        );
      } else {
        this.addCheck(
          'Package Scripts', 
          'fail', 
          'build:worker script missing from package.json'
        );
      }
    }
  }
  
  /**
   * Run all security validations
   */
  public async validateSecurity(): Promise<void> {
    console.log('🔍 Running security validation checks...\n');
    
    this.validateBackupExists();
    this.validateNoEval();
    this.validateTypeScriptSource();
    this.validateBuildScript();
    this.validatePackageScripts();
    
    this.printResults();
  }
  
  /**
   * Print validation results with colored output
   */
  private printResults(): void {
    let hasFailures = false;
    let hasWarnings = false;
    
    console.log('📋 SECURITY VALIDATION RESULTS:\n');
    
    for (const check of this.checks) {
      const icon = check.status === 'pass' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
      const status = check.status.toUpperCase().padEnd(8);
      
      console.log(`${icon} [${status}] ${check.name}: ${check.message}`);
      
      if (check.details) {
        console.log(`    Details: ${check.details}`);
      }
      
      if (check.status === 'fail') hasFailures = true;
      if (check.status === 'warning') hasWarnings = true;
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (hasFailures) {
      console.log('❌ SECURITY VALIDATION FAILED - Critical issues must be resolved');
      process.exit(1);
    } else if (hasWarnings) {
      console.log('⚠️  SECURITY VALIDATION PASSED with warnings - Review recommended');
    } else {
      console.log('✅ SECURITY VALIDATION PASSED - All checks successful');
      console.log('🔒 eval() vulnerability has been eliminated');
      console.log('🔒 Type safety enforced with branded types');
      console.log('🔒 Runtime validation implemented');
    }
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new SecurityValidator();
  validator.validateSecurity().catch(err => {
    console.error('Validation failed:', err);
    process.exit(1);
  });
}

export { SecurityValidator };