#!/usr/bin/env node

/**
 * Image Optimization Script
 * Optimizes images in the assets directory for production builds
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

function getFileSize(filePath) {
  try {
    return fs.statSync(filePath).size
  } catch {
    return 0
  }
}

function optimizeImages() {
  console.log(`\n${colors.bright}${colors.cyan}🖼️  Image Optimization${colors.reset}\n`)

  const assetsDir = path.join(process.cwd(), 'assets')
  
  if (!fs.existsSync(assetsDir)) {
    console.log(`${colors.yellow}⚠️  No assets directory found${colors.reset}`)
    return
  }

  // Check if sharp-cli is available
  try {
    execSync('which sharp', { stdio: 'ignore' })
  } catch {
    console.log(`${colors.yellow}⚠️  sharp-cli not found. Install with: npm install -g sharp-cli${colors.reset}`)
    console.log(`${colors.cyan}ℹ️  Skipping image optimization${colors.reset}\n`)
    return
  }

  let totalOriginalSize = 0
  let totalOptimizedSize = 0
  let filesOptimized = 0

  function processDirectory(dirPath) {
    const items = fs.readdirSync(dirPath)

    for (const item of items) {
      const itemPath = path.join(dirPath, item)
      const stats = fs.statSync(itemPath)

      if (stats.isDirectory()) {
        processDirectory(itemPath)
      } else {
        const ext = path.extname(item).toLowerCase()
        
        // Only process PNG and JPG images (not icons or special formats)
        if (['.png', '.jpg', '.jpeg'].includes(ext)) {
          const originalSize = getFileSize(itemPath)
          totalOriginalSize += originalSize

          try {
            // Create a backup
            const backupPath = itemPath + '.backup'
            if (!fs.existsSync(backupPath)) {
              fs.copyFileSync(itemPath, backupPath)
            }

            // Optimize based on file type
            if (ext === '.png') {
              // Optimize PNG with compression
              execSync(`sharp -i "${itemPath}" -o "${itemPath}" --compressionLevel 9`, {
                stdio: 'ignore',
              })
            } else {
              // Optimize JPEG with quality 85
              execSync(`sharp -i "${itemPath}" -o "${itemPath}" --quality 85`, {
                stdio: 'ignore',
              })
            }

            const optimizedSize = getFileSize(itemPath)
            totalOptimizedSize += optimizedSize

            const savings = originalSize - optimizedSize
            const savingsPercent = ((savings / originalSize) * 100).toFixed(1)

            if (savings > 0) {
              console.log(
                `  ${colors.green}✓${colors.reset} ${path.relative(process.cwd(), itemPath)}`
              )
              console.log(
                `    ${formatBytes(originalSize)} → ${formatBytes(optimizedSize)} (${colors.green}-${savingsPercent}%${colors.reset})`
              )
              filesOptimized++
            }
          } catch (error) {
            console.log(
              `  ${colors.yellow}⚠️  Failed to optimize: ${path.relative(process.cwd(), itemPath)}${colors.reset}`
            )
            // Restore from backup if optimization failed
            const backupPath = itemPath + '.backup'
            if (fs.existsSync(backupPath)) {
              fs.copyFileSync(backupPath, itemPath)
            }
          }
        }
      }
    }
  }

  processDirectory(assetsDir)

  if (filesOptimized > 0) {
    const totalSavings = totalOriginalSize - totalOptimizedSize
    const totalSavingsPercent = ((totalSavings / totalOriginalSize) * 100).toFixed(1)

    console.log(`\n${colors.bright}Summary:${colors.reset}`)
    console.log(`  Files optimized: ${colors.green}${filesOptimized}${colors.reset}`)
    console.log(
      `  Total savings: ${colors.green}${formatBytes(totalSavings)} (-${totalSavingsPercent}%)${colors.reset}`
    )
    console.log(
      `  ${formatBytes(totalOriginalSize)} → ${formatBytes(totalOptimizedSize)}\n`
    )
  } else {
    console.log(`${colors.cyan}ℹ️  No images needed optimization${colors.reset}\n`)
  }
}

// Run optimization
try {
  optimizeImages()
} catch (error) {
  console.error(`${colors.yellow}❌ Error optimizing images:${colors.reset}`, error.message)
  process.exit(1)
}
