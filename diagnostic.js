// Quick diagnostic - run this to test search query directly
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'ayini.db');

async function testSearch() {
  try {
    const SQL = await initSqlJs();
    const fileBuffer = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(fileBuffer);
    
    console.log('\n=== CHECKING TABLES ===');
    
    // Check if reviews table exists
    const tables = db.exec(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      ORDER BY name
    `);
    
    console.log('\nAll tables in database:');
    if (tables.length > 0) {
      tables[0].values.forEach(row => console.log('  -', row[0]));
    }
    
    // Check products count
    const products = db.exec(`SELECT COUNT(*) as count FROM products`);
    console.log('\nTotal products:', products[0]?.values[0]?.[0] || 0);
    
    // Check if reviews table exists and has data
    try {
      const reviews = db.exec(`SELECT COUNT(*) as count FROM reviews`);
      console.log('Total reviews:', reviews[0]?.values[0]?.[0] || 0);
    } catch (e) {
      console.log('Reviews table: DOES NOT EXIST ❌');
    }
    
    // Test search query
    console.log('\n=== TESTING SEARCH QUERY ===');
    try {
      const searchResult = db.exec(`
        SELECT 
          p.id, p.name, p.price, p.category, p.image
        FROM products p
        WHERE p.stock > 0
        AND (LOWER(p.name) LIKE LOWER('%masala%') OR LOWER(p.description) LIKE LOWER('%masala%'))
        LIMIT 5
      `);
      
      if (searchResult.length > 0) {
        console.log('Search works! Found', searchResult[0].values.length, 'results');
      } else {
        console.log('Search returned no results');
      }
    } catch (e) {
      console.log('Search query error:', e.message);
    }
    
    // Test reviews query
    console.log('\n=== TESTING REVIEWS QUERY ===');
    try {
      const reviewResult = db.exec(`
        SELECT r.id, r.rating, r.title
        FROM reviews r
        WHERE r.product_id = 1
        LIMIT 5
      `);
      console.log('Reviews query works!');
    } catch (e) {
      console.log('Reviews query error:', e.message);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSearch();
