const { PrismaClient } = require('./src/generated/prisma/client');

async function assignQuickCodes() {
  const prisma = new PrismaClient();
  await prisma.\$connect();
  
  const categories = await prisma.category.findMany();
  const codeMap = {
    'Conos': '1',
    'Vasos': '2', 
    'Sabores': '3',
    'Toppings': '4',
    'Helados': '5',
    'Bebidas': '6'
  };
  
  for (const cat of categories) {
    const code = codeMap[cat.name];
    if (code) {
      await prisma.category.update({
        where: { id: cat.id },
        data: { quickCode: code }
      });
      console.log(`Categoría "${cat.name}" actualizada con quickCode: ${code}`);
    }
  }
  
  console.log('¡Script completado!');
  await prisma.\$disconnect();
}

assignQuickCodes().catch(console.error);