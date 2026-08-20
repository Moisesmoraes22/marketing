"use client";

import { useState } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsIndicator,
  TabsContent,
} from "@/components/ui/tabs";
import type { ContentItem, Search } from "@/lib/types";
import { NewSearchForm } from "./new-search-form";
import { SearchList } from "./search-list";
import { ContentFeed } from "../conteudo/content-feed";
import { ContentFilters } from "../conteudo/content-filters";
import { DiscoveryStatus } from "../conteudo/discovery-status";
import { ProcessingBanner } from "../conteudo/processing-banner";

export function DescobertaTabs({
  searches,
  content,
  page,
  pageCount,
}: {
  searches: Search[];
  content: ContentItem[];
  page: number;
  pageCount: number;
}) {
  const [tab, setTab] = useState("descoberta");

  return (
    <Tabs value={tab} onValueChange={(value) => setTab(String(value))}>
      <TabsList>
        <TabsIndicator />
        <TabsTrigger value="descoberta">Descoberta</TabsTrigger>
        <TabsTrigger value="conteudo">Conteúdo</TabsTrigger>
      </TabsList>

      <TabsContent value="descoberta" className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Configure hashtags, contas e engajamento mínimo para buscar conteúdo viral.
        </p>
        <NewSearchForm onCreated={() => setTab("conteudo")} />
        <SearchList searches={searches} onRun={() => setTab("conteudo")} />
      </TabsContent>

      <TabsContent value="conteudo" className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Feed de posts coletados com status do pipeline em tempo real.
        </p>
        <DiscoveryStatus />
        <ContentFilters />
        <ProcessingBanner />
        <ContentFeed initialItems={content} page={page} pageCount={pageCount} />
      </TabsContent>
    </Tabs>
  );
}
