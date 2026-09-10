import {
  getClosedRegisters,
  getOpenRegisterSummary,
} from "@/lib/cash-register";
import { requireUser } from "@/lib/auth";
import { CajaClient } from "./caja-client";

export const metadata = { title: "Caja · Heladería POS" };

export default async function CajaPage() {
  await requireUser();

  const [openSummary, closedRegisters] = await Promise.all([
    getOpenRegisterSummary(),
    getClosedRegisters(),
  ]);

  return <CajaClient summary={openSummary} closedRegisters={closedRegisters} />;
}
