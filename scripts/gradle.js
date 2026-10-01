// Invoque le wrapper Gradle du dossier android/ de façon identique sous Windows,
// macOS et Linux ("./gradlew" ne fonctionne pas dans l'invite de commandes Windows).
const { spawnSync } = require('child_process');
const path = require('path');

const androidDir = path.join(__dirname, '..', 'android');
const cmd = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const args = process.argv.slice(2);

const res = spawnSync(cmd, args, { cwd: androidDir, stdio: 'inherit', shell: true });
if (res.error) {
  console.error('Impossible de lancer Gradle :', res.error.message);
  process.exit(1);
}
process.exit(res.status === null ? 1 : res.status);
