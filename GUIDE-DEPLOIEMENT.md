# 🚀 Guide de mise en production — Pas à pas

Tu n'as besoin d'aucune connaissance technique. Suis ces étapes dans l'ordre.

---

## Prérequis (5 minutes)

Tu as besoin de 2 comptes gratuits :

1. **GitHub** (pour stocker le code) → https://github.com/signup
2. **Vercel** (pour héberger l'app) → https://vercel.com/signup (connecte-toi avec ton compte GitHub)

---

## Étape 1 — Mettre le code sur GitHub (5 minutes)

### Option A : Via le site web (le plus simple)

1. Va sur https://github.com/new
2. Nom du dépôt : `edmonton-investment-analyzer`
3. Laisse "Public" ou choisis "Private"
4. **Ne coche rien** d'autre (pas de README, pas de .gitignore)
5. Clique **"Create repository"**
6. GitHub va te montrer des commandes. Dans ton terminal, tape :

```bash
cd /workspace/edmonton-investment-analyzer
git remote add origin https://github.com/TON-USERNAME/edmonton-investment-analyzer.git
git branch -M main
git push -u origin main
```

> Remplace `TON-USERNAME` par ton nom d'utilisateur GitHub.

### Option B : Via GitHub CLI

```bash
cd /workspace/edmonton-investment-analyzer
gh repo create edmonton-investment-analyzer --public --source=. --push
```

---

## Étape 2 — Déployer sur Vercel (3 minutes)

1. Va sur https://vercel.com/new
2. Clique **"Import Git Repository"**
3. Sélectionne `edmonton-investment-analyzer` dans la liste
4. Vercel détecte automatiquement que c'est du Next.js
5. **Ne change rien aux paramètres**
6. Clique **"Deploy"**
7. Attends 1-2 minutes ⏳
8. ✅ Ton app est en ligne ! Vercel te donne une URL comme :
   `https://edmonton-investment-analyzer.vercel.app`

---

## Étape 3 — C'est fini ! 🎉

Ton application est maintenant :
- ✅ En ligne et accessible de partout
- ✅ HTTPS activé automatiquement
- ✅ Se met à jour automatiquement quand tu modifies le code sur GitHub
- ✅ Gratuite (le plan gratuit Vercel suffit largement)

---

## Optionnel : Nom de domaine personnalisé

Si tu veux une adresse comme `analyse.tonsite.com` :

1. Achète un domaine sur [Namecheap](https://namecheap.com) (~15$/an) ou [Google Domains](https://domains.google)
2. Dans Vercel → ton projet → **Settings** → **Domains**
3. Ajoute ton domaine
4. Vercel te donne des enregistrements DNS à configurer chez ton registraire
5. Attends 5-30 minutes pour la propagation DNS

---

## Optionnel : Mises à jour futures

Quand tu veux modifier l'app :

```bash
cd /workspace/edmonton-investment-analyzer

# Fais tes modifications...

# Puis envoie-les en production :
git add -A
git commit -m "Description de la modification"
git push
```

Vercel redéploie automatiquement en 1-2 minutes.

---

## En cas de problème

| Problème | Solution |
|----------|----------|
| "Build failed" sur Vercel | Va dans l'onglet "Deployments" → clique sur le déploiement → lis les logs d'erreur |
| Page blanche | Ouvre la console du navigateur (F12) pour voir les erreurs |
| L'upload ne marche pas | Vérifie que le fichier est bien .xlsx, .xls ou .pdf et < 10 Mo |
| Erreur "extraction impossible" | Le format du pro forma n'est pas reconnu — les données doivent contenir "sale price" et "units" |

---

## Architecture technique (pour référence)

```
Utilisateur → Vercel (hébergement gratuit)
                ├── Frontend (React/Next.js)
                └── API serverless (/api/analyze)
                     ├── Parser Excel (xlsx)
                     ├── Parser PDF (pdf-parse)
                     └── Moteur d'analyse
```

Tout tourne sur Vercel, aucun serveur à gérer.
