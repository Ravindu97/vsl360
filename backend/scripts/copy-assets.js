#!/usr/bin/env node
/**
 * Copy non-TypeScript assets (templates, etc.) to dist folder after build
 */
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '../src/templates');
const destDir = path.join(__dirname, '../dist/templates');

try {
  // Use fs.cpSync for Node 16.7+ or fallback to manual copy
  if (fs.cpSync) {
    fs.cpSync(assetsDir, destDir, { recursive: true, force: true });
  } else {
    // Fallback for older Node versions
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    const files = fs.readdirSync(assetsDir);
    files.forEach(file => {
      const src = path.join(assetsDir, file);
      const dest = path.join(destDir, file);
      if (fs.statSync(src).isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        copyDir(src, dest);
      } else {
        fs.copyFileSync(src, dest);
      }
    });
  }
  console.log('✓ Templates copied to dist/');
} catch (error) {
  console.error('✗ Failed to copy templates:', error.message);
  process.exit(1);
}

function copyDir(src, dest) {
  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    if (fs.statSync(srcFile).isDirectory()) {
      if (!fs.existsSync(destFile)) fs.mkdirSync(destFile, { recursive: true });
      copyDir(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  });
}
