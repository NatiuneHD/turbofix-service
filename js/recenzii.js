// =========================================================
// TurboFix Service - pagina Recenzii
// Afișează recenziile din baza de date, calculează nota medie, filtrează,
// sortează și adaugă recenzii noi din formular (prin api/recenzii.php).
// =========================================================

const LIMITA_CARACTERE = 500;

// recenziile vin din baza de date (api/recenzii.php); le ținem aici după fiecare încărcare
let recenzii = [];

async function incarcaRecenzii() {
  try {
    recenzii = await Api.recenzii.lista();
  } catch (err) {
    recenzii = [];
    infoRezultate.textContent = err.message;
  }
  actualizeazaTot();
}

const toateRecenziile = () => recenzii;

// ---------- Elementele din pagină ----------
const lista = document.getElementById("listaRecenzii");
const infoRezultate = document.getElementById("infoRezultate");
const filtruStele = document.getElementById("filtruStele");
const filtruServiciu = document.getElementById("filtruServiciu");
const sortare = document.getElementById("sortare");

// ---------- Funcții de afișare ----------
function htmlStele(nota) {
  let html = "";
  for (let i = 1; i <= 5; i++) {
    html += i <= nota ? '<i class="bi bi-star-fill"></i>' : '<i class="bi bi-star"></i>';
  }
  return html;
}

function formateazaData(text) {
  return new Date(text.replace(" ", "T")).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" });
}

// Construiește cardul unei recenzii. Folosim textContent pentru textele scrise de vizitator,
// ca să nu poată introduce cod HTML în pagină.
function creeazaCard(r) {
  const col = document.createElement("div");
  col.className = "col-md-6";

  const card = document.createElement("article");
  card.className = "review-card";

  const cap = document.createElement("div");
  cap.className = "review-head";
  const stele = document.createElement("div");
  stele.className = "review-stars";
  stele.setAttribute("aria-label", `${r.nota} din 5 stele`);
  stele.innerHTML = htmlStele(r.nota);
  const serviciu = document.createElement("span");
  serviciu.className = "review-service";
  serviciu.textContent = r.serviciu;
  cap.append(stele, serviciu);

  const text = document.createElement("p");
  text.className = "review-text";
  text.textContent = `„${r.text}”`;

  const autor = document.createElement("div");
  autor.className = "review-author";
  const avatar = document.createElement("span");
  avatar.className = "review-avatar";
  avatar.textContent = r.nume.charAt(0).toUpperCase();
  const detalii = document.createElement("div");
  const nume = document.createElement("strong");
  nume.textContent = r.nume;
  const sub = document.createElement("small");
  sub.textContent = (r.masina ? r.masina + " · " : "") + formateazaData(r.creat);
  detalii.append(nume, sub);
  // „Client verificat”: autorul are cont și cel puțin o lucrare finalizată la service
  if (r.verificat) {
    const eticheta = document.createElement("span");
    eticheta.className = "verified";
    eticheta.innerHTML = '<i class="bi bi-patch-check-fill"></i> Client verificat';
    nume.after(eticheta);
  }
  autor.append(avatar, detalii);

  // recenziile proprii (sau toate, pentru administrator) pot fi șterse
  if (r.proprie) {
    const sterge = document.createElement("button");
    sterge.type = "button";
    sterge.className = "review-delete";
    sterge.innerHTML = '<i class="bi bi-trash"></i> Șterge';
    sterge.addEventListener("click", () => stergeRecenzie(r.id));
    autor.appendChild(sterge);
  }

  card.append(cap, text, autor);
  col.appendChild(card);
  return col;
}

