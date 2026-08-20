# Fase 6 — QA e Segurança

Status do checklist de segurança definido na Seção 7 (Fase 6) do plano
[`sistema-criacao-conteudo-v2-free.md`](../../architecture/decisions/sistema-criacao-conteudo-v2-free.md).

| Item | Status | Nota |
|---|---|---|
| API keys em variáveis de ambiente | ✅ | `frontend/.env.local` e `worker/.env` gitignorados; nunca hardcoded. |
| RLS ativo no Supabase | ✅ | Todas as 7 tabelas com RLS habilitado e verificado via advisor de segurança (sem alertas pendentes). |
| Rate limiting no worker | ✅ | O poller processa **1 job por vez**, sequencialmente. O agendamento original usava `setInterval`, que sobreporia execuções se um job (ex: transcrição) demorasse mais que os 30s do intervalo — corrigido para reagendar só após o job anterior terminar ([worker/src/poller.ts](../../../worker/src/poller.ts)). |
| Validação de input com Zod | ✅ | Adicionada em todas as Server Actions e API routes que recebem input de usuário: `descoberta/actions.ts`, `voz/actions.ts`, `roteiros/actions.ts`, `api/searches/[id]/run`. |
| Worker sem endpoints públicos desnecessários | ✅ | Só expõe `GET /health`. Toda a lógica de negócio roda via poller interno, não por rota HTTP. |
| HTTPS automático (Vercel/Render) | ⏳ | Provisionado automaticamente no deploy — nada a fazer, mas só é validável após o deploy real. |
| Logs sem dados sensíveis | ✅ | Nenhum agente loga `APIFY_API_TOKEN`, `GROQ_API_KEY` ou `SUPABASE_SERVICE_ROLE_KEY`. |
| `.env` no `.gitignore` desde o início | ✅ | Presente desde a Fase 1 em todos os `.gitignore` do monorepo. |

## Pendências que exigem ação do usuário (fora do alcance do agente)

- **Deploy real** (Vercel + Render) para validar HTTPS automático — ver
  [README.md](../../../README.md#deploy).
- **`APIFY_API_TOKEN`** e **`GROQ_API_KEY`** ainda não configurados em
  `worker/.env` — sem eles o pipeline não roda de ponta a ponta.
- **`yt-dlp`** precisa estar instalado no `PATH` local e no build do Render
  (`pip install -U yt-dlp` no build command) — é uma dependência externa ao
  Node.js.

## O que não foi implementado

Rate limiting mais sofisticado (fila com prioridade, backoff exponencial em
erro 429 do Groq) não foi implementado — está fora do escopo do MVP e não
consta no checklist original. Se jobs começarem a falhar com 429, é o sinal
documentado na Seção 8 do plano para migrar de plano gratuito.
