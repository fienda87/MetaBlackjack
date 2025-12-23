#!/usr/bin/env node

const { execSync } = require('child_process')

function benchmark() {
  console.log('🚀 NEXT.JS BUILD BENCHMARK\n')

  // Clean build
  execSync('rm -rf .next', { stdio: 'inherit' })

  const start = Date.now()
  console.log('Building...')

  try {
    execSync('next build', { stdio: 'inherit' })
  } catch (error) {
    console.error('❌ Build failed:', error.message)
    return
  }

  const duration = Date.now() - start
  const seconds = (duration / 1000).toFixed(2)

  console.log('\n' + '='.repeat(50))
  console.log(`✅ Build completed in ${seconds}s`)
  console.log('='.repeat(50) + '\n')

  // Target performance
  const target = 10 // seconds
  if (duration / 1000 < target) {
    console.log(`🎉 EXCELLENT! Built in ${seconds}s (target: <${target}s)`)
  } else if (duration / 1000 < target * 1.5) {
    console.log(`⚠️  Build took ${seconds}s (target: <${target}s)`)
    console.log('   Consider: ANALYZE=true npm run build to identify large chunks')
  } else {
    console.log(`❌ Build took ${seconds}s (target: <${target}s)`)
    console.log('   Run bundle analysis and optimize large chunks')
  }
}

benchmark()
