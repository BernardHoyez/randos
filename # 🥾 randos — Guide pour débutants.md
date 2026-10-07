# 🥾 randos — Guide pour débutants

**randos** est une application de randonnée pour téléphone Android. Elle permet de :

- afficher une carte (même sans réseau, si vous l'avez préparée avant) ;
- **enregistrer votre parcours** (votre « trace ») pendant la marche ;
- ajouter des points d'intérêt (« waypoints »), avec ou sans photo ;
- partager ou sauvegarder vos traces dans des fichiers GPX, KML ou KMZ.

Ce guide vous explique, pas à pas et sans jargon, comment l'installer et enregistrer votre première randonnée. Aucune connaissance technique n'est nécessaire.

---

## Sommaire

1. [Avant de commencer](#1-avant-de-commencer)
2. [Télécharger l'application](#2-télécharger-lapplication)
3. [Installer l'application (source inconnue)](#3-installer-lapplication-source-inconnue)
4. [Premier lancement et autorisations](#4-premier-lancement-et-autorisations)
5. [Découvrir l'écran](#5-découvrir-lécran)
6. [Enregistrer votre première trace](#6-enregistrer-votre-première-trace)
7. [Retrouver et partager votre trace](#7-retrouver-et-partager-votre-trace)
8. [Préparer la carte pour marcher sans réseau](#8-préparer-la-carte-pour-marcher-sans-réseau)
9. [Conseils de terrain](#9-conseils-de-terrain)
10. [Problèmes fréquents](#10-problèmes-fréquents)
11. [Petit lexique](#11-petit-lexique)

---

## 1. Avant de commencer

Vous avez besoin de :

- un **téléphone Android** (version 10 ou plus récente recommandée) ;
- une **connexion internet** pour le téléchargement et l'installation (Wi-Fi de préférence) ;
- environ **100 Mo d'espace libre** sur le téléphone (davantage si vous téléchargez des cartes) ;
- un téléphone **bien chargé** avant de partir en randonnée : le GPS consomme de la batterie.

> 💡 L'application n'est **pas** disponible sur le Play Store (la boutique officielle de Google). C'est normal : elle est distribuée sous forme de fichier à installer soi-même. C'est la raison de l'étape 3.

---

## 2. Télécharger l'application

L'application est fournie sous la forme d'un fichier qui se termine par **`.apk`** (par exemple `randos.apk`). C'est le « programme d'installation » des applications Android.

1. Sur votre téléphone, ouvrez votre navigateur (Chrome, Firefox, Samsung Internet…).
2. Rendez-vous à l'adresse qui vous a été communiquée par la personne qui vous a transmis l'application :

   **`👉 [https://github.com/BernardHoyez/randos/releases/latest/download/randos.apk]`**

3. Appuyez sur le lien ou le bouton de téléchargement du fichier `.apk`.
4. Le navigateur affiche probablement un avertissement du type :
   *« Ce type de fichier peut endommager votre appareil. Voulez-vous quand même télécharger… ? »*
   C'est un message **automatique** affiché pour tous les fichiers `.apk`. Si vous faites confiance à la personne qui vous a donné le lien, appuyez sur **Télécharger** (ou **OK**).
5. Attendez la fin du téléchargement. Le fichier est rangé dans le dossier **Téléchargements** de votre téléphone.

> ⚠️ **Une règle de prudence** : n'installez jamais un fichier `.apk` provenant d'un site que vous ne connaissez pas ou d'un message suspect. Ne téléchargez celui-ci que depuis le lien donné par son auteur.

---

## 3. Installer l'application (source inconnue)

Android protège votre téléphone : par défaut, il refuse d'installer des applications qui ne viennent pas du Play Store. Ces applications sont dites de **« source inconnue »**. Il faut donc donner une autorisation **une seule fois**, pour l'application qui vous sert à ouvrir le fichier (votre navigateur ou votre gestionnaire de fichiers).

### Étape par étape

1. Ouvrez l'application **Fichiers** (ou *Gestionnaire de fichiers*) de votre téléphone, puis le dossier **Téléchargements**.
   *Astuce : vous pouvez aussi appuyer sur la notification « Téléchargement terminé » juste après le téléchargement.*
2. Appuyez sur le fichier **`randos.apk`** (ou le nom qu'il porte).
3. Si c'est la première fois, Android affiche un message comme :
   *« Pour votre sécurité, votre téléphone n'est pas autorisé à installer des applications inconnues depuis cette source. »*
4. Appuyez sur **Paramètres** (ou **Réglages**).
5. Activez l'interrupteur **« Autoriser depuis cette source »**
   (le nom varie : *Installer des applications inconnues*, *Autoriser cette source*…).
6. Appuyez sur la flèche **Retour** pour revenir à l'installation.
7. Appuyez sur **Installer**.
8. Si votre téléphone affiche un message de type *« Analyse de l'application »* ou *« Google Play Protect »* qui signale une application non reconnue, appuyez sur **Installer quand même** (ou **Plus de détails → Installer quand même**).
9. Une fois terminé, appuyez sur **Ouvrir**. L'application est maintenant installée et son icône apparaît parmi vos applications.

### Si vous ne trouvez pas l'option

Le chemin dans les réglages dépend de la marque du téléphone. Essayez :

- **Android « standard » / Samsung** : *Paramètres → Applications → Accès spécial → Installer des applis inconnues* → choisissez votre navigateur ou « Fichiers » → activez l'autorisation.
- **Xiaomi / Redmi / POCO** : l'installation passe souvent par un écran « Installateur de paquets » avec un compte à rebours de quelques secondes ; patientez puis appuyez sur **Installer**. Si l'option est bloquée, allez dans *Paramètres → Applications → Autorisations → Autorisations spéciales → Installer des applications inconnues*.
- **Dans tous les cas** : tapez « inconnues » ou « sources inconnues » dans la barre de recherche des **Paramètres**.

> 🔒 **Bonne habitude** : une fois l'application installée, vous pouvez **retirer** l'autorisation donnée au navigateur ou à « Fichiers » (même chemin, on désactive l'interrupteur). L'application restera installée et fonctionnera normalement.

---

## 4. Premier lancement et autorisations

Au premier lancement, l'application vous demande quelques autorisations. Voici à quoi elles servent et quoi répondre :

| Demande | Pourquoi | Que répondre |
|---|---|---|
| **Localisation / position** | Indispensable : c'est ce qui permet de savoir où vous êtes et d'enregistrer votre trace. | **« Pendant l'utilisation de l'appli »** ou **« Toujours »**. Choisissez **Position précise** si le choix s'affiche. |
| **Notifications** | Affiche une notification pendant l'enregistrement, pour que le téléphone ne « s'endorme » pas. | **Autoriser** |
| **Appareil photo** | Seulement si vous voulez joindre une photo à un point d'intérêt. | **Autoriser** (vous pouvez refuser si vous ne comptez pas prendre de photos) |

> 💡 Pour que l'enregistrement continue **écran éteint ou téléphone en poche**, choisissez l'autorisation de localisation **« Toujours »** (ou « Autoriser tout le temps »). Si vous avez refusé par erreur, vous pouvez la modifier dans *Paramètres → Applications → randos → Autorisations → Position*.

Si votre téléphone vous demande de **désactiver l'optimisation de la batterie** pour l'application, acceptez : sans cela, certains téléphones (Xiaomi, Huawei, Oppo…) interrompent l'enregistrement quand l'écran s'éteint.

---

## 5. Découvrir l'écran

Au lancement, vous voyez une **carte** occupant presque tout l'écran, et une **barre de boutons** répartie en trois groupes.

### Boutons « terrain » (les plus utiles en marchant)

- **🔒 Verrou** : bloque les boutons pour éviter les appuis accidentels (téléphone en poche, par exemple).
- **📍 GPS** : centre la carte sur votre position et affiche un point qui vous représente.
- **+WPT** : ajoute un **point d'intérêt** (waypoint) à l'endroit où vous êtes, ou à un endroit touché sur la carte.
- **⏺ REC** : **démarre / arrête l'enregistrement** de votre trace.

### Boutons « carte »

- Choix du **fond de carte** (plan, orthophoto…).
- Ajout d'une carte hors-ligne (fichier **MBTiles**) ou d'un fond personnalisé.
- **📥** : téléchargement d'une zone pour l'utiliser **sans réseau**.

### Boutons « données »

- **Import** : ouvrir un fichier de trace (GPX, KML, KMZ).
- **Export** : partager ou enregistrer vos traces.
- **Traces** : la liste de tout ce que vous avez enregistré.
- **Effacer** : supprime des éléments (attention !).

Enfin, une **boussole** et un **bandeau de message** (en bas) vous informent de l'état de l'application. Au démarrage, ce bandeau affiche par exemple *« Prêt — build N »* : c'est normal, c'est simplement le numéro de version.

> 📌 Les icônes exactes peuvent légèrement varier selon la version de l'application. Si vous hésitez, **appuyez longuement ou lisez le texte** à côté du bouton.

---

## 6. Enregistrer votre première trace

### Avant de partir

1. **Sortez à l'extérieur**, au dégagé : le GPS capte mal à l'intérieur d'un bâtiment.
2. Ouvrez l'application et appuyez sur **📍 GPS**. Attendez que le point de position apparaisse sur la carte (de quelques secondes à une minute la première fois).
3. Vérifiez que le point correspond bien à l'endroit où vous vous trouvez.

### Démarrer

4. Appuyez sur **⏺ REC**. Le bouton change de couleur (rouge) : l'enregistrement est en cours. Un trait commence à se dessiner sur la carte au fur et à mesure que vous avancez.
5. *(Recommandé)* Appuyez sur **🔒 Verrou** pour bloquer les boutons, puis rangez votre téléphone dans votre poche ou votre sac. L'enregistrement continue.

### Pendant la marche

- Pour noter un lieu intéressant (belle vue, source, carrefour…), **déverrouillez** puis appuyez sur **+WPT**. Donnez-lui un nom, une description si vous voulez, éventuellement une photo, puis validez.
- Vous pouvez consulter la carte à tout moment : cela n'interrompt pas l'enregistrement.

### Arrêter

6. De retour à l'arrivée, **déverrouillez** si besoin, puis appuyez de nouveau sur **⏺ REC**.
7. L'application demande une **confirmation** avant d'arrêter (pour éviter les arrêts accidentels). Confirmez.
8. Votre trace est enregistrée automatiquement. 🎉

> 🛟 **Bon à savoir** : à chaque trace terminée, l'application fait aussi une **copie de sécurité automatique** dans son espace privé. Même si vous fermez l'application ou supprimez la trace par erreur, il reste une sauvegarde récupérable (voir section 7).

---

## 7. Retrouver et partager votre trace

### Voir la liste de vos traces

1. Appuyez sur le bouton **Traces**.
2. Vous voyez la liste de vos enregistrements (et de vos points d'intérêt, repérés par 📍 ou 📷), avec pour chaque trace des **statistiques** : distance, durée, dénivelé, vitesse.
3. Sur chaque ligne, quatre actions :
   - **🔍** : centrer la carte sur cette trace ;
   - **✎** : la renommer (par exemple « Sentier du lac — 7 octobre ») ;
   - **⬇** : l'exporter seule ;
   - **🗑** : la supprimer (⚠ sans retour en arrière).

> 💡 **Donnez un nom clair** à vos traces dès le retour : dans quelques mois, « Trace 12 » ne vous dira plus rien.

### Exporter pour garder ou partager

- **Export d'une seule trace** : le bouton **⬇** de sa ligne. Il enregistre **la trace seule** (sans les photos).
- **Export complet** : le bouton **Export…** de la barre d'outils. Il regroupe **traces + points d'intérêt + photos** (au format KMZ).

Une fenêtre de partage s'ouvre : vous pouvez alors envoyer le fichier par e-mail, messagerie, l'enregistrer dans votre cloud (Drive…), etc.

### Où sont mes fichiers sur le téléphone ?

Chaque export est aussi **copié automatiquement** dans le dossier :

```
Téléchargements / randos / Tracklogs /
```

Ouvrez l'application **Fichiers** → **Téléchargements** → **randos** → **Tracklogs**. Vous pouvez aussi brancher le téléphone à un ordinateur en USB et retrouver ce dossier.

### Récupérer les copies de sécurité automatiques

Dans le panneau **Traces**, le bouton **« 💾 Exporter les sauvegardes »** permet de récupérer toutes les traces sauvegardées automatiquement. Si le message *« Aucune sauvegarde automatique pour le moment »* s'affiche, c'est simplement que vous n'avez pas encore terminé d'enregistrement.

### Formats de fichiers : lequel choisir ?

| Format | À utiliser pour… |
|---|---|
| **GPX** | Le plus répandu : à importer dans la plupart des applis de rando et GPS. |
| **KML** | Visualiser la trace dans Google Earth. |
| **KMZ** | Comme le KML, mais en un seul fichier compressé qui **peut contenir des photos**. |

---

## 8. Préparer la carte pour marcher sans réseau

En montagne ou en forêt, il n'y a souvent **pas de réseau** : la carte risque de rester grise. Prenez l'habitude de **préparer la zone avant de partir**, chez vous, en Wi-Fi.

1. Choisissez le fond de carte voulu (par exemple OpenStreetMap ou IGN Plan).
2. Déplacez la carte jusqu'à la zone de votre randonnée.
3. Appuyez sur **📥** et suivez le panneau pour **télécharger la zone** (ne choisissez pas une zone trop grande : le téléchargement serait long et lourd).
4. Une fois terminé, vous pouvez activer le **mode avion** pour tester : la carte de la zone doit toujours s'afficher.

> 📶 Le **GPS fonctionne sans réseau** : seul le fond de carte a besoin d'être préchargé.

Les utilisateurs avancés peuvent aussi importer un fichier de carte **MBTiles**, mais ce n'est pas nécessaire pour débuter.

---

## 9. Conseils de terrain

- 🔋 **Batterie** : partez avec 100 %. Activez le mode économie d'énergie du téléphone si besoin (sans interdire la localisation à l'application) et emportez une batterie externe pour les longues sorties.
- 🔒 **Utilisez le verrou** quand le téléphone est en poche : c'est le meilleur moyen d'éviter d'arrêter l'enregistrement sans le vouloir.
- 📍 **Laissez le GPS « s'accrocher »** quelques secondes avant d'appuyer sur REC, surtout au départ.
- 🌲 Sous un **couvert forestier dense**, entre deux falaises ou en ville, la trace peut être moins précise : c'est normal.
- 📸 Ajoutez des **points d'intérêt avec photo** : ils rendront votre trace bien plus vivante au retour.
- 💾 **Exportez vos traces** régulièrement vers un autre endroit (e-mail, cloud, ordinateur). Si vous changez de téléphone ou désinstallez l'application, les données internes peuvent être perdues.
- 🗑 **Désinstaller l'application** efface ses données internes : exportez d'abord !

---

## 10. Problèmes fréquents

**« Je n'arrive pas à installer le fichier, rien ne se passe. »**
→ Vérifiez que vous avez bien autorisé l'installation depuis la source (étape 3). Si l'écran reste bloqué, essayez d'ouvrir le fichier depuis l'application **Fichiers** plutôt que depuis le navigateur.

**« Android affiche un message de danger / application non vérifiée. »**
→ C'est le comportement normal pour une application hors Play Store. Si le fichier vous vient d'une source de confiance, choisissez **Installer quand même**.

**« L'installation échoue avec le message *Application non installée*. »**
→ Cela arrive si le téléphone manque de place, si le fichier est incomplet (re-téléchargez-le), ou si une autre version de l'application, signée différemment, est déjà installée (désinstallez-la d'abord, **après avoir exporté vos traces**).

**« Le point GPS n'apparaît pas. »**
→ Vérifiez que la **localisation** est activée dans les réglages rapides du téléphone, que l'autorisation est donnée à l'application, et que vous êtes en extérieur.

**« L'enregistrement s'arrête quand l'écran s'éteint. »**
→ Donnez à l'application la localisation **« Toujours »** et désactivez l'**optimisation de la batterie** pour elle (*Paramètres → Applications → randos → Batterie → Aucune restriction*). Sur Xiaomi, activez aussi **« Démarrage automatique »**.

**« La carte reste grise. »**
→ Vous n'avez pas de réseau et la zone n'a pas été préchargée (section 8).

**« Le bouton d'export ne semble rien faire. »**
→ Regardez le **bandeau de message** en bas de l'écran : il indique ce qui se passe. Les exports longs affichent un **voile avec une roue** ; attendez qu'il disparaisse avant de réappuyer.

**« J'ai supprimé une trace par erreur. »**
→ Essayez **« 💾 Exporter les sauvegardes »** dans le panneau Traces : une copie automatique existe peut-être.

---

## 11. Petit lexique

| Mot | Signification |
|---|---|
| **APK** | Fichier d'installation d'une application Android. |
| **Source inconnue** | Une application qui ne vient pas du Play Store. |
| **Trace** | Le tracé de votre parcours, enregistré pendant la marche. |
| **Waypoint** | Un point d'intérêt que vous marquez sur la carte. |
| **GPX / KML / KMZ** | Formats de fichiers pour échanger des traces et des points. |
| **MBTiles** | Fichier de carte utilisable sans réseau. |
| **Hors-ligne** | Qui fonctionne sans connexion internet. |
| **Fond de carte** | L'image de la carte affichée (plan, photo aérienne…). |

---

*Bonne randonnée ! 🥾 N'hésitez pas à faire part à l'auteur de l'application de vos remarques ou des difficultés rencontrées : elles aident à améliorer ce guide.*