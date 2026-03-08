# MyERP - Σύστημα ERP για Επιχειρήσεις

Ολοκληρωμένο SaaS ERP σύστημα κατασκευασμένο με Next.js 14, TypeScript, και SQLite.

## 🚀 Γρήγορη Εκκίνηση

### 1. Εγκατάσταση dependencies

```bash
npm install
```

### 2. Ρύθμιση βάσης δεδομένων

```bash
# Δημιουργία βάσης και schema
npm run db:push

# Αρχικά δεδομένα (demo accounts)
npm run db:seed
```

### 3. Εκκίνηση development server

```bash
npm run dev
```

Ανοίξτε [http://localhost:3000](http://localhost:3000)

---

## 🔐 Λογαριασμοί Demo

| Ρόλος | Email | Password |
|-------|-------|----------|
| Master Admin | admin@myerp.gr | Admin@123456 |
| Business Admin | bizadmin@demo.gr | Admin@123456 |
| User | user@demo.gr | User@123456 |

---

## ✨ Δυνατότητες

### 📦 Διαχείριση Αποθήκης
- Κατάλογος προϊόντων με SKU, barcode, κατηγορίες
- Κινήσεις αποθέματος (εισαγωγή, εξαγωγή, προσαρμογή)
- Ειδοποιήσεις χαμηλού αποθέματος
- Διαχείριση αποθηκών
- Αξία αποθέματος σε πραγματικό χρόνο

### 👥 Διαχείριση Πελατών
- Πελάτες, προμηθευτές ή και τα δύο
- ΑΦΜ, ΔΟΥ, πλήρη στοιχεία επικοινωνίας
- Ιστορικό συναλλαγών
- Πιστωτικά όρια

### 🧾 Τιμολόγηση
- Τιμολόγια πώλησης και αγοράς
- Πιστωτικά σημειώματα
- Αυτόματος υπολογισμός ΦΠΑ (0%, 6%, 13%, 24%)
- Διαχείριση κατάστασης (Πρόχειρο, Εστάλη, Πληρώθηκε, Ληξιπρόθεσμο)
- Εξαγωγή PDF κάθε τιμολογίου

### 💰 Διαχείριση Εξόδων
- Κατηγορίες: Μισθοδοσία, Ενοίκιο, Λογαριασμοί, Marketing, Λειτουργικά
- Επαναλαμβανόμενα έξοδα
- Γράφημα κατανομής ανά κατηγορία

### 📊 Αναλυτικά & Αναφορές
- Έσοδα vs Έξοδα (γράφημα περιοχής)
- Μηνιαία σύγκριση (bar chart)
- Κορυφαίοι πελάτες ανά τζίρο
- Εξαγωγή αναφορών σε **CSV** και **PDF**
- 5 τύποι αναφορών: Αποθήκη, Πελάτες, Έξοδα, Πωλήσεις, Οικονομικά

### 👤 Διαχείριση Χρηστών
- 3 επίπεδα ρόλων: Master Admin, Business Admin, User
- Ενεργοποίηση/απενεργοποίηση χρηστών
- Κάθε επιχείρηση έχει τους δικούς της χρήστες

### 🔒 Ασφάλεια
- **2FA** (Two-Factor Authentication) με Google Authenticator
- Κρυπτογράφηση κωδικών (bcrypt)
- JWT session management
- Role-based access control
- Audit log

### ⚙️ Ρυθμίσεις
- Στοιχεία επιχείρησης
- Αλλαγή κωδικού
- Ενεργοποίηση/απενεργοποίηση 2FA
- **Εξαγωγή δεδομένων** σε CSV (όλα, πελάτες, αποθήκη, οικονομικά)
- **Εισαγωγή δεδομένων** από CSV

---

## 🌐 Γλώσσες
- **Ελληνικά** (κύρια)
- **Αγγλικά** (δευτερεύουσα)

Εναλλαγή γλώσσας από το header (cookie-based)

---

## 🛠️ Τεχνολογίες

| Τεχνολογία | Χρήση |
|------------|-------|
| Next.js 14 | Framework (App Router) |
| TypeScript | Type safety |
| Prisma + SQLite | Database ORM |
| NextAuth v5 | Authentication |
| Tailwind CSS | Styling |
| Recharts | Charts |
| jsPDF + autoTable | PDF export |
| PapaParse | CSV export/import |
| speakeasy + qrcode | 2FA TOTP |
| next-intl | Internationalization |

---

## 🗂️ Δομή Project

```
MyERP/
├── app/
│   ├── (dashboard)/        # Dashboard pages (auth-protected)
│   │   ├── dashboard/      # Κεντρικός πίνακας
│   │   ├── inventory/      # Αποθήκη
│   │   ├── clients/        # Πελάτες
│   │   ├── invoices/       # Τιμολόγια
│   │   ├── costs/          # Έξοδα
│   │   ├── analytics/      # Αναλυτικά
│   │   ├── reports/        # Αναφορές
│   │   ├── users/          # Χρήστες
│   │   └── settings/       # Ρυθμίσεις
│   ├── api/                # API Routes
│   ├── login/              # Login page
│   ├── setup-2fa/          # 2FA setup
│   └── verify-2fa/         # 2FA verification
├── components/
│   ├── layout/             # Sidebar, Header
│   ├── inventory/          # Product & Movement modals
│   ├── clients/            # Client modal
│   ├── costs/              # Cost modal
│   ├── invoices/           # Invoice modal
│   └── users/              # User modal
├── lib/
│   ├── auth.ts             # NextAuth + 2FA config
│   ├── db.ts               # Prisma client
│   ├── utils.ts            # Utilities
│   ├── export-pdf.ts       # PDF export
│   └── export-csv.ts       # CSV export
├── messages/
│   ├── el.json             # Greek translations
│   └── en.json             # English translations
└── prisma/
    ├── schema.prisma       # Database schema
    └── seed.ts             # Initial data
```

---

## 🚀 Deployment σε GitHub

```bash
# 1. Initialize git (αν δεν έχει γίνει)
git init
git add .
git commit -m "Initial commit: MyERP v1.0"

# 2. Δημιουργία GitHub repository
gh repo create MyERP --public

# 3. Push
git remote add origin https://github.com/USERNAME/MyERP.git
git push -u origin main
```

### Production Deployment (Vercel / Railway)

Για production, αλλάξτε το DATABASE_URL σε PostgreSQL:
```
DATABASE_URL="postgresql://user:password@host:5432/myerp"
```

Και ενημερώστε το prisma/schema.prisma:
```
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

---

## 📝 Περιβαλλοντικές Μεταβλητές (.env.local)

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="your-secret-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"
MASTER_ADMIN_EMAIL="admin@myerp.gr"
MASTER_ADMIN_PASSWORD="Admin@123456"
```

---

## 🔧 Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run db:push      # Apply schema to database
npm run db:seed      # Seed demo data
npm run db:studio    # Prisma Studio (DB browser)
npm run db:migrate   # Create migration
```

---

Κατασκευασμένο με ❤️ για ελληνικές επιχειρήσεις
