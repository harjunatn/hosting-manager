import { AppShell } from "@/components/app-shell";
import { requireClient } from "@/modules/auth/session";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireClient();
  return (
    <AppShell user={user} variant="portal">
      {children}
    </AppShell>
  );
}
