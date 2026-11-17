// =========================================================
// TurboFix Service - pagina Administrare (doar pentru administrator)
// Programările, recenziile și clienții vin din baza de date prin API.
// Administratorul schimbă statusul programărilor, șterge înregistrări,
// caută, filtrează și exportă totul în Excel (.xlsx, cu biblioteca SheetJS).
// =========================================================

const STATUSURI = ["Nouă", "Confirmată", "Finalizată", "Anulată"];

// ---------- Elemente ----------
const tabButoane = document.querySelectorAll(".admin-tab");
const panouri = document.querySelectorAll(".admin-panel");
const cautare = document.getElementById("adminCautare");
const filtruStatus = document.getElementById("adminStatus");
const corpProgramari = document.getElementById("tabelProgramari");
const corpRecenzii = document.getElementById("tabelRecenzii");
const corpClienti = document.getElementById("tabelClienti");
let tabActiv = "programari";

// datele încărcate de pe server
const date = { programari: [], recenzii: [], clienti: [] };

// ---------- Ajutătoare ----------
const dataDin = text => new Date(String(text).replace(" ", "T"));

function formateazaDataOra(text) {
  const d = dataDin(text);
  return d.toLocaleDateString("ro-RO") + " " + d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
}

function formateazaData(text) {
  return dataDin(text).toLocaleDateString("ro-RO");
}

// celulă de tabel cu text (textContent: nu permite cod HTML venit din formulare)
function celula(text, clasa) {
  const td = document.createElement("td");
  td.textContent = text;
  if (clasa) td.className = clasa;
  return td;
}

function butonSterge(onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "btn btn-sm btn-outline-danger";
  b.innerHTML = '<i class="bi bi-trash"></i>';
  b.setAttribute("aria-label", "Șterge");
  b.addEventListener("click", onClick);
  return b;
}

function randGol(tbody, coloane, mesaj) {
  const tr = document.createElement("tr");
  const td = document.createElement("td");
  td.colSpan = coloane;
  td.className = "admin-empty";
  td.textContent = mesaj;
  tr.appendChild(td);
  tbody.appendChild(tr);
}

// rulează o operație pe server; la eroare afișează mesajul, apoi reîncarcă datele
async function opereaza(promisiune) {
  try {
    await promisiune;
  } catch (err) {
    alert(err.message);
  }
  await incarcaDate();
}

// ---------- Încărcarea datelor din baza de date ----------
async function incarcaDate() {
  try {
    const [programari, recenzii, clienti] = await Promise.all([
      Api.programari.lista(), Api.recenzii.lista(), Api.utilizatori.lista(),
    ]);
    Object.assign(date, { programari, recenzii, clienti });
  } catch (err) {
    if (err.cod === 401 || err.cod === 403) return window.location.replace("login.html");
    alert(err.message);
  }
  actualizeaza();
}

// ---------- Statistici ----------
function afiseazaStatistici() {
  const { programari, recenzii, clienti } = date;
  const medie = recenzii.length ? recenzii.reduce((s, r) => s + r.nota, 0) / recenzii.length : 0;

  document.getElementById("statProgramari").textContent = programari.length;
  document.getElementById("statNoi").textContent = programari.filter(p => p.status === "Nouă").length;
  document.getElementById("statClienti").textContent = clienti.length;
  document.getElementById("statNota").textContent = recenzii.length ? medie.toFixed(1).replace(".", ",") : "–";
  document.getElementById("nrProgramari").textContent = programari.length;
  document.getElementById("nrRecenzii").textContent = recenzii.length;
  document.getElementById("nrClienti").textContent = clienti.length;
}

// ---------- Tabelul de programări ----------
function afiseazaProgramari() {
  const text = cautare.value.trim().toLowerCase();
  const status = filtruStatus.value;
  const lista = date.programari.filter(p =>
    (status === "" || p.status === status) &&
    (text === "" || `${p.nume} ${p.prenume} ${p.telefon} ${p.solicitare} ${p.masina}`.toLowerCase().includes(text)));

  corpProgramari.innerHTML = "";
  if (lista.length === 0) {
    randGol(corpProgramari, 7, date.programari.length ? "Nicio programare nu corespunde căutării." : "Nu există încă programări.");
    return;
  }

  lista.forEach(p => {
    const tr = document.createElement("tr");

    const tdClient = celula(`${p.nume} ${p.prenume}`, "fw-semibold");
    const tip = document.createElement("small");
    tip.className = p.utilizator_id ? "acc-tag acc-client" : "acc-tag";
    tip.textContent = p.utilizator_id ? "client cu cont" : "vizitator";
    tdClient.append(document.createElement("br"), tip);

    // statusul se schimbă direct din tabel (UPDATE în baza de date)
    const tdStatus = document.createElement("td");
    const select = document.createElement("select");
    select.className = `form-select form-select-sm status-select status-${STATUSURI.indexOf(p.status)}`;
    select.setAttribute("aria-label", "Statusul programării");
    STATUSURI.forEach(s => select.add(new Option(s, s, false, s === p.status)));
    select.addEventListener("change", () => opereaza(Api.programari.status(p.id, select.value)));
    tdStatus.appendChild(select);

    const tdActiuni = document.createElement("td");
    tdActiuni.appendChild(butonSterge(() => {
      if (confirm("Ștergi această programare?")) opereaza(Api.programari.sterge(p.id));
    }));

    tr.append(
      celula(formateazaDataOra(p.creat), "text-nowrap"),
      tdClient,
      celula(p.telefon, "text-nowrap"),
      celula(p.masina || "–"),
      celula(p.solicitare, "admin-long"),
      tdStatus,
      tdActiuni,
    );
    corpProgramari.appendChild(tr);
  });
}

