# 🤖 Claude Code Agent Specification

## Project: FadNote

**Last Updated:** February 19, 2026  
**Agent Instructions:** Read this entire document before making any changes. This is your source of truth.

---

## 1. Project Overview

### What is FadNote?

FadNote is a **secure, self-destructing note sharing platform** with a unique twist: **no web interface for creating notes**. Instead of competing with Privnote/Yopass (which have web forms vulnerable to phishing), FadNote integrates directly into existing workflows through:

1. **OpenClaw Skill** - Users say "Secure this note" in chat
2. **Obsidian Plugin** - Right-click any text → "Share as FadNote"
3. **API** - For developers who want to integrate

### Core Philosophy

> **Security through integration** — Users never leave their trusted tools to share secrets. The server never sees unencrypted content.

### Key Differentiator

| Traditional Tools (Privnote) | FadNote |
|------------------------------|---------|
| Go to website → paste text | Say "secure this" in OpenClaw |
| Copy-paste workflow | One-click in Obsidian |
| Web form vulnerable to fake sites | No web form to spoof |
| Server receives plaintext | Client-side encryption only |

---

## 2. Architecture

### Universal Backend Strategy

The backend is built with **Hono**, a ultra-light web framework (14KB) that runs everywhere:
- **Cloudflare Workers** (hosted, serverless)
- **Docker + Node.js/Bun** (self-hosted)
- **Same codebase** for both

### Storage Abstraction

```typescript
// src/storage/interface.ts
interface Storage {
  get(id: string): Promise<Buffer | null>;
  set(id: string, blob: Buffer, ttlSeconds?: number): Promise<void>;
  delete(id: string): Promise<void>;
  exists(id: string): Promise<boolean>;
}
```

**Storage Adapters:**
1. **RedisStorage** - Production, proper TTL support
2. **FilesystemStorage** - Development/simple deployments
3. **CloudflareKVStorage** - For Workers deployment (not yet implemented)

