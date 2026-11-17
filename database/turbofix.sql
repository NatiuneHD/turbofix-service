-- =========================================================
-- TurboFix Service - baza de date (MySQL / MariaDB, XAMPP)
-- Import: phpMyAdmin → tab „Import” → alegi acest fișier → „Import”.
-- Scriptul creează baza „turbofix”, cele 4 tabele și datele de pornire.
-- =========================================================

DROP DATABASE IF EXISTS turbofix;
CREATE DATABASE turbofix CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE turbofix;

-- ---------------------------------------------------------
-- 1. utilizatori: conturile de client și contul de administrator
-- ---------------------------------------------------------
CREATE TABLE utilizatori (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nume      VARCHAR(60)  NOT NULL,
  prenume   VARCHAR(60)  NOT NULL,
  email     VARCHAR(120) NOT NULL UNIQUE,
  telefon   VARCHAR(20)  NOT NULL,
  parola    VARCHAR(255) NOT NULL,                 -- hash bcrypt (password_hash), niciodată parola în clar
  rol       ENUM('client', 'admin') NOT NULL DEFAULT 'client',
  creat     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 2. masini: mașinile clienților
--    Relație 1:N: un utilizator are mai multe mașini.
--    Dacă se șterge utilizatorul, i se șterg și mașinile (CASCADE).
-- ---------------------------------------------------------
CREATE TABLE masini (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilizator_id  INT UNSIGNED NOT NULL,
  marca          VARCHAR(40) NOT NULL,
  model          VARCHAR(40) NOT NULL,
  an             SMALLINT UNSIGNED NOT NULL,
  nr             VARCHAR(15) NOT NULL UNIQUE,       -- numărul de înmatriculare, ex. „TM 12 ABC”
  CONSTRAINT fk_masini_utilizator FOREIGN KEY (utilizator_id)
    REFERENCES utilizatori(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 3. programari: cererile de programare și statusul lor
--    Relații 1:N (opționale): un utilizator / o mașină pot avea mai multe programări.
--    Vizitatorii fără cont au utilizator_id = NULL.
--    Dacă se șterge contul sau mașina, programarea rămâne (SET NULL),
--    iar datele de contact și descrierea mașinii sunt păstrate în rând.
-- ---------------------------------------------------------
CREATE TABLE programari (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilizator_id  INT UNSIGNED NULL,
  masina_id      INT UNSIGNED NULL,
  nume           VARCHAR(60)  NOT NULL,
  prenume        VARCHAR(60)  NOT NULL,
  telefon        VARCHAR(20)  NOT NULL,
  masina         VARCHAR(100) NOT NULL DEFAULT '',  -- ex. „Dacia Logan (TM 12 ABC)”
  solicitare     TEXT NOT NULL,
  status         ENUM('Nouă', 'Confirmată', 'Finalizată', 'Anulată') NOT NULL DEFAULT 'Nouă',
  creat          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_programari_utilizator FOREIGN KEY (utilizator_id)
    REFERENCES utilizatori(id) ON DELETE SET NULL,
  CONSTRAINT fk_programari_masina FOREIGN KEY (masina_id)
    REFERENCES masini(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------
-- 4. recenzii: părerile clienților
--    Relație 1:N (opțională): un utilizator poate scrie mai multe recenzii.
--    „verificat” = 1 dacă autorul are cont și cel puțin o programare „Finalizată”.
-- ---------------------------------------------------------
CREATE TABLE recenzii (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  utilizator_id  INT UNSIGNED NULL,
  nume           VARCHAR(60)  NOT NULL,
  masina         VARCHAR(60)  NOT NULL DEFAULT '',
  serviciu       VARCHAR(60)  NOT NULL,
  nota           TINYINT UNSIGNED NOT NULL CHECK (nota BETWEEN 1 AND 5),
  text           TEXT NOT NULL,
  verificat      TINYINT(1) NOT NULL DEFAULT 0,
  creat          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_recenzii_utilizator FOREIGN KEY (utilizator_id)
    REFERENCES utilizatori(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =========================================================
-- Date de pornire
-- =========================================================

-- administratorul: admin.turbofix@gmail.com / !Turbofix2026
-- client demo:     client.demo@gmail.com    / Client2026!
INSERT INTO utilizatori (id, nume, prenume, email, telefon, parola, rol, creat) VALUES
(1, 'Administrator', 'TurboFix', 'admin.turbofix@gmail.com', '0712 345 678',
 '$2y$10$o9CVZndFH71rsqxtuOXUM.hf6CjJVH2beaXkJ/O9RGf9/snXQaTxy', 'admin', '2026-01-10 09:00:00'),
(2, 'Marin', 'Alexandru', 'client.demo@gmail.com', '0766 555 444',
 '$2y$10$P7c6yj5vNVIwsLh00AqYVuWM.b/M9Un7KcfNycbEvL/GAHZnsTtIm', 'client', '2026-10-18 17:20:00');

INSERT INTO masini (id, utilizator_id, marca, model, an, nr) VALUES
(1, 2, 'Volkswagen', 'Golf 7', 2017, 'TM 07 ALX'),
(2, 2, 'Dacia', 'Sandero', 2021, 'TM 21 MRN');

INSERT INTO programari (utilizator_id, masina_id, nume, prenume, telefon, masina, solicitare, status, creat) VALUES
(2, 1, 'Marin', 'Alexandru', '0766 555 444', 'Volkswagen Golf 7 (TM 07 ALX)',
 'Doresc programare pentru: Revizii tehnice.', 'Finalizată', '2026-10-28 10:15:00'),
(2, 2, 'Marin', 'Alexandru', '0766 555 444', 'Dacia Sandero (TM 21 MRN)',
 'Doresc programare pentru: Schimb anvelope și jante. Trecere pe anvelope de iarnă.', 'Confirmată', '2026-11-15 18:40:00'),
(NULL, NULL, 'Popescu', 'Ion', '0722 111 222', '',
 'Doresc programare pentru: Schimb ulei și filtre. Dacia Logan 2016, 140.000 km.', 'Nouă', '2026-11-16 09:05:00'),
(NULL, NULL, 'Ionescu', 'Maria', '0733 222 333', '',
 'Zgomot la frânare pe față, VW Polo.', 'Nouă', '2026-11-16 21:30:00'),
(NULL, NULL, 'Georgescu', 'Andrei', '0744 333 444', '',
 'Doresc programare pentru: Service ITP. Expiră săptămâna viitoare.', 'Confirmată', '2026-11-14 12:00:00');

INSERT INTO recenzii (utilizator_id, nume, masina, serviciu, nota, text, verificat, creat) VALUES
(NULL, 'Andrei M.', 'Dacia Logan', 'Revizii tehnice', 5, 'M-am programat seara din formular și a doua zi la 10 mașina era pe elevator. Deviz clar, fără surprize.', 1, '2026-11-10 10:00:00'),
(NULL, 'Ioana P.', 'VW Golf 7', 'Diagnoză computerizată', 5, 'Mi-au explicat ce era urgent și ce mai putea aștepta. Apreciez că nu au încercat să-mi vândă tot.', 1, '2026-11-04 10:00:00'),
(NULL, 'Sorin T.', 'Skoda Octavia', 'Geometrie roți', 4, 'Geometria făcută rapid și corect, mașina merge drept. Doar coada de la recepție a fost puțin mai lungă.', 0, '2026-10-28 10:00:00'),
(NULL, 'Bianca R.', 'Renault Clio', 'Service climatizare', 5, 'Aerul condiționat nu mai răcea deloc. În o oră era rezolvat, iar mirosul din habitaclu a dispărut după igienizare.', 1, '2026-10-15 10:00:00'),
(NULL, 'Vlad C.', 'BMW Seria 3', 'Schimb ulei și filtre', 5, 'Au folosit exact uleiul recomandat de producător și mi-au arătat filtrele vechi. Corect și rapid.', 1, '2026-10-02 10:00:00'),
(NULL, 'Gabriela N.', 'Ford Focus', 'Service ITP', 4, 'Am trecut ITP-ul din prima. Mi-au semnalat că plăcuțele de frână sunt la limită, fără să insiste să le schimb pe loc.', 0, '2026-09-21 10:00:00'),
(NULL, 'Paul D.', 'Opel Astra', 'Vopsitorie', 5, 'Bara din spate arată ca nouă, nuanța e identică. Au respectat termenul promis.', 1, '2026-09-09 10:00:00'),
(NULL, 'Raluca S.', 'Toyota Yaris', 'Schimb anvelope și jante', 3, 'Treaba făcută bine, dar am așteptat aproape o oră peste ora programată. Sper să fie doar o excepție.', 0, '2026-08-30 10:00:00'),
(2, 'Alexandru M.', 'Volkswagen Golf 7', 'Revizii tehnice', 5, 'Revizia completă la un preț corect. Am primit raportul scris, cu tot ce s-a verificat.', 1, '2026-10-29 19:00:00'),
(NULL, 'Mara I.', 'Fiat 500', 'Diagnoză computerizată', 2, 'Martorul de motor s-a aprins din nou după câteva zile. Au refăcut diagnoza gratuit, dar a durat până s-a rezolvat.', 0, '2026-07-25 10:00:00');
