# test-fadnote.js

CLI tool to post encrypted notes to FadNote.

## Usage

```bash
# Set target server (optional, defaults to production)
export FADNOTE_URL=http://localhost:3000

# Post from command line
node scripts/test-fadnote.js "your secret message"

# Post from stdin
echo "your secret message" | node scripts/test-fadnote.js

# Post from file
cat secret.txt | node scripts/test-fadnote.js

# Post from clipboard (macOS)
pbpaste | node scripts/test-fadnote.js

# Post from clipboard (Linux with xclip)
xclip -o -selection clipboard | node scripts/test-fadnote.js

# Post from clipboard (Linux with xsel)
xsel -b | node scripts/test-fadnote.js
```

Output: Decryption URL with embedded key (share this with recipient).
