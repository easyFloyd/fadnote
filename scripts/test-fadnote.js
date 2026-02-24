import crypto from 'crypto';

const FADNOTE_URL = process.env.FADNOTE_URL || 'https://fadnote.com';

async function readNote() {
  // Read from stdin if no arguments, or from args
  if (process.argv.length > 2) {
    // From command line args
    const content = process.argv.slice(2).join(' ');
    return content;
  } else {
    // From stdin (for piped input or large text)
    return new Promise((resolve, reject) => {
      let content = '';
      process.stdin.setEncoding('utf8');

      process.stdin.on('data', chunk => {
        content += chunk;
      });

      process.stdin.on('end', () => {
        content = content.trim();
        if (!content) {
          reject(new Error('Content is empty'));
          return;
        }
        resolve(content);
      });

      process.stdin.on('error', reject);
    });
  }
}

async function encryptNote(content) {
  // Generate random 256-bit key and convert to URL-safe base64
  const key = crypto.randomBytes(32).toString('base64url');

  // Generate salt and IV
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);

  // Derive key using PBKDF2
  const passwordBuffer = Buffer.from(key);
  const derivedKey = crypto.pbkdf2Sync(passwordBuffer, salt, 100000, 32, 'sha256');

  // Encrypt content
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(content, 'utf8'),
    cipher.final()
  ]);
  const authTag = cipher.getAuthTag();

  // Combine ciphertext with auth tag
  const ciphertext = Buffer.concat([encrypted, authTag]);

  // Create encrypted payload - Using standard base64 (not base64url)
  const encryptedData = {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    salt: salt.toString('base64')
  };

  return {
    encryptedBlob: Buffer.from(JSON.stringify(encryptedData)),
    decryptionKey: key
  };
}

async function postNote() {
  try {
    // Get note from input
    const note = await readNote();

    // Encrypt the test message
    const { encryptedBlob, decryptionKey } = await encryptNote(note);

    // Post to FadNote API
    const response = await fetch(`${FADNOTE_URL}/n`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Note-TTL': '3600' // 1 hour
      },
      body: encryptedBlob
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const decryptionUrl = `${FADNOTE_URL}/n/${result.id}#${decryptionKey}`;

    console.log('✅ Note created successfully!');
    console.log(`📌 ID: ${result.id}`);
    console.log(`⏰ Expires in: ${result.expiresIn} seconds`);
    console.log(`🔗 Decryption URL: ${decryptionUrl}`);
    console.log('\nShare this URL with the recipient:');
    console.log(decryptionUrl);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

postNote();
