import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-server";
import { TicketConfigPanel } from "@/components/TicketConfigPanel";
import type { TicketConfigDTO } from "@/lib/types";
import Link from "next/link";

const defaultConfig: TicketConfigDTO = {
  businessName: "Heladería POS",
  nit: null,
  address: null,
  phone: "",
  footerMessage: "¡Gracias por su compra!",
  fontSize: 10,
  paperWidthMm: 58,
};

export default async function TicketPage() {
  await requireAdmin();

  const config: TicketConfigDTO =
    (await prisma.ticketConfig.findUnique({ where: { id: "default" } })) ??
    defaultConfig;

  return (
    <div className="min-h-screen bg-[#FDF8FC] p-8">
      <nav
        className="border-b border-[#FF9CEE]/50 pb-4 mb-6 flex items-center justify-between"
      >
        <Link
          href="/productos"
          className="text-sm text-slate-500 hover:text-slate-800 transition"
        >
          ← Volver a Productos
        </Link>
        <span className="text-sm text-slate-500">
          ADMIN
        </span>
      </nav>

      <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 shadow-lg">
        <h1 className="text-2xl font-extrabold text-slate-800 mb-6">
          🧾 Configuración de Ticket Térmico (58mm)
        </h1>

        <TicketConfigPanel
          initialConfig={config}
        />
      </div>
    </div>
  );
}