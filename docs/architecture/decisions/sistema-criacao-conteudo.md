# Plano de Desenvolvimento — Sistema de Criação de Conteúdo (Instagram)

**Data:** 20/08/2026  
**Contexto:** Sistema interno do departamento de marketing  
**Objetivo:** Pipeline multi-agente que descobre conteúdo viral no Instagram, analisa, critica e gera roteiros/posts no tom de voz da marca.

---

## 1. Visão do Produto

Um **web app hospedado** onde o time de marketing acessa um painel que automatiza o ciclo completo de inteligência de conteúdo:

```
[Instagram] → Descoberta → Transcrição → Análise → Crítica → Roteiro/Post
                                                                    ↑
                                                          (perfil de voz da marca)
```

O sistema não substitui o criativo — ele elimina as horas gastas em pesquisa manual e garante que cada roteiro já nasce alinhado ao estilo da empresa.

---

## 2. Agentes do Pipeline (o coração do sistema)

| # | Agente | O que faz | Tecnologia |
|---|--------|-----------|------------|
| 1 | **Discovery Agent** | Busca posts/reels virais por nicho, hashtag ou conta concorrente | Apify (Instagram scraper) + Claude |
| 2 | **Transcription Agent** | Extrai áudio de Reels e transcreve | OpenAI Whisper (via API) |
| 3 | **Analysis Agent** | Identifica gancho, estrutura, tom, CTA e por que viralizou | Claude API |
| 4 | **Critique Agent** | Avalia aplicabilidade ao nicho e às metas da empresa | Claude API |
| 5 | **Script Generator** | Gera roteiro/post adaptado com o tom de voz da marca | Claude API + perfil de voz |

> **Nota sobre o perfil de voz:** como não há material de referência ainda, o sistema terá um módulo de "Construção de Voz" onde o time responde perguntas guiadas e aprova/rejeita rascunhos até o perfil estar calibrado. Com o tempo, posts aprovados retroalimentam o perfil automaticamente.

---

## 3. Stack Técnica Recomendada

### Frontend
- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** — componentes prontos, design limpo, fácil de customizar
- **Recharts** — para dashboards e métricas

### Backend
- **Next.js API Routes** para endpoints simples (mesma base, deploy único na Vercel)
- **BullMQ** (fila de jobs) para orquestrar os agentes sem travar a UI
- **Redis** (Upstash, serverless) como broker da fila

### Banco de Dados
- **Supabase** (PostgreSQL gerenciado) — banco + autenticação de usuários + storage de mídia em um só lugar

### Serviços Externos
- **Anthropic API** — todos os agentes de IA (Discovery intelligence, Analysis, Critique, Script)
- **Apify** — scraping do Instagram (API oficial + proxies gerenciados, sem risco de bloqueio)
- **OpenAI Whisper API** — transcrição de áudio de Reels
- **Vercel** — hospedagem do Next.js (frontend + API routes)
- **Upstash Redis** — fila de jobs serverless (integra nativamente com Vercel)

### Por que essa stack?
- **Um só repositório, um só deploy** (Next.js full-stack na Vercel) — sem infraestrutura separada para manter
- **Supabase** elimina a necessidade de configurar auth do zero e já dá banco relacional com SDK
- **BullMQ + Redis** garante que pipelines longos (scraping + transcrição + 3 agentes) rodem em background sem timeout
- **Custo inicial baixo** — Vercel Hobby/Pro + Supabase Free + Upstash Free cobrem a fase de validação

---

## 4. Arquitetura de Informação (Páginas do App)

```
/login                    — Autenticação do time (Supabase Auth)
/dashboard                — Resumo: jobs rodando, últimos roteiros gerados, métricas
/descoberta               — Configurar buscas (nicho, hashtags, contas, frequência)
/conteudo                 — Feed de posts virais coletados + status de análise
/conteudo/[id]            — Detalhe: post original, transcrição, análise, crítica
/roteiros                 — Biblioteca de roteiros gerados
/roteiros/novo            — Gerar roteiro a partir de um conteúdo analisado
/voz                      — Perfil de voz da marca (construção e refinamento)
/configuracoes            — Integrações, API keys, usuários do time
```

---

## 5. Fases de Desenvolvimento

### Fase 1 — Fundação (Semana 1–2)
**Objetivo:** Projeto funcionando localmente, banco configurado, auth funcionando.

Entregas:
- Repositório Next.js 14 com TypeScript e Tailwind configurados
- Supabase configurado: tabelas, políticas RLS, auth
- Login/logout funcionando com proteção de rotas
- Layout base do app (sidebar, header, área de conteúdo)

