// =========================================================
// TurboFix Service - comunicarea cu serverul (API PHP)
// Paginile nu mai păstrează date în browser: tot ce se citește sau se salvează
// trece prin fișierele din folderul api/, care lucrează cu baza de date MySQL.
// =========================================================

// trimite o cerere la API și întoarce răspunsul JSON;
// dacă serverul răspunde cu eroare, aruncă o excepție cu mesajul și erorile pe câmpuri
async function api(adresa, metoda = "GET", date = null) {
  const optiuni = { method: metoda, headers: {}, credentials: "same-origin" };
  if (date !== null) {
    optiuni.headers["Content-Type"] = "application/json";
    optiuni.body = JSON.stringify(date);
  }

  let raspuns;
  try {
    raspuns = await fetch("api/" + adresa, optiuni);
  } catch (e) {
    throw new EroareApi("Serverul nu răspunde. Verifică dacă Apache și MySQL sunt pornite în XAMPP.", 0);
  }

  let continut = null;
  try {
    continut = await raspuns.json();
  } catch (e) {
    throw new EroareApi("Serverul a trimis un răspuns neașteptat. Deschide site-ul prin http://localhost/... (XAMPP), nu direct din fișier.", raspuns.status);
  }
  if (!raspuns.ok) throw new EroareApi(continut.eroare || "Eroare necunoscută.", raspuns.status, continut.campuri || {});
  return continut;
}

class EroareApi extends Error {
  constructor(mesaj, cod, campuri = {}) {
    super(mesaj);
    this.cod = cod;
    this.campuri = campuri;   // erori pe câmpuri, ex. { telefon: "Introdu un număr valid..." }
  }
}

// ---------- funcții pentru fiecare tabel ----------
const Api = {
  programari: {
    lista: () => api("programari.php"),
    creeaza: date => api("programari.php", "POST", date),
    status: (id, status) => api(`programari.php?id=${id}`, "PUT", { status }),
    sterge: id => api(`programari.php?id=${id}`, "DELETE"),
  },
  recenzii: {
    lista: () => api("recenzii.php"),
    creeaza: date => api("recenzii.php", "POST", date),
    sterge: id => api(`recenzii.php?id=${id}`, "DELETE"),
  },
  masini: {
    lista: () => api("masini.php"),
    creeaza: date => api("masini.php", "POST", date),
    modifica: (id, date) => api(`masini.php?id=${id}`, "PUT", date),
    sterge: id => api(`masini.php?id=${id}`, "DELETE"),
  },
  utilizatori: {
    lista: () => api("utilizatori.php"),
    sterge: id => api(`utilizatori.php?id=${id}`, "DELETE"),
    profil: date => api("utilizatori.php?actiune=profil", "PUT", date),
    stergeContulMeu: () => api("utilizatori.php?actiune=cont", "DELETE"),
  },
  auth: {
    eu: () => api("auth.php?actiune=eu"),
    logare: (email, parola) => api("auth.php?actiune=logare", "POST", { email, parola }),
    inregistrare: date => api("auth.php?actiune=inregistrare", "POST", date),
    iesire: () => api("auth.php?actiune=iesire", "POST", {}),
  },
};

// afișează pe câmpuri erorile primite de la server: { numeCamp: "mesaj" } → { numeCamp: [camp, idEroare] }
function arataEroriServer(eroare, harta) {
  Object.entries(eroare.campuri || {}).forEach(([cheie, mesaj]) => {
    if (harta[cheie]) {
      const [camp, idEroare] = harta[cheie];
      camp.classList.add("is-invalid");
      const el = document.getElementById(idEroare);
      if (el) el.textContent = mesaj;
    }
  });
}
