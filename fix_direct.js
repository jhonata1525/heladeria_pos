const Database = require('better-sqlite3');
const db = new Database('./dev.db');

// Step 1: Delete Arañita (id: 39) - duplicate BASE in INFANTILES
const del1 = db.prepare('DELETE FROM Product WHERE id = ?');
del1.run(39);
console.log('✓ Deleted Arañita (id: 39)');

// Step 2: Move AÑARITA (id: 50) from category 13 to category 9 (INFANTILES)
const upd1 = db.prepare('UPDATE Product SET categoryId = ? WHERE id = ?');
upd1.run(9, 50);
console.log('✓ Moved AÑARITA to INFANTILES (categoryId: 9)');

// Step 3: Delete Osito BASE (id: 40) since COMBO OSITO (id: 47) exists
del1.run(40);
console.log('✓ Deleted Osito BASE (id: 40)');

// Step 4: Delete Ratoncito BASE (id: 41) since COMBO RATONCITO (id: 49) exists
del1.run(41);
console.log('✓ Deleted Ratoncito BASE (id: 41)');

// Step 5: Change Cerdita (id: 38) kind from "BASE" to "COMBO"
const upd2 = db.prepare('UPDATE Product SET kind = ? WHERE id = ?');
upd2.run('COMBO', 38);
console.log('✓ Changed Cerdita kind to COMBO');

db.close();
console.log('\nAll operations completed successfully!');