// Prépare le projet Android généré par "npx cap add android" :
//  1. installe le plugin natif MbtilesPlugin et l'enregistre dans MainActivity
//  2. ajoute au manifeste les permissions (localisation, suivi en arrière-plan, notification)
//     et le service de suivi en arrière-plan
//  3. corrige la ligne ProGuard obsolète de android/app/build.gradle
// Idempotent : peut être relancé à chaque "npm run sync".
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(path.join(root, 'capacitor.config.json'), 'utf8'));
const appId = cfg.appId;
const androidDir = path.join(root, 'android');
const pkgDir = path.join(androidDir, 'app', 'src', 'main', 'java', ...appId.split('.'));

if (!fs.existsSync(androidDir)) {
  console.error("Dossier android/ absent : lancez d'abord  npx cap add android");
  process.exit(1);
}

// ---- 1. Plugin MBTiles + MainActivity
fs.mkdirSync(pkgDir, { recursive: true });
const plugin = fs
  .readFileSync(path.join(root, 'native-android', 'MbtilesPlugin.java'), 'utf8')
  .replace(/__PACKAGE__/g, appId);
fs.writeFileSync(path.join(pkgDir, 'MbtilesPlugin.java'), plugin);

const mainActivity = `package ${appId};

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Les plugins locaux doivent être enregistrés AVANT super.onCreate
        registerPlugin(MbtilesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`;
fs.writeFileSync(path.join(pkgDir, 'MainActivity.java'), mainActivity);
console.log('[plugin] MbtilesPlugin installé et enregistré dans ' + pkgDir);

// ---- 2. Manifeste
const manifestPath = path.join(androidDir, 'app', 'src', 'main', 'AndroidManifest.xml');
let manifest = fs.readFileSync(manifestPath, 'utf8');
let changed = false;

const permissions = [
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_LOCATION', // requis à partir d'Android 14
  'android.permission.POST_NOTIFICATIONS'           // requis à partir d'Android 13
];
for (const p of permissions) {
  if (!manifest.includes('"' + p + '"')) {
    manifest = manifest.replace('</manifest>', `    <uses-permission android:name="${p}" />\n</manifest>`);
    changed = true;
  }
}

const serviceName = 'com.equimaps.capacitor_background_geolocation.BackgroundGeolocationService';
if (!manifest.includes(serviceName)) {
  manifest = manifest.replace(
    '</application>',
    `    <service android:name="${serviceName}" android:enabled="true" android:exported="true" android:foregroundServiceType="location" />\n    </application>`
  );
  changed = true;
}
if (changed) fs.writeFileSync(manifestPath, manifest);
console.log('[manifest] permissions et service de suivi vérifiés');

// ---- 3. build.gradle : ProGuard
const gradlePath = path.join(androidDir, 'app', 'build.gradle');
let gradle = fs.readFileSync(gradlePath, 'utf8');
if (gradle.includes("getDefaultProguardFile('proguard-android.txt')")) {
  gradle = gradle.replace("getDefaultProguardFile('proguard-android.txt')", "getDefaultProguardFile('proguard-android-optimize.txt')");
  fs.writeFileSync(gradlePath, gradle);
  console.log('[gradle] ligne ProGuard corrigée');
}
