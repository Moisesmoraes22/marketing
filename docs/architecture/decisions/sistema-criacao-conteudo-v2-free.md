# Plano de Desenvolvimento — Sistema de Criação de Conteúdo (Stack 100% Gratuita)

**Data:** 20/08/2026  
**Versão:** 2.0 — Free-first  
**Contexto:** Sistema interno do departamento de marketing  
**Princípio:** Construir e validar tudo sem gastar nada. Migrar para planos pagos só quando o sistema provar valor real para o time.

---

## 1. Visão do Produto

Pipeline multi-agente que descobre conteúdo viral no Instagram, analisa, critica e gera roteiros/posts no tom de voz da marca — rodando 100% em serviços gratuitos.

```
[Instagram] → Descoberta → Transcrição → Análise → Crítica → Roteiro/Post
                                                                    ↑
                                                          (perfil de voz da marca)
```

---

## 2. Stack Gratuita — Decisões e Justificativas

| Camada | Serviço | Plano gratuito | Por que essa escolha |
|--------|---------|---------------|----------------------|
| Frontend | Vercel Hobby | Ilimitado | Melhor hospedagem para Next.js, deploy automático pelo GitHub |
| Worker (agentes) | Render Free | 750h/mês | Servidor persistente sem timeout de 10s — essencial para pipelines longos |
| Banco de dados + Auth | Supabase Free | 500MB + 50k MAU | Banco, autenticação e fila de jobs em um só lugar |
| IA — Análise, Crítica, Roteiro | Groq Free | ~14.400 req/dia | Llama 3.3 70B, rápido e capaz para os agentes |
| IA — Transcrição de Reels | Groq Whisper Free | Incluso no plano | Mesmo provider, sem chave adicional |
| Scraping do Instagram | Apify Free | $5 créditos/mês | Único custo com risco de esgotar; ~300–500 posts/mês |
| Repositório | GitHub Free | Ilimitado | Repositório privado, integra com Vercel e Render |

**Custo total: R$ 0/mês** (enquanto o Apify não esgotar os $5 de crédito).

> **Aviso honesto sobre o Render Free:** o servidor "hiberna" após 15 minutos sem receber requisições e leva ~30 segundos para "acordar". Para uso durante o horário comercial isso é praticamente invisível — o primeiro job do dia pode demorar um pouco mais. Não é problema para um time pequeno.

> **Aviso honesto sobre o Groq:** os modelos (Llama 3.3 70B, Mixtral) são excelentes para análise e crítica. Na geração de roteiros com voz de marca muito específica, o Claude 3.5 Sonnet entrega resultado mais refinado. Quando chegar a hora de subir de nível, a migração é trocar a chave de API e o nome do modelo — a arquitetura não muda.

---

## 3. Arquitetura: dois serviços, um banco

O problema de rodar tudo no Vercel é o timeout de 10 segundos nas funções gratuitas — tempo insuficiente para scraping + transcrição + 3 agentes de IA encadeados. A solução gratuita é separar as responsabilidades:

```
┌─────────────────────┐        ┌──────────────────────────┐
│   Next.js (Vercel)  │        │  Worker Node.js (Render)  │
│                     │        │                           │
│  • UI do time       │        │  • Discovery Agent        │
│  • Login/auth       │◄──────►│  • Transcription Agent    │
│  • Dashboard        │        │  • Analysis Agent         │
│  • Biblioteca       │        │  • Critique Agent         │
│  • Editor de voz    │        │  • Script Generator       │
└─────────────────────┘        └──────────────────────────┘
           │                               │
           └──────────┬────────────────────┘
                      ▼
           ┌─────────────────────┐
           │   Supabase          │
           │                     │
           │  • PostgreSQL       │
           │  • Auth (usuários)  │
           │  • Fila de jobs*    │
           │  • Storage (mídia)  │
           └─────────────────────┘

* Fila simples via tabela jobs — sem Redis necessário
```

A fila de jobs é implementada como uma tabela no próprio Supabase. O Worker em Render consulta essa tabela a cada 30 segundos, pega o próximo job pendente e processa. Simples, sem dependência extra.

---

## 4. Agentes do Pipeline

