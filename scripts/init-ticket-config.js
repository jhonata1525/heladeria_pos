const { PrismaClient } = require('C:\\Users\\Javier\\Documents\\proyectos\\heladeria_pos\\src\\generated\\prisma\\client');

async function init() {
  const p = new PrismaClient();
  await p.$connect();
  await p.ticketConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      businessName: 'Heladitos Dani',
      nit: '',
      address: '',
      phone: '312 345 6789',
      footerMessage: '¡Gracias por su compra!',
      fontSize: 10,
      paperWidthMm: 58,
    },
  });
  console.log('TicketConfig inicializado');
  await p.$disconnect();
}

init().catch(console.error);