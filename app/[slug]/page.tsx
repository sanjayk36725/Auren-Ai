import { notFound } from "next/navigation";
import Page from "../page";

const pages: Record<string, string> = {
  dashboard: "dashboard",
  "new-project": "new",
  templates: "templates",
  assistant: "assistant",
  "code-analyzer": "analyzer",
  "ui-generator": "ui",
  "bug-finder": "bugs",
  performance: "performance",
  projects: "projects",
  deployments: "deployments",
  integrations: "integrations",
  settings: "settings",
};

export default async function RoutedAurenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const initialPage = pages[slug];
  if (!initialPage) notFound();
  return <Page initialPage={initialPage} />;
}
