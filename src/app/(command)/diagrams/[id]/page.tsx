import type { Metadata } from "next";
import { DiagramEditor } from "@/components/diagrams/diagram-editor";
import { getDiagram } from "@/lib/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const diagram = await getDiagram(id);
  return { title: diagram?.name ?? "Diagram" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DiagramEditor diagramId={id} />;
}
