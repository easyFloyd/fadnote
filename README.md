# 🗒️ FadNote

> Burn after reading. Seriously.

[![Live](https://img.shields.io/badge/live-fadnote--dc.drofty.com-blue)](https://fadnote-dc.drofty.com)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**Free, secure, self-destructing notes for developers who actually care about privacy.**

No signup. No tracking. No "we value your privacy" banners. Just encrypted blobs that vanish after one view.

---

## 🤔 What is this?

FadNote is a zero-knowledge note sharing service. Think of it as Privnote's introverted cousin who studied cryptography.

- 🔐 **Client-side encryption** — Your secret never touches our servers naked
- 🔥 **One-time read** — First view deletes the note forever
- ⏰ **Auto-expire** — Notes vaporize after 24 hours (or your custom TTL)
- 🕵️ **Zero knowledge** — We can't read your notes even if we wanted to

Live instance: **https://fadnote-dc.drofty.com**

*(Free for everyone. Because privacy shouldn't cost money.)*

---

## 🧠 How it works

```
You type secret → Browser encrypts it (AES-256-GCM) → We store gibberish
                                                             ↓
Recipient opens URL ← Browser decrypts ← We delete the gibberish
```

The decryption key lives in the URL fragment (`#key`) — browsers never send it to the server. We literally *cannot* decrypt your notes.

**Tech nerds:** Check `service/src/utils/crypto.ts` for the gory details. PBKDF2, 100k iterations, the whole shebang.

---

## 🚀 Quick Start

### Option 1: CLI Script (Easiest)

```bash
# Using the included test script
cd scripts
echo "My secret API key" | node test-fadnote.js

# Or from clipboard
pbpaste | node test-fadnote.js      # macOS
xclip -o | node test-fadnote.js     # Linux
```

Outputs a shareable link. Copy, paste, done.

### Option 2: Direct API

```bash
# Encrypt something (client-side, obviously)
# Then POST the encrypted blob
curl -X POST https://fadnote-dc.drofty.com/n \
  -H "Content-Type: application/octet-stream" \
  -H "X-Note-TTL: 3600" \
  --data-binary @encrypted-note.bin

# Response: {"id": "abc123", "expiresIn": 3600}
# Share: https://fadnote-dc.drofty.com/n/abc123#YOUR_DECRYPTION_KEY
```

### Option 3: Open in Browser

1. Visit `https://fadnote-dc.drofty.com/n/YOUR_ID`
2. If the note exists, it decrypts in your browser
3. Refresh = gone forever

---

## 🏠 Self-Hosting

Paranoid? Good. Host it yourself.

### Quick Start (Docker)

```bash
git clone https://github.com/easyFloyd/fadnote.git
cd fadnote/service
cp .env.example .env
# Edit .env: STORAGE_TYPE=filesystem (or redis)

docker-compose up
```

Runs on http://localhost:3000

### Manual (Node/Bun)

```bash
cd service
npm install
npm run build
STORAGE_TYPE=filesystem npm start
```

**Requirements:** Node 18+ or Bun. That's it.

### Storage Options

| Backend | Use Case | Persistence |
|---------|----------|-------------|
| Filesystem | Dev / single-node | Disk |
| Redis | Production / multi-node | Memory + disk |

Set `STORAGE_TYPE` in your `.env` file.

---

## 🔒 Security Notes

- ✅ AES-256-GCM encryption (client-side)
- ✅ Keys never leave the browser
- ✅ One-time read enforced server-side
- ✅ Rate limited (10 req/min per IP)
- ✅ Max note size: 1MB
- ❌ We cannot recover lost notes (seriously, we don't have the keys)

**Threat model:** Protects against server compromise, nosy admins, and warrant requests. Does *not* protect against screenshotting recipients or XSS in the recipient's browser. Use with humans you trust.

---

## 🛠️ Development

```bash
cd service
npm install
npm run dev        # Hot reload on :3000
npm test           # Vitest suite
```

See `service/` directory for the full backend code. It's surprisingly small.

---

## 📜 License

MIT. Do whatever. Just don't use it for evil.

---

## 🙋 FAQ

**Q: Is this really free?**
A: Yes. The hosted version is my gift to the privacy-conscious. Self-host if you want.

**Q: Can you recover a note I accidentally deleted?**
A: No. We don't have the decryption key. We don't even have the encrypted blob after first read.

**Q: How do I know you're not lying about encryption?**
A: Read the code. `service/src/utils/crypto.ts`. It's ~100 lines. Auditable in 5 minutes.

**Q: Will you add feature X?**
A: Maybe. Open an issue. Keep it simple though — this is a hobby project, not a startup.

---

Made with ☕ and 😤 by [@easyFloyd](https://github.com/easyFloyd)

*"The right to privacy is the right to be left alone."* — Some smart person, probably
