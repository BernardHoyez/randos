# randos — application de randonnée hors-ligne

Application Android (Capacitor) open-source : fonds de carte raster **en ligne** et **hors-ligne**
(MBTiles ou cache de tuiles), **waypoints photo**, **enregistrement de trace** avec statistiques,
**boussole**, et **import/export GPX, KML, KMZ**.

Ce document a deux parties : un **guide d'utilisation**, bouton par bouton, et une **procédure de
déploiement** pour qui veut modifier ou recompiler l'application.

---

## 1. Guide d'utilisation

### Barre d'outils du haut

| Bouton | Signification | Utilisation |
|---|---|---|
| 🔓 / 🔒 | **Verrou de la barre** | Appui : verrouille tous les autres boutons et le sélecteur de fond (ils deviennent inertes). Un second appui déverrouille. À activer avant de ranger le téléphone en poche pendant un enregistrement, pour éviter qu'un contact accidentel (à travers le tissu) n'arrête la trace. Le bouton verrou lui-même reste toujours actif. |
| *(sélecteur)* | **Fond de carte** | Liste tous les fonds disponibles, classés en deux groupes : « En ligne » (OpenStreetMap, OpenTopoMap, IGN Plan v2, vos fonds +XYZ) et « Hors-ligne (MBTiles) » (les fichiers importés). Changer la sélection change immédiatement le fond affiché. |
| **MBTiles** | **Importer un fichier MBTiles** | Ouvre le sélecteur de fichiers Android pour choisir un `.mbtiles` (raster uniquement, pas de tuiles vectorielles). Le fichier est copié dans l'application puis ajouté au sélecteur de fond, dans le groupe « Hors-ligne ». |
| **+XYZ** | **Ajouter un fond en ligne personnalisé** | Demande une URL de tuiles au format `{z}/{x}/{y}` (par exemple un serveur WMTS ou XYZ de votre choix), puis un nom. Le fond est enregistré sur l'appareil et réapparaît aux prochains lancements. |
| 📥 | **Préparer le hors-ligne** | Ouvre le panneau de téléchargement de zone (voir plus bas, « Panneau Hors-ligne »). Permet de télécharger à l'avance les tuiles d'un fond en ligne pour une utilisation sans réseau, sans passer par un fichier MBTiles. |
| **Import** | **Importer un GPX / KML / KMZ** | Ouvre le sélecteur de fichiers. Accepte un ou plusieurs fichiers à la fois. Les traces, itinéraires et waypoints du fichier sont ajoutés à la carte et à la liste **Traces**. |
| **Export…** | **Exporter tout** | Sélecteur avec trois choix : GPX, KML, KMZ. Exporte **toutes** les traces et **tous** les waypoints actuellement sur la carte en un seul fichier, partagé via la feuille de partage Android. Le format **KMZ** est le seul à inclure les **photos** des waypoints (intégrées dans l'archive). Pour exporter une seule trace ou un seul waypoint, utilisez plutôt le bouton ⬇ dans le panneau **Traces**. |
| **GPS** | **Position en direct** | Active ou désactive l'affichage de votre position (point rouge avec cercle de précision). Ne fonctionne pas pendant un enregistrement REC en cours (il faut d'abord arrêter l'enregistrement). |
| **+WPT** | **Ajouter un waypoint** | Si le GPS est actif, propose d'abord d'utiliser votre position actuelle (à confirmer) ; sinon, ou si vous déclinez, le bouton passe en bleu et invite à toucher la carte à l'endroit voulu. Dans les deux cas, un panneau s'ouvre ensuite pour saisir un nom, une description, et éventuellement une photo (voir « Panneau Nouveau waypoint »). |
| **REC** | **Enregistrer une trace** | Premier appui : démarre l'enregistrement GPS de la trace, y compris **écran éteint** (fonctionne en arrière-plan). Second appui : demande confirmation, puis arrête l'enregistrement, nomme la trace avec la date et l'heure, et la sauvegarde (localement *et* dans un fichier de sécurité séparé, voir plus bas). |
| **Traces** | **Liste des traces et waypoints** | Ouvre le panneau de gestion (voir « Panneau Traces & waypoints »). |
| ✕ | **Tout effacer** | Demande confirmation, puis supprime **toutes** les traces et **tous** les waypoints (photos comprises). Irréversible, sauf à réimporter un export ou une sauvegarde automatique faite auparavant. Pour supprimer un seul élément, utilisez plutôt 🗑 dans le panneau **Traces**. |

### La boussole

En haut à droite de la carte, un cadran avec une aiguille rouge (pointe nord) indique le nord
magnétique, avec le cap en degrés et point cardinal affiché en dessous. Fonctionne via le
magnétomètre du téléphone ; s'affiche automatiquement si le capteur est disponible, sinon reste
masqué sans bloquer le reste de l'application.

### Panneau « Nouveau waypoint »

S'ouvre après un appui sur **+WPT**.

| Élément | Rôle |
|---|---|
| Champ **Nom** | Pré-rempli à « Repère », modifiable. |
| Champ **Description** | Optionnel. |
| **📷 Ajouter une photo** | Ouvre l'appareil photo (ou la galerie). La photo est automatiquement redimensionnée avant d'être associée au waypoint. Une miniature apparaît une fois choisie, avec un bouton **Retirer la photo** pour l'enlever avant validation. |
| **Valider** | Crée le waypoint (avec sa photo si vous en avez ajouté une) et ferme le panneau. |
| **Annuler** / ✕ | Ferme le panneau sans rien créer. |

### Panneau « Traces & waypoints »

S'ouvre avec le bouton **Traces** de la barre d'outils. Liste toutes les traces (avec leurs
statistiques) et tous les waypoints (avec une icône 📍 ou 📷 selon qu'ils ont une photo). Pour
chaque ligne :

| Bouton | Action |
|---|---|
| 🔍 | Centre la carte sur cet élément. Pour un waypoint, ouvre aussi sa popup (donc sa photo si elle en a une). |
| ✎ | Renomme l'élément (la description et la photo éventuelle sont conservées). |
| ⬇ | Exporte **cet élément seul** (GPX, KML ou KMZ au choix). Pour un waypoint avec photo exporté en KMZ, la photo est incluse. |
| 🗑 | Supprime cet élément seul, après confirmation. La photo associée, s'il y en a une, est supprimée avec lui. |

En bas du panneau, le bouton **💾 Exporter les sauvegardes** récupère, sous forme d'une archive
zip, l'ensemble des fichiers de sauvegarde automatique créés à chaque fin d'enregistrement (voir
plus bas, « Sauvegarde automatique »). Utile pour en garder une copie indépendante de
l'application (Drive, mail…), de temps en temps.

### Panneau « Préparer le hors-ligne »

S'ouvre avec le bouton 📥. Concerne uniquement les fonds **en ligne** (il est inactif si le fond
actuel est déjà un MBTiles, puisque celui-ci est déjà utilisable hors-ligne par nature).

| Élément | Rôle |
|---|---|
| **Zoom min / max** | Plage de niveaux de zoom à télécharger pour la zone actuellement visible à l'écran. |
| *Estimation* | Nombre de tuiles correspondant à la zone et à la plage choisies, mis à jour en déplaçant ou zoomant la carte pendant que le panneau est ouvert. |
| **Télécharger la zone visible** | Lance le téléchargement, avec barre de progression. Un avertissement apparaît au-delà de 3 000 tuiles ; au-delà de 20 000, le téléchargement est refusé (zone ou plage trop grande). |
| **Annuler** | Interrompt un téléchargement en cours. |
| *Cache de ce fond* | Nombre de tuiles déjà en cache et taille approximative pour le fond actuellement sélectionné. |
| **Vider ce fond** | Supprime uniquement les tuiles en cache de ce fond-là. |
| **Vider tout le cache** | Supprime les tuiles en cache de **tous** les fonds en ligne confondus. |

**À savoir** : chaque tuile affichée en navigant normalement est aussi mise en cache
automatiquement, même sans utiliser ce panneau. Certains serveurs refusent toutefois cette mise en
cache pour des raisons techniques (CORS) ; OpenStreetMap et IGN Plan v2 fonctionnent correctement,
à tester pour d'autres fonds.

---

## 2. Sauvegarde automatique

À chaque fin d'enregistrement REC, un fichier GPX est écrit silencieusement dans le stockage privé
de l'application, en plus de la sauvegarde habituelle. Cela protège contre un vidage de cache
accidentel ou une corruption du stockage interne — mais **pas** contre une désinstallation ou un
« Effacer les données » depuis les réglages Android, qui suppriment ce dossier comme le reste de
l'application. Pensez à utiliser **💾 Exporter les sauvegardes** de temps en temps pour en garder
une copie réellement indépendante.

---

## 3. Conseils d'usage sur le terrain

- **Verrouillez la barre (🔓→🔒)** avant de ranger le téléphone en poche pendant un enregistrement.
- **Réglages batterie** : certains constructeurs (Xiaomi/HyperOS notamment) tuent les applications
  en arrière-plan par défaut. Dans les réglages de l'application, désactivez les restrictions de
  batterie et activez le démarrage automatique, sans quoi l'enregistrement peut s'interrompre
  écran éteint.
- **Accordez la permission de localisation en « Précise »**, idéalement « Toujours » plutôt que
  « Pendant l'utilisation de l'app ».

---

## 4. Limites connues

- Pas de dénivelé/durée/vitesse pour une trace importée sans altitude ni horodatage (certains KML
  n'en contiennent pas).
- KML : seuls points, lignes et polygones simples sont lus (styles, superpositions, `gx:Tour` et
  médias d'un KMZ importé sont ignorés).
- MBTiles vectoriel (pbf) non supporté : raster uniquement (png/jpg/webp).
- Un seul fond affiché à la fois (pas de superposition de deux fonds).
- Un waypoint ne peut avoir qu'une seule photo, choisie à sa création.

---

## 5. Architecture du projet

```
rando-mbtiles/
├── capacitor.config.json        appId, nom de l'app (« randos »), dossier web (www)
├── package.json                 scripts npm (sync, apk:debug, apk:release…)
├── www/                         application web (Leaflet, sans bundler)
│   ├── index.html · style.css · app.js
│   ├── sw.js                    service worker brise-cache (version web uniquement)
│   └── vendor/                  généré par « npm run vendor » (Leaflet, JSZip)
├── native-android/
│   └── MbtilesPlugin.java       plugin natif : copie + lecture SQLite des MBTiles
└── scripts/
    ├── copy-vendor.js           node_modules → www/vendor
    ├── install-plugin.js        installe le plugin MBTiles, les permissions, corrige build.gradle
    └── gradle.js                invoque le wrapper Gradle (compatible Windows et Unix)
```

Stockage utilisé par l'application sur l'appareil :
- **localStorage** : traces et waypoints (métadonnées), fonds +XYZ personnalisés.
- **IndexedDB `randos-tiles`** : cache des tuiles en ligne.
- **IndexedDB `randos-photos`** : photos des waypoints (séparées des traces pour ne jamais saturer
  leur espace de stockage).
- **Stockage privé de l'app (dossier `backups/`)** : sauvegardes automatiques en GPX.

---

## 6. Procédure de déploiement

### Prérequis (une fois)

- **Node.js** (LTS récente)
- **Android Studio** (fournit le SDK Android et le JDK)
- Un téléphone Android en **Débogage USB**, ou un émulateur
- Vérification à tout moment : `npx cap doctor`

### Dépendances (une fois)

```bash
npm install leaflet jszip @capacitor/core @capacitor/android @capacitor/filesystem @capacitor/share @capacitor/geolocation @capacitor-community/background-geolocation @capacitor/local-notifications
npm install -D @capacitor/cli
```

### Générer le projet Android (une fois)

```bash
npx cap add android
```

### Synchroniser (après chaque modification de www/ ou du plugin)

```bash
npm run sync
```

Copie Leaflet/JSZip, synchronise le projet Android, installe le plugin MBTiles, vérifie les
permissions (localisation, suivi en arrière-plan, notifications), et corrige une ligne ProGuard
obsolète dans `build.gradle`.

### Tester sur le téléphone

```bash
npm run run:device      # choix de l'appareil, installation et lancement
# ou : npm run android  # ouvre Android Studio, puis ▶ Run
```

### Produire un APK

**Debug** (suffisant pour vos propres tests) :
```bash
npm run apk:debug
# → android/app/build/outputs/apk/debug/app-debug.apk
```

**Release** (signé, pour diffusion) — nécessite un keystore créé une fois avec :
```bash
keytool -genkeypair -v -keystore randos-release.jks -alias randos -keyalg RSA -keysize 2048 -validity 10000
```
puis un `signingConfig` déclaré dans `android/app/build.gradle` (le plus simple reste Android
Studio : **Build → Generate Signed App Bundle / APK…**).
```bash
npm run apk:release
# → android/app/build/outputs/apk/release/app-release.apk
```

### Mettre à jour l'application

1. Modifier `www/` ou le plugin Java.
2. Incrémenter `CACHE_NAME` dans `www/sw.js` (utile pour la version web uniquement).
3. Incrémenter `versionCode`/`versionName` dans `android/app/build.gradle` avant une diffusion.
4. `npm run apk:debug` (ou `apk:release`, signé avec le même keystore qu'à l'origine).

### Dépannage rapide

- **`android/` absent** → lancer d'abord `npx cap add android`.
- **Erreur Gradle/JDK** → ouvrir une fois le projet dans Android Studio (installe ce qui manque),
  puis relancer `npx cap doctor`.
- **Plugin `Mbtiles` non défini côté JS** → relancer `npm run sync`, puis reconstruire.
- **`./gradlew` introuvable sous Windows** → déjà résolu par `scripts/gradle.js`, inutile de lancer
  Gradle à la main.
#   r a n d o s  
 