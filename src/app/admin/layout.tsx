import { requireAdmin } from "@/lib/auth-server";

export default async function AdminLayout({
  children,
}: LayoutProps<"/admin">) {
  await requireAdmin();
  return children;
}
