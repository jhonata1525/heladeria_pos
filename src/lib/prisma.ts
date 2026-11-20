import "dotenv/config";
import { PrismaClient } from '../generated/prisma'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
})

const CATEGORIES = [
  { name: "Bebidas", products: ["MARACUMANGO", "SODA", "MALTEADA", "MALTEADA DANI ESPECIAL", "SALPICON CON HELADO"] },
  { name: "Copas", products: ["COPA CHOCOLATE", "ESPECIAL FRESAS"] },
  { name: "Emplatados", products: ["BANANA SPLIT", "ENSANADA DE FRUTAS", "WAFFLE DULCE DANI", "DANI ESPECIAL", "WAFFLE FRUTI DANI", "BROWNIE CON HELADO"] },
  { name: "Infantiles", products: ["CERDITA", "ARANITA", "OSITO", "RATONCITO"] },
  { name: "Conos y Canastas", products: ["FRUTIDANI", "SENCILLO", "DOBLE", "CANASTA DOBLE", "CANASTA TRIPLE"] },
]

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma