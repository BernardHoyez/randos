# randos — application de randonnée hors-ligne

Application Android (Capacitor) open-source : fonds de carte raster **en ligne** et **hors-ligne**
(MBTiles ou cache de tuiles), **waypoints photo**, **enregistrement de trace** avec statistiques,
**boussole**, **export automatique dans Téléchargements**, et **import/export GPX, KML, KMZ**.

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
| **+XYZ** | **Ajouter un fond en ligne personnalisé** | Demande une URL de tuiles au format `{z}/{x}/{y}`, puis un nom. Le fond est enregistré sur l'appareil et réapparaît aux prochains lancements. |
| 📥 | **Préparer le hors-ligne** | Ouvre le panneau de téléchargement de zone (voir « Panneau Préparer le hors-ligne »). Permet de télécharger à l'avance les tuiles d'un fond en ligne pour une utilisation sans réseau, sans passer par un fichier MBTiles. |
| **Import** | **Importer un GPX / KML / KMZ** | Ouvre le sélecteur de fichiers. Accepte un ou plusieurs fichiers à la fois. Les traces, itinéraires et waypoints du fichier sont ajoutés à la carte et à la liste **Traces**. |
| **Export…** | **Exporter tout** | Sélecteur avec trois choix : GPX, KML, KMZ. Exporte **toutes** les traces et **tous** les waypoints actuellement sur la carte en un seul fichier. Le fichier est à la fois **copié automatiquement dans `Téléchargements/randos/Tracklogs/`** (voir plus bas) et proposé via la feuille de partage Android. Le format **KMZ** est le seul à inclure les **photos** des waypoints (intégrées dans l'archive). Pour exporter une seule trace ou un seul waypoint, utilisez plutôt le bouton ⬇ dans le panneau **Traces**. |
| **GPS** | **Position en direct** | Active ou désactive l'affichage de votre position (point rouge avec cercle de précision). Ne fonctionne pas pendant un enregistrement REC en cours (il faut d'abord arrêter l'enregistrement). |
| **+WPT** | **Ajouter un waypoint** | Si le GPS est actif, propose d'abord d'utiliser votre position actuelle (à confirmer) ; sinon, ou si vous déclinez, le bouton passe en bleu et invite à toucher la carte à l'endroit voulu. Dans les deux cas, le panneau **Nouveau waypoint** s'ouvre ensuite. |
| **REC** | **Enregistrer une trace** | Premier appui : démarre l'enregistrement GPS de la trace, y compris **écran éteint** (fonctionne en arrière-plan). Second appui : demande confirmation, puis arrête l'enregistrement, nomme la trace avec la date et l'heure locale, et la sauvegarde (localement *et* dans un fichier de sécurité séparé, voir « Sauvegarde automatique »). |
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
statistiques : distance, dénivelé, durée, vitesse) et tous les waypoints (avec une icône 📍 ou 📷
selon qu'ils ont une photo, et leurs coordonnées). Pour chaque ligne :

| Bouton | Action |
|---|---|
| 🔍 | Centre la carte sur cet élément. Pour un waypoint, ouvre aussi sa popup (donc sa photo si elle en a une). |
| ✎ | Renomme l'élément (la description et la photo éventuelle sont conservées). |
| ⬇ | Exporte **cet élément seul** (GPX, KML ou KMZ au choix), copié dans `Téléchargements/randos/Tracklogs/` comme l'export global. Pour un waypoint avec photo exporté en KMZ, la photo est incluse. |
| 🗑 | Supprime cet élément seul, après confirmation. La photo associée, s'il y en a une, est supprimée avec lui. |

En bas du panneau, le bouton **💾 Exporter les sauvegardes** récupère, sous forme d'une archive
zip, l'ensemble des fichiers de sauvegarde automatique créés à chaque fin d'enregistrement (voir
« Sauvegarde automatique »). Utile pour en garder une copie indépendante de l'application (Drive,
mail…), de temps en temps.

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
confirmé à l'usage.

---

## 2. Export automatique dans Téléchargements

Chaque export de trace ou de waypoint (global via **Export…**, ou individuel via ⬇ dans le panneau
Traces) est **copié automatiquement** dans :

```
Téléchargements/randos/Tracklogs/
```

visible immédiatement par n'importe quel gestionnaire de fichiers ou par USB, en plus de rester
proposé via la feuille de partage habituelle. Cette copie passe par l'API MediaStore d'Android
(aucune permission supplémentaire requise sur Android 10 et plus) : le stockage privé classique
d'une application Capacitor (`Directory.Data`/`Directory.Documents`) est en effet **invisible**
depuis l'extérieur sur Android 11 et plus, même pour l'utilisateur propriétaire du téléphone — une
restriction du système, pas un choix de l'application.

## 3. Sauvegarde automatique

À chaque fin d'enregistrement REC, un fichier GPX est écrit silencieusement dans le stockage privé
de l'application (distinct du dossier Tracklogs ci-dessus), en plus de la sauvegarde habituelle.
Cela protège contre un vidage de cache accidentel ou une corruption du stockage interne — mais
**pas** contre une désinstallation ou un « Effacer les données » depuis les réglages Android, qui
suppriment ce dossier comme le reste de l'application. Le bouton **💾 Exporter les sauvegardes**
(panneau Traces) permet d'en sortir une copie réellement indépendante quand vous le souhaitez.

---

## 4. Conseils d'usage sur le terrain

- **Verrouillez la barre (🔓→🔒)** avant de ranger le téléphone en poche pendant un enregistrement.
- **Réglages batterie** : certains constructeurs (Xiaomi/HyperOS notamment) tuent les applications
  en arrière-plan par défaut. Dans les réglages de l'application, désactivez les restrictions de
  batterie et activez le démarrage automatique, sans quoi l'enregistrement peut s'interrompre
  écran éteint.
