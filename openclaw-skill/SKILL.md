# FadNote Skill

**Secure self-destructing notes for OpenClaw**

Create encrypted, one-time-read notes directly from OpenClaw. The server never sees your plaintext.

---

## Overview

| Property | Value |
|----------|-------|
| **Name** | fadnote |
| **Version** | 1.0.0 |
| **Author** | easyFloyd |
| **License** | MIT |
| **Runtime** | Node.js 18+ |

---

## Installation

```bash
# Via ClawHub
claw install fadnote

# Manual
git clone https://github.com/easyFloyd/fadnote.git
ln -s $(pwd)/fadnote/openclaw-skill/scripts/fadnote.js ~/.claw/bin/fadnote
```

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `FADNOTE_URL` | `https://fadnote-dc.drofty.com` | FadNote server endpoint |

---

## Usage

### From OpenClaw

```
user: Secure this API key: sk-abc123xyz

claw: I'll create a secure, self-destructing note for that.
      [runs: echo "sk-abc123xyz" | fadnote]

      🔗 https://fadnote-dc.drofty.com/n/abc123# decryption-key-here

      This link will self-destruct after first view.
```

### CLI Usage

```bash
# Direct text
fadnote "my secret message"

# From stdin
echo "secret" | fadnote
cat file.txt | fadnote
pbpaste | fadnote  # macOS clipboard
```

**Output:** Single line with the shareable URL.

---

## Security

- **Client-side encryption** — AES-256-GCM with PBKDF2 (100k iterations)
- **Zero knowledge** — Server receives only encrypted blobs
- **One-time read** — Note deleted immediately after first fetch
- **Auto-expire** — Default 1 hour TTL

The decryption key is embedded in the URL fragment (`#key`) and never sent to the server.

---

## Files

```
openclaw-skill/
├── SKILL.md           # This file
└── scripts/
    └── fadnote.js     # Main CLI script (~60 lines)
```

---

## Requirements

- Node.js 18+ (no external dependencies)

---

## Links

- **Live Service:** https://fadnote-dc.drofty.com
- **Source:** https://github.com/easyFloyd/fadnote
- **Issues:** https://github.com/easyFloyd/fadnote/issues
