const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(process.cwd(), 'dev.db'));

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables);

const users = db.prepare("SELECT id, name, email, role, passwordHash, isActive, failedLoginAttempts FROM User").all();
console.log('\nUsers:', users);

const products = db.prepare("SELECT name, price, (SELECT name FROM Category WHERE id = Product.categoryId) as category FROM Product ORDER BY category, name").all();
console.log('\nProducts:', products);