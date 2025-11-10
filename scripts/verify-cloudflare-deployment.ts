#!/usr/bin/env ts-node

/**
 * Script de verificación para deployment en Cloudflare Pages
 * Verifica que la configuración y build estén correctos
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
}

class CloudflareDeploymentVerifier {
  private results: CheckResult[] = [];

  private addResult(name: string, status: 'pass' | 'fail' | 'warning', message: string) {
    this.results.push({ name, status, message });
  }

  private checkNextConfig() {
    try {
      const configPath = join(process.cwd(), 'next.config.ts');
      if (!existsSync(configPath)) {
        this.addResult('Next.js Config', 'fail', 'next.config.ts not found');
        return;
      }

      const configContent = readFileSync(configPath, 'utf-8');
      
      if (configContent.includes("output: 'export'")) {
        this.addResult('Static Export', 'pass', 'output: export configured');
      } else {
        this.addResult('Static Export', 'fail', 'Missing output: export in next.config.ts');
      }

      if (configContent.includes('trailingSlash: true')) {
        this.addResult('Trailing Slash', 'pass', 'trailingSlash configured');
      } else {
        this.addResult('Trailing Slash', 'warning', 'Consider adding trailingSlash: true');
      }

      if (configContent.includes('unoptimized: true')) {
        this.addResult('Image Optimization', 'pass', 'Images configured for static export');
      } else {
        this.addResult('Image Optimization', 'fail', 'Missing images: { unoptimized: true }');
      }
    } catch (error) {
      this.addResult('Next.js Config', 'fail', `Error reading config: ${error}`);
    }
  }

  private checkPackageJson() {
    try {
      const packagePath = join(process.cwd(), 'package.json');
      const packageContent = JSON.parse(readFileSync(packagePath, 'utf-8'));
      
      if (packageContent.scripts?.['build:cf']) {
        this.addResult('Build Script', 'pass', 'build:cf script exists');
      } else {
        this.addResult('Build Script', 'fail', 'Missing build:cf script in package.json');
      }

      const requiredDeps = ['next', 'react', 'react-dom'];
      const missingDeps = requiredDeps.filter(dep => !packageContent.dependencies?.[dep]);
      
      if (missingDeps.length === 0) {
        this.addResult('Dependencies', 'pass', 'Core dependencies present');
      } else {
        this.addResult('Dependencies', 'fail', `Missing dependencies: ${missingDeps.join(', ')}`);
      }
    } catch (error) {
      this.addResult('Package.json', 'fail', `Error reading package.json: ${error}`);
    }
  }

  private checkSQLiteWorker() {
    const workerPath = join(process.cwd(), 'public', 'sqlite-worker.js');
    if (existsSync(workerPath)) {
      this.addResult('SQLite Worker', 'pass', 'sqlite-worker.js found in public/');
    } else {
      this.addResult('SQLite Worker', 'warning', 'sqlite-worker.js not found - may affect offline functionality');
    }
  }

  private checkHeaders() {
    const headersPath = join(process.cwd(), 'public', '_headers');
    if (existsSync(headersPath)) {
      const headersContent = readFileSync(headersPath, 'utf-8');
      if (headersContent.includes('Cross-Origin-Opener-Policy') && 
          headersContent.includes('Cross-Origin-Embedder-Policy')) {
        this.addResult('CORS Headers', 'pass', 'COOP/COEP headers configured');
      } else {
        this.addResult('CORS Headers', 'fail', 'Missing required CORS headers');
      }
    } else {
      this.addResult('CORS Headers', 'fail', 'public/_headers file not found');
    }
  }

  private checkBuildOutput() {
    const outPath = join(process.cwd(), 'out');
    if (existsSync(outPath)) {
      this.addResult('Build Output', 'pass', 'out/ directory exists');
      
      const indexPath = join(outPath, 'index.html');
      if (existsSync(indexPath)) {
        this.addResult('Index Page', 'pass', 'index.html generated');
      } else {
        this.addResult('Index Page', 'warning', 'index.html not found - run npm run build:cf');
      }
    } else {
      this.addResult('Build Output', 'warning', 'out/ directory not found - run npm run build:cf first');
    }
  }

  public async verify(): Promise<void> {
    console.log('🔍 Verifying Cloudflare Pages deployment configuration...\n');

    this.checkNextConfig();
    this.checkPackageJson();
    this.checkSQLiteWorker();
    this.checkHeaders();
    this.checkBuildOutput();

    // Print results
    console.log('📊 Verification Results:\n');
    
    const passes = this.results.filter(r => r.status === 'pass').length;
    const failures = this.results.filter(r => r.status === 'fail').length;
    const warnings = this.results.filter(r => r.status === 'warning').length;

    this.results.forEach(result => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
      console.log(`${icon} ${result.name}: ${result.message}`);
    });

    console.log(`\n📈 Summary: ${passes} passed, ${failures} failed, ${warnings} warnings\n`);

    if (failures > 0) {
      console.log('🚨 Fix the failed items above before deploying to Cloudflare Pages\n');
      
      console.log('💡 Quick fixes:');
      console.log('1. Ensure next.config.ts has output: "export"');
      console.log('2. Run: npm run build:cf');
      console.log('3. In Cloudflare Pages: Build command = "npm run build:cf", Output dir = "out"\n');
      
      process.exit(1);
    } else {
      console.log('🎉 Configuration looks good for Cloudflare Pages deployment!\n');
      
      console.log('📋 Next steps:');
      console.log('1. Commit and push changes to GitHub');
      console.log('2. In Cloudflare Pages: Build command = "npm run build:cf"');
      console.log('3. In Cloudflare Pages: Output directory = "out"');
      console.log('4. Set Node.js version = 20');
      console.log('5. Add environment variables for TURSO_*\n');
    }
  }
}

// Run verification
const verifier = new CloudflareDeploymentVerifier();
verifier.verify().catch(console.error);