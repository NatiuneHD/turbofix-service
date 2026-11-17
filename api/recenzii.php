<?php
// =========================================================
// api/recenzii.php - recenziile
//   GET            → toate recenziile (public); fiecare are „proprie” = poate fi ștearsă de cel conectat
//   POST           → recenzie nouă { nume, masina, serviciu, nota, text }
//   DELETE ?id=N   → administratorul șterge orice recenzie; clientul doar recenziile lui
// =========================================================
require __DIR__ . '/config.php';

const SERVICII = [
    'Revizii tehnice', 'Schimb ulei și filtre', 'Service climatizare', 'Diagnoză computerizată',
    'Service ITP', 'Schimb anvelope și jante', 'Geometrie roți', 'Vopsitorie',
];

switch (metoda()) {

    // ---------- READ ----------
    case 'GET':
        $u = utilizator();
        $randuri = db()->query('SELECT id, utilizator_id, nume, masina, serviciu, nota, text, verificat, creat
                                FROM recenzii ORDER BY creat DESC, id DESC')->fetchAll();
        foreach ($randuri as &$r) {
            $r['nota'] = (int) $r['nota'];
            $r['verificat'] = (bool) $r['verificat'];
            $r['proprie'] = $u && ($u['rol'] === 'admin' || (int) $r['utilizator_id'] === (int) $u['id']);
            unset($r['utilizator_id']);           // nu expunem id-urile utilizatorilor
        }
        raspuns($randuri);

    // ---------- CREATE ----------
    case 'POST':
        $date = corp();
        $nume = text($date, 'nume');
        $masina = text($date, 'masina');
        $serviciu = text($date, 'serviciu');
        $nota = (int) ($date['nota'] ?? 0);
        $textRec = text($date, 'text');
        $lung = mb_strlen($textRec);

        verifica([
            'nume' => $nume === '' ? 'Completează numele.' : (mb_strlen($nume) < 2 ? 'Numele trebuie să aibă cel puțin 2 caractere.' : ''),
            'serviciu' => in_array($serviciu, SERVICII, true) ? '' : 'Alege serviciul.',
            'nota' => $nota >= 1 && $nota <= 5 ? '' : 'Alege o notă de la 1 la 5 stele.',
            'text' => $lung < 10 ? 'Scrie cel puțin 10 caractere.' : ($lung > 500 ? "Recenzia are $lung caractere. Limita este 500." : ''),
        ]);

        // „Client verificat”: autor cu cont și cel puțin o programare „Finalizată”
        $u = utilizator();
        $utilizatorId = null;
        $verificat = 0;
        if ($u && $u['rol'] === 'client') {
            $utilizatorId = $u['id'];
            $st = db()->prepare("SELECT COUNT(*) FROM programari WHERE utilizator_id = ? AND status = 'Finalizată'");
            $st->execute([$u['id']]);
            $verificat = $st->fetchColumn() > 0 ? 1 : 0;
        }

        $st = db()->prepare('INSERT INTO recenzii (utilizator_id, nume, masina, serviciu, nota, text, verificat, creat)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $st->execute([$utilizatorId, $nume, $masina, $serviciu, $nota, $textRec, $verificat, acum()]);
        raspuns(['id' => (int) db()->lastInsertId(), 'verificat' => (bool) $verificat], 201);

    // ---------- DELETE ----------
    case 'DELETE':
        $u = utilizator();
        if (!$u) eroare('Trebuie să fii conectat.', 401);
        $id = id_din_adresa();
        if ($u['rol'] === 'admin') {
            $st = db()->prepare('DELETE FROM recenzii WHERE id = ?');
            $st->execute([$id]);
        } else {
            $st = db()->prepare('DELETE FROM recenzii WHERE id = ? AND utilizator_id = ?');
            $st->execute([$id, $u['id']]);
        }
        if ($st->rowCount() === 0) eroare('Recenzia nu există sau nu poate fi ștearsă.', 404);
        raspuns(['ok' => true]);
}

eroare('Metodă nepermisă.', 405);