| # | Agente | O que faz | Serviço gratuito |
|---|--------|-----------|-----------------|
| 1 | **Discovery Agent** | Busca posts/reels virais por hashtag e conta | Apify Free ($5/mês) |
| 2 | **Transcription Agent** | Baixa áudio do Reel e transcreve | Groq Whisper Free |
| 3 | **Analysis Agent** | Identifica gancho, estrutura, tom, gatilhos | Groq (Llama 3.3 70B) |
| 4 | **Critique Agent** | Avalia relevância e adaptabilidade ao nicho | Groq (Llama 3.3 70B) |
| 5 | **Script Generator** | Cria roteiro/post no tom da marca | Groq (Llama 3.3 70B) |

---

## 5. Arquitetura de Informação (Páginas)

```
/login                    — Autenticação (Supabase Auth)
/dashboard                — Jobs em andamento, últimos roteiros, métricas da semana
/descoberta               — Configurar hashtags, contas e frequência de busca
/conteudo                 — Feed de posts coletados com status do pipeline
/conteudo/[id]            — Detalhe: post original, transcrição, análise, crítica
/roteiros                 — Biblioteca de roteiros gerados
/roteiros/novo            — Gerar roteiro a partir de conteúdo analisado
/voz                      — Construção e refinamento do perfil de voz da marca
/configuracoes            — Usuários do time, integrações, API keys
```

---

## 6. Schema do Banco de Dados (Supabase)

```sql
-- Usuários do time (gerenciado pelo Supabase Auth)
profiles (id, email, name, role, created_at)

-- Configurações de busca
searches (id, name, hashtags[], accounts[], min_engagement, active, created_by, created_at)

-- Conteúdo coletado do Instagram
content_items (
  id, search_id, source_url, caption, media_type,
  engagement_score, thumbnail_url, collected_at,
  status  -- 'collected' | 'transcribing' | 'analyzing' | 'done' | 'error'
)

-- Resultados de cada agente
analyses (
  id, content_item_id, type,  -- 'transcription' | 'analysis' | 'critique'
  content jsonb,               -- resultado estruturado do agente
  created_at
)

-- Roteiros gerados
scripts (
  id, content_item_id, format,  -- 'reel_30s' | 'reel_60s' | 'carousel' | 'static_post'
  content jsonb,                 -- roteiro estruturado
  voice_profile_snapshot jsonb,  -- snapshot do perfil de voz usado
  approved bool, created_at
)

-- Fila de jobs (substitui Redis/BullMQ)
jobs (
  id, type,          -- 'discover' | 'transcribe' | 'analyze' | 'critique' | 'generate_script'
  payload jsonb,     -- dados necessários para o job
  status,            -- 'pending' | 'running' | 'done' | 'error'
  attempts int default 0,
  error_message text,
  created_at, started_at, finished_at
)

-- Perfil de voz da marca
voice_profile (
  id, target_audience text, tone_adjectives text[],
  words_we_use text[], words_we_avoid text[],
  example_approved_post text, calibration_notes text,
  updated_at
)
```

---

## 7. Fases de Desenvolvimento

### Fase 1 — Fundação (Semana 1–2)
**Objetivo:** Dois projetos rodando — Next.js no Vercel e Worker no Render — comunicando pelo Supabase.

Entregas:
- Repositório GitHub com dois diretórios: `/frontend` (Next.js) e `/worker` (Node.js)
- Supabase configurado: tabelas, RLS, auth
- Login/logout funcionando com proteção de rotas
- Layout base: sidebar, header, área de conteúdo
- Worker mínimo rodando no Render (endpoint `/health` retorna OK)
- Worker consultando tabela `jobs` a cada 30s e logando jobs encontrados

