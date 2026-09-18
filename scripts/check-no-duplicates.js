const db = require('better-sqlite3')('dev.db');

console.log('=== Checking for remaining duplicate names ===');

// Get all products
const products = db.prepare('SELECT id, name, kind FROM Product ORDER BY id').all();

// Normalize names and check for duplicates
const normalizedMap = {};

products.forEach(p => {
  const normalized = p.name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .trim();
  
  if (!normalizedMap[normalized]) {
    normalizedMap[normalized] = [];
  }
  normalizedMap[normalized].push(p);
});

let hasDuplicates = false;
for (const [normalized, group] of Object.entries(normalizedMap)) {
  if (group.length > 1) {
    console.log('DUPLICATE GROUP ("' + normalized + '"):');
    group.forEach(p => {
      console.log('  ID ' + p.id + ': "' + p.name + '" kind=' + p.kind);
    });
    hasDuplicates = true;
  }
}

if (!hasDuplicates) {
  console.log('No duplicate product names found! All products have unique normalized names.');
}

// Show summary
console.log('\n=== Summary ===');
console.log('Total products: ' + products.length);
console.log('BASE products: ' + products.filter(p => p.kind === 'BASE').length);
console.log('COMBO products: ' + products.filter(p => p.kind === 'COMBO').length);

// Show the main product groups that were kept
console.log('\n=== Kept Products (one per normalized name) ===');
const kept = new Set();
for (const p of products) {
  const normalized = p.name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/ñ/g, 'n')
    .trim();
  if (!kept.has(normalized)) {
    kept.add(normalized);
    console.log('ID ' + p.id + ': "' + p.name + '" kind=' + p.kind);
  }
}

db.close();