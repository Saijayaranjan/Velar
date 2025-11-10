#!/usr/bin/env node

/**
 * Bundle Size Analysis Script
 * Analyzes the production build and generates a size report
 */

const fs = require('fs')
const path = require('path')

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

function getDirectorySize(dirPath) {
  let totalSize = 0
  const files = {}

  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath)

    for (const item of items) {
      const itemPath = path.join(currentPath, item)
      const stats = fs.statSync(itemPath)

      if (stats.isDirectory()) {
        traverse(itemPath)
      } else {
        totalSize += stats.size
        const relativePath = path.relative(dirPath, itemPath)
        files[relativePath] = stats.size
      }
    }
  }

  if (fs.existsSync(dirPath)) {
    traverse(dirPath)
  }

  return { totalSize, files }
}

function analyzeBundle() {
  console.log(`\n${colors.bright}${colors.cyan}📊 Bundle Size Analysis${colors.reset}\n`)

  const distDir = path.join(process.cwd(), 'dist')
  const distElectronDir = path.join(process.cwd(), 'dist-electron')

  if (!fs.existsSync(distDir)) {
    console.log(`${colors.red}❌ Error: dist directory not found. Run 'npm run build' first.${colors.reset}`)
    process.exit(1)
  }

  // Analyze renderer build (Vite output)
  const rendererAnalysis = getDirectorySize(distDir)
  console.log(`${colors.bright}Renderer Process (Vite Build):${colors.reset}`)
  console.log(`  Total Size: ${colors.green}${formatBytes(rendererAnalysis.totalSize)}${colors.reset}\n`)

  // Group files by type
  const filesByType = {
    js: [],
    css: [],
    images: [],
    fonts: [],
    other: [],
  }

  for (const [file, size] of Object.entries(rendererAnalysis.files)) {
    const ext = path.extname(file).toLowerCase()
    if (ext === '.js' || ext === '.mjs') {
      filesByType.js.push({ file, size })
    } else if (ext === '.css') {
      filesByType.css.push({ file, size })
    } else if (['.png', '.jpg', '.jpeg', '.svg', '.gif', '.ico'].includes(ext)) {
      filesByType.images.push({ file, size })
    } else if (['.woff', '.woff2', '.ttf', '.eot', '.otf'].includes(ext)) {
      filesByType.fonts.push({ file, size })
    } else {
      filesByType.other.push({ file, size })
    }
  }

  // Display JavaScript files
  if (filesByType.js.length > 0) {
    console.log(`  ${colors.bright}JavaScript Files:${colors.reset}`)
    filesByType.js
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)
      .forEach(({ file, size }) => {
        const sizeStr = formatBytes(size)
        const color = size > 500000 ? colors.red : size > 200000 ? colors.yellow : colors.green
        console.log(`    ${color}${sizeStr.padEnd(12)}${colors.reset} ${file}`)
      })
    if (filesByType.js.length > 10) {
      console.log(`    ... and ${filesByType.js.length - 10} more files`)
    }
    console.log()
  }

  // Display CSS files
  if (filesByType.css.length > 0) {
    console.log(`  ${colors.bright}CSS Files:${colors.reset}`)
    filesByType.css
      .sort((a, b) => b.size - a.size)
      .forEach(({ file, size }) => {
        console.log(`    ${colors.green}${formatBytes(size).padEnd(12)}${colors.reset} ${file}`)
      })
    console.log()
  }

  // Display Images
  if (filesByType.images.length > 0) {
    const totalImageSize = filesByType.images.reduce((sum, { size }) => sum + size, 0)
    console.log(`  ${colors.bright}Images:${colors.reset}`)
    console.log(`    Total: ${colors.green}${formatBytes(totalImageSize)}${colors.reset} (${filesByType.images.length} files)`)
    console.log()
  }

  // Analyze main process build
  if (fs.existsSync(distElectronDir)) {
    const mainAnalysis = getDirectorySize(distElectronDir)
    console.log(`${colors.bright}Main Process (Electron):${colors.reset}`)
    console.log(`  Total Size: ${colors.green}${formatBytes(mainAnalysis.totalSize)}${colors.reset}\n`)
  }

  // Calculate total
  const electronSize = fs.existsSync(distElectronDir) ? getDirectorySize(distElectronDir).totalSize : 0
  const totalSize = rendererAnalysis.totalSize + electronSize

  console.log(`${colors.bright}${colors.cyan}Total Build Size: ${formatBytes(totalSize)}${colors.reset}\n`)

  // Warnings
  const largeFiles = Object.entries(rendererAnalysis.files).filter(([, size]) => size > 500000)
  if (largeFiles.length > 0) {
    console.log(`${colors.yellow}⚠️  Warning: ${largeFiles.length} file(s) larger than 500KB detected${colors.reset}`)
    largeFiles.forEach(([file, size]) => {
      console.log(`   ${formatBytes(size).padEnd(12)} ${file}`)
    })
    console.log()
  }

  // Recommendations
  console.log(`${colors.bright}💡 Optimization Tips:${colors.reset}`)
  if (rendererAnalysis.totalSize > 2000000) {
    console.log(`   • Consider lazy loading routes and components`)
  }
  if (largeFiles.length > 0) {
    console.log(`   • Review large files for optimization opportunities`)
  }
  console.log(`   • Enable gzip/brotli compression on your server`)
  console.log(`   • Use dynamic imports for code splitting`)
  console.log()

  // Generate JSON report
  const report = {
    timestamp: new Date().toISOString(),
    renderer: {
      totalSize: rendererAnalysis.totalSize,
      files: rendererAnalysis.files,
    },
    electron: {
      totalSize: electronSize,
    },
    total: totalSize,
  }

  const reportPath = path.join(process.cwd(), 'build-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`${colors.green}✓ Detailed report saved to: build-report.json${colors.reset}\n`)
}

// Run analysis
try {
  analyzeBundle()
} catch (error) {
  console.error(`${colors.red}❌ Error analyzing bundle:${colors.reset}`, error.message)
  process.exit(1)
}
