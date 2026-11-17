<?php
// =========================================================
// TurboFix Service - configurare comună pentru API
// Conexiunea la baza de date (PDO), sesiunea și funcții ajutătoare.
// Toate fișierele din api/ încep cu: require __DIR__ . '/config.php';
// =========================================================

// ---------- Datele de conectare la MySQL (implicite în XAMPP) ----------
const DB_HOST = 'localhost';
const DB_NUME = 'turbofix';
const DB_USER = 'root';
const DB_PAROLA = '';          // în XAMPP, utilizatorul root nu are parolă

header('Content-Type: application/json; charset=utf-8');
session_start();

// ---------- Conexiunea PDO ----------
function db(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;

    try {
        $sqlite = getenv('TURBOFIX_SQLITE');   // folosit doar la testele automate
        if ($sqlite) {
            $pdo = new PDO('sqlite:' . $sqlite);
            $pdo->exec('PRAGMA foreign_keys = ON');
        } else {
            $pdo = new PDO('mysql:host=' . DB_HOST . ';dbname=' . DB_NUME . ';charset=utf8mb4', DB_USER, DB_PAROLA);
        }
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);          // erorile SQL devin excepții
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);    // rânduri ca tablouri asociative
        $pdo->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
    } catch (PDOException $e) {
        eroare('Nu mă pot conecta la baza de date. Verifică dacă MySQL este pornit în XAMPP și dacă baza „turbofix” a fost importată.', 500);
    }
    return $pdo;
}

// ---------- Răspunsuri JSON ----------
function raspuns($date, int $cod = 200): void {
    http_response_code($cod);
    echo json_encode($date, JSON_UNESCAPED_UNICODE);
    exit;
}

function eroare(string $mesaj, int $cod = 400, array $campuri = []): void {
    raspuns(['eroare' => $mesaj, 'campuri' => (object) $campuri], $cod);
}

// datele trimise de pagină (JSON) ca tablou asociativ
function corp(): array {
    $date = json_decode(file_get_contents('php://input'), true);
    return is_array($date) ? $date : [];
}

// text „curățat”: fără spații la capete
function text(array $date, string $cheie): string {
    return trim((string) ($date[$cheie] ?? ''));
}

function metoda(): string {
    return $_SERVER['REQUEST_METHOD'];
}

function id_din_adresa(): int {
    return (int) ($_GET['id'] ?? 0);
}

// ---------- Utilizatorul conectat ----------
function utilizator(): ?array {
    if (empty($_SESSION['utilizator_id'])) return null;
    $st = db()->prepare('SELECT id, nume, prenume, email, telefon, rol, creat FROM utilizatori WHERE id = ?');
    $st->execute([$_SESSION['utilizator_id']]);
    $u = $st->fetch();
    return $u ?: null;
}

// oprește cererea dacă utilizatorul nu are rolul cerut
function cere_rol(string $rol): array {
    $u = utilizator();
    if (!$u) eroare('Trebuie să fii conectat.', 401);
    if ($u['rol'] !== $rol) eroare('Nu ai acces la această operație.', 403);
    return $u;
}

// ---------- Reguli de validare (aceleași ca în JavaScript) ----------
function valideaza_nume(string $v, string $eticheta): string {
    if ($v === '') return "Completează $eticheta.";
    if (mb_strlen($v) < 2) return ucfirst($eticheta) . ' trebuie să aibă cel puțin 2 litere.';
    if (!preg_match('/^[\p{L}\s-]+$/u', $v)) return ucfirst($eticheta) . ' poate conține doar litere, spații și cratimă.';
    return '';
}

function valideaza_telefon(string $v): string {
    $cifre = preg_replace('/[\s.-]/', '', $v);
    if ($cifre === '') return 'Completează numărul de telefon.';
    if (!preg_match('/^(\+40|0040|0)[237]\d{8}$/', $cifre)) return 'Introdu un număr valid, de exemplu 0712 345 678.';
    return '';
}

function valideaza_email(string $v): string {
    if ($v === '') return 'Completează adresa de email.';
    if (!filter_var($v, FILTER_VALIDATE_EMAIL)) return 'Adresa de email nu este validă.';
    return '';
}

function valideaza_parola(string $v): string {
    if ($v === '') return 'Alege o parolă.';
    if (mb_strlen($v) < 8) return 'Parola trebuie să aibă cel puțin 8 caractere.';
    if (!preg_match('/[A-Z]/', $v) || !preg_match('/[a-z]/', $v) || !preg_match('/\d/', $v)) {
        return 'Parola trebuie să conțină o literă mare, o literă mică și o cifră.';
    }
    return '';
}

// păstrează doar erorile completate; dacă există, oprește cererea cu 422
function verifica(array $erori): void {
    $erori = array_filter($erori);
    if ($erori) eroare('Datele trimise nu sunt valide.', 422, $erori);
}

function acum(): string {
    return date('Y-m-d H:i:s');
}

// orice excepție neprevăzută devine un răspuns JSON curat
set_exception_handler(function (Throwable $e) {
    http_response_code(500);
    echo json_encode(['eroare' => 'Eroare pe server: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
});

date_default_timezone_set('Europe/Bucharest');
