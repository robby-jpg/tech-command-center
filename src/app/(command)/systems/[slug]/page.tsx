import type { Metadata } from "next";
import { SystemDetail } from "@/components/systems/system-detail";
import { getSystem, getSystems } from "@/lib/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const system = await getSystem(slug);
  return { title: system?.name ?? "System" };
}

/** The catalogue is small and stable, so every system page is prerendered. */
export async function generateStaticParams() {
  const systems = await getSystems();
  return systems.map((system) => ({ slug: system.slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <SystemDetail slug={slug} />;
}
