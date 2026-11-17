// =========================================================
// TurboFix Service - pagina Autentificare (logare + creare cont)
// Datele se verifică întâi în browser, apoi pe server (api/auth.php).
// =========================================================

// dacă cineva e deja conectat, îl trimitem pe pagina rolului său
Auth.eu().then(u => {
  if (u) window.location.replace(Auth.paginaRol(u.rol));
});

// ---------- Tab-urile „Intră în cont” / „Creează cont” ----------
const taburi = document.querySelectorAll(".auth-tab");
const panouriAuth = document.querySelectorAll(".auth-panel");

function arataTab(nume) {
  taburi.forEach(t => {
    const activ = t.dataset.tab === nume;
    t.classList.toggle("active", activ);
    t.setAttribute("aria-selected", activ ? "true" : "false");
  });
  panouriAuth.forEach(p => p.classList.toggle("d-none", p.id !== "panou-" + nume));
}

taburi.forEach(t => t.addEventListener("click", () => arataTab(t.dataset.tab)));
// login.html#cont-nou deschide direct tab-ul de înregistrare
function tabDinAdresa() {
  if (window.location.hash === "#cont-nou") arataTab("inregistrare");
}
tabDinAdresa();
window.addEventListener("hashchange", tabDinAdresa);

// ---------- Butoanele „arată parola” ----------
document.querySelectorAll(".btn-eye").forEach(buton => {
  buton.addEventListener("click", () => {
    const camp = document.getElementById(buton.dataset.camp);
    const ascunsa = camp.type === "password";
    camp.type = ascunsa ? "text" : "password";
    buton.innerHTML = ascunsa ? '<i class="bi bi-eye-slash"></i>' : '<i class="bi bi-eye"></i>';
    buton.setAttribute("aria-label", ascunsa ? "Ascunde parola" : "Arată parola");
  });
});

// ștergem eroarea unui câmp când utilizatorul scrie în el
document.querySelectorAll(".login-box .form-control").forEach(camp => {
  camp.addEventListener("input", () => {
    camp.classList.remove("is-invalid");
    const fb = camp.closest(".mb-3, .mb-4, .col-md-6, .col-12")?.querySelector(".invalid-feedback");
    if (fb) fb.textContent = "";
  });
});

function mesajGeneral(id, text) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.classList.toggle("d-none", !text);
}

// =========================================================
// Logare
// =========================================================
const formLogin = document.getElementById("formLogin");
const loginEmail = document.getElementById("loginEmail");
const loginParola = document.getElementById("loginParola");

formLogin.addEventListener("submit", async e => {
  e.preventDefault();
  mesajGeneral("mesajLogin", "");

  const ok = [
    marcheaza(loginEmail, "eroareEmail", Validare.email(loginEmail.value)),
    marcheaza(loginParola, "eroareParola", loginParola.value === "" ? "Completează parola." : ""),
  ];
  if (ok.includes(false)) return;

  const buton = formLogin.querySelector("button[type=submit]");
  buton.disabled = true;
  try {
    const { utilizator } = await Api.auth.logare(loginEmail.value.trim(), loginParola.value);
    window.location.href = Auth.paginaRol(utilizator.rol);
  } catch (err) {
    loginParola.value = "";
    loginParola.focus();
    mesajGeneral("mesajLogin", err.message);   // ex. „Email sau parolă greșită. Mai ai 4 încercări.”
  } finally {
    buton.disabled = false;
  }
});

// =========================================================
// Creare cont (doar clienți)
// =========================================================
const formCont = document.getElementById("formCont");
const c = id => document.getElementById(id);

formCont.addEventListener("submit", async e => {
  e.preventDefault();
  mesajGeneral("mesajCont", "");

  const parola = c("regParola").value;
  const ok = [
    marcheaza(c("regNume"), "eroareRegNume", Validare.nume(c("regNume").value, "numele")),
    marcheaza(c("regPrenume"), "eroareRegPrenume", Validare.nume(c("regPrenume").value, "prenumele")),
    marcheaza(c("regEmail"), "eroareRegEmail", Validare.email(c("regEmail").value)),
    marcheaza(c("regTelefon"), "eroareRegTelefon", Validare.telefon(c("regTelefon").value)),
    marcheaza(c("regParola"), "eroareRegParola", Validare.parola(parola)),
    marcheaza(c("regParola2"), "eroareRegParola2",
      c("regParola2").value === "" ? "Repetă parola." : c("regParola2").value !== parola ? "Parolele nu coincid." : ""),
    marcheaza(c("regAcord"), "eroareRegAcord", c("regAcord").checked ? "" : "Trebuie să accepți prelucrarea datelor."),
  ];
  if (ok.includes(false)) return;

  const buton = formCont.querySelector("button[type=submit]");
  buton.disabled = true;
  try {
    await Api.auth.inregistrare({
      nume: c("regNume").value, prenume: c("regPrenume").value, email: c("regEmail").value,
      telefon: c("regTelefon").value, parola,
    });
    window.location.href = "cont.html";
  } catch (err) {
    // erorile pe câmpuri venite de la server (ex. „Există deja un cont cu acest email.”)
    arataEroriServer(err, {
      nume: [c("regNume"), "eroareRegNume"], prenume: [c("regPrenume"), "eroareRegPrenume"],
      email: [c("regEmail"), "eroareRegEmail"], telefon: [c("regTelefon"), "eroareRegTelefon"],
      parola: [c("regParola"), "eroareRegParola"],
    });
    if (!Object.keys(err.campuri || {}).length) mesajGeneral("mesajCont", err.message);
  } finally {
    buton.disabled = false;
  }
});
