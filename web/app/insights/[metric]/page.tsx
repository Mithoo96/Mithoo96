import { metrics } from "@/lib/mock";
import { MetricReport } from "@/components/pages/metric-report";

export function generateStaticParams() { return metrics.map((m) => ({ metric: m.key })); }

export default async function Page({ params }: { params: Promise<{ metric: string }> }) {
  const { metric } = await params;
  return <MetricReport metricKey={metric} />;
}
