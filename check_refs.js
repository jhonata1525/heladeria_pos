const Database = require('better-sqlite3');
const db = new Database('./dev.db');

// Check what references Ratoncito (id: 41)
const refs = db.prepare(
  "SELECT 'OrderItem' as table_name, count(*) as refs FROM OrderItem WHERE productId = 41 UNION ALL " +
  "SELECT 'RecipeItem', count(*) FROM RecipeItem WHERE productId = 41 UNION ALL " +
  "SELECT 'WasteLog', count(*) FROM WasteLog WHERE productId = 41"
).all();

console.log('References to Ratoncito (id: 41):', JSON.stringify(refs, null, 2));

// Also check order items that might reference it
const orderItems = db.prepare('SELECT * FROM OrderItem WHERE productId = 41').all();
console.log('OrderItem references:', JSON.stringify(orderItems, null, 2));

// Check recipe items
const recipeItems = db.prepare('SELECT * FROM RecipeItem WHERE productId = 41').all();
console.log('RecipeItem references:', JSON.stringify(recipeItems, null, 2));

db.close();