**Prompt para Claude Code — Fase 1:**
```
Crie um monorepo com dois diretórios na raiz:

/frontend — Next.js 14 com App Router, TypeScript, Tailwind CSS e shadcn/ui.
Configure Supabase Auth (email/senha) com middleware de proteção de rotas.
Crie layout base com sidebar (itens: Dashboard, Descoberta, Conteúdo, Roteiros, Voz da Marca, Configurações).
Variáveis de ambiente necessárias: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY.

/worker — Express.js com TypeScript.
Implemente um job poller em src/poller.ts que a cada 30 segundos consulta a tabela "jobs" no Supabase
(status = 'pending', ORDER BY created_at ASC, LIMIT 1), marca o job como 'running' e loga o payload.
Crie um endpoint GET /health que retorna { status: 'ok', timestamp }.
Variáveis de ambiente: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.

Crie o schema SQL completo para as tabelas: profiles, searches, content_items, analyses, scripts, jobs, voice_profile.
Inclua políticas RLS: usuários autenticados veem apenas dados da própria organização.

README.md com instruções de setup local e deploy (Vercel para /frontend, Render para /worker).
```

---

### Fase 2 — Discovery Agent (Semana 3–4)
**Objetivo:** Sistema buscando e salvando conteúdo viral do Instagram.

Entregas:
- Página `/descoberta` para configurar hashtags, contas e engajamento mínimo
- Botão "Executar busca agora" cria um job na tabela
- Worker processa o job chamando a API do Apify
- Posts coletados aparecem em `/conteudo` com status em tempo real via Supabase Realtime

**Prompt para Claude Code — Fase 2:**
```
No /worker, implemente o Discovery Agent em src/agents/discovery.ts.

Ele recebe um job com payload { search_id, hashtags: string[], accounts: string[], min_engagement: number }.

Fluxo:
1. Chama a API do Apify: POST https://api.apify.com/v2/acts/apify~instagram-scraper/runs
   com body { directUrls: (contas) e hashtags, resultsLimit: 50 }
   Header: Authorization: Bearer ${APIFY_API_TOKEN}
2. Faz polling no endpoint de resultado até status = 'SUCCEEDED' (intervalo de 5s, máximo 10 tentativas)
3. Filtra posts com (likesCount + commentsCount) >= min_engagement
4. Para cada post, insere na tabela content_items com status = 'collected'
5. Para cada Reel inserido, cria um job filho do tipo 'transcribe' na tabela jobs
6. Atualiza o job original para status = 'done'

Trate erros: se a API do Apify retornar erro, atualize o job para status = 'error' com error_message.
Nunca logue o APIFY_API_TOKEN.

No /frontend, crie a página /descoberta com:
- Formulário para criar/editar searches (nome, hashtags separadas por vírgula, contas @, engajamento mínimo)
- Botão "Executar agora" que faz POST /api/searches/[id]/run (API route do Next.js que insere job no Supabase)
- Lista de content_items com status em tempo real usando Supabase Realtime (subscribe na tabela content_items)
```

---

### Fase 3 — Transcription + Analysis + Critique Agents (Semana 5–6)
**Objetivo:** Pipeline completo de inteligência de conteúdo rodando automaticamente.

Entregas:
- Transcrição de Reels via Groq Whisper
- Análise identificando gancho, estrutura, tom e gatilhos de engajamento
- Crítica avaliando relevância ao nicho e adaptabilidade
- Página `/conteudo/[id]` com todas as camadas visíveis

**Prompt para Claude Code — Fase 3:**
```
No /worker, implemente três agentes encadeados. Todos usam o SDK do Groq:
import Groq from 'groq-sdk'
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

--- src/agents/transcription.ts ---
Recebe job com payload { content_item_id, source_url }.
1. Baixa o áudio do Reel usando yt-dlp via child_process.exec:
   yt-dlp -x --audio-format mp3 -o /tmp/{content_item_id}.mp3 {source_url}
2. Lê o arquivo /tmp/{content_item_id}.mp3
3. Envia para Groq Whisper:
   groq.audio.transcriptions.create({ file, model: 'whisper-large-v3', language: 'pt' })
4. Salva texto em analyses com type='transcription', content: { text }
5. Atualiza content_item status para 'analyzing'
6. Cria job filho do tipo 'analyze' com payload { content_item_id }
7. Deleta o arquivo /tmp/{content_item_id}.mp3

--- src/agents/analysis.ts ---
Recebe job com payload { content_item_id }.
Busca caption e transcrição do content_item no Supabase.
Chama groq.chat.completions.create com model: 'llama-3.3-70b-versatile' e system prompt:
"Você é especialista em conteúdo viral para Instagram. Analise o conteúdo e retorne APENAS um JSON válido com:
{ hook: string, narrative_structure: { intro: string, body: string, cta: string },
  tone: string[], engagement_triggers: string[], why_it_works: string }"
Salva em analyses com type='analysis'.
Cria job filho do tipo 'critique'.

--- src/agents/critique.ts ---
Recebe job com payload { content_item_id }.
Busca analysis e o nicho configurado (tabela searches via content_item).
Chama Groq com system prompt:
"Avalie a adaptabilidade deste conteúdo para o nicho informado. Retorne APENAS JSON:
{ relevance_score: number (0-10), adaptation_potential: 'alta'|'media'|'baixa',
  risks: string[], recommendation: 'adaptar'|'inspirar'|'ignorar', justification: string }"
Salva em analyses com type='critique'.
Atualiza content_item status para 'done'.

No poller (src/poller.ts), adicione handlers para jobs do tipo 'transcribe', 'analyze' e 'critique',
chamando os respectivos agentes. Use um Map<string, AgentHandler> para o dispatch.
```

---

### Fase 4 — Script Generator + Perfil de Voz (Semana 7–8)
**Objetivo:** Gerar roteiros e posts no tom da marca, com módulo de construção de voz.

Entregas:
- Wizard de construção do perfil de voz (5 perguntas guiadas)
- Gerador de roteiro a partir de conteúdo analisado
- Suporte a: roteiro de Reel (30s/60s/90s), post estático, carrossel
- Biblioteca de roteiros com aprovação pelo time

**Prompt para Claude Code — Fase 4:**
```
No /worker, implemente src/agents/scriptGenerator.ts.

Recebe job com payload { content_item_id, format, voice_profile_id }.
Busca no Supabase: analysis, critique e voice_profile.

System prompt base:
"Você é especialista em criação de conteúdo para Instagram. Use o perfil de voz fornecido abaixo
para criar o conteúdo — nunca copie o original, inspire-se apenas na estrutura e nos gatilhos.
O resultado deve soar 100% como a voz descrita.

PERFIL DE VOZ:
Público-alvo: {target_audience}
Tom: {tone_adjectives}
Palavras que usamos: {words_we_use}
Palavras que evitamos: {words_we_avoid}
Exemplo de post aprovado: {example_approved_post}"

Para format='carousel': retorne JSON { slides: [{ slide_number, headline, body, visual_suggestion }], caption, hashtags }
Para format='reel_30s'|'reel_60s'|'reel_90s': retorne JSON { hook, body_segments: string[], cta, caption, hashtags }
Para format='static_post': retorne JSON { headline, body, cta, caption, hashtags }

Salva em scripts com voice_profile_snapshot = cópia atual do voice_profile.

No /frontend, implemente:

Página /voz — Wizard de 5 etapas:
1. "Quem é o seu público?" (textarea)
2. "Descreva o tom de voz em 3 a 5 adjetivos" (tags input)
3. "Palavras e expressões que usamos muito" (tags input)
4. "Palavras e expressões que nunca usamos" (tags input)
5. "Cole aqui um post que você considera ideal para a marca" (textarea)
Salva no Supabase (tabela voice_profile). Após salvar, gera um post de teste usando o Script Generator
e apresenta para aprovação — o feedback ("aprovei" / "ajustar: ...") é salvo em calibration_notes.

Página /roteiros/novo — Selecionar conteúdo analisado + formato desejado + botão Gerar.
Página /roteiros — Biblioteca com status (pendente aprovação / aprovado) e filtros por formato.
```

---

### Fase 5 — Design com Claude Design (Semana 9)
**Objetivo:** UI polida com identidade visual da empresa.

Ações:
1. Abrir o **Claude Design** e descrever cada tela com base nas páginas da Seção 5
2. Gerar design system: cores da marca, tipografia, estado dos cards de conteúdo (coletado / analisando / pronto)
3. Exportar variáveis CSS e substituir os tokens do Tailwind

