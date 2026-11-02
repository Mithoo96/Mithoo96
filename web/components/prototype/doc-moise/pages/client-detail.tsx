import { clients } from "@/lib/prototype/doc-moise";
import { ClientProfile } from "@/components/pages/client-profile";

export function generateStaticParams() { return clients.map((c) => ({ id: c.id })); }

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientProfile id={id} />;
}
