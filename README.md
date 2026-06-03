# Reconnect AI - Intelligent Network OS

**Nexus Loom** e uma plataforma full stack de networking inteligente que transforma contatos profissionais em um sistema vivo de relacionamento, com historico, score, recomendacoes e mensagens geradas por IA.

O produto resolve a dificuldade de manter uma rede profissional ativa: centraliza contatos, registra interacoes, organiza notas em Markdown e usa o modulo **Connection Intelligence** para sugerir proximas acoes, follow-ups e insights.

## Visao Geral

- **Produto:** Reconnect AI - Intelligent Network OS
- **Codinome criativo:** Nexus Loom
- **Frontend:** React, Vite, TailwindCSS, Supabase Auth client
- **Backend:** Node.js, Express, API REST modular
- **Banco:** PostgreSQL via Neon/Supabase, com banco local JSON persistente para desenvolvimento
- **Auth:** Supabase Auth
- **IA:** OpenAI Responses API
- **Deploy:** Frontend na Vercel, backend no Render, DNS/CDN via Cloudflare

## Funcionalidades

- Login, cadastro e recuperacao de senha via Supabase
- Modo demo sem credenciais para avaliacao local
- Dashboard com total de conexoes, conexoes ativas, score medio e recomendacoes
- CRUD de contatos com tags, empresa, cargo, area e grau de proximidade
- Registro de interacoes com timeline de relacionamento
- Notas em Markdown
- Modulo **Connection Intelligence**
  - proxima acao recomendada
  - sugestao de follow-up
  - mensagem personalizada
  - resumo inteligente
  - score de relacionamento
- Pesquisa global
- Filtros por busca e tags no backend
- Exportacao CSV
- Exportacao PDF de brief de relacionamento
- Loading/empty/toast states

## Estrutura

```txt
Reconnect AI - Intelligent Network OS/
  backend/
    src/
      config/
      data/
      db/
      middleware/
      modules/
        contacts/
        interactions/
        intelligence/
      app.js
      server.js
    render.yaml
  frontend/
    src/
      components/
      data/
      lib/
      App.jsx
    vercel.json
```

## Como Rodar Localmente

### Backend

```bash
cd backend
npm install
copy .env.example .env
npm run dev
```

API local:

```txt
http://localhost:4100
```

### Frontend

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

App local:

```txt
http://localhost:5173
```

## Variaveis de Ambiente

### Backend

```txt
PORT=4100
CLIENT_ORIGIN=http://localhost:5173
DATABASE_URL=postgresql://...
LOCAL_DB_PATH=
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
```

### Frontend

```txt
VITE_API_URL=http://localhost:4100
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
```

## Banco Neon

1. Crie um projeto PostgreSQL no Neon.
2. Copie a connection string para `DATABASE_URL`.
3. Rode o schema:

```bash
cd backend
npm run seed
```

Sem `DATABASE_URL`, o backend usa o banco local persistente em `backend/src/data/local-db.json`.
Esse arquivo permite testar criacao de contatos, grupos, interacoes e perfil publico sem instalar Postgres.
Para mudar o local do arquivo, configure `LOCAL_DB_PATH`.

## Supabase Auth

1. Crie um projeto no Supabase.
2. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` no frontend.
3. Configure `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` no backend.
4. Ative email/password no painel de Authentication.

Sem Supabase, a interface entra em modo demo.

## OpenAI

O modulo `Connection Intelligence` usa a OpenAI Responses API para gerar respostas estruturadas em JSON. Se `OPENAI_API_KEY` nao estiver configurada, o backend gera recomendacoes demo deterministicas.

Endpoint principal:

```txt
POST /api/contacts/:id/intelligence
```

## Deploy

### Frontend - Vercel

1. Importe a pasta `frontend`.
2. Configure:

```txt
VITE_API_URL=https://seu-backend.onrender.com
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

3. Build command: `npm run build`
4. Output: `dist`

### Backend - Render

1. Crie um Web Service apontando para `backend`.
2. Use:

```txt
Build Command: npm install
Start Command: npm start
```

3. Configure as variaveis de ambiente do backend.

### Cloudflare

1. Aponte seu dominio para Vercel/Render.
2. Ative proxy/CDN para o frontend.
3. Use regras separadas para `api.seudominio.com` se desejar separar backend.

## Principais Rotas REST

```txt
GET    /health
GET    /api/dashboard
GET    /api/contacts
POST   /api/contacts
GET    /api/contacts/:id
PUT    /api/contacts/:id
DELETE /api/contacts/:id
GET    /api/interactions
POST   /api/interactions
POST   /api/contacts/:id/intelligence
GET    /api/intelligence/recommendations
```

## Status

MVP profissional pronto para evoluir para producao com credenciais reais de Neon, Supabase e OpenAI.
