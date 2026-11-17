// =========================================================
// TurboFix Service - sesiunea utilizatorului (în browser)
//
// Logarea, crearea contului și verificarea parolelor se fac pe server
// (api/auth.php, cu password_hash / password_verify și sesiuni PHP).
// Aici doar întrebăm serverul cine este conectat și păstrăm regulile
// de validare folosite în formulare (aceleași reguli sunt verificate și pe server).
// =========================================================

const Auth = {
  _eu: null,

  // utilizatorul conectat ({ id, nume, prenume, email, telefon, rol }) sau null
  // (rezultatul se cere o singură dată pe pagină)
  eu() {
    if (!this._eu) {
      this._eu = Api.auth.eu().then(r => r.utilizator).catch(() => null);
    }
    return this._eu;
  },

  // pagina „de start” a fiecărui rol
  paginaRol(rol) {
    return rol === "admin" ? "admin.html" : "cont.html";
  },

  async deconectare() {
    try { await Api.auth.iesire(); } catch (e) { /* ignorăm: oricum plecăm de pe pagină */ }
    window.location.href = "login.html";
  },
};

// ---------- reguli de validare (aceleași ca în api/config.php) ----------
const Validare = {
  nume(valoare, eticheta) {
    const t = valoare.trim();
    const E = eticheta.charAt(0).toUpperCase() + eticheta.slice(1);
    if (t === "") return `Completează ${eticheta}.`;
    if (t.length < 2) return `${E} trebuie să aibă cel puțin 2 litere.`;
    if (!/^[A-Za-zĂÂÎȘȚăâîșțŞŢşţ\s-]+$/.test(t)) return `${E} poate conține doar litere, spații și cratimă.`;
    return "";
  },
  email(valoare) {
    const t = valoare.trim();
    if (t === "") return "Completează adresa de email.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(t)) return "Adresa de email nu este validă.";
    return "";
  },
  telefon(valoare) {
    const cifre = valoare.replace(/[\s.-]/g, "");
    if (cifre === "") return "Completează numărul de telefon.";
    if (!/^(\+40|0040|0)[237]\d{8}$/.test(cifre)) return "Introdu un număr valid, de exemplu 0712 345 678.";
    return "";
  },
  // parolă: minim 8 caractere, cel puțin o literă mare, o literă mică și o cifră
  parola(valoare) {
    if (valoare === "") return "Alege o parolă.";
    if (valoare.length < 8) return "Parola trebuie să aibă cel puțin 8 caractere.";
    if (!/[A-Z]/.test(valoare) || !/[a-z]/.test(valoare) || !/\d/.test(valoare)) {
      return "Parola trebuie să conțină o literă mare, o literă mică și o cifră.";
    }
    return "";
  },
};

// afișează / șterge eroarea unui câmp (folosită de toate formularele)
function marcheaza(camp, idEroare, mesaj) {
  camp.classList.toggle("is-invalid", Boolean(mesaj));
  const el = document.getElementById(idEroare);
  if (el) el.textContent = mesaj;
  return !mesaj;
}
