import { prisma } from "./prisma";

async function check() {
  const products = await prisma.product.findMany({
    where: { kind: "COMBO" },
    include: { recipeItems: { include: { ingredient: true } } },
  });

  console.log("Productos COMBO:", products.length);
  for (const p of products) {
    console.log(`  ${p.name}: ${p.recipeItems.length} ingredientes`);
  }

  const ingredients = await prisma.ingredient.findMany();
  console.log("Ingredientes totales:", ingredients.length);
}

check()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });