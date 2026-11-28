import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-server";

const DEFAULT_ID = "default";

const DEFAULTS = {
  businessName: "Heladitos Dani",
  nit: null as string | null,
  address: null as string | null,
  phone: "",
  footerMessage: "¡Gracias por su compra!",
  fontSize: 10,
  paperWidthMm: 58,
};

function sanitizeConfig(body: unknown) {
  const input = (body ?? {}) as Record<string, unknown>;

  const text = (value: unknown, fallback: string) => {
    const parsed = typeof value === "string" ? value.trim() : "";
    return parsed.length > 0 ? parsed : fallback;
  };

  const optionalText = (value: unknown) => {
    const parsed = typeof value === "string" ? value.trim() : "";
    return parsed.length > 0 ? parsed : null;
  };

  const integer = (value: unknown, fallback: number, min: number, max: number) => {
    const parsed = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.round(parsed)));
  };

  return {
    businessName: text(input.businessName, DEFAULTS.businessName),
    nit: optionalText(input.nit),
    address: optionalText(input.address),
    phone: typeof input.phone === "string" ? input.phone.trim() : DEFAULTS.phone,
    footerMessage: text(input.footerMessage, DEFAULTS.footerMessage),
    fontSize: integer(input.fontSize, DEFAULTS.fontSize, 8, 14),
    paperWidthMm: integer(input.paperWidthMm, DEFAULTS.paperWidthMm, 54, 80),
  };
}

export async function GET() {
  try {
    const existing = await prisma.ticketConfig.findUnique({
      where: { id: DEFAULT_ID },
    });
    const config =
      existing ?? (await prisma.ticketConfig.create({ data: { id: DEFAULT_ID } }));

    return Response.json(
      { ok: true, config },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("GET /api/ticket-config failed:", error);
    return Response.json(
      { ok: false, error: "Error al obtener configuración" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ ok: false, error: "No autenticado" }, { status: 401 });
    }
    if (user.role !== "ADMIN") {
      return Response.json({ ok: false, error: "No autorizado" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const data = sanitizeConfig(body);

    const config = await prisma.ticketConfig.upsert({
      where: { id: DEFAULT_ID },
      update: data,
      create: { id: DEFAULT_ID, ...data },
    });

    return Response.json(
      { ok: true, config },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("PUT /api/ticket-config failed:", error);
    return Response.json(
      { ok: false, error: "Error al actualizar configuración" },
      { status: 500 },
    );
  }
}
