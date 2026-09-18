const Database = require('better-sqlite3');
const db = new Database('./dev.db');

// Check references for all three products
[38, 40, 41].forEach(id => {
  const productName = db.prepare('SELECT name FROM Product WHERE id = ?').get(id).name;
  const orderItems = db.prepare('SELECT * FROM OrderItem WHERE productId = ?').all(id);
  const recipeItems = db.prepare('SELECT * FROM RecipeItem WHERE productId = ?').all(id);
  console.log(`${productName} (id: ${id}):`);
  console.log('  OrderItems:', orderItems.length > 0 ? orderItems.map(o => `ord${o.orderId} qty${o.quantity}`).join(', ') : 'none');
  console.log('  RecipeItems:', recipeItems.length > 0 ? recipeItems.map(r => r.ingredient.name).join(', ') : 'none');
});

db.close();