import { scrapeIntershalaSimple, scrapeIntershalaAdvanced, scrapeIntershalaHybrid } from './intershala_scraper.js';

async function testIntershala() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('INTERSHALA SCRAPER TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Test 1: Simple Cheerio-based scraper
  console.log('🔍 TEST 1: Simple Scraper (Cheerio - HTML Parsing)');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('⏳ Starting... (This may take 5-10 seconds)\n');
  
  try {
    const simpleResults = await scrapeIntershalaSimple();
    console.log(`✅ Simple Scraper: Found ${simpleResults.length} internships\n`);
    
    if (simpleResults.length > 0) {
      console.log('Sample Results (First 2):');
      simpleResults.slice(0, 2).forEach((job, idx) => {
        console.log(`\n  [${idx + 1}]`);
        console.log(`      Title: ${job.title}`);
        console.log(`      Company: ${job.organization}`);
        console.log(`      Stipend: ${job.reward}`);
        console.log(`      Location: ${job.metadata?.location || 'N/A'}`);
        console.log(`      Duration: ${job.metadata?.duration || 'N/A'}`);
        console.log(`      Apply: ${job.applyLink}`);
      });
    }
  } catch (err) {
    console.error(`❌ Simple Scraper Error: ${err.message}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');

  // Test 2: Advanced Puppeteer-based scraper
  console.log('🤖 TEST 2: Advanced Scraper (Puppeteer - JavaScript Rendering)');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('⏳ Starting... (This may take 15-30 seconds)\n');
  
  try {
    const advancedResults = await scrapeIntershalaAdvanced();
    console.log(`✅ Advanced Scraper: Found ${advancedResults.length} internships\n`);
    
    if (advancedResults.length > 0) {
      console.log('Sample Results (First 2):');
      advancedResults.slice(0, 2).forEach((job, idx) => {
        console.log(`\n  [${idx + 1}]`);
        console.log(`      Title: ${job.title}`);
        console.log(`      Company: ${job.organization}`);
        console.log(`      Stipend: ${job.reward}`);
        console.log(`      Location: ${job.metadata?.location || 'N/A'}`);
        console.log(`      Duration: ${job.metadata?.duration || 'N/A'}`);
        console.log(`      Views: ${job.metadata?.views || 'N/A'}`);
        console.log(`      Apply: ${job.applyLink}`);
      });
    }
  } catch (err) {
    console.error(`❌ Advanced Scraper Error: ${err.message}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');

  // Test 3: Hybrid (tries advanced, falls back to simple)
  console.log('⚙️  TEST 3: Hybrid Scraper (Smart Fallback)');
  console.log('─────────────────────────────────────────────────────────────');
  console.log('⏳ Starting... (May use either method)\n');
  
  try {
    const hybridResults = await scrapeIntershalaHybrid();
    console.log(`✅ Hybrid Scraper: Found ${hybridResults.length} internships\n`);
  } catch (err) {
    console.error(`❌ Hybrid Scraper Error: ${err.message}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('TEST COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════');

  process.exit(0);
}

testIntershala().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
