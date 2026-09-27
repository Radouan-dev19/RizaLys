# Base Supabase RizaLys

Cette configuration doit être appliquée uniquement à un projet Supabase séparé nommé `rizaly`. Elle ne doit jamais être appliquée au projet du questionnaire.

## Schéma

La migration `migrations/202609220001_rizaly_orders_and_seasonal_flowers.sql` crée :

- `orders` : commande, papier choisi, totaux, statut et copie complète de la sélection ;
- `order_flowers` : chaque fleur, sa quantité, son prix unitaire et son total ;
- `order_extras` : chaque attention ajoutée à la commande ;
- `seasonal_flowers` : disponibilité magasin, stock, mois actifs et suivi des images à générer ;
- `create_order` : fonction transactionnelle appelée exclusivement par le serveur Next.js.

La seconde migration ajoute les coordonnées client, la date et le lieu de livraison ainsi que le suivi du paiement en boutique. Ces informations alimentent le carnet atelier disponible à l’URL privée configurée par l’application.

La troisième migration relie les nouvelles commandes à `auth.users`, ajoute l’adresse e-mail du compte et les politiques RLS permettant à chaque client de consulter uniquement ses propres commandes depuis `/mon-compte`.

Toutes les tables ont la sécurité RLS activée. La fonction de création de commande est réservée au rôle serveur Supabase.

## Variables serveur

Copier `.env.example` vers `.env.local`, puis renseigner uniquement les identifiants du projet `rizaly` :

```text
SUPABASE_URL=...
SUPABASE_SECRET_KEY=...
SUPABASE_PUBLISHABLE_KEY=...
```

La clé `SUPABASE_SECRET_KEY` ne doit jamais être préfixée par `NEXT_PUBLIC_`, copiée dans un composant client ou enregistrée dans Git. La clé publiable sert uniquement aux opérations Supabase Auth effectuées par les routes serveur.

Les inscriptions utilisent le flux public Supabase Auth et exigent la confirmation de l’adresse e-mail avant la première connexion. Les mots de passe sont exclusivement transmis à Supabase Auth, qui les stocke sous forme de hachage bcrypt avec un sel aléatoire ; ils ne sont jamais enregistrés dans les tables applicatives.

Pour la production, configurer un fournisseur SMTP personnalisé dans Supabase Auth, déclarer l’URL publique du site comme `Site URL` et autoriser les redirections vers `/mon-compte` et `/reinitialiser-mot-de-passe`. Le service d’e-mail par défaut de Supabase est réservé aux essais et fortement limité.

## Accès au carnet atelier

L’accès utilise un hash `scrypt` et une session signée HTTP-only. Pour renouveler le mot de passe et le secret de session :

```text
npm run setup:atelier
```

Copier uniquement `BACKOFFICE_PASSWORD_HASH` et `BACKOFFICE_SESSION_SECRET` dans `.env.local` et dans les variables privées de l’hébergement. Le mot de passe affiché une fois par la commande ne doit jamais être ajouté au dépôt.
