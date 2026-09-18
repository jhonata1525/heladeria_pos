const Database = require('better-sqlite3');
const db = new Database('./dev.db');

// Step 1: Arañita (id: 39) was already deleted in previous run - verify
const check1 = db.prepare('SELECT id FROM Product WHERE id = 39').get();
if (check1) {
  console.log('! Arañita (id: 39) still exists, deleting...');
  db.prepare('DELETE FROM Product WHERE id = ?').run(39);
  console.log('✓ Deleted Arañita (id: 39)');
} else {
  console.log('✓ Arañita (id: 39) already deleted');
}

// Step 2: Move AÑARITA (id: 50) from category 13 to category 9 (INFANTILES)
const check2 = db.prepare('SELECT categoryId, name FROM Product WHERE id = 50').get();
if (check2.categoryId !== 9) {
  db.prepare('UPDATE Product SET categoryId = ? WHERE id = ?').run(9, 50);
  console.log('✓ Moved AÑARITA to INFANTILES (categoryId: 9)');
} else {
  console.log('✓ AÑARITA already in INFANTILES');
}

// Step 3: Delete Osito BASE (id: 40) - verify it's gone
const check3 = db.prepare('SELECT id FROM Product WHERE id = 40').get();
if (check3) {
  db.prepare('DELETE FROM Product WHERE id = ?').run(40);
  console.log('✓ Deleted Osito BASE (id: 40)');
} else {
  console.log('✓ Osito BASE (id: 40) already deleted');
}

// Step 4: Change Ratoncito (id: 41) kind to COMBO since it has OrderItem references
const check4 = db.prepare('SELECT id, name, kind FROM Product WHERE id = 41').get();
if (check4 && check4.kind !== 'COMBO') {
  db.prepare('UPDATE Product SET kind = ? WHERE id = ?').run('COMBO', 41);
  console.log('✓ Changed Ratoncito kind to COMBO');
} else if (check4 && check4.kind === 'COMBO') {
  console.log('✓ Ratoncito already kind COMBO');
} else {
  console.log('! Ratoncito (id: 41) not found');
}

// Step 5: Change Cerdita (id: 38) kind from "BASE" to "COMBO" since no COMBO version exists
const check5 = db.prepare('SELECT id, name, kind FROM Product WHERE id = 38').get();
if (check5 && check5.kind === 'BASE') {
  db.prepare('UPDATE Product SET kind = ? WHERE id = ?').run('COMBO', 38);
  console.log('✓ Changed Cerdita kind to COMBO');
} else if (check5 && check5.kind === 'COMBO') {
  console.log('✓ Cerdita already kind COMBO');
} else {
  console.log('! Cerdita (id: 38) not found');
}

db.close();
console.log('\nAll operations completed successfully!');