# JURIS - Système de Gestion de Cabinet d'Avocat

Une application complète de gestion pour cabinets d'avocats avec abonnements mensuels, notifications automatiques et fonctionnalités avancées.

## 🚀 Fonctionnalités

### ✅ Gestion Complète
- **Dossiers juridiques** avec suivi complet
- **Fiches clients** détaillées (particuliers et entreprises)
- **Calendrier** avec rappels automatiques
- **Documents** sécurisés avec stockage cloud
- **Facturation** intégrée et devis

### ✅ Abonnements et Paiements
- **Plans flexibles** : Basic, Premium, Enterprise
- **Paiement mensuel automatique** via mobile money
- **Limites strictes** par plan avec blocage automatique
- **Période de grâce** de 3 jours après expiration

### ✅ Notifications Automatiques
- **WhatsApp Business** pour communications urgentes
- **Email professionnel** pour documents et rappels
- **Rappels automatiques** (rendez-vous, échéances, paiements)

### ✅ Sécurité et Performance
- **Sauvegarde automatique** des données
- **Accès sécurisé** avec authentification
- **Données en temps réel** sans simulation
- **Interface responsive** pour mobile et desktop

## 📋 Plans d'Abonnement

| Fonctionnalité | Basic (15,000 FCFA/mois) | Premium (35,000 FCFA/mois) | Enterprise (75,000 FCFA/mois) |
|---|---|---|---|
| Dossiers | 10 | 500 | Illimités |
| Clients | 25 | 1,000 | Illimités |
| Documents | 50 | 5,000 | Illimités |
| Notifications | ❌ | ✅ | ✅ |
| Facturation | ❌ | ✅ | ✅ |
| Rapports avancés | ❌ | ❌ | ✅ |
| Support | Email | Prioritaire | Dédié |

## 🛠️ Installation

### Prérequis
- Node.js 18+
- Compte Supabase
- Comptes API (WhatsApp, Email)

### Configuration

1. **Cloner le projet**
```bash
git clone [url-du-projet]
cd juris-app
npm install
```

2. **Variables d'environnement**
Copier `.env.production.example` vers `.env` et configurer :

```env
# Supabase
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_cle_supabase

# WhatsApp Business API
VITE_WHATSAPP_ENABLED=true
VITE_WHATSAPP_API_KEY=votre_token_whatsapp
VITE_WHATSAPP_INSTANCE_ID=votre_phone_number_id

# Service Email
VITE_EMAIL_ENABLED=true  
VITE_EMAIL_API_KEY=votre_cle_email
VITE_EMAIL_FROM_ADDRESS=noreply@votrecabinet.com
```

3. **Base de données**
Exécuter dans l'éditeur SQL Supabase :
```sql
-- 1. Créer les tables
-- Exécuter : supabase/migrations/001_enhanced_schema.sql
-- Exécuter : supabase/migrations/002_complete_schema_update.sql

-- 2. Configurer les utilisateurs de démo
-- Exécuter : setup-demo-users.sql
```

4. **Démarrer l'application**
```bash
npm run dev
```

## 👥 Comptes de Démonstration

| Email | Mot de passe | Plan | Description |
|---|---|---|---|
| basic@cabinet.com | basic123 | Basic | Fonctionnalités de base |
| demo@cabinet.com | demo123 | Premium | Toutes les fonctions premium |
| enterprise@cabinet.com | enterprise123 | Enterprise | Accès complet |

## 🔧 APIs Requises

### WhatsApp Business API
- **Fournisseur** : Meta Business, Twilio, ou providers locaux
- **Configuration** : Obtenir Phone Number ID + Access Token
- **Coût** : ~0.005-0.015€ par message

### Service Email  
- **Recommandé** : SendGrid (gratuit jusqu'à 100 emails/jour)
- **Alternatives** : Mailgun, Postmark, Amazon SES
- **Configuration** : API Key + domaine vérifié

### Mobile Money (Afrique de l'Ouest)
- **Orange Money** : Contact Orange Business Services
- **Moov Money** : Portail Moov Africa Business  
- **Wave** : https://wave.com/business (Sénégal, Mali)
- **MTN MoMo** : Portail MTN Business

## 🚦 Mise en Production

### 1. Déploiement
```bash
npm run build
# Déployer le dossier dist/ sur votre serveur
```

### 2. Monitoring
- Configurer alertes Supabase
- Surveiller usage API
- Monitorer paiements

### 3. Maintenance
- Sauvegardes automatiques activées
- Mises à jour sécuritaires mensuelles
- Monitoring des performances

## 📊 Fonctionnalités par Plan

### Basic
- Gestion simple des dossiers et clients
- Calendrier de base
- Support email

### Premium
- Notifications automatiques WhatsApp/Email
- Facturation intégrée
- Recherche avancée
- Export de données
- Support prioritaire

### Enterprise  
- Toutes fonctionnalités Premium
- Tableaux de bord avancés
- Rapports détaillés
- Configuration personnalisée
- Support dédié

## 🔒 Sécurité

- **Authentification** via Supabase Auth
- **Chiffrement** des données sensibles
- **Accès par rôles** (Row Level Security)
- **Sauvegardes** automatiques quotidiennes
- **Conformité** RGPD

## 📞 Support

- **Email** : support@votrecabinet.com
- **Documentation** : Disponible dans l'application
- **Formation** : Incluse avec plan Enterprise

## 🔄 Mises à Jour

L'application se met à jour automatiquement. Les nouvelles fonctionnalités sont déployées progressivement selon les plans d'abonnement.

---

**Développé pour les cabinets d'avocats africains** 🌍
*Avec support mobile money et notifications WhatsApp*
