'use client';

import { signOut } from 'next-auth/react';
import { ShieldOff, Mail, LogOut } from 'lucide-react';

export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10">
            <ShieldOff className="h-10 w-10 text-red-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Η πρόσβαση ανεστάλη</h1>
          <p className="text-muted-foreground">
            Η άδεια χρήσης της επιχείρησής σας είναι ανενεργή ή έχει λήξει.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 text-left space-y-3">
          <p className="text-sm font-medium text-foreground">Τι μπορείτε να κάνετε:</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Επικοινωνήστε με τον διαχειριστή του συστήματος για ανανέωση της άδειας.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Ελέγξτε αν η ημερομηνία λήξης έχει παρέλθει.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              Επικοινωνήστε μαζί μας για αναβάθμιση του πλάνου σας.
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href="mailto:support@myerp.gr"
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
          >
            <Mail className="h-4 w-4" />
            Επικοινωνία Support
          </a>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Αποσύνδεση
          </button>
        </div>
      </div>
    </div>
  );
}
