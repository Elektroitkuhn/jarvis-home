# JARVIS HOME – Einkaufsliste auf AWS Amplify

Ein **Next.js-15-Projekt für AWS Amplify Hosting (SSR)**. Die ursprüngliche Jarvis-Oberfläche wurde übernommen. Sie nutzt deine bestehenden n8n-Webhooks für die Einkaufsliste. Die Zugangsdaten liegen ausschließlich bei AWS Secrets Manager und werden über eine eingeschränkte IAM-SSR-Compute-Rolle zur Laufzeit abgerufen.

## Was schon vorbereitet ist

- iPhone-freundliche Oberfläche mit Familienpasswort.
- Artikel anzeigen, hinzufügen, abhaken/reaktivieren, löschen.
- Gleiche Liste auf beiden Geräten, Aktualisierung ca. alle 30 Sekunden bei geöffneter Seite.
- Geschützte API-Routen in Next.js statt direkter n8n-Aufrufe aus dem Browser.
- Serverseitige Anmeldung mit `HttpOnly`, `Secure`, `SameSite=Strict` Cookie; origin-kontrollierte Schreibaufrufe.
- AWS Secrets Manager (Name `jarvis-home/config`), Laufzeitabruf ohne Passwörter im Repo oder im Browser.

## Voraussetzungen

- AWS-Konto, bevorzugte Region **Europa (Frankfurt), `eu-central-1`**.
- Privates GitHub-Repository (Amplify benötigt für Next.js SSR einen Git-basierten Deploy).
- Deine vier n8n-Workflows müssen veröffentlicht sein und gleiches **erneuertes** Basic Auth Credential nutzen:
  - `GET /webhook/jarvis-einkaufsliste`
  - `POST /webhook/jarvis-einkaufsliste-add`
  - `POST /webhook/jarvis-einkaufsliste-update`
  - `POST /webhook/jarvis-einkaufsliste-delete`
- Stelle sicher, dass du das **früher veröffentlichte n8n Basic-Auth-Passwort geändert** hast!

## A. Repository vorbereiten

1. Entpacke `Jarvis_Home_AWS_Amplify.zip` auf deinem PC. In das private GitHub-Repository kommen **die Dateien aus dem Ordner `jarvis-home-amplify`**, sodass `package.json` im Stammordner des Repositories liegt.
2. Lege bei GitHub ein privates Repository `jarvis-home` an und lade die Dateien hoch; mit GitHub Desktop oder `git` geht das am einfachsten.
3. Keine Zugangsdaten oder `.env`-Dateien ins Repository laden.

## B. AWS Secrets Manager – sichere Zugangsdaten

1. AWS-Konsole → Region **Frankfurt (eu-central-1)** → **Secrets Manager → Store a new secret**.
2. Als Secret-Typ **Other type of secret** wählen; unter *Plaintext* genau ein JSON-Objekt eintragen (nur bei AWS, niemals in GitHub oder im Chat). Passe die Platzhalter an:

```json
{
  "N8N_BASE_URL": "https://elektroitkuhn.app.n8n.cloud",
  "N8N_USER": "jarvis",
  "N8N_PASSWORD": "DEIN_NEUES_N8N_BASIC_AUTH_PASSWORT",
  "APP_PASSWORD": "EIGENES_STARKES_FAMILIENPASSWORT_MIND_16_ZEICHEN",
  "SESSION_SECRET": "EIN_ZUFAELLIGER_SCHLUESSEL_MIND_32_ZEICHEN"
}
```

3. Secret-Name: **`jarvis-home/config`**. Secret speichern.
4. Die Amazon Resource Name (ARN) dieses Secrets notieren. Secrets Manager verursacht laufende Gebühren.
5. Für `SESSION_SECRET` in Windows PowerShell einen zufälligen Schlüssel erzeugen:

```powershell
$bytes = New-Object byte[] 32
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

**Hinweis:** Standardmäßig ruft die App das Secret aus `eu-central-1` ab. Bei anderer Region muss `JARVIS_SECRET_REGION` als **nicht geheime** Konfigurationsvariable vor dem Build für SSR verfügbar gemacht werden. Für den Einstieg bitte Frankfurt nutzen.

## C. IAM Compute-Rolle – nur das eine Secret freigeben

1. AWS → **IAM → Policies → Create policy → JSON**.
2. Diese Vorlage einsetzen; `<ACCOUNT_ID>` durch deine 12-stellige AWS-Kontonummer ersetzen:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": "secretsmanager:GetSecretValue",
    "Resource": "arn:aws:secretsmanager:eu-central-1:<ACCOUNT_ID>:secret:jarvis-home/config-*"
  }]
}
```

