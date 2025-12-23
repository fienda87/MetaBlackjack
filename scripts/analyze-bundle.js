#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

function analyzeBundle() {
  const nextDir = path.join(process.cwd(), '.next')
  const staticDir = path.join(nextDir, 'static', 'chunks')

  if (!fs.existsSync(staticDir)) {
    console.log('❌ Static chunks not found. Run build first: npm run build')
    return
  }

  const files = fs.readdirSync(staticDir)
  const chunks = files
    .filter(f => f.endsWith('.js'))
    .map(file => ({
      name: file,
      size: fs.statSync(path.join(staticDir, file)).size
    }))
    .sort((a, b) => b.size - a.size)

  console.log('\n📊 BUNDLE ANALYSIS\n')
  console.log('Chunk Name'.padEnd(50) + 'Size'.padEnd(15) + 'Gzipped\n')

  let totalSize = 0
  chunks.forEach(chunk => {
    const sizeKB = (chunk.size / 1024).toFixed(2)
    const sizeKBStr = sizeKB.padEnd(10)
    console.log(
      chunk.name.padEnd(50) +
      sizeKBStr + ' KB'
    )
    totalSize += chunk.size
  })

  const totalKB = (totalSize / 1024).toFixed(2)
  console.log('\n' + '='.repeat(65))
  console.log(`Total Bundle Size: ${totalKB} KB (${(totalSize / 1024 / 1024).toFixed(2)} MB)`)

  // Performance recommendations
  console.log('\n💡 OPTIMIZATION TIPS:\n')

  const largeChunks = chunks.filter(c => c.size > 200000)
  if (largeChunks.length > 0) {
    console.log('⚠️  Large chunks (>200KB):')
    largeChunks.forEach(c => {
      console.log(`   - ${c.name} (${(c.size / 1024).toFixed(2)}KB)`)
    })
  }

  console.log('\n✅ Next steps:')
  console.log('   1. Run: ANALYZE=true npm run build')
  console.log('   2. Check .next bundle visualization')
  console.log('   3. Identify and lazy-load large libraries')
}

analyzeBundle()