// Rezumatul din bara laterală: nota medie și barele pe fiecare notă
function afiseazaRezumat() {
  const toate = toateRecenziile();
  const total = toate.length;
  const medie = total ? toate.reduce((s, r) => s + r.nota, 0) / total : 0;

  document.getElementById("notaMedie").textContent = medie.toFixed(1).replace(".", ",");
  document.getElementById("steleMedie").innerHTML = htmlStele(Math.round(medie));
  document.getElementById("numarRecenzii").textContent = `${total} ${total === 1 ? "recenzie" : "recenzii"}`;

  const bare = document.getElementById("bareNote");
  bare.innerHTML = "";
  for (let nota = 5; nota >= 1; nota--) {
    const cate = toate.filter(r => r.nota === nota).length;
    const procent = total ? Math.round((cate / total) * 100) : 0;
    const rand = document.createElement("div");
    rand.className = "rating-row";
    rand.innerHTML = `<span class="label">${nota} <i class="bi bi-star-fill"></i></span>
      <span class="bar"><span data-procent="${procent}"></span></span>
      <span class="count">${cate}</span>`;
    bare.appendChild(rand);
  }
  // lățimea barelor o setăm din JavaScript (fără stiluri inline în HTML)
  bare.querySelectorAll("[data-procent]").forEach(b => { b.style.width = b.dataset.procent + "%"; });
}

// Lista principală, după filtre și sortare
function afiseazaLista() {
  const stele = Number(filtruStele.value);
  const serviciu = filtruServiciu.value;

  let rezultat = toateRecenziile().filter(r =>
    (stele === 0 || r.nota === stele) && (serviciu === "" || r.serviciu === serviciu));

  if (sortare.value === "noi") rezultat.sort((a, b) => b.creat.localeCompare(a.creat));
  if (sortare.value === "bune") rezultat.sort((a, b) => b.nota - a.nota || b.creat.localeCompare(a.creat));
  if (sortare.value === "slabe") rezultat.sort((a, b) => a.nota - b.nota || b.creat.localeCompare(a.creat));

  lista.innerHTML = "";
  if (rezultat.length === 0) {
    lista.innerHTML = '<div class="col-12"><div class="empty-state"><i class="bi bi-chat-square-text fs-2"></i><p class="mt-2 mb-0">Nicio recenzie nu corespunde filtrelor alese.</p></div></div>';
  } else {
    rezultat.forEach(r => lista.appendChild(creeazaCard(r)));
  }
  infoRezultate.textContent = `Se afișează ${rezultat.length} din ${toateRecenziile().length} recenzii`;
}

function actualizeazaTot() {
  afiseazaRezumat();
  afiseazaLista();
}

[filtruStele, filtruServiciu, sortare].forEach(el => el.addEventListener("change", afiseazaLista));

async function stergeRecenzie(id) {
  if (!confirm("Ștergi această recenzie?")) return;
  try {
    await Api.recenzii.sterge(id);
    incarcaRecenzii();
  } catch (err) {
    alert(err.message);
  }
}

// =========================================================
// Formularul „Lasă o recenzie”
// =========================================================
const formRecenzie = document.getElementById("formRecenzie");
const recNume = document.getElementById("recNume");
const recMasina = document.getElementById("recMasina");
const recServiciu = document.getElementById("recServiciu");
const recText = document.getElementById("recText");
const recStele = document.getElementById("recStele");
const contorRecenzie = document.getElementById("contorRecenzie");
const mesajRecenzie = document.getElementById("mesajRecenzie");
const butoaneStele = recStele.querySelectorAll(".star-btn");
let notaAleasa = 0;

// colorează stelele până la nota dată
function coloreazaStele(nota) {
  butoaneStele.forEach(b => b.classList.toggle("on", Number(b.dataset.nota) <= nota));
}

butoaneStele.forEach(buton => {
  buton.addEventListener("click", () => {
    notaAleasa = Number(buton.dataset.nota);
    coloreazaStele(notaAleasa);
    butoaneStele.forEach(b => b.setAttribute("aria-checked", b === buton ? "true" : "false"));
    recStele.classList.remove("is-invalid");
    document.getElementById("eroareRecStele").textContent = "";
  });
  // la trecerea mouse-ului arătăm nota pe care ar alege-o
  buton.addEventListener("mouseenter", () => coloreazaStele(Number(buton.dataset.nota)));
});
recStele.addEventListener("mouseleave", () => coloreazaStele(notaAleasa));

