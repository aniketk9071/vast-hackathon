# SkillsHub — AI-Powered Skills Intelligence Platform

Built with Next.js 14, Prisma, **local PostgreSQL**, and **Ollama (free local AI)**.
No cloud services required — everything runs on your machine.

---

## Run with Docker (Recommended — one command)

### 1. Set your NextAuth secret
```bash
cp .env.docker.example .env.local
```
Edit `.env.local` — only one value needed:
```env
NEXTAUTH_SECRET="paste-output-of: openssl rand -base64 32"
```

### 2. Start everything
```bash
docker-compose up --build
```

Docker will automatically:
- Start **PostgreSQL** locally (no Supabase needed)
- Run **database migrations + seed** (15 demo employees)
- Download **llama3.2** AI model (~2 GB, first run only)
- Start the **Next.js app** at http://localhost:3000

> First run takes 3–5 minutes (model download). After that, starts in seconds.

### Docker commands
```bash
docker-compose up -d            # run in background
docker-compose down             # stop everything
docker-compose down -v          # stop + delete all data
docker-compose up --build       # rebuild after code changes
docker-compose logs -f app      # view app logs
docker-compose logs -f ollama   # view AI logs
docker-compose logs -f postgres # view DB logs
```

---

## Run locally (without Docker)

### Requirements
- Node.js 20+
- PostgreSQL installed locally
- Ollama installed from [ollama.com/download](https://ollama.com/download)

### Setup
```bash
# 1. Create local database
createdb skillshub

# 2. Pull AI model
ollama pull llama3.2

# 3. Install dependencies
npm install

# 4. Configure environment
cp .env.example .env.local
# Edit NEXTAUTH_SECRET in .env.local

# 5. Setup database
npm run db:push
npm run db:seed

# 6. Start dev server
npm run dev
```

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| HR | hr@skillshub.com | hr123 |
| Employee | john.doe@skillshub.com | emp123 |
| Employee | jane.smith@skillshub.com | emp123 |
| (+ 12 more employees) | ...@skillshub.com | emp123 |

---

## Services & Ports

| Service | Port | Description |
|---------|------|-------------|
| Next.js App | 3000 | Main application |
| PostgreSQL | 5432 | Local database |
| Ollama | 11434 | Local AI server |

---

## Ollama Model Options

| Model | Size | Quality |
|-------|------|---------|
| `llama3.2` | 2 GB | Good — default |
| `mistral` | 4 GB | Better JSON extraction |
| `qwen2.5:7b` | 4.5 GB | Excellent structured output |

Change model in `.env.local`:
```env
OLLAMA_MODEL="mistral"
```

---

## Architecture

```
Browser
  └── Next.js App (Docker: skillshub-app, port 3000)
        ├── Prisma ORM → PostgreSQL (Docker: skillshub-postgres, port 5432)
        └── Ollama AI  → llama3.2  (Docker: skillshub-ollama, port 11434)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router, standalone) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | NextAuth.js |
| ORM | Prisma |
| Database | PostgreSQL 16 (local Docker container) |
| AI | Ollama + llama3.2 (local, 100% free) |
| PDF Parsing | pdf-parse |
| Container | Docker + docker-compose |