**Prompt para Claude Design — Tela principal (feed de conteúdo):**
```
Crie o design da página de feed de conteúdo de um sistema interno de criação de conteúdo para Instagram.
Cada card representa um post coletado e exibe: thumbnail, tipo (post/carrossel/reel), engajamento,
badge de status com cores (coletado = cinza, analisando = amarelo, pronto = verde, erro = vermelho),
e botão "Ver análise" ou "Gerar roteiro" dependendo do status.
Layout em grid responsivo (1 coluna mobile, 2 tablet, 3 desktop).
Estilo: profissional, limpo, sem elementos decorativos pesados. Não precisa parecer rede social.
Placeholder de cor de destaque: #6C63FF. Modo claro.
```

---

### Fase 6 — QA, Segurança e Deploy (Semana 10)

**Checklist de segurança:**
- [ ] Todas as API keys em variáveis de ambiente — nunca no código ou no repositório
- [ ] RLS ativo no Supabase (cada usuário vê apenas dados do próprio time)
- [ ] Rate limiting no Worker (máximo de N jobs simultâneos para não estourar limites do Groq)
- [ ] Validação de input com Zod em todos os endpoints
- [ ] Worker não expõe endpoints públicos desnecessários (apenas `/health` e rotas internas)
- [ ] HTTPS automático no Vercel e no Render (sem configuração adicional)
- [ ] Logs sem dados sensíveis (mascarar API keys, IDs de usuário em mensagens de erro)
- [ ] `.env` no `.gitignore` desde o início

**Deploy passo a passo:**

```
# 1. GitHub (privado)
git init && git remote add origin https://github.com/seu-usuario/content-system

# 2. Supabase
- Criar projeto em supabase.com (gratuito)
- Rodar o schema SQL da Seção 6 no SQL Editor
- Ativar RLS em todas as tabelas
- Copiar: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# 3. Vercel (frontend)
- Conectar repositório GitHub → selecionar diretório /frontend
- Adicionar variáveis de ambiente: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
- Deploy automático

# 4. Render (worker)
- Criar Web Service → conectar repositório → selecionar diretório /worker
- Build command: npm install && npm run build
- Start command: npm start
- Adicionar variáveis de ambiente:
    SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
    GROQ_API_KEY
    APIFY_API_TOKEN
- Deploy

# 5. Verificar
- Acessar frontend no domínio Vercel → fazer login
- Criar uma busca de teste → executar
- Checar logs do Worker no Render → confirmar que jobs estão sendo processados
```

---

## 8. Limites do Plano Gratuito e Quando Migrar

| Serviço | Limite gratuito | Sinal de que chegou a hora de pagar |
|---------|----------------|-------------------------------------|
| Apify | $5/mês (~300–500 posts) | Crédito esgotando antes do fim do mês |
| Groq | ~14.400 req/dia, rate limit por minuto | Jobs falhando com erro 429 (rate limit) |
| Supabase | 500MB de banco | Banco acima de 400MB |
| Render | 750h/mês, cold starts | Time reclamando de lentidão constante |
| Vercel | 100GB bandwidth | Raramente um problema para uso interno |

**Migração para pago quando provar valor:**
- Apify → aumentar plano ($49/mês para volume maior)
- Groq → manter OR migrar para Anthropic API (Claude 3.5 Sonnet) para melhor qualidade de roteiros
- Render → Starter ($7/mês) para eliminar cold starts
- Supabase → Pro ($25/mês) para 8GB de banco e backups diários

**Custo total na migração completa: ~R$ 450–600/mês** — justificado quando o sistema estiver ativo e economizando horas do time todo dia.

---

## 9. Próximos Passos Imediatos

1. **Definir o nicho:** quais hashtags e contas concorrentes monitorar — isso alimenta o Discovery Agent
2. **Criar contas gratuitas:** Supabase, Groq, Apify, Render, Vercel (todas têm cadastro em menos de 5 minutos)
3. **Abrir o Claude Code** com o prompt da Fase 1 e iniciar a fundação
4. **Abrir o Claude Design** para criar as primeiras telas (pode ser em paralelo com o dev)
5. Quando a Fase 2 estiver pronta, testar o scraping com as hashtags reais do nicho antes de seguir

---

*Versão 2.0 — Stack 100% gratuita. Atualizada em 20/08/2026.*
