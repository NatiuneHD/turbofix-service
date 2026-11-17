<?php
// =========================================================
// api/auth.php - conturi și autentificare
//   GET  auth.php?actiune=eu            → cine este conectat (sau null)
//   POST auth.php?actiune=logare        → { email, parola }
//   POST auth.php?actiune=inregistrare  → { nume, prenume, email, telefon, parola }
//   POST auth.php?actiune=iesire        → deconectare
// Parolele se verifică cu password_verify (hash bcrypt din baza de date).
// =========================================================
require __DIR__ . '/config.php';

const MAX_INCERCARI = 5;
const BLOCARE_SECUNDE = 30;

$actiune = $_GET['actiune'] ?? '';

// ---------- cine este conectat ----------
if ($actiune === 'eu' && metoda() === 'GET') {
    raspuns(['utilizator' => utilizator()]);
}

if (metoda() !== 'POST') eroare('Metodă nepermisă.', 405);
$date = corp();

// ---------- logare ----------
if ($actiune === 'logare') {
    // protecție la încercări repetate (ținută în sesiune)
    $blocatPana = $_SESSION['blocat_pana'] ?? 0;
    if ($blocatPana > time()) {
        $sec = $blocatPana - time();
        eroare("Prea multe încercări greșite. Încearcă din nou peste $sec " . ($sec >= 20 ? 'de ' : '') . 'secunde.', 429);
    }

    $email = mb_strtolower(text($date, 'email'));
    $parola = (string) ($date['parola'] ?? '');
    verifica(['email' => valideaza_email($email), 'parola' => $parola === '' ? 'Completează parola.' : '']);

    $st = db()->prepare('SELECT * FROM utilizatori WHERE email = ?');
    $st->execute([$email]);
    $u = $st->fetch();

    if (!$u || !password_verify($parola, $u['parola'])) {
        $_SESSION['incercari'] = ($_SESSION['incercari'] ?? 0) + 1;
        if ($_SESSION['incercari'] >= MAX_INCERCARI) {
            $_SESSION['incercari'] = 0;
            $_SESSION['blocat_pana'] = time() + BLOCARE_SECUNDE;
            eroare('Email sau parolă greșită. Formularul este blocat ' . BLOCARE_SECUNDE . ' de secunde.', 401);
        }
        $ramase = MAX_INCERCARI - $_SESSION['incercari'];
        eroare("Email sau parolă greșită. Mai ai $ramase " . ($ramase === 1 ? 'încercare' : 'încercări') . '.', 401);
    }

    session_regenerate_id(true);            // id nou de sesiune după logare (securitate)
    $_SESSION['utilizator_id'] = $u['id'];
    unset($_SESSION['incercari'], $_SESSION['blocat_pana']);
    raspuns(['utilizator' => utilizator()]);
}

// ---------- creare cont de client ----------
if ($actiune === 'inregistrare') {
    $nume = text($date, 'nume');
    $prenume = text($date, 'prenume');
    $email = mb_strtolower(text($date, 'email'));
    $telefon = text($date, 'telefon');
    $parola = (string) ($date['parola'] ?? '');

    verifica([
        'nume' => valideaza_nume($nume, 'numele'),
        'prenume' => valideaza_nume($prenume, 'prenumele'),
        'email' => valideaza_email($email),
        'telefon' => valideaza_telefon($telefon),
        'parola' => valideaza_parola($parola),
    ]);

    $st = db()->prepare('SELECT COUNT(*) FROM utilizatori WHERE email = ?');
    $st->execute([$email]);
    if ($st->fetchColumn() > 0) eroare('Există deja un cont cu acest email.', 409, ['email' => 'Există deja un cont cu acest email.']);

    $st = db()->prepare('INSERT INTO utilizatori (nume, prenume, email, telefon, parola, rol, creat) VALUES (?, ?, ?, ?, ?, ?, ?)');
    $st->execute([$nume, $prenume, $email, $telefon, password_hash($parola, PASSWORD_DEFAULT), 'client', acum()]);

    session_regenerate_id(true);
    $_SESSION['utilizator_id'] = (int) db()->lastInsertId();
    raspuns(['utilizator' => utilizator()], 201);
}

// ---------- deconectare ----------
if ($actiune === 'iesire') {
    $_SESSION = [];
    session_destroy();
    raspuns(['ok' => true]);
}

eroare('Acțiune necunoscută.', 404);
