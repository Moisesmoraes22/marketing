# Sistema de Criação de Conteúdo

Pipeline multi-agente que descobre conteúdo viral no Instagram, analisa, critica e
gera roteiros/posts no tom de voz da marca. Uso interno do departamento de
marketing. Stack 100% gratuita — veja o plano completo em
[`docs/architecture/decisions/sistema-criacao-conteudo-v2-free.md`](docs/architecture/decisions/sistema-criacao-conteudo-v2-free.md).

## Estrutura

```
/frontend   — Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui
/worker     — Express + TypeScript, roda os agentes via polling da tabela `jobs`
/supabase   — schema.sql (banco, auth, fila de jobs)
```

## Setup local

### 1. Supabase

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No SQL Editor, rode o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).
3. Em **Project Settings → API**, copie a `URL`, a `anon public key` e a
   `service_role key`.

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
# preencha NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
npm install
npm run dev
```

Acesse `http://localhost:3000`. Crie um usuário em **Authentication → Users**
no painel do Supabase (ou habilite o cadastro público) para conseguir logar.

### 3. Worker

```bash
cd worker
cp .env.example .env
# preencha SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, APIFY_API_TOKEN e GROQ_API_KEY
npm install
npm run dev
```

O worker sobe em `http://localhost:3001` (`GET /health`) e começa a
consultar a tabela `jobs` a cada 30 segundos.

> **Dependência externa:** o agente de transcrição chama o binário `yt-dlp`
> via `child_process` — ele **não é um pacote npm**. Instale localmente com
> `pip install yt-dlp` (ou `winget install yt-dlp`) e garanta que esteja no
> `PATH`. Sem isso, jobs do tipo `transcribe` falham com status `error`.

## Deploy

| Serviço | O que fazer |
|---|---|
| **Vercel** | Conectar o repositório → Root Directory `/frontend` → variáveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **Render** | Web Service → Root Directory `/worker` → build `pip install -U yt-dlp && npm install && npm run build` → start `npm start` → variáveis `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY`, `APIFY_API_TOKEN` |
| **Supabase** | Já provisionado no passo 1 |

> O Render Free hiberna após 15 min sem tráfego (cold start de ~30s no
> primeiro job do dia). Aceitável para uso interno em horário comercial.

## Fases de desenvolvimento

Ver a Seção 7 do plano em
[`docs/architecture/decisions/sistema-criacao-conteudo-v2-free.md`](docs/architecture/decisions/sistema-criacao-conteudo-v2-free.md).
Fase 1 (fundação) está concluída nesta base.
