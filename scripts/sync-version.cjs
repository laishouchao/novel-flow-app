const fs = require('fs');
const path = require('path');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const tauriConf = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8'));
const cargoToml = fs.readFileSync('src-tauri/Cargo.toml', 'utf8');

const version = packageJson.version;

// Sync to tauri.conf.json
tauriConf.package.version = version;
fs.writeFileSync('src-tauri/tauri.conf.json', JSON.stringify(tauriConf, null, 2) + '\n');

// Sync to Cargo.toml
const cargoVersion = cargoToml.replace(
  /^version\s*=\s*".*"/m,
  `version = "${version}"`
);
fs.writeFileSync('src-tauri/Cargo.toml', cargoVersion);

console.log(`✅ 版本已同步: v${version}`);
