<?php
// =========================================================
// api/masini.php - mașinile clientului conectat (CRUD complet)
//   GET            → mașinile mele
//   POST           → adaugă { marca, model, an, nr }
//   PUT    ?id=N   → modifică
//   DELETE ?id=N   → șterge
// =========================================================
require __DIR__ . '/config.php';

$client = cere_rol('client');

// număr de înmatriculare românesc, ex. „TM 12 ABC”, „B 123 ABC” → forma standard cu spații
function normalizeaza_nr(string $v): string {
    $fara = strtoupper(preg_replace('/[\s-]+/', '', $v));
    if (preg_match('/^([A-Z]{1,2})(\d{2,3})([A-Z]{3})$/', $fara, $m)) return "$m[1] $m[2] $m[3]";
    return '';
}

function valideaza_masina(array $date, int $idExclus = 0): array {
    $marca = text($date, 'marca');
    $model = text($date, 'model');
    $an = (int) ($date['an'] ?? 0);
    $nr = normalizeaza_nr(text($date, 'nr'));
    $anMax = (int) date('Y') + 1;

    $erori = [
        'marca' => mb_strlen($marca) < 2 ? 'Completează marca (ex.: Dacia).' : '',
        'model' => $model === '' ? 'Completează modelul (ex.: Logan).' : '',
        'an' => $an < 1950 || $an > $anMax ? "Anul trebuie să fie între 1950 și $anMax." : '',
        'nr' => text($date, 'nr') === '' ? 'Completează numărul de înmatriculare.'
              : ($nr === '' ? 'Format invalid. Exemplu: TM 12 ABC sau B 123 ABC.' : ''),
    ];
    if (!$erori['nr']) {
        // numărul de înmatriculare este unic în toată baza de date
        $st = db()->prepare('SELECT COUNT(*) FROM masini WHERE nr = ? AND id <> ?');
        $st->execute([$nr, $idExclus]);
        if ($st->fetchColumn() > 0) $erori['nr'] = 'Există deja o mașină cu acest număr.';
    }
    verifica($erori);
    return [$marca, $model, $an, $nr];
}

// verifică faptul că mașina există și aparține clientului
function masina_mea(int $id, int $clientId): array {
    $st = db()->prepare('SELECT * FROM masini WHERE id = ? AND utilizator_id = ?');
    $st->execute([$id, $clientId]);
    $m = $st->fetch();
    if (!$m) eroare('Mașina nu există.', 404);
    return $m;
}

switch (metoda()) {
    case 'GET':      // READ (cu numărul de programări al fiecărei mașini)
        $st = db()->prepare('SELECT m.*, (SELECT COUNT(*) FROM programari p WHERE p.masina_id = m.id) AS programari
                             FROM masini m WHERE m.utilizator_id = ? ORDER BY m.id DESC');
        $st->execute([$client['id']]);
        raspuns($st->fetchAll());

    case 'POST':     // CREATE
        [$marca, $model, $an, $nr] = valideaza_masina(corp());
        $st = db()->prepare('INSERT INTO masini (utilizator_id, marca, model, an, nr) VALUES (?, ?, ?, ?, ?)');
        $st->execute([$client['id'], $marca, $model, $an, $nr]);
        raspuns(['id' => (int) db()->lastInsertId()], 201);

    case 'PUT':      // UPDATE
        $id = id_din_adresa();
        masina_mea($id, $client['id']);
        [$marca, $model, $an, $nr] = valideaza_masina(corp(), $id);
        db()->prepare('UPDATE masini SET marca = ?, model = ?, an = ?, nr = ? WHERE id = ?')
            ->execute([$marca, $model, $an, $nr, $id]);
        raspuns(['ok' => true]);

    case 'DELETE':   // DELETE (programările rămân, cu masina_id = NULL)
        $id = id_din_adresa();
        masina_mea($id, $client['id']);
        db()->prepare('DELETE FROM masini WHERE id = ?')->execute([$id]);
        raspuns(['ok' => true]);
}

eroare('Metodă nepermisă.', 405);