// ---------- Tabelul de recenzii ----------
function afiseazaRecenzii() {
  const text = cautare.value.trim().toLowerCase();
  const lista = date.recenzii.filter(r =>
    text === "" || `${r.nume} ${r.masina} ${r.serviciu} ${r.text}`.toLowerCase().includes(text));

  corpRecenzii.innerHTML = "";
  if (lista.length === 0) {
    randGol(corpRecenzii, 7, date.recenzii.length ? "Nicio recenzie nu corespunde căutării." : "Nu există încă recenzii.");
    return;
  }

  lista.forEach(r => {
    const tr = document.createElement("tr");
    const tdNota = document.createElement("td");
    tdNota.className = "text-nowrap admin-stars";
    tdNota.innerHTML = '<i class="bi bi-star-fill"></i>'.repeat(r.nota) + '<i class="bi bi-star"></i>'.repeat(5 - r.nota);
    tdNota.setAttribute("aria-label", `${r.nota} din 5`);

    const tdNume = celula(r.nume, "fw-semibold");
    if (r.verificat) {
      const v = document.createElement("small");
      v.className = "acc-tag acc-client";
      v.textContent = "client verificat";
      tdNume.append(document.createElement("br"), v);
    }

    const tdActiuni = document.createElement("td");
    tdActiuni.appendChild(butonSterge(() => {
      if (confirm("Ștergi această recenzie?")) opereaza(Api.recenzii.sterge(r.id));
    }));

    tr.append(
      celula(formateazaData(r.creat), "text-nowrap"),
      tdNume,
      celula(r.masina || "–"),
      celula(r.serviciu),
      tdNota,
      celula(r.text, "admin-long"),
      tdActiuni,
    );
    corpRecenzii.appendChild(tr);
  });
}

// ---------- Tabelul de clienți ----------
function afiseazaClienti() {
  const text = cautare.value.trim().toLowerCase();
  const lista = date.clienti.filter(u =>
    text === "" || `${u.nume} ${u.prenume} ${u.email} ${u.telefon}`.toLowerCase().includes(text));

  corpClienti.innerHTML = "";
  if (lista.length === 0) {
    randGol(corpClienti, 7, date.clienti.length ? "Niciun client nu corespunde căutării." : "Nu există încă clienți cu cont.");
    return;
  }

  lista.forEach(u => {
    const tr = document.createElement("tr");
    const tdActiuni = document.createElement("td");
    tdActiuni.appendChild(butonSterge(() => {
      if (confirm(`Ștergi contul lui ${u.nume} ${u.prenume}? Mașinile lui se șterg, programările și recenziile rămân.`)) {
        opereaza(Api.utilizatori.sterge(u.id));
      }
    }));
    tr.append(
      celula(`${u.nume} ${u.prenume}`, "fw-semibold"),
      celula(u.email),
      celula(u.telefon, "text-nowrap"),
      celula(u.masini.join(", ") || "–"),
      celula(u.programari, "text-center"),
      celula(formateazaData(u.creat), "text-nowrap"),
      tdActiuni,
    );
    corpClienti.appendChild(tr);
  });
}

function actualizeaza() {
  afiseazaStatistici();
  afiseazaProgramari();
  afiseazaRecenzii();
  afiseazaClienti();
}

// ---------- Tab-uri, căutare, filtre ----------
tabButoane.forEach(buton => {
  buton.addEventListener("click", () => {
    tabActiv = buton.dataset.tab;
    tabButoane.forEach(b => {
      b.classList.toggle("active", b === buton);
      b.setAttribute("aria-selected", b === buton ? "true" : "false");
    });
    panouri.forEach(p => p.classList.toggle("d-none", p.id !== "panou-" + tabActiv));
    // filtrul de status are sens doar pentru programări
    filtruStatus.closest(".admin-status-wrap").classList.toggle("d-none", tabActiv !== "programari");
  });
});

