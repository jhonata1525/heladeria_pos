const { PrismaClient } = require('prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();
  
  // Step 1: Delete duplicate Arañita (id: 39) - BASE type in INFANTILES
  await prisma.product.delete({
    where: { id: 39 }
  });
  console.log('✓ Deleted Arañita (id: 39)');
  
  // Step 2: Move AÑARITA (id: 50) from category 13 to category 9 (INFANTILES)
  await prisma.product.update({
    where: { id: 50 },
    data: { categoryId: 9 }
  });
  console.log('✓ Moved AÑARITA to INFANTILES (categoryId: 9)');
  
  // Step 3: Delete Osito BASE (id: 40) since COMBO OSITO (id: 47) exists
  await prisma.product.delete({
    where: { id: 40 }
  });
  console.log('✓ Deleted Osito BASE (id: 40)');
  
  // Step 4: Delete Ratoncito BASE (id: 41) since COMBO RATONCITO (id: 49) exists
  await prisma.product.delete({
    where: { id: 41 }
  });
  console.log('✓ Deleted Ratoncito BASE (id: 41)');
  
  // Step 5: Change Cerdita (id: 38) kind from "BASE" to "COMBO" since no COMBO version exists
  await prisma.product.update({
    where: { id: 38 },
    data: { kind: 'COMBO' }
  });
  console.log('✓ Changed Cerdita kind to COMBO');
  
  await prisma.$disconnect();
  console.log('\nAll operations completed successfully!');
}

main().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});