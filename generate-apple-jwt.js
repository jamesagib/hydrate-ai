const fs = require('fs');
const { SignJWT } = require('jose');

// ==== FILL THESE IN ====
const TEAM_ID = '';
const CLIENT_ID = 'com.hydrate.ai'; // e.g. com.yourcompany.yourapp.service
const KEY_ID = '';
const KEY_PATH = ''; // absolute path to your .p8 file
// =======================

const privateKey = fs.readFileSync(KEY_PATH, 'utf8');

async function generateJWT() {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 15552000; // 180 days

  const alg = 'ES256';

  const jwt = await new SignJWT({
    iss: TEAM_ID,
    iat: now,
    exp: exp,
    aud: 'https://appleid.apple.com',
    sub: CLIENT_ID,
  })
    .setProtectedHeader({ alg, kid: KEY_ID })
    .sign(await importPrivateKey(privateKey));

  console.log('\nYour Apple client secret JWT:\n');
  console.log(jwt);
  console.log('\n');
}

// Helper to import the .p8 key
async function importPrivateKey(pem) {
  return await import('jose').then(jose =>
    jose.importPKCS8(pem, 'ES256')
  );
}

generateJWT();