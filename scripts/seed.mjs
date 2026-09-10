import Database from "better-sqlite3";
import path from "node:path";

const db = new Database(path.join(process.cwd(), "dev.db"));

db.prepare("DELETE FROM OrderItem").run();
db.prepare('DELETE FROM "Order"').run();
db.prepare("DELETE FROM Product").run();
db.prepare("DELETE FROM Category").run();

const categories = [
  ["COPAS", "Copas de helado"],
  ["EMPLATADOS", "Postres emplatados"],
  ["INFANTILES", "Productos infantiles"],
  ["CONOS", "Conos de helado"],
  ["CANASTAS", "Canastas de helado"],
  ["BEBIDAS", "Bebidas"],
];

const insertCategory = db.prepare(
  'INSERT INTO Category (name, description) VALUES (?, ?)',
);

for (const [name, description] of categories) {
  insertCategory.run(name, description);
}

const categoryIds = Object.fromEntries(
  db.prepare("SELECT id, name FROM Category").all().map((row) => [row.name, row.id]),
);

const products = [
  ["Maracumango Con Helado", 12000, "COPAS", 20, "unidad"],
  ["Soda", 10000, "BEBIDAS", 30, "unidad"],
  ["Malteada", 13000, "BEBIDAS", 25, "unidad"],
  ["Malteada Dani Especial", 16000, "BEBIDAS", 20, "unidad"],
  ["Salpicón Con Helado", 12000, "COPAS", 20, "unidad"],
  ["Especial Fresas Con Helado", 12000, "COPAS", 20, "unidad"],
  ["Copa Chocolate", 14000, "COPAS", 20, "unidad"],
  ["Banana Split", 13000, "EMPLATADOS", 15, "unidad"],
  ["Ensalada de Frutas Con Helado", 15000, "EMPLATADOS", 15, "unidad"],
  ["Ensalada de Frutas Sin Helado", 12000, "EMPLATADOS", 20, "unidad"],
  ["Waffle Dulce Dani", 14000, "EMPLATADOS", 15, "unidad"],
  ["Dani Especial", 13000, "EMPLATADOS", 15, "unidad"],
  ["Waffle Fruti Dani", 14000, "EMPLATADOS", 15, "unidad"],
  ["Brownie Con Helado", 11000, "EMPLATADOS", 15, "unidad"],
  ["Cerdita", 9000, "INFANTILES", 25, "unidad"],
  ["Arañita", 9000, "INFANTILES", 25, "unidad"],
  ["Osito", 9000, "INFANTILES", 25, "unidad"],
  ["Ratoncito", 6500, "INFANTILES", 30, "unidad"],
  ["Frutidani", 13000, "CONOS", 20, "unidad"],
  ["Sencillo", 3500, "CONOS", 30, "unidad"],
  ["Doble", 6500, "CONOS", 25, "unidad"],
  ["Doble Canasta", 8500, "CANASTAS", 20, "unidad"],
  ["Triple Canasta", 11000, "CANASTAS", 15, "unidad"],
];

const insertProduct = db.prepare(
  `INSERT OR IGNORE INTO Product (name, price, categoryId, inStock, stockQuantity, image, unit)
   VALUES (?, ?, ?, 1, ?, NULL, ?)`,
);

let inserted = 0;
for (const [name, price, categoryName, stock, unit] of products) {
  const result = insertProduct.run(name, price, categoryIds[categoryName], stock, unit);
  inserted += result.changes;
}

console.log(`Seed listo: ${inserted} productos nuevos, ${categories.length} categorías.`);
db.close();
