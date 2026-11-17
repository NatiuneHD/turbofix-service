// =========================================================
// TurboFix Service - pagina „Contul meu” (doar pentru clienți)
// Programările clientului (cu statusul pus de administrator),
// mașinile lui (CRUD complet) și profilul. Toate datele vin din baza de date
// prin api/programari.php, api/masini.php și api/utilizatori.php.
// =========================================================

const $ = id => document.getElementById(id);
let client = null;

const STATUS_CLASA = { "Nouă": "status-0", "Confirmată": "status-1", "Finalizată": "status-2", "Anulată": "status-3" };
const STATUS_TEXT = {
  "Nouă": "Am primit cererea. Te sunăm pentru confirmare.",
  "Confirmată": "Programarea este confirmată. Te așteptăm!",
  "Finalizată": "Lucrarea a fost finalizată.",
  "Anulată": "Programarea a fost anulată.",
};

// ---------- Navigarea între secțiuni (Programări / Mașini / Profil) ----------
document.querySelectorAll(".account-nav button").forEach(buton => {
  buton.addEventListener("click", () => arataSectiune(buton.dataset.sectiune));
});

function arataSectiune(nume) {
  document.querySelectorAll(".account-nav button").forEach(b => b.classList.toggle("active", b.dataset.sectiune === nume));
  document.querySelectorAll(".account-panel").forEach(p => p.classList.toggle("d-none", p.id !== "sectiune-" + nume));
}

function mesajEroare(container, err) {
  container.innerHTML = "";
  const div = document.createElement("div");
  div.className = "alert alert-danger";
  div.textContent = err.message;
  container.appendChild(div);
}

