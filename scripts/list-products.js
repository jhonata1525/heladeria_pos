const { PrismaClient } = require('prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();
  
  const products = await prisma.product.findMany({
    include: { category: true, recipeItems: true, wasteLogs: true, orderItems: true }
  });
  
  console.log('=== ALL PRODUCTS ===');
  products.forEach(p => {
    const hasRecipe = p.recipeItems && p.recipeItems.length > 0;
    const hasWaste = p.wasteLogs && p.wasteLogs.length > 0;
    const hasOrders = p.orderItems && p.orderItems.length > 0;
    console.log(`ID: ${p.id}, Name: '${p.name}', Kind: '${p.kind}', Price: ${p.price}, Category: '${p.category?.name}', Stock: ${p.stockQuantity}, InStock: ${p.inStock}, HasRecipe: ${hasRecipe}, HasWaste: ${hasWaste}, HasOrders: ${hasOrders}`);
    if (p.recipeItems && p.recipeItems.length > 0) {
      console.log('  Recipe items:', p.recipeItems.map(ri => `${ri.ingredient.name}: ${ri.quantity}`).join(', '));
    }
    if (p.wasteLogs && p.wasteLogs.length > 0) {
      console.log('  Waste logs:', p.wasteLogs.map(wl => `${wl.reason}: ${wl.quantity}`).join(', '));
    }
    if (p.orderItems && p.orderItems.length > 0) {
      console.log('  Order items:', p.orderItems.map(oi => `ord${oi.orderId} prod${oi.productId} qty${oi.quantity}`).join(', '));
    }
  });
  console.log(`\nTotal products: ${products.length}`);
  
  await prisma.$disconnect();
}

main().catch(console.error);