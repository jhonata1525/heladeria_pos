const db = require('better-sqlite3')('dev.db');

console.log('=== VERIFICATION: Order Items ===');
const orderItems = db.prepare('SELECT productId, COUNT(*) as cnt, GROUP_CONCAT(DISTINCT orderId) as orders FROM OrderItem GROUP BY productId ORDER BY productId').all();
orderItems.forEach(oi => {
  console.log('Product ID ' + oi.productId + ': ' + oi.cnt + ' items, orders: ' + oi.orders);
});

console.log('\n=== VERIFICATION: Waste Logs ===');
const wasteLogs = db.prepare('SELECT productId, COUNT(*) as cnt, GROUP_CONCAT(reason) as reasons FROM WasteLog GROUP BY productId').all();
wasteLogs.forEach(wl => {
  console.log('Product ID ' + wl.productId + ': ' + wl.cnt + ' logs, reasons: ' + wl.reasons);
});

console.log('\n=== VERIFICATION: Recipe Items ===');
const recipeItems = db.prepare('SELECT productId, COUNT(*) as cnt FROM RecipeItem GROUP BY productId HAVING cnt > 0 ORDER BY productId').all();
recipeItems.forEach(ri => {
  console.log('Product ID ' + ri.productId + ': ' + ri.cnt + ' recipe items (COMBO)');
});

console.log('\n=== VERIFICATION: Products by Kind ===');
const products = db.prepare('SELECT id, name, kind FROM Product ORDER BY id, kind').all();
const baseCount = products.filter(p => p.kind === 'BASE').length;
const comboCount = products.filter(p => p.kind === 'COMBO').length;
console.log('BASE products: ' + baseCount);
console.log('COMBO products: ' + comboCount);
console.log('Total: ' + products.length);

db.close();