// =========================================================
// 1. Programările mele
// =========================================================
async function afiseazaProgramari() {
  const cont = $("listaProgramari");
  let lista;
  try {
    lista = await Api.programari.lista();
  } catch (err) {
    mesajEroare(cont, err);
    return;
  }

  $("nrProg").textContent = lista.length;
  $("nrProgActive").textContent = lista.filter(p => p.status === "Nouă" || p.status === "Confirmată").length;
  $("nrProgFinal").textContent = lista.filter(p => p.status === "Finalizată").length;

  cont.innerHTML = "";
  if (lista.length === 0) {
    cont.innerHTML = `<div class="empty-state"><i class="bi bi-calendar-x fs-2"></i>
      <p class="mt-2">Nu ai încă nicio programare.</p>
      <a href="contact.html#programare" class="btn btn-red">Fă prima programare</a></div>`;
    return;
  }

  lista.forEach(p => {
    const card = document.createElement("article");
    card.className = "booking-card";

    const cap = document.createElement("div");
    cap.className = "booking-card-head";
    const data = document.createElement("span");
    data.className = "booking-date";
    data.innerHTML = '<i class="bi bi-calendar3"></i> ';
    data.append(new Date(p.creat.replace(" ", "T")).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" }));
    const status = document.createElement("span");
    status.className = `status-pill ${STATUS_CLASA[p.status] || ""}`;
    status.textContent = p.status;
    cap.append(data, status);

    const masina = document.createElement("p");
    masina.className = "booking-car";
    masina.innerHTML = '<i class="bi bi-car-front"></i> ';
    masina.append(p.masina || "Mașină nespecificată");

    const text = document.createElement("p");
    text.className = "booking-text";
    text.textContent = p.solicitare;

    const info = document.createElement("p");
    info.className = "booking-info";
    info.textContent = STATUS_TEXT[p.status] || "";

    card.append(cap, masina, text, info);

    // cât timp e „Nouă”, clientul o poate anula singur (UPDATE pe server)
    if (p.status === "Nouă") {
      const anuleaza = document.createElement("button");
      anuleaza.type = "button";
      anuleaza.className = "btn btn-sm btn-outline-danger";
      anuleaza.innerHTML = '<i class="bi bi-x-circle"></i> Anulează programarea';
      anuleaza.addEventListener("click", async () => {
        if (!confirm("Anulezi această programare?")) return;
        try {
          await Api.programari.status(p.id, "Anulată");
          afiseazaProgramari();
        } catch (err) {
          alert(err.message);
        }
      });
      card.appendChild(anuleaza);
    }
    cont.appendChild(card);
  });
}

// =========================================================
// 2. Mașinile mele (CREATE, READ, UPDATE, DELETE)
// =========================================================
const formMasina = $("formMasina");
let masinaInEditare = null;   // id-ul mașinii modificate sau null la adăugare

// număr de înmatriculare românesc: ex. TM 12 ABC, B 123 ABC
function valideazaNr(valoare) {
  const t = valoare.trim().toUpperCase().replace(/[\s-]+/g, "");
  if (t === "") return "Completează numărul de înmatriculare.";
  if (!/^[A-Z]{1,2}\d{2,3}[A-Z]{3}$/.test(t)) return "Format invalid. Exemplu: TM 12 ABC sau B 123 ABC.";
  return "";
}

async function afiseazaMasini() {
  const cont = $("listaMasini");
  let lista;
  try {
    lista = await Api.masini.lista();
  } catch (err) {
    mesajEroare(cont, err);
    return;
  }
  $("nrMasini").textContent = lista.length;
  cont.innerHTML = "";

  if (lista.length === 0) {
    cont.innerHTML = '<div class="col-12"><div class="empty-state"><i class="bi bi-car-front fs-2"></i><p class="mt-2 mb-0">Nu ai adăugat nicio mașină. Folosește formularul de mai jos.</p></div></div>';
    return;
  }

  lista.forEach(m => {
    const col = document.createElement("div");
    col.className = "col-md-6";
    const card = document.createElement("article");
    card.className = "car-card";

    const nr = document.createElement("span");
    nr.className = "plate";
    nr.textContent = m.nr;
    const titlu = document.createElement("h3");
    titlu.textContent = `${m.marca} ${m.model}`;
    const meta = document.createElement("p");
    meta.className = "car-meta";
    const n = Number(m.programari);
    meta.textContent = `An fabricație: ${m.an} · ${n} ${n === 1 ? "programare" : "programări"}`;

    const actiuni = document.createElement("div");
    actiuni.className = "car-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "btn btn-sm btn-outline-secondary";
    edit.innerHTML = '<i class="bi bi-pencil"></i> Modifică';
    edit.addEventListener("click", () => incepeEditare(m));
    const del = document.createElement("button");
    del.type = "button";
    del.className = "btn btn-sm btn-outline-danger";
    del.innerHTML = '<i class="bi bi-trash"></i> Șterge';
    del.addEventListener("click", async () => {
      if (!confirm(`Ștergi ${m.marca} ${m.model} (${m.nr})?`)) return;
      try {
        await Api.masini.sterge(m.id);
        if (masinaInEditare === m.id) renuntaEditare();
        afiseazaMasini();
      } catch (err) {
        alert(err.message);
      }
    });
    actiuni.append(edit, del);

    card.append(nr, titlu, meta, actiuni);
    col.appendChild(card);
    cont.appendChild(col);
  });
}

function incepeEditare(m) {
  masinaInEditare = m.id;
  $("masMarca").value = m.marca;
  $("masModel").value = m.model;
  $("masAn").value = m.an;
  $("masNr").value = m.nr;
  $("titluFormMasina").textContent = `Modifică ${m.marca} ${m.model}`;
  $("btnSalveazaMasina").innerHTML = '<i class="bi bi-check-lg"></i> Salvează modificările';
  $("btnRenunta").classList.remove("d-none");
  formMasina.scrollIntoView({ behavior: "smooth", block: "center" });
}

function renuntaEditare() {
  masinaInEditare = null;
  formMasina.reset();
  formMasina.querySelectorAll(".is-invalid").forEach(el => el.classList.remove("is-invalid"));
  $("titluFormMasina").textContent = "Adaugă o mașină";
  $("btnSalveazaMasina").innerHTML = '<i class="bi bi-plus-lg"></i> Adaugă mașina';
  $("btnRenunta").classList.add("d-none");
}

$("btnRenunta").addEventListener("click", renuntaEditare);

formMasina.addEventListener("submit", async e => {
  e.preventDefault();
  const anCurent = new Date().getFullYear();
  const an = Number($("masAn").value);
  const ok = [
    marcheaza($("masMarca"), "eroareMarca", $("masMarca").value.trim().length < 2 ? "Completează marca (ex.: Dacia)." : ""),
    marcheaza($("masModel"), "eroareModel", $("masModel").value.trim() === "" ? "Completează modelul (ex.: Logan)." : ""),
    marcheaza($("masAn"), "eroareAn",
      $("masAn").value === "" ? "Completează anul." :
      !Number.isInteger(an) || an < 1950 || an > anCurent + 1 ? `Anul trebuie să fie între 1950 și ${anCurent + 1}.` : ""),
    marcheaza($("masNr"), "eroareNr", valideazaNr($("masNr").value)),
  ];
  if (ok.includes(false)) return;

  const date = { marca: $("masMarca").value, model: $("masModel").value, an, nr: $("masNr").value };
  try {
    if (masinaInEditare) await Api.masini.modifica(masinaInEditare, date);   // UPDATE
    else await Api.masini.creeaza(date);                                     // CREATE
    renuntaEditare();
    afiseazaMasini();
  } catch (err) {
    // ex. „Există deja o mașină cu acest număr.” (verificat în baza de date)
    arataEroriServer(err, {
      marca: [$("masMarca"), "eroareMarca"], model: [$("masModel"), "eroareModel"],
      an: [$("masAn"), "eroareAn"], nr: [$("masNr"), "eroareNr"],
    });
    if (!Object.keys(err.campuri || {}).length) alert(err.message);
  }
});

formMasina.querySelectorAll(".form-control").forEach(camp =>
  camp.addEventListener("input", () => camp.classList.remove("is-invalid")));

// =========================================================
// 3. Profil
// =========================================================
const formProfil = $("formProfil");

function completeazaProfil() {
  $("profNume").value = client.nume;
  $("profPrenume").value = client.prenume;
  $("profEmail").value = client.email;
  $("profTelefon").value = client.telefon;
}

formProfil.querySelectorAll(".form-control").forEach(camp =>
  camp.addEventListener("input", () => camp.classList.remove("is-invalid")));

formProfil.addEventListener("submit", async e => {
  e.preventDefault();
  $("mesajProfil").classList.add("d-none");
  const parolaNoua = $("profParola").value;
  const ok = [
    marcheaza($("profNume"), "eroareProfNume", Validare.nume($("profNume").value, "numele")),
    marcheaza($("profPrenume"), "eroareProfPrenume", Validare.nume($("profPrenume").value, "prenumele")),
    marcheaza($("profTelefon"), "eroareProfTelefon", Validare.telefon($("profTelefon").value)),
    // parola e opțională: se schimbă doar dacă se completează
    marcheaza($("profParola"), "eroareProfParola", parolaNoua === "" ? "" : Validare.parola(parolaNoua)),
    marcheaza($("profParola2"), "eroareProfParola2",
      parolaNoua !== "" && $("profParola2").value !== parolaNoua ? "Parolele nu coincid." : ""),
  ];
  if (ok.includes(false)) return;

  try {
    const { utilizator } = await Api.utilizatori.profil({
      nume: $("profNume").value, prenume: $("profPrenume").value, telefon: $("profTelefon").value,
      parola_noua: parolaNoua,
    });
    client = utilizator;
    $("contPrenume").textContent = client.prenume;
    $("profParola").value = "";
    $("profParola2").value = "";
    $("mesajProfil").classList.remove("d-none");
  } catch (err) {
    arataEroriServer(err, {
      nume: [$("profNume"), "eroareProfNume"], prenume: [$("profPrenume"), "eroareProfPrenume"],
      telefon: [$("profTelefon"), "eroareProfTelefon"], parola_noua: [$("profParola"), "eroareProfParola"],
    });
    if (!Object.keys(err.campuri || {}).length) alert(err.message);
  }
});

// ---------- Ștergerea contului (DELETE) ----------
$("btnStergeCont").addEventListener("click", async () => {
  if (!confirm("Ștergi definitiv contul și mașinile salvate? Programările rămân la service.")) return;
  try {
    await Api.utilizatori.stergeContulMeu();
    window.location.href = "index.html";
  } catch (err) {
    alert(err.message);
  }
});

$("btnLogoutCont").addEventListener("click", () => Auth.deconectare());

// =========================================================
// Pornire: doar clienții conectați au acces
// =========================================================
(async () => {
  const u = await Auth.eu();
  if (!u) return window.location.replace("login.html");
  if (u.rol === "admin") return window.location.replace("admin.html");

  client = u;
  document.body.classList.remove("needs-auth");
  $("contPrenume").textContent = client.prenume;
  $("contEmail").textContent = client.email;
  completeazaProfil();
  afiseazaProgramari();
  afiseazaMasini();
  if (window.location.hash === "#masini") arataSectiune("masini");
})();
