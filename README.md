# 42 Alumni Helper

Extension navigateur (Chrome pour le moment) qui recalcule et corrige l'affichage
du level 42cursus sur `profile.intra.42.fr` pour les comptes passés **alumni**.

## Le problème

Une fois un compte 42 passé en statut `alumni`, le champ `level` de
`cursus_users` se **fige** côté API - même en continuant à valider des
projets après coup, la barre de progression affichée sur l'intra ne bouge
plus. Cette extension recalcule le vrai level à partir des projets validés
depuis la date d'alumnization, et corrige l'affichage directement dans le DOM.

## Comment ça marche

1. OAuth2 avec ton compte 42 (scope `public` uniquement - lecture seule de
   tes propres données)
2. Récupère ton level gelé (`cursus_users.level`) et le convertit en XP exact
   via la courbe level↔XP officielle
3. Récupère tes `projects_users` validés depuis ton `alumnized_at`, calcule
   l'XP gagnée avec la table XP-par-projet
4. Recalcule le level précis (avec décimales) et patche la barre affichée
5. Fonctionne sur `profile.intra.42.fr/users/<login>` et sur la racine
   `profile.intra.42.fr/` (ton propre profil)

Table XP par projet + courbe level↔XP par
[fzphr/42insight](https://github.com/fzphr/42insight). Merci à eux.

## Setup

### Charger l'extension

```bash
cd extension
```
`chrome://extensions` → active le mode développeur → "Charger l'extension non
empaquetée" → sélectionne ce dossier.

## Build

### 1. Créer l'app OAuth 42 *(build only)*

> Cette étape concerne uniquement si tu build l'extension toi-même depuis
> les sources. Si tu utilises une release déjà packagée, le `client_id`
> est déjà configuré dedans.

Sur [profile.intra.42.fr/oauth/applications](https://profile.intra.42.fr/oauth/applications) :

- **Scope** : `Access the user public data` uniquement (rien d'autre coché)
- **Redirect URI** :
  ```
  https://onnneeengohdglgkbphbfcfjmbafkjjm.chromiumapp.org/
  ```
- Récupère le `client_id` généré, colle-le dans `extension/background.js` :
  ```js
  const CLIENT_ID = "TON_CLIENT_ID";
  ```

### 2. Déployer le proxy (Vercel) *(build only)*

> Cette étape concerne uniquement si tu build l'extension toi-même depuis
> les sources. Si tu utilises une release déjà packagée, le `client_id`
> est déjà configuré dedans.


```bash
cd proxy
cp .env.example .env      # remplis FT_CLIENT_ID / FT_CLIENT_SECRET en local
npx vercel dev             # tester en local sur http://localhost:3000/api/token
```

Déploiement prod :
```bash
npx vercel env add FT_CLIENT_ID
npx vercel env add FT_CLIENT_SECRET
npx vercel --prod
```

Récupère l'URL prod (`https://ton-projet.vercel.app`), colle-la dans
`extension/background.js` :
```js
const PROXY_URL = "https://ton-projet.vercel.app/api/token";
```
et dans `extension/manifest.json` → `host_permissions`.

## Structure du repo

```
42-alumni-helper/
├── extension/
│   ├── manifest.json         # Manifest V3, clé épinglée (ID stable)
│   ├── background.js         # Flow OAuth2 (chrome.identity.launchWebAuthFlow)
│   ├── content/
│   │   ├── config.js         # Constantes (cursus id, URLs, TTL cache)
│   │   ├── cache.js          # Helper générique cache TTL (chrome.storage.local)
│   │   ├── level-engine.js   # Interpolation level↔XP, calcul XP gagnée
│   │   └── content.js        # Orchestration + patch DOM
│   ├── popup/                # UI connexion / déconnexion / vidage cache
│   └── icons/
├── proxy/
│   ├── .env.example
│   └── api/
│       └── token.js          # Vercel serverless function - échange code→token
├── .gitignore
└── README.md
└── LICENSE
```

## Licence

Ce repo est sous licence [MIT](LICENSE)

La table de données XP/level vient de [fzphr/42insight](https://github.com/fzphr/42insight),
sous MIT aussi mais avec une clause de crédit en plus.