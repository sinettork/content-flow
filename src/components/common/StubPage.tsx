import { Card, CardContent } from "@/components/ui/card";

import { PageHeader } from "./PageHeader";

export function StubPage({ title, description }: { title: string; description?: string }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          This page is scaffolded. Build the feature here.
        </CardContent>
      </Card>
    </>
  );
}