3. Policy z. B. `JarvisHomeSecretRead` nennen.
4. **IAM → Roles → Create role → Custom trust policy**. Trust-Policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {"Service": "amplify.amazonaws.com"},
    "Action": "sts:AssumeRole"
  }]
}
```

5. Policy `JarvisHomeSecretRead` anhängen; Role z. B. `JarvisHomeAmplifyComputeRole` nennen.
6. Diese Rolle in Amplify unter **App settings → IAM roles → Compute role** zuweisen (nicht mit der **Service role** für Build/Logs verwechseln). AWS-Doku: https://docs.aws.amazon.com/amplify/latest/userguide/amplify-SSR-compute-role.html

## D. App mit AWS Amplify hosten

1. AWS Amplify Console: https://console.aws.amazon.com/amplify/
2. **Create new app** → **GitHub** (keine manuelle ZIP-Bereitstellung) → privates Repo `jarvis-home` → Branch `main`.
3. AWS erkennt **Next.js SSR**, die Datei `amplify.yml` regelt den Build. GitHub-Autorisierung bestätigen, wenn nötig.
4. AWS erstellt bei Bedarf eine **Service role** für die Bereitstellung und Logs. Diese ist **nicht** dieselbe wie die Compute-Rolle aus Schritt C.
5. **Save and deploy**. Nach erfolgreichem Build die angezeigte `amplifyapp.com`-URL öffnen.
6. **App settings → IAM roles → Compute role** muss `JarvisHomeAmplifyComputeRole` sein. Falls die Rolle erst nach dem Deployment zugewiesen wurde, Seite neu laden und ggf. einen neuen Deploy starten.
7. Mit `APP_PASSWORD` anmelden, die vorhandenen Artikel abrufen und Hinzufügen/Abhaken/Löschen testen.

**Warum kein ZIP direkt in Amplify?** AWS unterstützt bei Next.js mit Serverfunktionen/SSR kein manuelles ZIP-Deployment. Siehe https://docs.aws.amazon.com/amplify/latest/userguide/manual-deploys.html

## E. Auf den iPhones verwenden

Auf jedem iPhone in Safari die Amplify-Webadresse öffnen → **Teilen** → **Zum Home-Bildschirm**. Es ist eine Web-App, kein App-Store-Download. Internet wird benötigt. Beide Benutzer sehen die gleichen Artikel.

## Sicherheit & Grenzen

- Die App verwendet **ein gemeinsames Familienpasswort**; es gibt aktuell **keine individuelle Benutzerverwaltung, Login-Rate-Limits, WebAuthn oder verpflichtende MFA**. Für den öffentlichen Internetbetrieb starke, einzigartige Passwörter verwenden und vorzugsweise einen AWS-WAF-Rate-Limit-Schutz oder später Cognito hinzufügen.
- AWS Amplify Hosting SSR, Secrets Manager und eventuell weitere AWS-Dienste können Gebühren verursachen. Kosten in AWS Billing kontrollieren.
- In AWS Secrets Manager lassen sich die Werte erneuern. Die App cached das Secret maximal fünf Minuten; aktualisierte Werte werden danach übernommen.
- Der n8n-Webhook muss `POST` für Update/Delete nutzen und die Spalte `id` korrekt filtern. Wenn n8n bei einer Aktion HTTP 200 antwortet, zeigt die Website durch erneutes Laden den tatsächlichen Zustand.
- Dies ist eine **erste private Familienversion**, nicht sicherheitsgeprüfte kommerzielle Software. Vor Produktiveinsatz alle Aktionen und Anmeldungen testen.
- Kein echter Push-Sync: Aktualisierung alle 30 Sekunden, sofern die App offen und im Vordergrund ist.
- Der HERO-Arbeitskalender ist noch nicht Teil dieser Website. Er ist bereits separat in Jarvis/n8n angebunden.

## Lokal testen (optional)

Voraussetzung: Node.js 20 oder 22 und Berechtigung zum Secret bei AWS (z. B. AWS CLI mit einem passenden Profil).

```bash
npm install
npm test
npm run dev
```

Auf `http://localhost:3000` ist die Oberfläche erreichbar. API-Aufrufe benötigen Zugriff auf AWS Secrets Manager. Test-Passwörter niemals ins Repo schreiben.

## Dateien

- `app/route.js`: HTML-Ausgabe mit CSP-Nonce.
- `app/api/`: Anmeldung und Einkaufslisten-API.
- `lib/config.js`: AWS Secrets Manager zur Laufzeit.
- `lib/n8n.js`: geschützte Verbindung zu n8n.
- `lib/template.js`: deine bisherige Jarvis-Home-Oberfläche.
- `public/`: Manifest & Icon für den iPhone-Home-Bildschirm.
- `amplify.yml`: Build-Definition.

AWS-Hilfen:
- https://docs.aws.amazon.com/amplify/latest/userguide/getting-started-next.html
- https://docs.aws.amazon.com/amplify/latest/userguide/amplify-SSR-compute-role.html
- https://docs.aws.amazon.com/amplify/latest/userguide/server-side-rendering-amplify.html

## Korrigierte Next.js-Struktur

`app/page.js` leitet nach `/home` weiter. Die HTML-Oberfläche wird von `app/home/route.js` ausgeliefert. `app/layout.js` ist das Root-Layout; die API-Routen verbleiben unverändert unter `app/api/...`. Alle Unterordner beim Upload unbedingt erhalten!