recText.addEventListener("input", () => {
  const n = recText.value.length;
  contorRecenzie.textContent = `${n} / ${LIMITA_CARACTERE} caractere`;
  contorRecenzie.classList.toggle("limita", n > LIMITA_CARACTERE);
});

function eroare(camp, id, mesaj) {
  camp.classList.toggle("is-invalid", Boolean(mesaj));
  document.getElementById(id).textContent = mesaj;
  return !mesaj;
}

[[recNume, "eroareRecNume"], [recServiciu, "eroareRecServiciu"], [recText, "eroareRecText"]].forEach(([camp, id]) => {
  camp.addEventListener("input", () => eroare(camp, id, ""));
  camp.addEventListener("change", () => eroare(camp, id, ""));
});

formRecenzie.addEventListener("submit", async e => {
  e.preventDefault();
  mesajRecenzie.classList.add("d-none");

  const nume = recNume.value.trim();
  const text = recText.value.trim();

  const ok = [
    eroare(recNume, "eroareRecNume",
      nume === "" ? "Completează numele." :
      nume.length < 2 ? "Numele trebuie să aibă cel puțin 2 caractere." : ""),
    eroare(recServiciu, "eroareRecServiciu", recServiciu.value === "" ? "Alege serviciul." : ""),
    eroare(recStele, "eroareRecStele", notaAleasa === 0 ? "Alege o notă de la 1 la 5 stele." : ""),
    eroare(recText, "eroareRecText",
      text.length < 10 ? "Scrie cel puțin 10 caractere." :
      text.length > LIMITA_CARACTERE ? `Recenzia are ${text.length} caractere. Limita este ${LIMITA_CARACTERE}.` : ""),
  ];
  if (ok.includes(false)) return;

  const buton = formRecenzie.querySelector("button[type=submit]");
  buton.disabled = true;
  try {
    // serverul decide dacă recenzia e „verificată” (client cu o lucrare finalizată)
    const rezultat = await Api.recenzii.creeaza({
      nume, masina: recMasina.value.trim(), serviciu: recServiciu.value, nota: notaAleasa, text,
    });

    formRecenzie.reset();
    completeazaAutor();
    notaAleasa = 0;
    coloreazaStele(0);
    contorRecenzie.textContent = `0 / ${LIMITA_CARACTERE} caractere`;
    filtruStele.value = "0";
    filtruServiciu.value = "";
    sortare.value = "noi";
    mesajRecenzie.innerHTML = '<i class="bi bi-check-circle-fill"></i> Mulțumim! Recenzia ta a fost publicată'
      + (rezultat.verificat ? " cu eticheta „Client verificat”." : ".");
    mesajRecenzie.classList.remove("d-none");
    await incarcaRecenzii();
    lista.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    arataEroriServer(err, {
      nume: [recNume, "eroareRecNume"], serviciu: [recServiciu, "eroareRecServiciu"],
      nota: [recStele, "eroareRecStele"], text: [recText, "eroareRecText"],
    });
    if (!Object.keys(err.campuri || {}).length) alert(err.message);
  } finally {
    buton.disabled = false;
  }
});

// ---------- Client conectat: completăm numele și mașina ----------
let autor = null;
let masinaAutor = "";

function completeazaAutor() {
  if (!autor) return;
  recNume.value = `${autor.prenume} ${autor.nume.charAt(0)}.`;
  recMasina.value = masinaAutor;
}

Auth.eu().then(async u => {
  if (!u || u.rol !== "client") return;
  autor = u;
  try {
    const masini = await Api.masini.lista();
    if (masini.length) masinaAutor = `${masini[0].marca} ${masini[0].model}`;
  } catch (e) { /* fără mașini salvate */ }
  completeazaAutor();
});

incarcaRecenzii();