**Prompt para Claude Code — Fase 1:**
```
Crie um projeto Next.js 14 com App Router, TypeScript e Tailwind CSS.
Configure Supabase para autenticação (email/senha) com middleware de proteção de rotas.
Crie o layout base do app com sidebar de navegação responsiva (itens: Dashboard, Descoberta, Conteúdo, Roteiros, Voz da Marca, Configurações).
Use shadcn/ui para os componentes base (Button, Input, Card, Badge, Sidebar).
Estrutura de pastas: src/app, src/components, src/lib, src/types.
Crie o schema inicial no Supabase com as tabelas: profiles, searches, content_items, analyses, scripts, voice_profile.
```

---

### Fase 2 — Discovery Agent (Semana 3–4)
**Objetivo:** Sistema buscando e salvando conteúdo viral do Instagram.

Entregas:
- Integração com Apify (Instagram Scraper)
- Página de configuração de buscas (nicho, hashtags, volume)
- Job em background que roda a busca e salva no banco
- Feed de conteúdo na UI com status (coletado / analisado / roteiro gerado)

**Prompt para Claude Code — Fase 2:**
```
Implemente o Discovery Agent no arquivo src/lib/agents/discovery.ts.
Ele deve: (1) chamar a API do Apify com o ator 'apify/instagram-scraper', passando hashtags e contas configuradas pelo usuário; (2) filtrar posts por engajamento mínimo (likes + comments > threshold configurável); (3) salvar os posts na tabela content_items do Supabase com campos: id, source_url, caption, media_type (post/carousel/reel), engagement_score, thumbnail_url, collected_at, status.
Crie uma API route em src/app/api/discovery/run/route.ts que dispara o job via BullMQ.
A UI na página /descoberta deve mostrar as buscas configuradas e um botão "Executar agora" com status em tempo real via polling (revalidate a cada 5s).
Trate erros da API Apify retornando status 500 com mensagem clara. Nunca exponha a API key nos logs de erro.
```

---

### Fase 3 — Transcription + Analysis + Critique Agents (Semana 5–6)
**Objetivo:** Pipeline completo de inteligência rodando para cada conteúdo coletado.

Entregas:
- Transcrição automática de Reels via Whisper
- Agente de análise identificando: gancho, estrutura narrativa, tom, CTA, gatilhos de engajamento
- Agente de crítica avaliando: relevância ao nicho, adaptabilidade, riscos
- Página de detalhe do conteúdo com todas as camadas de análise

**Prompt para Claude Code — Fase 3:**
```
Implemente três agentes em src/lib/agents/:

1. transcription.ts — baixa o áudio do Reel usando yt-dlp (via child_process), envia para a API Whisper (openai.audio.transcriptions.create) e salva o texto na tabela analyses com type='transcription'.

2. analysis.ts — recebe caption + transcrição e envia ao Claude API (anthropic.messages.create) com o seguinte system prompt: "Você é um especialista em conteúdo viral para Instagram. Analise o conteúdo fornecido e retorne um JSON estruturado com: hook (gancho dos primeiros 3 segundos/palavras), narrative_structure (introdução/desenvolvimento/CTA), tone (adjetivos que descrevem o tom), engagement_triggers (lista dos gatilhos usados), why_it_works (análise em 2-3 parágrafos)." Salve o resultado em analyses com type='analysis'.

3. critique.ts — recebe a análise anterior e o contexto do nicho configurado, envia ao Claude API e retorna: relevance_score (0-10), adaptation_potential (alta/média/baixa), risks (lista), recommendation (adaptar/inspirar/ignorar). Salve em analyses com type='critique'.

Os três agentes devem ser encadeados em um pipeline em src/lib/pipeline.ts que roda via BullMQ quando um novo content_item é salvo com status='collected'.
```

---

### Fase 4 — Script Generator + Perfil de Voz (Semana 7–8)
**Objetivo:** Geração de roteiros e carrosséis no tom da marca.

Entregas:
- Módulo de construção do perfil de voz (questionário guiado + aprovação de rascunhos)
- Gerador de roteiro/post a partir de análise aprovada
- Suporte a múltiplos formatos: roteiro de Reel (30s/60s/90s), post estático, carrossel (slides)
- Biblioteca de roteiros com histórico e versões

**Prompt para Claude Code — Fase 4:**
```
Implemente o Script Generator em src/lib/agents/scriptGenerator.ts.
Ele recebe: analysis (da Fase 3), critique (da Fase 3), format ('reel_30s' | 'reel_60s' | 'reel_90s' | 'static_post' | 'carousel'), voice_profile (objeto da tabela voice_profile do usuário).

System prompt base:
"Você é um especialista em criação de conteúdo para Instagram. Use o perfil de voz fornecido para adaptar o conteúdo — nunca copie o original, apenas inspire-se na estrutura e nos gatilhos identificados. O resultado deve soar 100% como a voz da marca."

Para 'carousel', retorne um array de slides com { slide_number, headline, body, visual_suggestion }.
Para formatos de reel, retorne { hook, body_segments, cta, caption_sugerida, hashtags }.
Para 'static_post', retorne { headline, body, cta, caption_sugerida, hashtags }.

Salve na tabela scripts com: content_item_id, format, content (JSON), voice_profile_snapshot, created_at.

Crie também a página /voz com um wizard de 5 perguntas guiadas (público-alvo, tom de voz, palavras que usamos, palavras que evitamos, exemplo de post que você aprovaria) que popula a tabela voice_profile. Adicione um botão "Calibrar com rascunho" que gera um post teste e pede aprovação/ajustes — o feedback é salvo e incorporado ao perfil.
```

