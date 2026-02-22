-- German Email Templates for MedMeister
-- Based on the "About MedMeister" content and messaging
-- Run these in your Supabase SQL Editor

-- 1. EMAIL VERIFICATION TEMPLATE (Welcome Email)
UPDATE auth.config
SET value = jsonb_build_object(
  'subject', '🎉 Willkommen bei MedMeister - Effektive Prüfungsvorbereitung, die wirklich funktioniert!',
  'body_html', '<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Willkommen bei MedMeister</title>
    <style>
        body { margin: 0; padding: 0; font-family: "Segoe UI", sans-serif; background: #f8f9fa; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #B87E70 0%, #E2827F 100%); padding: 40px 30px; text-align: center; color: white; }
        .logo { font-size: 32px; font-weight: bold; margin-bottom: 10px; }
        .tagline { font-size: 16px; opacity: 0.95; margin: 0; }
        .content { padding: 40px 30px; }
        .welcome-title { font-size: 28px; font-weight: bold; color: #1F2937; margin-bottom: 20px; text-align: center; }
        .welcome-text { font-size: 16px; color: #374151; margin-bottom: 25px; text-align: center; line-height: 1.6; }
        .problem-section { background: #FEF2F2; border-left: 4px solid #EF4444; padding: 20px; margin: 25px 0; border-radius: 8px; }
        .solution-section { background: #F0FDF4; border-left: 4px solid #22C55E; padding: 20px; margin: 25px 0; border-radius: 8px; }
        .feature-list { margin: 20px 0; }
        .feature-item { display: flex; align-items: flex-start; margin: 12px 0; }
        .feature-icon { color: #B87E70; font-weight: bold; margin-right: 10px; min-width: 20px; }
        .feature-text { font-size: 15px; color: #374151; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #B87E70 0%, #E2827F 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; text-align: center; margin: 25px auto; display: block; max-width: 300px; box-shadow: 0 4px 15px rgba(184,126,112,0.3); }
        .price-highlight { background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center; }
        .price-text { color: #92400E; font-size: 16px; font-weight: 600; margin: 0; }
        .footer { background: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB; }
        .footer-text { font-size: 14px; color: #6B7280; margin: 0; }
        @media (max-width: 600px) { .container { margin: 10px; } .header, .content, .footer { padding: 25px 20px; } }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🩺 MedMeister 📚</div>
            <p class="tagline">Effektive Prüfungsvorbereitung, die wirklich funktioniert</p>
        </div>

        <div class="content">
            <h1 class="welcome-title">🎉 Willkommen bei MedMeister!</h1>

            <p class="welcome-text">
                Herzlichen Glückwunsch! Sie haben sich für die <strong>effektivste Prüfungsvorbereitung</strong> entschieden,
                die es gibt. Keine überflüssigen Details, keine Zeitverschwendung – nur das, was Sie wirklich brauchen.
            </p>

            <div class="problem-section">
                <h3 style="color: #DC2626; margin-top: 0;">🔴 Schluss mit ineffektiver Vorbereitung</h3>
                <p style="margin: 0; color: #374151;">
                    Tausende Euro für Kurse, die Sie mit Informationen überschütten? Telegram-Gruppen ohne echtes Feedback?
                    <strong>Das ist Vergangenheit!</strong>
                </p>
            </div>

            <div class="solution-section">
                <h3 style="color: #059669; margin-top: 0;">✅ Ihre Lösung: Fokussiertes Lernen + Realistische Simulation</h3>
                <div class="feature-list">
                    <div class="feature-item">
                        <span class="feature-icon">🎯</span>
                        <span class="feature-text"><strong>Prüfungsrelevante Inhalte:</strong> Nur das, was wirklich in der Prüfung vorkommt</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">🩺</span>
                        <span class="feature-text"><strong>Professionelle KP & FSP Simulationen:</strong> Realistische Prüfungsvorbereitung</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">📊</span>
                        <span class="feature-text"><strong>Detaillierte Auswertungen:</strong> Ihre Stärken, Schwächen & persönlicher Lernplan</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">🚀</span>
                        <span class="feature-text"><strong>Maximaler Fortschritt:</strong> Konkrete Empfehlungen für Ihren Erfolg</span>
                    </div>
                </div>
            </div>

            <div class="price-highlight">
                <p class="price-text">🟠 Statt Tausende Euro: Ab nur 1,50 € pro Tag!</p>
                <p style="color: #6B7280; font-size: 14px; margin: 8px 0 0 0;">Das ist weniger als ein Kaffee – für dramatisch verbesserte Prüfungschancen</p>
            </div>

            <p style="text-align: center; font-size: 16px; color: #374151; margin: 25px 0;">
                Bestätigen Sie jetzt Ihre E-Mail und starten Sie Ihre <strong>erfolgreiche Prüfungsvorbereitung:</strong>
            </p>

            <a href="{{ .ConfirmationURL }}" class="cta-button">
                ✅ E-Mail bestätigen & Kostenlos starten
            </a>

            <p style="text-align: center; font-size: 14px; color: #6B7280; margin-top: 30px;">
                Dieser Link läuft in <strong>24 Stunden</strong> ab.<br>
                Falls der Button nicht funktioniert: <span style="word-break: break-all; color: #B87E70;">{{ .ConfirmationURL }}</span>
            </p>
        </div>

        <div class="footer">
            <p class="footer-text">
                <strong>MedMeister</strong> - Effektive Prüfungsvorbereitung, die wirklich funktioniert<br>
                Haben Sie Fragen? Kontaktieren Sie uns jederzeit über die App.
            </p>
        </div>
    </div>
</body>
</html>'
)
WHERE parameter = 'MAILER_TEMPLATES_CONFIRMATION';

-- 2. PASSWORD RESET TEMPLATE
UPDATE auth.config
SET value = jsonb_build_object(
  'subject', '🔐 Passwort zurücksetzen - MedMeister',
  'body_html', '<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Passwort zurücksetzen - MedMeister</title>
    <style>
        body { margin: 0; padding: 0; font-family: "Segoe UI", sans-serif; background: #f8f9fa; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #B87E70 0%, #E2827F 100%); padding: 40px 30px; text-align: center; color: white; }
        .logo { font-size: 32px; font-weight: bold; margin-bottom: 10px; }
        .content { padding: 40px 30px; }
        .title { font-size: 24px; font-weight: bold; color: #1F2937; margin-bottom: 20px; text-align: center; }
        .text { font-size: 16px; color: #374151; margin-bottom: 20px; text-align: center; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #B87E70 0%, #E2827F 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; text-align: center; margin: 25px auto; display: block; max-width: 280px; box-shadow: 0 4px 15px rgba(184,126,112,0.3); }
        .warning { background: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 20px; margin: 25px 0; text-align: center; }
        .warning-text { color: #92400E; font-size: 14px; margin: 0; }
        .footer { background: #F9FAFB; padding: 30px; text-align: center; border-top: 1px solid #E5E7EB; }
        .footer-text { font-size: 14px; color: #6B7280; margin: 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🔐 MedMeister</div>
            <p style="margin: 0; opacity: 0.9;">Passwort zurücksetzen</p>
        </div>

        <div class="content">
            <h1 class="title">Passwort zurücksetzen</h1>

            <p class="text">
                Sie haben eine Anfrage zum Zurücksetzen Ihres Passworts für Ihr MedMeister Konto gestellt.
                Klicken Sie auf den Button unten, um ein neues, sicheres Passwort zu erstellen:
            </p>

            <a href="{{ .ActionLink }}" class="cta-button">
                🔑 Neues Passwort erstellen
            </a>

            <div class="warning">
                <p class="warning-text">
                    ⏰ <strong>Wichtiger Hinweis:</strong> Dieser Link läuft in 1 Stunde ab.<br>
                    Falls Sie diese Anfrage nicht gestellt haben, ignorieren Sie diese E-Mail.
                </p>
            </div>

            <p style="text-align: center; font-size: 14px; color: #6B7280; margin-top: 30px;">
                Falls der Button nicht funktioniert, kopieren Sie diesen Link:<br>
                <span style="word-break: break-all; color: #B87E70;">{{ .ActionLink }}</span>
            </p>
        </div>

        <div class="footer">
            <p class="footer-text">
                <strong>MedMeister</strong> - Effektive Prüfungsvorbereitung, die wirklich funktioniert<br>
                Bei Fragen kontaktieren Sie uns über die App.
            </p>
        </div>
    </div>
</body>
</html>'
)
WHERE parameter = 'MAILER_TEMPLATES_RECOVERY';

-- Verify the updates
SELECT parameter,
       CASE
         WHEN value::text LIKE '%subject%' THEN 'Updated successfully'
         ELSE 'Not updated'
       END as status
FROM auth.config
WHERE parameter IN ('MAILER_TEMPLATES_CONFIRMATION', 'MAILER_TEMPLATES_RECOVERY');