<?php
// =========================================================
// api/programari.php - programările (CRUD)
//   GET            → administrator: toate programările; client: doar ale lui
//   POST           → creează o programare (oricine; legată de cont dacă e client conectat)
//   PUT    ?id=N   → schimbă statusul { status }
//                    administrator: orice status; client: doar „Anulată”, pentru programările lui „Noi”
//   DELETE ?id=N   → șterge programarea (doar administrator)
// =========================================================
require __DIR__ . '/config.php';

const STATUSURI = ['Nouă', 'Confirmată', 'Finalizată', 'Anulată'];

switch (metoda()) {

    // ---------- READ ----------
    case 'GET':
        $u = utilizator();
        if (!$u) eroare('Trebuie să fii conectat.', 401);
        if ($u['rol'] === 'admin') {
            $st = db()->query('SELECT * FROM programari ORDER BY creat DESC, id DESC');
        } else {
            $st = db()->prepare('SELECT * FROM programari WHERE utilizator_id = ? ORDER BY creat DESC, id DESC');
            $st->execute([$u['id']]);
        }
        raspuns($st->fetchAll());

    // ---------- CREATE ----------
    case 'POST':
        $date = corp();
        $nume = text($date, 'nume');
        $prenume = text($date, 'prenume');
        $telefon = text($date, 'telefon');
        $solicitare = text($date, 'solicitare');
        $cuvinte = $solicitare === '' ? 0 : count(preg_split('/\s+/u', $solicitare));

        verifica([
            'nume' => valideaza_nume($nume, 'numele'),
            'prenume' => valideaza_nume($prenume, 'prenumele'),
            'telefon' => valideaza_telefon($telefon),
            'solicitare' => $cuvinte === 0 ? 'Descrie pe scurt problema sau serviciul dorit.'
                : ($cuvinte < 3 ? 'Te rugăm să scrii cel puțin 3 cuvinte.'
                : ($cuvinte > 300 ? "Ai scris $cuvinte cuvinte. Limita este de 300." : '')),
            'acord' => empty($date['acord']) ? 'Trebuie să fii de acord pentru a putea fi contactat.' : '',
        ]);

        // client conectat: legăm programarea de contul lui și (opțional) de una dintre mașinile lui
        $u = utilizator();
        $utilizatorId = null;
        $masinaId = null;
        $masinaText = '';
        if ($u && $u['rol'] === 'client') {
            $utilizatorId = $u['id'];
            if (!empty($date['masina_id'])) {
                $st = db()->prepare('SELECT * FROM masini WHERE id = ? AND utilizator_id = ?');
                $st->execute([(int) $date['masina_id'], $u['id']]);
                $m = $st->fetch();
                if ($m) {
                    $masinaId = $m['id'];
                    $masinaText = "{$m['marca']} {$m['model']} ({$m['nr']})";
                }
            }
        }

        $st = db()->prepare('INSERT INTO programari (utilizator_id, masina_id, nume, prenume, telefon, masina, solicitare, status, creat)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $st->execute([$utilizatorId, $masinaId, $nume, $prenume, $telefon, $masinaText, $solicitare, 'Nouă', acum()]);
        raspuns(['id' => (int) db()->lastInsertId(), 'legata_de_cont' => $utilizatorId !== null], 201);

    // ---------- UPDATE (statusul) ----------
    case 'PUT':
        $u = utilizator();
        if (!$u) eroare('Trebuie să fii conectat.', 401);
        $id = id_din_adresa();
        $status = text(corp(), 'status');
        if (!in_array($status, STATUSURI, true)) eroare('Status invalid.', 422);

        $st = db()->prepare('SELECT * FROM programari WHERE id = ?');
        $st->execute([$id]);
        $p = $st->fetch();
        if (!$p) eroare('Programarea nu există.', 404);

        if ($u['rol'] === 'client') {
            // clientul își poate anula doar propriile programări, cât timp sunt „Noi”
            if ((int) $p['utilizator_id'] !== (int) $u['id']) eroare('Nu ai acces la această programare.', 403);
            if ($status !== 'Anulată' || $p['status'] !== 'Nouă') eroare('Poți anula doar programările cu statusul „Nouă”.', 403);
        }

        db()->prepare('UPDATE programari SET status = ? WHERE id = ?')->execute([$status, $id]);
        raspuns(['ok' => true]);

    // ---------- DELETE ----------
    case 'DELETE':
        cere_rol('admin');
        $st = db()->prepare('DELETE FROM programari WHERE id = ?');
        $st->execute([id_din_adresa()]);
        if ($st->rowCount() === 0) eroare('Programarea nu există.', 404);
        raspuns(['ok' => true]);
}

eroare('Metodă nepermisă.', 405);