cautare.addEventListener("input", actualizeaza);
filtruStatus.addEventListener("change", actualizeaza);

// =========================================================
// Export în Excel
// =========================================================
const randuriProgramari = () => date.programari.map(p => ({
  "Data trimiterii": formateazaDataOra(p.creat),
  "Nume": p.nume,
  "Prenume": p.prenume,
  "Telefon": p.telefon,
  "Tip": p.utilizator_id ? "Client cu cont" : "Vizitator",
  "Mașina": p.masina || "",
  "Solicitare": p.solicitare,
  "Status": p.status,
}));

const randuriRecenzii = () => date.recenzii.map(r => ({
  "Data": formateazaData(r.creat),
  "Nume": r.nume,
  "Mașina": r.masina || "",
  "Serviciu": r.serviciu,
  "Nota": r.nota,
  "Client verificat": r.verificat ? "Da" : "Nu",
  "Recenzie": r.text,
}));

// parolele nu ajung niciodată în browser, deci nici în export
const randuriClienti = () => date.clienti.map(u => ({
  "Nume": u.nume,
  "Prenume": u.prenume,
  "Email": u.email,
  "Telefon": u.telefon,
  "Mașini": u.masini.join(", "),
  "Programări": u.programari,
  "Înregistrat la": formateazaData(u.creat),
}));

function numeFisier(extensie) {
  const azi = new Date().toISOString().slice(0, 10);
  return `TurboFix_date_${azi}.${extensie}`;
}

// Varianta principală: fișier .xlsx cu trei foi
function exportaXlsx() {
  const wb = XLSX.utils.book_new();
  const foaie = (randuri, titluri, latimi) => {
    const ws = randuri.length ? XLSX.utils.json_to_sheet(randuri) : XLSX.utils.aoa_to_sheet([titluri]);
    ws["!cols"] = latimi.map(w => ({ wch: w }));   // lățimea coloanelor
    return ws;
  };
  XLSX.utils.book_append_sheet(wb,
    foaie(randuriProgramari(), ["Data trimiterii", "Nume", "Prenume", "Telefon", "Tip", "Mașina", "Solicitare", "Status"], [18, 16, 16, 15, 15, 28, 60, 12]),
    "Programări");
  XLSX.utils.book_append_sheet(wb,
    foaie(randuriRecenzii(), ["Data", "Nume", "Mașina", "Serviciu", "Nota", "Client verificat", "Recenzie"], [12, 18, 18, 26, 6, 15, 70]),
    "Recenzii");
  XLSX.utils.book_append_sheet(wb,
    foaie(randuriClienti(), ["Nume", "Prenume", "Email", "Telefon", "Mașini", "Programări", "Înregistrat la"], [16, 16, 30, 15, 40, 11, 14]),
    "Clienți");
  XLSX.writeFile(wb, numeFisier("xlsx"));
}

// Rezervă: fără biblioteca SheetJS (fără internet) facem un .csv pe care Excel îl deschide direct
function exportaCsv() {
  const linie = valori => valori.map(v => `"${String(v).replace(/"/g, '""')}"`).join(";");
  const sectiune = (titlu, randuri) => {
    if (!randuri.length) return [titlu, "(nicio înregistrare)"];
    return [titlu, linie(Object.keys(randuri[0])), ...randuri.map(r => linie(Object.values(r)))];
  };
  const continut = [
    ...sectiune("PROGRAMĂRI", randuriProgramari()), "",
    ...sectiune("RECENZII", randuriRecenzii()), "",
    ...sectiune("CLIENȚI", randuriClienti()),
  ].join("\r\n");

  const blob = new Blob(["﻿" + continut], { type: "text/csv;charset=utf-8" });   // ﻿: diacritice corecte în Excel
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = numeFisier("csv");
  link.click();
  URL.revokeObjectURL(link.href);
}

document.getElementById("btnExport").addEventListener("click", () => {
  if (window.XLSX) exportaXlsx();
  else exportaCsv();
});

document.getElementById("btnReincarca").addEventListener("click", incarcaDate);
document.getElementById("btnLogout").addEventListener("click", () => Auth.deconectare());

// =========================================================
// Pornire: doar administratorul are acces
// =========================================================
(async () => {
  const u = await Auth.eu();
  if (!u || u.rol !== "admin") return window.location.replace("login.html");
  document.body.classList.remove("needs-auth");
  document.getElementById("adminEmail").textContent = u.email;
  incarcaDate();
})();
