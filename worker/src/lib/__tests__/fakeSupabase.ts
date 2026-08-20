// Fake mínimo do cliente Supabase, cobrindo só as chamadas que o Discovery
// Agent realmente faz. Não é um mock genérico — cada método replica
// exatamente a assinatura usada em discovery.ts, incluindo a constraint
// UNIQUE (instagram_media_id / source_url_normalized) que o banco real impõe.

export interface FakeContentItem {
  id: string;
  status: string;
  media_type: string;
  source_url: string;
  instagram_media_id: string | null;
  source_url_normalized: string | null;
  discovery_count: number;
}

export interface FakeState {
  contentItems: Map<string, FakeContentItem>;
  sources: Array<{ content_id: string; search_id: string }>;
  jobInserts: Array<{ type: string; payload: unknown }>;
  jobUpdates: Array<{ id: string; result: unknown }>;
  rpcCalls: Array<{ name: string; args: unknown }>;
  /** simula uma corrida: a próxima busca por SELECT finge não achar nada,
   * mesmo que o registro já exista — só o INSERT/constraint vê a verdade. */
  simulateRaceOnce: boolean;
}

let nextId = 1;

export function createFakeState(): FakeState {
  return {
    contentItems: new Map(),
    sources: [],
    jobInserts: [],
    jobUpdates: [],
    rpcCalls: [],
    simulateRaceOnce: false,
  };
}

function findByField(
  state: FakeState,
  field: "instagram_media_id" | "source_url_normalized",
  value: string,
): FakeContentItem | null {
  if (state.simulateRaceOnce) {
    state.simulateRaceOnce = false;
    return null;
  }
  return [...state.contentItems.values()].find((row) => row[field] === value) ?? null;
}

export function seedContentItem(
  state: FakeState,
  overrides: Partial<FakeContentItem>,
): FakeContentItem {
  const row: FakeContentItem = {
    id: `content-${nextId++}`,
    status: "done",
    media_type: "reel",
    source_url: "https://instagram.com/reel/SEED/",
    instagram_media_id: null,
    source_url_normalized: null,
    discovery_count: 1,
    ...overrides,
  };
  state.contentItems.set(row.id, row);
  return row;
}

export function createFakeSupabase(state: FakeState) {
  return {
    from(table: string) {
      if (table === "content_items") {
        return {
          select() {
            return {
              eq(col: "instagram_media_id" | "source_url_normalized", val: string) {
                return {
                  async maybeSingle() {
                    const row = findByField(state, col, val);
                    return {
                      data: row
                        ? {
                            id: row.id,
                            status: row.status,
                            media_type: row.media_type,
                            source_url: row.source_url,
                          }
                        : null,
                    };
                  },
                };
              },
            };
          },
          insert(row: Record<string, unknown>) {
            return {
              select() {
                return {
                  async single() {
                    const mediaId = row.instagram_media_id as string | null;
                    const normalizedUrl = row.source_url_normalized as string | null;
                    if (
                      mediaId &&
                      [...state.contentItems.values()].some((r) => r.instagram_media_id === mediaId)
                    ) {
                      return { data: null, error: { code: "23505", message: "duplicate key" } };
                    }
                    if (
                      normalizedUrl &&
                      [...state.contentItems.values()].some(
                        (r) => r.source_url_normalized === normalizedUrl,
                      )
                    ) {
                      return { data: null, error: { code: "23505", message: "duplicate key" } };
                    }
                    const id = `content-${nextId++}`;
                    state.contentItems.set(id, {
                      id,
                      status: "collected",
                      discovery_count: 1,
                      media_type: String(row.media_type),
                      source_url: String(row.source_url),
                      instagram_media_id: mediaId,
                      source_url_normalized: normalizedUrl,
                    });
                    return { data: { id }, error: null };
                  },
                };
              },
            };
          },
          update(patch: Record<string, unknown>) {
            return {
              async eq(_col: string, id: string) {
                const row = state.contentItems.get(id);
                if (row) Object.assign(row, patch);
                return { error: null };
              },
            };
          },
        };
      }

      if (table === "content_sources") {
        return {
          upsert(row: { content_id: string; search_id: string }) {
            return {
              async select() {
                const exists = state.sources.some(
                  (s) => s.content_id === row.content_id && s.search_id === row.search_id,
                );
                if (exists) return { data: [], error: null };
                state.sources.push(row);
                return { data: [{ id: `src-${state.sources.length}` }], error: null };
              },
            };
          },
        };
      }

      if (table === "jobs") {
        return {
          insert(row: { type: string; payload: unknown }) {
            state.jobInserts.push(row);
            return Promise.resolve({ error: null });
          },
          update(patch: { result: unknown }) {
            return {
              async eq(_col: string, id: string) {
                state.jobUpdates.push({ id, result: patch.result });
                return { error: null };
              },
            };
          },
        };
      }

      throw new Error(`fakeSupabase: tabela não mockada: ${table}`);
    },
    async rpc(name: string, args: unknown) {
      state.rpcCalls.push({ name, args });
      if (name === "increment_content_discovery") {
        const contentId = (args as { p_content_id: string }).p_content_id;
        const row = state.contentItems.get(contentId);
        if (row) row.discovery_count += 1;
      }
      return { data: null, error: null };
    },
  };
}
