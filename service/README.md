# 🔥 FadNote

Secure, self-destructing notes that integrate into your existing workflows.

## Quick Start

```bash
# Install dependencies
bun install

# Copy environment file
cp .env.example .env

# Start with filesystem storage (simplest)
bun run dev

# Or start with Redis (production-like)
docker-compose up
```

## Project Structure

```
fadnote/
├── src/
│   ├── index.ts              # Hono server entry
│   ├── routes/notes.ts       # API endpoints
│   ├── storage/              # Storage adapters
│   └── utils/crypto.ts       # Client-side encryption
├── public/decrypt.html       # Browser decryption page
├── docker-compose.yml        # Redis + app setup
└── AGENT.md                  # 📖 Full specification for Claude Code
```

## Key Features

- ✅ **Client-side encryption** (AES-256-GCM) — server never sees plaintext
- ✅ **One-time read** — note auto-destructs after first view
- ✅ **Universal backend** — runs on Cloudflare Workers OR Docker
- ✅ **Storage abstraction** — Redis, Filesystem, or KV
- 🔄 **OpenClaw skill** (coming soon)
- 🔄 **Obsidian plugin** (coming soon)

## API

```bash
# Store encrypted note
curl -X POST http://localhost:3000/n/my-note-id \
  -H "Content-Type: application/octet-stream" \
  --data-binary @encrypted-note.bin

# Retrieve (one-time, auto-deletes)
curl http://localhost:3000/n/my-note-id
```

Shareable URL format:
```
https://fadnote.com/n/NOTE_ID#DECRYPTION_KEY
                              ↑
                    Never sent to server!
```

## Documentation

- **Full spec:** [AGENT.md](./AGENT.md) — Complete technical documentation
- **Project spec:** See Fabric inbox or `../fadnote-spec.md`

## Security

- Encryption happens in browser/skill before sending to server
- Server only stores encrypted blobs (can't decrypt)
- Decryption key is in URL fragment (#key) — browsers don't send this to server
- One-time retrieval with immediate deletion

---

Built with Hono, TypeScript, and 🔥
