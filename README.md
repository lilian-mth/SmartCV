# SmartCV — Assistant IA de Génération et d'Analyse de CV

Application web modulaire développée dans le cadre du test technique **SEPEFREI**.  
Elle permet de **générer et d'affiner un CV structuré** à partir d'un prompt libre, et d'**auditer un CV au format PDF** face à un poste cible.

---

## 1. Fonctionnalités

- **Génération & affinage conversationnel de CV :** création d'un CV complet structuré autour de 7 rubriques clés à partir d'une description textuelle, avec possibilité de le modifier itérativement par messages successifs.
- **Prévisualisation A4 & Export PDF natif :** rendu immédiat sur gabarit A4 et impression PDF propre sans marges ni en-têtes navigateur (`@media print` / `@page`).
- **Analyseur ATS de CV PDF :** extraction locale du texte d'un fichier PDF dans le navigateur, calcul d'un score d'adéquation sur 100, identification des points forts, des lacunes et recommandations d'amélioration ciblées.
- **Support bilingue (FR / EN) :** génération de CV et rapports d'analyse disponibles en français et en anglais.

---

## 2. Architecture technique & Modèles utilisés

- **Front-end :** HTML5, CSS3 (`@media print`), JavaScript Vanilla (ES Modules) bundlé avec **Vite**.
- **Extraction PDF côté client (`pdfjs-dist`) :** lecture directe du fichier en mémoire (`ArrayBuffer`) via le worker `PDF.js`. Aucun fichier n'est transféré vers un serveur tiers, ce qui réduit la latence et reproduit fidèlement l'extraction brute d'un logiciel ATS.
- **Relais API sécurisé (`functions/api/chat.js`) :** fonction serverless **Cloudflare Pages Functions** qui injecte la clé API côté serveur afin de ne jamais l'exposer côté client ni sur GitHub.
- **Modèle IA & Sorties structurées :** modèle **`openai/gpt-oss-120b`** hébergé sur **Groq** (API compatible OpenAI) avec mode JSON strict (`response_format: { type: "json_object" }`), garantissant un contrat de données déterministe pour le rendu de l'interface.

---

## 3. Installation et lancement en local

### Prérequis
- **Node.js** (v18 ou supérieur)
- Une clé API gratuite **Groq** (créable sur [console.groq.com](https://console.groq.com))

### Étapes d'installation

1. **Cloner le dépôt et installer les dépendances :**
   ```bash
   git clone <url-du-depot>
   cd SmartCV
   npm install
   ```

2. **Configurer la clé API en local :**
   Créer un fichier `.dev.vars` à la racine du projet (ce fichier est ignoré par Git via `.gitignore`) :
   ```env
   GROQ_API_KEY=gsk_votre_cle_api_ici
   ```

3. **Démarrer l'environnement local (Front-end Vite + Back-end Cloudflare Functions) :**
   ```bash
   npx wrangler pages dev -- npm run dev
   ```
   L'application est accessible à l'adresse : `http://localhost:8788`.

---

## 4. Guide d'utilisation

### Générer et exporter un CV
1. Sur la page d'accueil, sélectionner la langue souhaitée (**FR** ou **EN**) en haut à droite, puis cliquer sur **Créer un CV**.
2. Saisir une description du profil recherché dans la barre en bas de l'écran (ex. : *"Développeur Python avec 3 ans d'expérience en cybersécurité"*) et appuyer sur **Entrée**.
3. Le CV s'affiche sur une feuille A4 au centre de l'écran. Il est possible d'envoyer des messages supplémentaires pour affiner le contenu (ajouter une expérience, modifier le titre, traduire).
4. Cliquer sur **Exporter en PDF** pour enregistrer le document au format PDF, ou sur **Voir JSON** pour inspecter la structure de données brute.

### Analyser un CV PDF
1. Depuis l'accueil, cliquer sur **Analyser un CV**.
2. Glisser-déposer un fichier `.pdf` dans la zone prévue en bas de l'écran (ou cliquer pour parcourir).
3. Renseigner l'intitulé du **Poste cible** (ex. : *"Data Scientist Junior"*) et cliquer sur **Analyser**.
4. L'application affiche une note sur 100, une synthèse d'adéquation ainsi que trois listes détaillées : points forts, points faibles et pistes d'amélioration.

---

## 5. Tests unitaires

Une suite de tests automatisés valide la conformité des schémas JSON (CV et Analyse), la génération des prompts bilingues et le rejet des PDF vides ou scannés (`< 50` caractères).

Exécuter les tests via le runner natif de Node.js :
```bash
node --test tests/validator.test.js
```

---

## 6. Structure du projet

```text
SmartCV/
├── functions/
│   └── api/
│       └── chat.js               # Endpoint serverless (relais sécurisé vers l'API Groq)
├── src/
│   ├── services/
│   │   ├── prompts.js            # System prompts FR/EN et schémas JSON attendus
│   │   ├── aiService.js          # Appels fetch('/api/chat') et validation structurelle JSON
│   │   └── pdfParser.js          # Extraction de texte d'un PDF côté client (pdfjs-dist)
│   ├── components/
│   │   ├── cvRenderer.js         # Transformation JSON CV -> Feuille A4 HTML/CSS
│   │   └── analysisRenderer.js   # Transformation JSON Analyse -> Score & cartes de feedback
│   ├── main.js                   # Logique UI, navigation et gestion d'état
│   └── style.css                 # Styles globaux et feuille d'impression @media print
├── tests/
│   └── validator.test.js         # Tests unitaires (node:test)
├── exemples/
│   ├── exemple_cv_genere.json    # Exemple de sortie JSON générée
│   ├── exemple_cv_genere.pdf     # Exemple de CV exporté en PDF
│   └── exemple_analyse.json      # Exemple de rapport d'audit IA
├── .dev.vars                     # Variables d'environnement locales (non versionné)
├── index.html                    # Point d'entrée de l'application
├── package.json
└── README.md
```

---

## 7. Limites connues & Hypothèses

- **PDF scannés (images sans couche texte) :** `pdfjs-dist` extrait uniquement le texte vectoriel encodé dans le document. Si un PDF contient moins de 50 caractères exploitables, l'outil bloque l'analyse avec un message explicite (pas d'OCR intégré côté client).
- **Mise en page multi-colonnes :** sur des CV fortement mis en page (Canva, Figma), l'ordre d'extraction des blocs de texte peut différer de l'ordre de lecture visuel, mais le LLM reconstitue sémantiquement les rubriques.
- **Dépendance réseau :** la génération et l'analyse nécessitent un accès Internet et dépendent des quotas de l'API Groq.