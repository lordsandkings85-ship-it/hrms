/**
 * scripts/download-mariadb.js
 * 
 * Downloads the portable MariaDB zip for Windows x64 and extracts it
 * to the project root at ../../mariadb/ (relative to frontend/).
 * 
 * Run once before building the installer:
 *   node scripts/download-mariadb.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// MariaDB 11.4 LTS portable zip for Windows x64 (no installer)
const MARIADB_URL = 'https://downloads.mariadb.org/rest-api/mariadb/11.4.5/mariadb-11.4.5-winx64.zip';
const MARIADB_FILENAME = 'mariadb-portable.zip';
const DEST_DIR = path.join(__dirname, '..', '..', 'mariadb');
const ZIP_PATH = path.join(__dirname, '..', MARIADB_FILENAME);

if (fs.existsSync(path.join(DEST_DIR, 'bin', 'mysqld.exe'))) {
  console.log('✅ MariaDB already extracted at:', DEST_DIR);
  process.exit(0);
}

console.log('📥 Downloading portable MariaDB...');
console.log('   URL:', MARIADB_URL);

const file = fs.createWriteStream(ZIP_PATH);
https.get(MARIADB_URL, (response) => {
  const total = parseInt(response.headers['content-length'] || '0', 10);
  let downloaded = 0;
  
  response.on('data', (chunk) => {
    downloaded += chunk.length;
    const pct = total ? Math.round(downloaded / total * 100) : '?';
    process.stdout.write(`\r   ${pct}% (${(downloaded / 1024 / 1024).toFixed(1)} MB)`);
    file.write(chunk);
  });

  response.on('end', () => {
    file.end();
    console.log('\n✅ Download complete. Extracting...');
    
    fs.mkdirSync(DEST_DIR, { recursive: true });
    
    // Use PowerShell to extract zip (built into Windows)
    execSync(
      `powershell -Command "Expand-Archive -Path '${ZIP_PATH}' -DestinationPath '${path.join(DEST_DIR, '..')}' -Force"`,
      { stdio: 'inherit' }
    );

    // The zip extracts to a versioned folder — rename it
    const entries = fs.readdirSync(path.join(DEST_DIR, '..'))
      .filter(e => e.startsWith('mariadb-') && fs.statSync(path.join(DEST_DIR, '..', e)).isDirectory());
    
    if (entries.length > 0 && entries[0] !== 'mariadb') {
      const src = path.join(DEST_DIR, '..', entries[entries.length - 1]);
      if (fs.existsSync(DEST_DIR)) fs.rmSync(DEST_DIR, { recursive: true });
      fs.renameSync(src, DEST_DIR);
    }

    fs.unlinkSync(ZIP_PATH); // Clean up zip
    console.log('✅ MariaDB extracted to:', DEST_DIR);
    console.log('   mysqld.exe at:', path.join(DEST_DIR, 'bin', 'mysqld.exe'));
  });

  response.on('error', (err) => {
    console.error('❌ Download failed:', err.message);
    process.exit(1);
  });
}).on('error', (err) => {
  console.error('❌ Request failed:', err.message);
  process.exit(1);
});