### Security Model (CRITICAL)

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT-SIDE ENCRYPTION                    │
├─────────────────────────────────────────────────────────────┤
│ 1. User types note in OpenClaw/Obsidian                      │
│ 2. Note is encrypted with AES-256-GCM IN THE BROWSER/SKILL   │
│ 3. Encrypted blob sent to server (server can't decrypt!)     │
│ 4. Shareable URL: https://fadnote.com/n/ID#DECRYPTION_KEY   │
│                           ↑                                 │
│                    URL fragment (never sent to server)      │
│ 5. Recipient opens URL, fetches encrypted blob               │
│ 6. Browser decrypts using key from URL fragment              │
│ 7. Server deletes blob after first fetch (ONE-TIME READ)     │
└─────────────────────────────────────────────────────────────┘
```

**Key Points:**
- Server ONLY stores encrypted blobs
- Decryption key is in URL fragment (`#key`) - browsers never send this to server
- One-time read: blob is deleted immediately after first successful fetch
- AES-256-GCM with PBKDF2 key derivation (100,000 iterations)

---

## 3. API Endpoints

### POST /n/:id
Store an encrypted note.

**Headers:**
- `Content-Type: application/octet-stream` (the encrypted blob)
- `X-Note-TTL: 86400` (optional, seconds until auto-expiry)

**Body:** Encrypted note data (Buffer)

**Response:**
```json
{
  "success": true,
  "id": "abc123",
  "expiresIn": 86400
}
```

### GET /n/:id
Retrieve and delete a note (ONE-TIME READ).

**Response:**
- Success: Encrypted blob as `application/octet-stream`
- Already viewed: `404 Not Found`
- Not found: `404 Not Found`

**Headers on success:**
- `X-Note-Status: deleted` (confirms deletion occurred)

### GET /n/
Serves the decryption HTML page for browser users.

### GET /health
Health check endpoint.

---

## 4. File Structure

```
fadnote/
├── src/
│   ├── index.ts              # Main Hono server entry point
│   ├── routes/
│   │   └── notes.ts          # /n/* routes (POST, GET)
│   ├── storage/
│   │   ├── interface.ts      # Storage interface definition
│   │   ├── factory.ts        # createStorage() factory
│   │   ├── redis.ts          # Redis adapter
│   │   └── filesystem.ts     # Filesystem adapter
│   └── utils/
│       └── crypto.ts         # Client-side encryption utilities
├── public/
│   └── decrypt.html          # Browser decryption page
├── tests/                    # (not yet created)
├── package.json              # Dependencies: hono, ioredis, uuid
├── tsconfig.json             # TypeScript config
├── docker-compose.yml        # Redis + app setup
├── Dockerfile                # Bun-based container
└── .env.example              # Environment variables
```

---

## 5. Development Setup

### Option 1: Filesystem (Simplest)
```bash
# Install dependencies
bun install

# Copy env file
cp .env.example .env
# Edit .env: STORAGE_TYPE=filesystem

# Run dev server
bun run dev
```

### Option 2: With Redis (Production-like)
```bash
# Start Redis and app
docker-compose up

# Or manually:
docker run -d -p 6379:6379 redis:7-alpine
STORAGE_TYPE=redis bun run dev
```

### Option 3: Cloudflare Workers (Future)
```bash
# Install Wrangler
npm install -g wrangler

# Configure KV namespace in wrangler.toml
# Deploy
wrangler deploy
```

---

## 6. Current Implementation Status

### ✅ Implemented
- [x] Hono server scaffolding
- [x] Storage interface and factory
- [x] Redis adapter (with TTL)
- [x] Filesystem adapter (basic)
- [x] POST /n/:id endpoint (store encrypted note)
- [x] GET /n/:id endpoint (retrieve + delete)
- [x] Client-side crypto utilities (AES-256-GCM)
- [x] Browser decryption page (decrypt.html)
- [x] Docker compose setup
- [x] TypeScript configuration

### ❌ Not Yet Implemented
- [ ] **Cloudflare Workers adapter** (CloudflareKVStorage)
- [ ] **OpenClaw Skill** - Integration with OpenClaw agent
- [ ] **Obsidian Plugin** - Right-click share functionality
- [ ] **Rate limiting** - Prevent abuse
- [ ] **File sharing** - Support for encrypted file uploads
- [ ] **Expiration options** - 1 hour, 24 hours, 7 days, 1 view
- [ ] **Custom domains** - For Pro users
- [ ] **Audit logs** - For Enterprise users

---

## 7. Testing the API

### Store a Note
```bash
# Create encrypted payload (using crypto.ts functions)
# For manual testing, create a test file:
echo '{"ciphertext":"...","iv":"...","salt":"..."}' > note.enc

# Store it
curl -X POST http://localhost:3000/n/test123 \
  -H "Content-Type: application/octet-stream" \
  --data-binary @note.enc

# Response: {"success":true,"id":"test123","expiresIn":86400}
```

### Retrieve a Note
```bash
# First fetch succeeds and deletes
curl http://localhost:3000/n/test123 \
  -H "Accept: application/octet-stream" \
  --output retrieved.enc

# Second fetch returns 404
curl http://localhost:3000/n/test123
# Response: {"error":"Note not found or already viewed"}
```

---

## 8. Future Integrations

### OpenClaw Skill (Phase 2)
**User flow:**
```
User: "Secure this API key: sk-abc123"
OpenClaw: 
  1. Encrypts the key client-side
  2. POSTs to FadNote API
  3. Returns: "Link created: https://fadnote.com/n/abc#xyz"
  4. Optionally emails via Resend
```

**Implementation:**
- Create `openclaw-skill/` directory
- Use `crypto.ts` for encryption
- HTTP client to POST to FadNote API
- Integration with existing Resend skill for email

### Obsidian Plugin (Phase 3)
**User flow:**
```
1. Select text in Obsidian note
2. Right-click → "Share as FadNote"
3. Plugin encrypts selection
4. POSTs to FadNote API
5. Link copied to clipboard
```

**Implementation:**
- Create `obsidian-plugin/` directory
- Use Obsidian Plugin API
- Settings panel for API endpoint
- Context menu integration

---

## 9. Security Considerations

### DO:
- ✅ Keep encryption client-side only
- ✅ Validate all IDs (alphanumeric only)
- ✅ Limit note size (max 1MB)
- ✅ Delete immediately after fetch
- ✅ Use constant-time comparison if comparing keys
- ✅ Rate limit API endpoints

### DON'T:
- ❌ Never store decryption keys server-side
- ❌ Never log plaintext content
- ❌ Never allow server-side decryption
- ❌ Don't trust client-provided TTLs blindly
- ❌ Don't reuse IDs (check exists() before set)

---

## 10. Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `STORAGE_TYPE` | filesystem | `filesystem` or `redis` |
| `FS_STORAGE_PATH` | ./data/notes | Filesystem storage directory |
| `REDIS_URL` | redis://localhost:6379 | Redis connection URL |
| `CORS_ORIGIN` | * | CORS allowed origin |

---

## 11. Common Issues

### "Cannot find module 'hono'"
Run `bun install` to install dependencies.

### Redis connection refused
Make sure Redis is running: `docker-compose up redis`

### Filesystem storage not persisting
The `./data` directory must exist and be writable.

---

## 12. Next Tasks (Priority Order)

1. **Test current implementation**
   - Start server with filesystem storage
   - Store and retrieve a test note
   - Verify one-time delete works

2. **Add Cloudflare Workers support**
   - Create `src/storage/cloudflare-kv.ts`
   - Add wrangler.toml config
   - Test `wrangler dev` locally

3. **Create OpenClaw skill skeleton**
   - New directory `openclaw-skill/`
   - Implement crypto encryption
   - HTTP client to call FadNote API

4. **Add rate limiting**
   - Use `hono-rate-limiter` or custom middleware
   - Limit: 10 requests per minute per IP

5. **File sharing support**
   - Extend crypto.ts for file encryption
   - Add multipart/form-data support to POST endpoint

---

## 13. Tech Stack Reference

| Component | Technology |
|-----------|------------|
| Runtime | Bun (preferred) or Node.js |
| Framework | Hono v4 |
| Language | TypeScript 5.3 |
| Storage (self-hosted) | Redis 7 or Filesystem |
| Storage (cloud) | Cloudflare Workers KV |
| Encryption | Web Crypto API (AES-256-GCM) |
| Container | Docker + Bun base image |

---

## 14. Project Goals

### MVP (Weekend)
- [x] Backend API working
- [ ] OpenClaw skill proof-of-concept
- [ ] Basic Obsidian plugin

### Launch (Month 1)
- [ ] Hosted version on fadnote.com
- [ ] OpenClaw skill published
- [ ] Obsidian plugin in community store
- [ ] Self-hosting docs complete

### Scale (Month 3+)
- [ ] Pro tier ($5-10/mo)
- [ ] File sharing
- [ ] Team features
- [ ] Enterprise self-hosted

---

## 15. Contact & Context

This project was designed by:
- **User:** easyFloyd (Attila Király) - Senior backend developer
- **Agent:** efClaw (OpenClaw AI assistant)

**Original spec:** Check `fadnote-spec.md` in workspace root  
**Project folder:** `/home/node/.openclaw/workspace/fadnote/`  
**Domain:** fadnote.com (to be purchased)

---

**END OF SPECIFICATION**

Remember: When in doubt, prioritize **security** and **simplicity**. This is a tool for sharing secrets — trust is everything.