- **Accordez la permission de localisation en « Précise »**, idéalement « Toujours » plutôt que
  « Pendant l'utilisation de l'app ».
- Le bandeau de statut affiche **« Prêt — build N »** à l'ouverture : utile pour confirmer qu'une
  mise à jour a bien été installée avant de chercher un bug ailleurs.

---

## 5. Limites connues

- Pas de dénivelé/durée/vitesse pour une trace importée sans altitude ni horodatage (certains KML
  n'en contiennent pas).
- KML : seuls points, lignes et polygones simples sont lus (styles, superpositions, `gx:Tour` et
  médias d'un KMZ importé sont ignorés).
- MBTiles vectoriel (pbf) non supporté : raster uniquement (png/jpg/webp).
- Un seul fond affiché à la fois (pas de superposition de deux fonds).
- Un waypoint ne peut avoir qu'une seule photo, choisie à sa création.
- La copie automatique dans Téléchargements utilise MediaStore (Android 10+) ; sur un appareil
  Android 9 ou antérieur, une méthode plus ancienne est utilisée en repli, non testée en pratique.

---

## 6. Architecture du projet

```
rando-mbtiles/
├── capacitor.config.json        appId, nom de l'app (« randos »), dossier web (www)
├── package.json                 dépendances + scripts npm (sync, apk:debug, apk:release…)
├── www/                         application web (Leaflet, sans bundler)
│   ├── index.html · style.css · app.js
│   ├── sw.js                    service worker brise-cache (version web uniquement)
│   └── vendor/                  généré par « npm run vendor » (Leaflet, JSZip)
├── native-android/
│   └── MbtilesPlugin.java       plugin natif : MBTiles (SQLite), export vers Téléchargements (MediaStore)
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
- **Stockage privé de l'app (dossier `backups/`)** : sauvegardes automatiques en GPX, retrouvables
  uniquement via le bouton **💾 Exporter les sauvegardes** (invisible autrement, voir section 2).
- **Téléchargements publics (`Téléchargements/randos/Tracklogs/`)** : copie de chaque export,
  visible par tout gestionnaire de fichiers.

---

## 7. Procédure de déploiement

### Prérequis (une fois)

- **Node.js** (LTS récente)
- **Android Studio** (fournit le SDK Android et le JDK)
- Un téléphone Android en **Débogage USB**, ou un émulateur
- Vérification à tout moment : `npx cap doctor`

### Dépendances (une fois)

```bash
npm install
```

Toutes les dépendances (Leaflet, JSZip, Capacitor et ses plugins) sont déclarées dans
`package.json` ; cette seule commande suffit.

### Générer le projet Android (une fois)

```bash
npx cap add android
```

### Synchroniser (après chaque modification de www/ ou du plugin natif)

```bash
npm run sync
```

Copie Leaflet/JSZip, synchronise le projet Android, installe le plugin MBTiles (y compris sa
méthode d'export vers Téléchargements), vérifie les permissions, et corrige une ligne ProGuard
obsolète dans `build.gradle`. Après une modification de `native-android/MbtilesPlugin.java`,
Android Studio recompile le code Java au prochain build — un peu plus long que d'habitude.

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

Pour vérifier qu'un APK est bien signé avec votre clé :
```bash
apksigner verify --print-certs app-release.apk
keytool -list -v -keystore randos-release.jks -alias randos
```
Les deux empreintes SHA-256 doivent être identiques.

### Mettre à jour l'application

1. Modifier `www/` ou le plugin Java.
2. Incrémenter `CACHE_NAME` **et** `APP_BUILD` (dans `www/app.js`) — ce dernier s'affiche au
   démarrage (« Prêt — build N ») et permet de confirmer qu'une mise à jour a bien été installée.
3. Incrémenter `versionCode`/`versionName` dans `android/app/build.gradle` avant une diffusion.
4. `npm run apk:debug` (ou `apk:release`, signé avec le même keystore qu'à l'origine).

### Diffusion

L'APK signé peut être distribué directement (lien de téléchargement, GitHub Releases), ou via
IzzyOnDroid/Obtainium pour une mise à jour automatique sans Play Store. Voir les releases du
dépôt GitHub pour un lien de téléchargement stable
(`.../releases/latest/download/randos.apk`).

### Dépannage rapide

- **`android/` absent** → lancer d'abord `npx cap add android`.
- **Erreur Gradle/JDK** → ouvrir une fois le projet dans Android Studio (installe ce qui manque),
  puis relancer `npx cap doctor`.
- **Un plugin npm (Filesystem, Share, Geolocation…) n'apparaît pas dans « Found N Capacitor
  plugins » lors de `npx cap sync`** → vérifier qu'il est bien listé dans `package.json`
  (`npm ls --depth=0` ne doit afficher aucune mention `extraneous` pour vos dépendances directes).
- **Plugin `Mbtiles` non défini côté JS** → relancer `npm run sync`, puis reconstruire.
- **`./gradlew` introuvable sous Windows** → déjà résolu par `scripts/gradle.js`, inutile de lancer
  Gradle à la main.
- **Un fichier écrit avec succès (aucune erreur) reste introuvable** → vérifier qu'il n'a pas été
  écrit dans le stockage privé de l'app (`Directory.Data`/`Documents`), invisible depuis
  l'extérieur sur Android 11+ ; utiliser MediaStore (voir `saveDownload` dans `MbtilesPlugin.java`)
  pour tout ce qui doit être visible par l'utilisateur.
