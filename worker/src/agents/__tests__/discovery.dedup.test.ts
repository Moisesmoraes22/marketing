import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createFakeState,
  createFakeSupabase,
  seedContentItem,
  type FakeState,
} from "../../lib/__tests__/fakeSupabase.js";

const hoisted = vi.hoisted(() => ({
  current: {
    from: (_table: string): unknown => {
      throw new Error("fakeSupabase não inicializado");
    },
    rpc: (_name: string, _args: unknown): unknown => {
      throw new Error("fakeSupabase não inicializado");
    },
  },
}));

vi.mock("../../lib/supabase.js", () => ({
  supabase: {
    from: (table: string) => hoisted.current.from(table),
    rpc: (name: string, args: unknown) => hoisted.current.rpc(name, args),
  },
}));

const { processPost, normalizeInstagramUrl, mapMediaType } = await import("../discovery.js");
type ApifyPost = Parameters<typeof processPost>[0];
type DiscoveryPayload = Parameters<typeof processPost>[1];

let state: FakeState;

beforeEach(() => {
  state = createFakeState();
  const fake = createFakeSupabase(state);
  hoisted.current.from = fake.from.bind(fake);
  hoisted.current.rpc = fake.rpc.bind(fake);
});

function makePost(overrides: Partial<ApifyPost> = {}): ApifyPost {
  return {
    id: "17900000000000001",
    url: "https://instagram.com/reel/ABC123/",
    shortCode: "ABC123",
    caption: "post de teste",
    type: "Video",
    productType: "clips",
    likesCount: 100,
    commentsCount: 10,
    displayUrl: "https://example.com/thumb.jpg",
    videoUrl: "https://example.com/video.mp4",
    ownerUsername: "concorrente",
    ...overrides,
  };
}

const payloadA: DiscoveryPayload = {
  search_id: "search-a",
  hashtags: ["farmacia"],
  accounts: [],
  min_engagement: 0,
};
const payloadB: DiscoveryPayload = {
  search_id: "search-b",
  hashtags: ["farmaciapopular"],
  accounts: [],
  min_engagement: 0,
};

describe("normalizeInstagramUrl", () => {
  it("trata variações de protocolo, www, query string e barra final como o mesmo conteúdo", () => {
    const variants = [
      "https://instagram.com/reel/ABC123/",
      "https://www.instagram.com/reel/ABC123",
      "http://instagram.com/reel/ABC123/?utm_source=instagram",
      "https://www.instagram.com/reel/ABC123/?igshid=xyz",
    ];
    const normalized = variants.map(normalizeInstagramUrl);
    expect(new Set(normalized).size).toBe(1);
  });

  it("preserva o case do shortcode (case-sensitive)", () => {
    expect(normalizeInstagramUrl("https://instagram.com/reel/AbC123/")).toContain("AbC123");
  });
});

describe("mapMediaType", () => {
  it("identifica reel por productType clips", () => {
    expect(mapMediaType({ url: "x", productType: "clips" })).toBe("reel");
  });
  it("identifica carrossel por type Sidecar", () => {
    expect(mapMediaType({ url: "x", type: "Sidecar" })).toBe("carousel");
  });
  it("assume post como padrão", () => {
    expect(mapMediaType({ url: "x" })).toBe("post");
  });
});

describe("Discovery Agent — deduplicação de conteúdo", () => {
  it("Teste 1: dois resultados com o mesmo instagram_media_id → 1 content_item", async () => {
    await processPost(makePost(), payloadA);
    await processPost(makePost({ url: "https://instagram.com/reel/ABC123-repost/" }), payloadA);

    expect(state.contentItems.size).toBe(1);
  });

  it("Teste 2: mesmo conteúdo com URLs diferentes (sem media id) → 1 content_item", async () => {
    await processPost(
      makePost({ id: undefined, url: "https://instagram.com/reel/XYZ789/" }),
      payloadA,
    );
    await processPost(
      makePost({ id: undefined, url: "https://www.instagram.com/reel/XYZ789?utm_source=ig" }),
      payloadA,
    );

    expect(state.contentItems.size).toBe(1);
  });

  it("Teste 3: mesmo conteúdo encontrado por duas buscas → 1 content_item + 2 content_sources", async () => {
    await processPost(makePost(), payloadA);
    await processPost(makePost(), payloadB);

    expect(state.contentItems.size).toBe(1);
    expect(state.sources).toHaveLength(2);
    expect(state.sources.map((s) => s.search_id).sort()).toEqual(["search-a", "search-b"]);
  });

  it("Teste 4: mesmo conteúdo encontrado 5x pela mesma busca → 1 content_item + 1 content_source", async () => {
    for (let i = 0; i < 5; i++) {
      await processPost(makePost(), payloadA);
    }

    expect(state.contentItems.size).toBe(1);
    expect(state.sources).toHaveLength(1);
  });

  it("Teste 5: conteúdo já analisado (done) encontrado novamente → não reprocessa (IA não roda de novo)", async () => {
    const existing = seedContentItem(state, {
      status: "done",
      instagram_media_id: "17900000000000001",
      media_type: "reel",
    });

    await processPost(makePost(), payloadA);

    expect(state.contentItems.size).toBe(1);
    expect(state.jobInserts).toHaveLength(0);
    expect(state.contentItems.get(existing.id)?.discovery_count).toBe(2);
  });

  it("Teste 6: corrida entre dois jobs achando o mesmo conteúdo → ainda assim 1 content_item", async () => {
    // primeira chamada "vence" a corrida normalmente
    await processPost(makePost(), payloadA);
    expect(state.contentItems.size).toBe(1);

    // segunda chamada simula não ter visto o registro no SELECT (corrida),
    // mas a constraint UNIQUE do banco barra o INSERT — o código deve cair
    // no fallback e tratar como duplicata, não como erro.
    state.simulateRaceOnce = true;
    await processPost(makePost(), payloadB);

    expect(state.contentItems.size).toBe(1);
    expect(state.sources).toHaveLength(2);
  });

  it("Teste 7: conteúdo existente com status error → política de retry (reprocessa, sem duplicar)", async () => {
    seedContentItem(state, {
      status: "error",
      instagram_media_id: "17900000000000001",
      media_type: "reel",
    });

    await processPost(makePost(), payloadA);

    expect(state.contentItems.size).toBe(1);
    expect(state.jobInserts).toHaveLength(1);
    expect(state.jobInserts[0]?.type).toBe("transcribe");
  });

  it("Teste 8: conteúdo novo sem instagram_media_id → usa URL normalizada como fallback", async () => {
    const result = await processPost(makePost({ id: undefined }), payloadA);

    expect(result).toBe("new");
    expect(state.contentItems.size).toBe(1);
    const [row] = [...state.contentItems.values()];
    expect(row?.instagram_media_id).toBeNull();
    expect(row?.source_url_normalized).toBeTruthy();
  });
});
