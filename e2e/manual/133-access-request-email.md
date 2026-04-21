# Test: #133 — Email-Notification bei Zugriffsanfrage

**Ziel:** Neue User die sich einloggen und status='pending' bekommen, lösen
automatisch eine Mail an Stefan aus. Mehrfach-Triggern pro User wird
verhindert (nur bei Transition auf 'pending').

**Vorbedingungen (einmalig)**

1. **Resend-Account** anlegen: https://resend.com/signup
2. API-Key erstellen → Dashboard → API Keys → „Create"
3. Secret setzen:
   ```bash
   firebase functions:secrets:set RESEND_API_KEY
   # Dann API-Key einfügen
   ```
4. Deploy: `firebase deploy --only functions:notifyAccessRequest`
5. (Optional) Absender-Domain verifizieren und `NOTIFY_FROM_EMAIL`
   anpassen. Default `onboarding@resend.dev` funktioniert im Free-Tier
   aber **nur für Mails an die Resend-Account-Email**.

---

## TC-1: Neue Zugriffsanfrage → Mail kommt an

1. Neuen Browser (Incognito oder anderes Profil) öffnen
2. Beta oder Prod-URL laden
3. Mit Google-Account einloggen, der noch nicht in Firestore als User
   existiert
4. Admin-UI (Stefan) zeigt nun einen neuen pending-User
5. Inbox (stefan.kummert@gmail.com) checken

**Erwartetes Ergebnis:**
- ✅ Mail kommt mit Betreff „Zugriffsanfrage: <Name>"
- ✅ Body enthält Email, DisplayName, UID, Link zur App
- ✅ Cloud-Function-Log (Firebase Console → Functions → Logs) zeigt
  `[notifyAccessRequest] ✓ email sent for <uid>`

---

## TC-2: Mehrfach-Login → nur eine Mail

1. Gleicher Test-User loggt sich erneut ein (noch ohne Freigabe)
2. Firestore-Doc wird ggf. aktualisiert (lastSeen, etc.)

**Erwartetes Ergebnis:**
- ✅ **Keine neue Mail** — Logik checkt Transition auf 'pending',
  nicht bloßes Write
- ✅ Log: nichts (Function exitet früh)

---

## TC-3: Genehmigung + späterer Revoke → bei Revoke keine Mail

1. Stefan setzt via Admin-UI den User auf status='approved'
2. Stefan setzt ihn später manuell zurück auf 'pending'

**Erwartetes Ergebnis:**
- ✅ Schritt 2 → neue Mail (Transition von 'approved' zu 'pending'
  löst Mail aus, ist erwünscht damit Re-Approval-Anforderungen
  sichtbar sind)

---

## TC-4: Fehlender API-Key → Graceful Skip

1. Secret `RESEND_API_KEY` entfernen / nicht setzen
2. Neuer User meldet sich an

**Erwartetes Ergebnis:**
- ✅ Keine Mail (klar)
- ✅ Signup funktioniert normal
- ✅ Log: `RESEND_API_KEY not set — skipping email for <uid>`
