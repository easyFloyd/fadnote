# 🗒️ FadNote

> Share once, then fade away.

[![Live](https://img.shields.io/badge/live-fadnote.com-blue)](https://fadnote.com)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

**FadNote** is an open-source, zero-knowledge note sharing service that works where you do:
- **OpenClaw** — AI-powered workflow automation
- **Obsidian** — Your knowledge base (plugin coming soon)
- **CLI** — Script it your way

Your secrets are encrypted client-side before they ever reach our servers. We can't read them, we can't recover them, and after one view **they're faded forever.**

---

## 📚 Table of Contents

- [What is this?](#-what-is-this)
- [How it works](#-how-it-works)
- [Quick Start](#-quick-start)
- [Self-Hosting](#-self-hosting)
- [Security](#-security-notes)
- [Development](#-development)
- [FAQ](#-faq)

---

## 🤔 What is this?

FadNote is a zero-knowledge note sharing service that turns your secrets into secure, shareable links. Send them to recipients via any channel — email, Slack, Telegram, whatever. Once they view it, the note fades away forever.

- 🔐 **Client-side encryption** — Your secret never touches our servers naked
- 🔥 **One-time read** — First view deletes the note forever
- ⏰ **Auto-expire** — Notes vaporize after your chosen TTL (default: 24 hour)
- 🕵️ **Zero knowledge** — We can't read your notes even if we wanted to
- 🔓 **Open-source** — Audit the code, self-host if paranoid

Live instance: **https://fadnote.com**

*(Free for everyone. Self-host if you prefer.)*

---

## 🧠 How it works

FadNote uses **true zero-knowledge architecture**.

### On Your Device

1. **Generate** a random 256-bit encryption key
2. **Encrypt** your secret using AES-256-GCM + PBKDF2 (100k iterations)
3. **Send** only the encrypted blob to the server

### On FadNote Server

4. **Store** the encrypted blob (we can't read it — no key)
5. **Return** a unique ID for the blob

### Back On Your Device

6. **Build** the shareable link: `https://fadnote.com/n/{id}#{key}`
7. **Share** via email, Telegram, Slack, or anywhere

**The decryption key lives in the URL fragment (after `#`)** — browsers never send this to servers. Only the recipient with the full link can decrypt the note.

### Cryptography Details

| Aspect | Implementation |
|--------|---------------|
| Algorithm | AES-256-GCM |
| Key Derivation | PBKDF2 with 100,000 iterations |
| Hash | SHA-256 |
| IV | 96-bit random per encryption |
| Salt | 128-bit random per encryption |

---

## 🚀 Quick Start

### Option 1: OpenClaw Skill (Recommended)

Install from [ClawHub](https://clawhub.dev) for seamless AI-powered note creation:

```bash
claw install fadnote
```

Then just tell OpenClaw:

```
"Secure this API key: sk-live-12345"
"Create a secure link for these credentials"
"FadNote this password for the server"
```

The skill automatically encrypts and returns a shareable link.

📖 [Full Skill Documentation](openclaw-skill/SKILL.md)

---

### Option 2: Obsidian Plugin

**Coming soon** — Share notes directly from your knowledge base. Star the repo to get notified.

---

### Option 3: CLI

Use the standalone script (Node.js 18+, no dependencies):

```bash
# Clone and navigate
 git clone https://github.com/easyFloyd/fadnote.git
 cd fadnote/scripts

# Pipe text directly
echo "My secret API key" | node test-fadnote.js

# Or pass as argument
node test-fadnote.js "password for the server"

# From a file
cat credentials.txt | node test-fadnote.js

# From clipboard (macOS)
pbpaste | node test-fadnote.js

# From clipboard (Linux)
xclip -o | node test-fadnote.js
```

Outputs a single shareable link. Copy, paste, done.

---

### Option 4: Direct API

Roll your own client:

```bash
# 1. Encrypt your content (client-side!)
# See service/src/utils/crypto.ts for the reference implementation

# 2. POST the encrypted blob
curl -X POST https://fadnote.com/n \
  -H "Content-Type: application/octet-stream" \
  -H "X-Note-TTL: 3600" \
  --data-binary @encrypted-note.bin

# Response: {"id": "abc123", "expiresIn": 3600}
# Share: https://fadnote.com/n/abc123#YOUR_DECRYPTION_KEY
```

The encryption uses standard Web Crypto API — you can implement it in any language.

---

## 🏠 Self-Hosting

Paranoid? Good. Host it yourself.

### Quick Start (Docker)

```bash
git clone https://github.com/easyFloyd/fadnote.git
cd fadnote/service
cp .env.example .env
# Edit .env: STORAGE_TYPE=filesystem (or redis)

docker-compose up -d
```

Runs on http://localhost:3000

### Manual (Node)

```bash
cd service
npm install
npm run build
STORAGE_TYPE=filesystem npm start
```

**Requirements:** Node 18+. That's it.

### Storage Options

| Backend | Use Case | Persistence |
|---------|----------|-------------|
| Filesystem | Dev / single-node | Disk |
| Redis | Production / multi-node | Memory + disk |

Set `STORAGE_TYPE` in your `.env` file.

---

## 🔒 Security Notes

- ✅ AES-256-GCM encryption (client-side)
- ✅ Keys never leave the browser/CLI
- ✅ One-time read enforced server-side
- ✅ Rate limited (10 req/min per IP)
- ✅ Max note size: 1MB
- ✅ No logs of note content (server can't read it anyway)
- ❌ We cannot recover lost notes (seriously, we don't have the keys)

**Threat model:** Protects against server compromise, nosy admins, and warrant requests. Does *not* protect against screenshotting recipients or XSS in the recipient's browser. Use with humans you trust.

**Verifying the encryption:**
```bash
# Check the decrypt page source — decryption happens entirely in your browser
curl -s https://fadnote.com/decrypt.html | grep -A5 "decryptNote"
```

---

## 🛠️ Development

```bash
cd service
npm install
npm run dev        # Hot reload on :3000
npm test           # Vitest suite
```

See `service/` directory for the full backend code.

---

## 📜 License

MIT. Do whatever. Just don't use it for evil.

---

## 🙋 FAQ

**Q: Is this really free?**
A: Yes. The hosted version is my gift to the privacy-conscious. Self-host if you want. If it saves you time, or just like it consider ☕ [buying me a coffee](https://buymeacoffee.com/easyfloyd).

**Q: Can you recover a note I accidentally deleted?**
A: No. We don't have the decryption key. We don't even have the encrypted blob after first read.

**Q: How do I know you're not lying about encryption?**
A: [Read the code](service/src/utils/crypto.ts). It's 140 lines. The decrypt page is pure client-side JavaScript — no network requests during decryption.

**Q: What if someone intercepts the link?**
A: They can read the note (once). Share links through trusted channels — FadNote protects against server compromise, not person-in-the-middle during sharing.

**Q: Will you add feature X?**
A: Maybe. Open an issue. Keep it simple though — this is a hobby project I built over weekends, not a startup.

**Full FAQ:** https://fadnote.com/faq.html

---

Made with ☕ and AI by [@easyFloyd](https://github.com/easyFloyd)

*"Some notes are meant to fade"*
