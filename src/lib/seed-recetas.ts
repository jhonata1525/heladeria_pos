import { prisma } from "./prisma";

const RECETAS_COMPLETAS = [
  {
    nombreProducto: "OSITO",
    ingredientes: [
      { ingrediente: "CANASTA DE GALLETA", unidadMedida: "unidad", cantidad: 1 },
      { ingrediente: "HELADO", unidadMedida: "gramos", cantidad: 140 },
      { ingrediente: "MASMELOS", unidadMedida: "unidad", cantidad: 1 },
      { ingrediente: "CHIPS DE CHOCOLATE", unidadMedida: "gramos", cantidad: 2 },
      { ingrediente: "GALLETA MINI CHIPS", unidadMedida: "gramos", cantidad: 10 },
      { ingrediente: "CHANTILLY", unidadMedida: "gramos", cantidad: 10 },
      { ingrediente: "SERVILLETA", unidadMedida: "unidad", cantidad: 5 },
      { ingrediente: "CUCHARA", unidadMedida: "unidad", cantidad: 2 },
    ],
  },
  {
    nombreProducto: "MALTEADA",
    ingredientes: [
      { ingrediente: "CHOCUBIERTA", unidadMedida: "gramos", cantidad: 5 },
      { ingrediente: "HELADO", unidadMedida: "gramos", cantidad: 170 },
      { ingrediente: "LECHE LIQUIDA", unidadMedida: "gramos", cantidad: 50 },
    ],
  },
  {
    nombreProducto: "RATONCITO",
    ingredientes: [
      { ingrediente: "CANASTA DE GALLETA", unidadMedida: "unidad", cantidad: 1 },
      { ingrediente: "CHANTILLY", unidadMedida: "gramos", cantidad: 20 },
      { ingrediente: "HELADO", unidadMedida: "gramos", cantidad: 70 },
      { ingrediente: "GALLETA FESTIVAL", unidadMedida: "unidad", cantidad: 2 },
      { ingrediente: "CHIPS DE CHOCOLATE", unidadMedida: "gramos", cantidad: 15 },
      { ingrediente: "GRAJEAS DE COLORES", unidadMedida: "gramos", cantidad: 5 },
      { ingrediente: "SERVILLETA", unidadMedida: "unidad", cantidad: 5 },
      { ingrediente: "CUCHARA", unidadMedida: "unidad", cantidad: 2 },
    ],
  },
  {
    nombreProducto: "AÑARITA",
    ingredientes: [
      { ingrediente: "LECHE CONDENSADA", unidadMedida: "gramos", cantidad: 10 },
      { ingrediente: "HELADO", unidadMedida: "gramos", cantidad: 140 },
    ],
  },
  {
    nombreProducto: "CONO TRIPLE",
    ingredientes: [
      { ingrediente: "CONO DE GALLETA", unidadMedida: "unidad", cantidad: 1 },
      { ingrediente: "SALSA DE AREQUIPE", unidadMedida: "gramos", cantidad: 5 },
      { ingrediente: "GALLETA MINI CHIPS", unidadMedida: "gramos", cantidad: 2 },
      { ingrediente: "HELADO", unidadMedida: "gramos", cantidad: 210 },
      { ingrediente: "CHANTILLY", unidadMedida: "gramos", cantidad: 20 },
      { ingrediente: "FRESA", unidadMedida: "gramos", cantidad: 20 },
      { ingrediente: "BANANO", unidadMedida: "unidad", cantidad: 0.25 },
      { ingrediente: "BARQUILLO", unidadMedida: "unidad", cantidad: 2 },
      { ingrediente: "CHOCUBIERTA", unidadMedida: "gramos", cantidad: 5 },
      { ingrediente: "CUCHARA", unidadMedida: "unidad", cantidad: 2 },
      { ingrediente: "SERVILLETA", unidadMedida: "unidad", cantidad: 5 },
    ],
  },
  {
    nombreProducto: "DANI ESPECIAL",
    ingredientes: [
      { ingrediente: "CANASTA BANANA", unidadMedida: "unidad", cantidad: 1 },
      { ingrediente: "HELADO", unidadMedida: "gramos", cantidad: 140 },
      { ingrediente: "CHANTILLY", unidadMedida: "gramos", cantidad: 50 },
      { ingrediente: "BANANO", unidadMedida: "unidad", cantidad: 0.5 },
      { ingrediente: "FRESA", unidadMedida: "gramos", cantidad: 40 },
      { ingrediente: "SALSA DE AREQUIPE", unidadMedida: "gramos", cantidad: 10 },
      { ingrediente: "LLUVIA DE CHOCOLATE", unidadMedida: "gramos", cantidad: 5 },
      { ingrediente: "GALLETA OREO", unidadMedida: "unidad", cantidad: 1 },
      { ingrediente: "CUCHARA", unidadMedida: "unidad", cantidad: 2 },
      { ingrediente: "SERVILLETA", unidadMedida: "unidad", cantidad: 5 },
    ],
  },
  {
    nombreProducto: "COPA CHOCOLATE",
    ingredientes: [
      { ingrediente: "CHOCUBIERTA", unidadMedida: "gramos", cantidad: 10 },
      { ingrediente: "GALLETA OREO", unidadMedida: "unidad", cantidad: 2 },
      { ingrediente: "CHANTILLY", unidadMedida: "gramos", cantidad: 65 },
      { ingrediente: "HELADO", unidadMedida: "gramos", cantidad: 140 },
      { ingrediente: "BISCOLATA MOOD", unidadMedida: "unidad", cantidad: 4 },
      { ingrediente: "BISCOLATA BARQUILLO", unidadMedida: "unidad", cantidad: 0.5 },
    ],
  },
  {
    nombreProducto: "WAFFLE DULCE DANI",
    ingredientes: [
      { ingrediente: "WAFFLE", unidadMedida: "unidad", cantidad: 1 },
      { ingrediente: "CHOCUBIERTA", unidadMedida: "gramos", cantidad: 35 },
      { ingrediente: "CHANTILLY", unidadMedida: "gramos", cantidad: 20 },
      { ingrediente: "GALLETA OREO", unidadMedida: "unidad", cantidad: 2 },
      { ingrediente: "HELADO", unidadMedida: "gramos", cantidad: 120 },
      { ingrediente: "GALLETA MINI CHIPS", unidadMedida: "gramos", cantidad: 2 },
      { ingrediente: "BISCOLATA MOOD", unidadMedida: "unidad", cantidad: 2 },
      { ingrediente: "CUCHARA", unidadMedida: "unidad", cantidad: 2 },
      { ingrediente: "SERVILLETA", unidadMedida: "unidad", cantidad: 5 },
    ],
  },
  {
    nombreProducto: "FRESAS CON CREMA",
    ingredientes: [
      { ingrediente: "CHOCUBIERTA", unidadMedida: "gramos", cantidad: 15 },
      { ingrediente: "FRESA", unidadMedida: "gramos", cantidad: 90 },
      { ingrediente: "CHANTILLY", unidadMedida: "gramos", cantidad: 65 },
      { ingrediente: "HELADO", unidadMedida: "gramos", cantidad: 70 },
      { ingrediente: "BARQUILLO", unidadMedida: "unidad", cantidad: 2 },
      { ingrediente: "CEREZA", unidadMedida: "gramos", cantidad: 4 },
    ],
  },
  {
    nombreProducto: "WAFFLE FRUTI DANI",
    ingredientes: [
      { ingrediente: "WAFFLE", unidadMedida: "unidad", cantidad: 1 },
      { ingrediente: "SALSA DE AREQUIPE", unidadMedida: "gramos", cantidad: 40 },
      { ingrediente: "DURAZNO EN ALMIBAR", unidadMedida: "gramos", cantidad: 25 },
      { ingrediente: "FRESA", unidadMedida: "gramos", cantidad: 25 },
      { ingrediente: "BANANO", unidadMedida: "unidad", cantidad: 0.5 },
      { ingrediente: "CHANTILLY", unidadMedida: "gramos", cantidad: 30 },
      { ingrediente: "HELADO", unidadMedida: "gramos", cantidad: 70 },
      { ingrediente: "CHOCUBIERTA", unidadMedida: "gramos", cantidad: 5 },
      { ingrediente: "LECHE CONDENSADA", unidadMedida: "gramos", cantidad: 5 },
      { ingrediente: "GALLETA MINI CHIPS", unidadMedida: "gramos", cantidad: 2 },
      { ingrediente: "CUCHARA", unidadMedida: "unidad", cantidad: 2 },
      { ingrediente: "SERVILLETA", unidadMedida: "unidad", cantidad: 5 },
    ],
  },
  {
    nombreProducto: "BANANA SPLIT",
    ingredientes: [
      { ingrediente: "BANANO", unidadMedida: "unidad", cantidad: 1 },
      { ingrediente: "CHOCUBIERTA", unidadMedida: "gramos", cantidad: 6 },
      { ingrediente: "CHANTILLY", unidadMedida: "gramos", cantidad: 35 },
      { ingrediente: "HELADO", unidadMedida: "gramos", cantidad: 210 },
      { ingrediente: "FRESA", unidadMedida: "gramos", cantidad: 20 },
      { ingrediente: "DURAZNO EN ALMIBAR", unidadMedida: "gramos", cantidad: 20 },
      { ingrediente: "CEREZA", unidadMedida: "gramos", cantidad: 8 },
      { ingrediente: "GALLETA MINI CHIPS", unidadMedida: "gramos", cantidad: 2 },
      { ingrediente: "CUCHARA", unidadMedida: "unidad", cantidad: 2 },
      { ingrediente: "SERVILLETA", unidadMedida: "unidad", cantidad: 5 },
    ],
  },
  {
    nombreProducto: "ENSALADA DE FRUTAS",
    ingredientes: [
      { ingrediente: "CREMA DE LECHE", unidadMedida: "gramos", cantidad: 30 },
      { ingrediente: "LECHE CONDENSADA", unidadMedida: "gramos", cantidad: 30 },
      { ingrediente: "PAPAYA", unidadMedida: "gramos", cantidad: 120 },
      { ingrediente: "BANANO", unidadMedida: "unidad", cantidad: 1 },
      { ingrediente: "SANDIA", unidadMedida: "gramos", cantidad: 120 },
      { ingrediente: "MANGO", unidadMedida: "gramos", cantidad: 60 },
      { ingrediente: "PIÑA", unidadMedida: "gramos", cantidad: 60 },
      { ingrediente: "MANZANA", unidadMedida: "gramos", cantidad: 30 },
      { ingrediente: "GRANOLA", unidadMedida: "gramos", cantidad: 20 },
      { ingrediente: "QUESO", unidadMedida: "gramos", cantidad: 30 },
      { ingrediente: "CHANTILLY", unidadMedida: "gramos", cantidad: 20 },
      { ingrediente: "DURAZNO EN ALMIBAR", unidadMedida: "gramos", cantidad: 15 },
      { ingrediente: "KIWI", unidadMedida: "gramos", cantidad: 15 },
      { ingrediente: "FRESA", unidadMedida: "gramos", cantidad: 20 },
      { ingrediente: "HELADO", unidadMedida: "gramos", cantidad: 70 },
      { ingrediente: "BARQUILLO", unidadMedida: "unidad", cantidad: 1 },
    ],
  },
  {
    nombreProducto: "MEZCLA DE WAFFLE",
    ingredientes: [
      { ingrediente: "PREMEZCLA WAFFLE", unidadMedida: "gramos", cantidad: 150 },
      { ingrediente: "LECHE LIQUIDA", unidadMedida: "gramos", cantidad: 100 },
      { ingrediente: "ACEITE", unidadMedida: "gramos", cantidad: 20 },
      { ingrediente: "HUEVO", unidadMedida: "unidad", cantidad: 1 },
      { ingrediente: "CANELA EN POLVO", unidadMedida: "gramos", cantidad: 1 },
      { ingrediente: "ESENCIA", unidadMedida: "gramos", cantidad: 3 },
    ],
  },
  {
    nombreProducto: "SALPICON CON HELADO",
    ingredientes: [
      { ingrediente: "PAPAYA", unidadMedida: "gramos", cantidad: 40 },
      { ingrediente: "SANDIA", unidadMedida: "gramos", cantidad: 40 },
      { ingrediente: "BANANO", unidadMedida: "unidad", cantidad: 0.5 },
      { ingrediente: "PIÑA", unidadMedida: "gramos", cantidad: 40 },
      { ingrediente: "MANZANA", unidadMedida: "gramos", cantidad: 15 },
      { ingrediente: "NARANJA", unidadMedida: "gramos", cantidad: 40 },
      { ingrediente: "AGUA", unidadMedida: "gramos", cantidad: 40 },
      { ingrediente: "FRUTIÑO", unidadMedida: "gramos", cantidad: 2 },
      { ingrediente: "LECHE CONDENSADA", unidadMedida: "gramos", cantidad: 10 },
      { ingrediente: "CHANTILLY", unidadMedida: "gramos", cantidad: 30 },
      { ingrediente: "GRANOLA", unidadMedida: "gramos", cantidad: 5 },
    ],
  },
  {
    nombreProducto: "CANASTA DOBLE",
    ingredientes: [
      { ingrediente: "CANASTA DE GALLETA", unidadMedida: "unidad", cantidad: 1 },
      { ingrediente: "HELADO", unidadMedida: "gramos", cantidad: 140 },
      { ingrediente: "CHOCUBIERTA", unidadMedida: "gramos", cantidad: 5 },
      { ingrediente: "CHIPS DE CHOCOLATE", unidadMedida: "gramos", cantidad: 5 },
      { ingrediente: "LECHE CONDENSADA", unidadMedida: "gramos", cantidad: 5 },
      { ingrediente: "BARQUILLO", unidadMedida: "unidad", cantidad: 1 },
      { ingrediente: "SERVILLETA", unidadMedida: "unidad", cantidad: 5 },
      { ingrediente: "CUCHARA", unidadMedida: "unidad", cantidad: 2 },
    ],
  },
  {
    nombreProducto: "CANASTA TRIPLE",
    ingredientes: [
      { ingrediente: "CANASTA DE GALLETA", unidadMedida: "unidad", cantidad: 1 },
      { ingrediente: "HELADO", unidadMedida: "gramos", cantidad: 210 },
      { ingrediente: "CHOCUBIERTA", unidadMedida: "gramos", cantidad: 5 },
      { ingrediente: "CHIPS DE CHOCOLATE", unidadMedida: "gramos", cantidad: 5 },
      { ingrediente: "LECHE CONDENSADA", unidadMedida: "gramos", cantidad: 5 },
      { ingrediente: "BARQUILLO", unidadMedida: "unidad", cantidad: 1 },
      { ingrediente: "SERVILLETA", unidadMedida: "unidad", cantidad: 5 },
    ],
  },
  {
    nombreProducto: "MARACUMANGO",
    ingredientes: [
      { ingrediente: "MARACUYA", unidadMedida: "gramos", cantidad: 85 },
      { ingrediente: "LIMÓN", unidadMedida: "gramos", cantidad: 15 },
      { ingrediente: "AZÚCAR", unidadMedida: "gramos", cantidad: 30 },
      { ingrediente: "MANGO", unidadMedida: "gramos", cantidad: 70 },
      { ingrediente: "HIELO", unidadMedida: "gramos", cantidad: 210 },
      { ingrediente: "LECHE CONDENSADA", unidadMedida: "gramos", cantidad: 15 },
      { ingrediente: "HELADO", unidadMedida: "gramos", cantidad: 70 },
      { ingrediente: "BARQUILLO", unidadMedida: "unidad", cantidad: 1 },
      { ingrediente: "CUCHARA", unidadMedida: "unidad", cantidad: 2 },
      { ingrediente: "SERVILLETA", unidadMedida: "unidad", cantidad: 5 },
      { ingrediente: "PITILLO", unidadMedida: "unidad", cantidad: 1 },
    ],
  },
  {
    nombreProducto: "SODA",
    ingredientes: [
      { ingrediente: "SALSA CASERA", unidadMedida: "gramos", cantidad: 40 },
      { ingrediente: "HIELO", unidadMedida: "gramos", cantidad: 200 },
      { ingrediente: "LIMÓN", unidadMedida: "gramos", cantidad: 15 },
      { ingrediente: "MANGO", unidadMedida: "gramos", cantidad: 40 },
      { ingrediente: "FRESA", unidadMedida: "gramos", cantidad: 30 },
      { ingrediente: "SODA", unidadMedida: "unidad", cantidad: 1 },
      { ingrediente: "PALO PINCHO", unidadMedida: "unidad", cantidad: 1 },
      { ingrediente: "CEREZA", unidadMedida: "gramos", cantidad: 12 },
      { ingrediente: "CHANTILLY", unidadMedida: "gramos", cantidad: 60 },
      { ingrediente: "BARQUILLO", unidadMedida: "unidad", cantidad: 1 },
      { ingrediente: "CUCHARA", unidadMedida: "unidad", cantidad: 2 },
      { ingrediente: "SERVILLETA", unidadMedida: "unidad", cantidad: 5 },
      { ingrediente: "PITILLO", unidadMedida: "unidad", cantidad: 1 },
    ],
  },
  {
    nombreProducto: "MALTEADA DANI ESPECIAL",
    ingredientes: [
      { ingrediente: "SALSA CASERA", unidadMedida: "gramos", cantidad: 20 },
      { ingrediente: "HELADO", unidadMedida: "gramos", cantidad: 230 },
      { ingrediente: "LECHE LIQUIDA", unidadMedida: "gramos", cantidad: 90 },
      { ingrediente: "CHANTILLY", unidadMedida: "gramos", cantidad: 60 },
      { ingrediente: "GALLETA FESTIVAL", unidadMedida: "unidad", cantidad: 1 },
      { ingrediente: "BISCOLATA BARQUILLO", unidadMedida: "unidad", cantidad: 0.5 },
      { ingrediente: "BARQUILLO", unidadMedida: "unidad", cantidad: 1 },
      { ingrediente: "GALLETA MINI CHIPS", unidadMedida: "gramos", cantidad: 2 },
      { ingrediente: "CUCHARA", unidadMedida: "unidad", cantidad: 2 },
      { ingrediente: "SERVILLETA", unidadMedida: "unidad", cantidad: 5 },
      { ingrediente: "PITILLO", unidadMedida: "unidad", cantidad: 1 },
    ],
  },
];