---

### Fase 5 — Design com Claude Design (Semana 9)
**Objetivo:** UI/UX polida e consistente com a identidade visual da empresa.

Ações:
1. Abrir o **Claude Design** (ou Figma com Claude) e descrever cada tela com base na arquitetura de informação da Seção 4
2. Gerar o design system: cores da marca, tipografia, componentes (cards de conteúdo, badges de status, player de reel, visualizador de carrossel)
3. Exportar tokens de design e aplicar no shadcn/ui via variáveis CSS no Tailwind

**Prompt para Claude Design — Dashboard:**
```
Crie o design do dashboard de um sistema de criação de conteúdo para Instagram para uso interno de um time de marketing.
Layout: sidebar fixa à esquerda com navegação, área principal com grid de cards.
Cards principais: "Jobs em andamento" (lista com progress bar), "Últimos roteiros gerados" (cards com thumbnail + formato + data), "Métricas da semana" (posts coletados, analisados, roteiros gerados).
Estilo: moderno, limpo, profissional — não precisa parecer rede social. Paleta neutra com accent na cor principal da marca (placeholder: #6C63FF).
```

---

### Fase 6 — QA, Segurança e Deploy (Semana 10)

**Checklist de Segurança:**
- [ ] Todas as API keys em variáveis de ambiente (`.env.local` local, Vercel Environment Variables em produção)
- [ ] RLS (Row Level Security) ativo no Supabase — cada usuário vê apenas os dados da sua organização
- [ ] Rate limiting nas API routes que chamam serviços externos (Apify, Whisper, Claude API)
- [ ] Validação de input em todos os formulários (zod + react-hook-form)
- [ ] HTTPS automático via Vercel (sem configuração adicional)
- [ ] Headers de segurança configurados no `next.config.js` (CSP, X-Frame-Options, HSTS)
- [ ] Logs de erro sem dados sensíveis expostos

**Deploy:**
```
1. Repositório no GitHub (privado)
2. Conectar ao Vercel → deploy automático a cada push na main
3. Configurar variáveis de ambiente na Vercel:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - ANTHROPIC_API_KEY
   - APIFY_API_TOKEN
   - OPENAI_API_KEY
   - UPSTASH_REDIS_REST_URL
   - UPSTASH_REDIS_REST_TOKEN
4. Configurar domínio customizado na Vercel
5. Criar conta de serviço no Supabase com permissões mínimas para o backend
```

---

## 6. Estimativa de Custos Mensais (escala inicial)

| Serviço | Plano | Custo estimado |
|---------|-------|----------------|
| Vercel | Pro | ~$20/mês |
| Supabase | Free → Pro se necessário | $0–25/mês |
| Upstash Redis | Pay-per-use | ~$0–5/mês |
| Apify | Pay-per-use (scraping) | ~$10–50/mês dependendo do volume |
| Anthropic API | Pay-per-token | ~$10–30/mês (uso moderado) |
| OpenAI Whisper | Pay-per-minuto de áudio | ~$5–15/mês |
| **Total estimado** | | **~$45–145/mês** |

---

## 7. Roadmap Futuro (após MVP)

- **Agendamento automático** — integração com API do Instagram para agendar posts diretamente
- **A/B testing de ganchos** — testar duas versões de roteiro e rastrear qual performa melhor
- **Análise de concorrentes** — monitoramento contínuo de contas específicas
- **Relatório semanal automático** — email/Slack com os melhores conteúdos do nicho
- **Multi-nicho** — suporte a múltiplas marcas/contas no mesmo sistema

---

## 8. Próximos Passos Imediatos

1. **Definir o nicho** (hashtags e contas concorrentes a monitorar) — isso alimenta o Discovery Agent
2. **Criar conta no Apify** e testar o ator `apify/instagram-scraper` manualmente com as hashtags do nicho
3. **Criar conta no Supabase** e iniciar o projeto (grátis)
4. **Abrir o Claude Design** para criar as primeiras telas com base na arquitetura desta seção 4
5. **Iniciar o Claude Code** com o prompt da Fase 1 acima

---

*Documento gerado em 20/08/2026. Atualizar conforme o desenvolvimento avança.*
