const Database = require('better-sqlite3');
const db = new Database('./dev.db');

console.log('=== FINAL PRODUCT STATE ===\n');
const rows = db.prepare('SELECT id, name, price, kind, categoryId FROM Product ORDER BY name').all();

rows.forEach(p => {
  const catRow = db.prepare('SELECT name FROM Category WHERE id = ?').get(p.categoryId);
  console.log(`ID: ${p.id}, Name: '${p.name}', Kind: '${p.kind}', Price: $${p.price}, Category: ${catRow ? catRow.name : 'N/A'}`);
});

console.log('\n=== Categories ===');
const cats = db.prepare('SELECT id, name FROM Category ORDER BY id').all();
cats.forEach(c => {
  const prodCount = db.prepare('SELECT count(*) as cnt FROM Product WHERE categoryId = ?').get(c.id).cnt;
  console.log(`ID: ${c.id}, Name: ${c.name} - ${prodCount} products`);
});

db.close();