const DEFAULT_CATEGORY_NAME = "Helados y Postres";
const DEFAULT_PRICE = 10000;
const DEFAULT_STOCK = 100;

async function seedRecetas() {
  console.log("🌱 Iniciando seed de recetas...");

  const category = await prisma.category.upsert({
    where: { name: DEFAULT_CATEGORY_NAME },
    update: {},
    create: { name: DEFAULT_CATEGORY_NAME, description: "Productos de heladería y postres" },
  });

  console.log(`📦 Categoría: ${category.name} (ID: ${category.id})`);

  const allIngredients = new Map<string, { unit: string }>();

  for (const receta of RECETAS_COMPLETAS) {
    for (const ing of receta.ingredientes) {
      if (!allIngredients.has(ing.ingrediente)) {
        allIngredients.set(ing.ingrediente, { unit: ing.unidadMedida });
      }
    }
  }

  console.log(`🥕 Encontrados ${allIngredients.size} ingredientes únicos`);

  for (const [name, { unit }] of allIngredients) {
    await prisma.ingredient.upsert({
      where: { name },
      update: { unit },
      create: {
        name,
        unit,
        currentStock: DEFAULT_STOCK,
        minStock: 10,
        costPerUnit: 0,
      },
    });
  }

  console.log("✅ Ingredientes creados/actualizados");

  for (const receta of RECETAS_COMPLETAS) {
    let product = await prisma.product.findFirst({
      where: { name: receta.nombreProducto },
    });

    if (product) {
      product = await prisma.product.update({
        where: { id: product.id },
        data: {
          categoryId: category.id,
          kind: "COMBO",
          inStock: true,
        },
      });
    } else {
      product = await prisma.product.create({
        data: {
          name: receta.nombreProducto,
          price: DEFAULT_PRICE,
          categoryId: category.id,
          kind: "COMBO",
          inStock: true,
          stockQuantity: 0,
          unit: "unidad",
        },
      });
    }

    console.log(`🍦 Producto: ${product.name} (ID: ${product.id})`);

    await prisma.recipeItem.deleteMany({
      where: { productId: product.id },
    });

    for (const ing of receta.ingredientes) {
      const ingredient = await prisma.ingredient.findUnique({
        where: { name: ing.ingrediente },
      });

      if (!ingredient) {
        console.warn(`⚠️ Ingrediente no encontrado: ${ing.ingrediente}`);
        continue;
      }

      await prisma.recipeItem.create({
        data: {
          productId: product.id,
          ingredientId: ingredient.id,
          quantity: ing.cantidad,
        },
      });
    }

    console.log(`  ✅ ${receta.ingredientes.length} ingredientes vinculados`);
  }

  console.log("🎉 Seed completado exitosamente");
}

seedRecetas()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });