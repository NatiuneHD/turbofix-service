<?php
// =========================================================
// api/utilizatori.php - conturile
//   GET                    → administrator: lista clienților (cu mașini și număr de programări)
//   DELETE ?id=N           → administrator: șterge un client
//   PUT    ?actiune=profil → client: își modifică datele { nume, prenume, telefon, parola_noua? }
//   DELETE ?actiune=cont   → client: își șterge propriul cont
// =========================================================
require __DIR__ . '/config.php';

$actiune = $_GET['actiune'] ?? '';

// ---------- client: profilul propriu ----------
if ($actiune === 'profil' && metoda() === 'PUT') {
    $u = cere_rol('client');
    $date = corp();
    $nume = text($date, 'nume');
    $prenume = text($date, 'prenume');
    $telefon = text($date, 'telefon');
    $parolaNoua = (string) ($date['parola_noua'] ?? '');

    verifica([
        'nume' => valideaza_nume($nume, 'numele'),
        'prenume' => valideaza_nume($prenume, 'prenumele'),
        'telefon' => valideaza_telefon($telefon),
        'parola_noua' => $parolaNoua === '' ? '' : valideaza_parola($parolaNoua),
    ]);

    db()->prepare('UPDATE utilizatori SET nume = ?, prenume = ?, telefon = ? WHERE id = ?')
        ->execute([$nume, $prenume, $telefon, $u['id']]);
    if ($parolaNoua !== '') {
        db()->prepare('UPDATE utilizatori SET parola = ? WHERE id = ?')
            ->execute([password_hash($parolaNoua, PASSWORD_DEFAULT), $u['id']]);
    }
    raspuns(['utilizator' => utilizator()]);
}

// ---------- client: ștergerea propriului cont ----------
if ($actiune === 'cont' && metoda() === 'DELETE') {
    $u = cere_rol('client');
    // mașinile se șterg automat (ON DELETE CASCADE); programările și recenziile rămân (SET NULL)
    db()->prepare('DELETE FROM utilizatori WHERE id = ?')->execute([$u['id']]);
    $_SESSION = [];
    session_destroy();
    raspuns(['ok' => true]);
}

// ---------- administrator ----------
cere_rol('admin');

if (metoda() === 'GET') {
    $clienti = db()->query("SELECT id, nume, prenume, email, telefon, creat,
                                   (SELECT COUNT(*) FROM programari p WHERE p.utilizator_id = u.id) AS programari
                            FROM utilizatori u WHERE rol = 'client' ORDER BY creat DESC")->fetchAll();
    $masini = db()->query('SELECT utilizator_id, marca, model, nr FROM masini ORDER BY id')->fetchAll();
    foreach ($clienti as &$c) {
        $c['programari'] = (int) $c['programari'];
        $c['masini'] = array_values(array_map(
            fn($m) => "{$m['marca']} {$m['model']} ({$m['nr']})",
            array_filter($masini, fn($m) => (int) $m['utilizator_id'] === (int) $c['id'])
        ));
    }
    raspuns($clienti);
}

if (metoda() === 'DELETE') {
    $st = db()->prepare("DELETE FROM utilizatori WHERE id = ? AND rol = 'client'");
    $st->execute([id_din_adresa()]);
    if ($st->rowCount() === 0) eroare('Clientul nu există.', 404);
    raspuns(['ok' => true]);
}

eroare('Metodă nepermisă.', 405);
