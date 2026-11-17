# TurboFix Service

Site pentru un service auto multimarcă din Timișoara (fictiv), realizat la disciplina **Programare Multimedia**.

Vizitatorii văd serviciile, echipa și recenziile și trimit cereri de programare. Clienții cu cont își salvează mașinile și urmăresc statusul programărilor. Administratorul gestionează programările, recenziile și clienții și exportă datele în Excel. Datele sunt păstrate într-o bază de date MySQL, accesată printr-un API PHP.

**Repository:** https://github.com/NatiuneHD/turbofix-service

## Pagini

| Pagina | Fișier | Conținut |
|---|---|---|
| Acasă | `index.html` | hero cu telefon animat (conversație client–service), servicii principale, „De ce noi”, recenzii, apel la programare |
| Servicii | `servicii.html` | toate cele 8 servicii, grupate pe categorii, cu preț orientativ și durată |
| Echipa | `echipa.html` | cei 6 membri ai echipei, cu funcție, experiență și specializări |
| Recenzii | `recenzii.html` | nota medie, distribuția notelor, filtre, sortare, formular pentru recenzie nouă |
| Contact | `contact.html` | formular de programare, telefoane, email, adresă, program, hartă |
| Autentificare | `login.html` | tab „Intră în cont” (clienți și administrator) și tab „Creează cont” (clienți), cu validări, „arată parola” și blocare 30 s după 5 încercări greșite |
| Contul meu | `cont.html` | **doar pentru clienți**: programările proprii cu statusul pus de service (pot fi anulate cât sunt „Noi”), mașinile (adăugare, modificare, ștergere), profilul (date, schimbare parolă, ștergere cont) |
| Administrare | `admin.html` | **doar pentru administrator**: statistici, programări (vizitator / client cu cont, mașina, schimbare status, ștergere), recenzii, clienți, căutare, filtrare, **export în Excel** (3 foi) |

## Utilizatori și roluri

| Rol | Cine | Ce poate face |
|---|---|---|
| Vizitator | oricine, fără cont | vede site-ul, trimite cereri de programare, scrie recenzii |
| Client | are cont (îl creează singur) | ce face vizitatorul + formular precompletat, mașini salvate, istoricul și statusul programărilor, anularea programărilor noi, eticheta „Client verificat” la recenzii |
| Administrator | angajatul service-ului | vede și gestionează programările, recenziile și clienții, exportă datele în Excel |

Toate paginile au același antet (meniu cu pagina curentă evidențiată) și același subsol.

## Funcționalități JavaScript

- **Formular de programare** (`js/script.js`): validare (nume, prenume, telefon românesc, solicitare de 3–300 de cuvinte, acord), numărător de cuvinte în timp real; pentru clientul conectat, date precompletate și alegerea mașinii.
- **Precompletare**: butonul „Programează” de pe un serviciu deschide `contact.html?serviciu=...` cu serviciul completat.
- **Telefonul animat** din pagina principală: conversație client–service, în buclă.
- **Recenzii** (`js/recenzii.js`): notă medie și bare de distribuție, filtrare după stele și serviciu, sortare, recenzie nouă cu alegerea notei prin clic pe stele, eticheta „Client verificat”.
- **Autentificare** (`js/login.js`): logare și creare cont, cu validări, „arată parola” și mesajele serverului (ex. „Mai ai 4 încercări”).
- **Contul meu** (`js/cont.js`): programările cu statusul lor și anularea celor noi, CRUD pe mașini (cu validarea numărului de înmatriculare), profil și schimbarea parolei.
- **Administrare** (`js/admin.js`): statistici, tabele cu căutare și filtre, schimbarea statusului programărilor, ștergeri, **export în Excel** (.xlsx cu foile Programări, Recenzii, Clienți, prin SheetJS; fără internet se exportă .csv).
- **Echipa**: dacă lipsește poza unui membru, se afișează inițialele.
- Toate paginile protejate verifică rolul pe server: `cont.html` doar pentru clienți, `admin.html` doar pentru administrator.

## Tehnologii

- HTML5 și CSS3 (stiluri proprii în `css/style.css`, fără stiluri inline)
- [Bootstrap 5.3](https://getbootstrap.com/) și Bootstrap Icons (prin CDN)
- [SheetJS](https://sheetjs.com/) pentru exportul în Excel (prin CDN)
- JavaScript (fetch către API, fără biblioteci suplimentare)
- PHP 8 (PDO, sesiuni, password_hash) și MySQL / MariaDB (XAMPP)
- Google Fonts: Poppins și Inter; Google Maps (hartă încorporată)

## Conturi pentru testare

| Rol | Email | Parolă |
|---|---|---|
| Administrator | `admin.turbofix@gmail.com` | `!Turbofix2026` |
| Client demo | `client.demo@gmail.com` | `Client2026!` |

Ambele conturi sunt create de scriptul bazei de date (`database/turbofix.sql`).

## Baza de date (MySQL)

Baza `turbofix` are 4 tabele legate prin chei străine:

| Tabel | Câmpuri principale | Relații |
|---|---|---|
| `utilizatori` | nume, prenume, email (unic), telefon, parola (hash bcrypt), rol (client/admin), creat | – |
| `masini` | marca, model, an, nr (unic) | `utilizator_id` → utilizatori (1:N, ON DELETE CASCADE) |
| `programari` | nume, prenume, telefon, masina, solicitare, **status** (Nouă / Confirmată / Finalizată / Anulată), creat | `utilizator_id` → utilizatori, `masina_id` → masini (1:N, opționale, ON DELETE SET NULL) |
| `recenzii` | nume, masina, serviciu, nota (1–5), text, verificat, creat | `utilizator_id` → utilizatori (1:N, opțională, ON DELETE SET NULL) |

## API (PHP)

Paginile comunică cu baza de date prin fișierele din `api/` (JSON, sesiuni PHP, PDO cu interogări pregătite):

| Fișier | Operații |
|---|---|
| `api/auth.php` | logare, creare cont, deconectare, utilizatorul conectat |
| `api/programari.php` | listă (admin: toate, client: ale lui), creare, schimbare status, ștergere |
| `api/recenzii.php` | listă publică, creare (cu „Client verificat” calculat pe server), ștergere |
| `api/masini.php` | CRUD complet pe mașinile clientului conectat |
| `api/utilizatori.php` | listă clienți și ștergere (admin), profil și ștergere cont (client) |

Toate datele sunt validate și pe server; parolele se salvează cu `password_hash` și se verifică cu `password_verify`.

## Rulare (XAMPP)

1. Instalați [XAMPP](https://www.apachefriends.org) și porniți **Apache** și **MySQL** din XAMPP Control Panel.
2. Importați baza de date: deschideți `http://localhost/phpmyadmin` → tab-ul **Import** → alegeți `database/turbofix.sql` → **Import**.
3. Puneți proiectul la dispoziția Apache, într-una din variante:
   - copiați folderul în `C:\xampp\htdocs\carservice`, **sau**
   - adăugați la finalul fișierului `C:\xampp\apache\conf\httpd.conf` (XAMPP Control Panel → Apache → Config → httpd.conf):
     ```
     Alias /carservice "D:/master/PMM/turbofix-service"
     <Directory "D:/master/PMM/turbofix-service">
         Options Indexes FollowSymLinks
         AllowOverride All
         Require all granted
     </Directory>
     ```
     apoi reporniți Apache (Stop → Start).
4. Deschideți **http://localhost/carservice/**

Datele de conectare la MySQL sunt în `api/config.php` (implicit în XAMPP: utilizator `root`, fără parolă).

> Site-ul trebuie deschis prin `http://localhost/...`. Deschis direct din fișier sau cu Live Server, paginile se afișează, dar formularele și conturile nu funcționează, pentru că PHP nu rulează.

## Structura

```
carservice/
├── index.html
├── servicii.html
├── echipa.html
├── recenzii.html
├── contact.html
├── login.html
├── cont.html
├── admin.html
├── css/style.css
├── js/
│   ├── date.js        (comunicarea cu API-ul: funcții pentru fiecare tabel)
│   ├── script.js      (comun tuturor paginilor)
│   ├── recenzii.js    (doar pagina Recenzii)
│   ├── auth.js        (utilizatorul conectat, validări comune)
│   ├── login.js       (doar pagina Autentificare)
│   ├── cont.js        (doar pagina Contul meu)
│   └── admin.js       (doar pagina Administrare)
├── api/               (serverul PHP: config, auth, programari, recenzii, masini, utilizatori)
├── database/
│   └── turbofix.sql   (crearea bazei de date + date de pornire)
├── img/               (pozele serviciilor; img/echipa/ pentru echipă)
└── README.md
```
