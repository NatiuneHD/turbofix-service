// =========================================================
// TurboFix Service - cod comun tuturor paginilor
//   1. formularul de programare (pagina Contact)
//   2. meniul lateral: cine este conectat
//   3. telefonul animat (pagina Acasă)
//   4. pozele echipei (pagina Echipa)
// =========================================================

const LIMITA_CUVINTE = 300;

// =========================================================
// 1. Formularul de programare (există doar pe pagina Contact)
// =========================================================
const formProgramare = document.getElementById("formProgramare");

if (formProgramare) {
  const campNume = document.getElementById("nume");
  const campPrenume = document.getElementById("prenume");
  const campTelefon = document.getElementById("telefon");
  const campSolicitare = document.getElementById("solicitare");
  const campAcord = document.getElementById("acord");
  const selectMasina = document.getElementById("masinaProgramare");
  const contorCuvinte = document.getElementById("contorCuvinte");
  const mesajSucces = document.getElementById("mesajSucces");
  const mesajEroare = document.getElementById("mesajEroare");
  let clientConectat = null;

  // Numără cuvintele: împarte textul după spații și ignoră bucățile goale
  function numaraCuvinte(text) {
    return text.trim().split(/\s+/).filter(cuvant => cuvant.length > 0).length;
  }

  // Solicitare: obligatorie, minim 3 cuvinte, maxim 300 de cuvinte
  function valideazaSolicitare(valoare) {
    const nr = numaraCuvinte(valoare);
    if (nr === 0) return "Descrie pe scurt problema sau serviciul dorit.";
    if (nr < 3) return "Te rugăm să scrii cel puțin 3 cuvinte.";
    if (nr > LIMITA_CUVINTE) return `Ai scris ${nr} cuvinte. Limita este de ${LIMITA_CUVINTE}.`;
    return "";
  }

  // Numărătorul de cuvinte, actualizat la fiecare tastă
  function actualizeazaContor() {
    const nr = numaraCuvinte(campSolicitare.value);
    contorCuvinte.textContent = `${nr} / ${LIMITA_CUVINTE} cuvinte`;
    contorCuvinte.classList.toggle("limita", nr > LIMITA_CUVINTE);
  }
  campSolicitare.addEventListener("input", actualizeazaContor);

  // Ștergem eroarea unui câmp de îndată ce utilizatorul îl corectează
  const HARTA = {
    nume: [campNume, "eroareNume"],
    prenume: [campPrenume, "eroarePrenume"],
    telefon: [campTelefon, "eroareTelefon"],
    solicitare: [campSolicitare, "eroareSolicitare"],
    acord: [campAcord, "eroareAcord"],
  };
  Object.values(HARTA).forEach(([camp, idEroare]) => {
    camp.addEventListener(camp.type === "checkbox" ? "change" : "input", () => marcheaza(camp, idEroare, ""));
  });

  // ---------- Trimiterea formularului ----------
  formProgramare.addEventListener("submit", async eveniment => {
    eveniment.preventDefault();           // nu reîncărcăm pagina
    mesajSucces.classList.add("d-none");
    mesajEroare.classList.add("d-none");

    // 1. validare în browser (reguli comune din js/auth.js)
    const verificari = [
      marcheaza(campNume, "eroareNume", Validare.nume(campNume.value, "numele")),
      marcheaza(campPrenume, "eroarePrenume", Validare.nume(campPrenume.value, "prenumele")),
      marcheaza(campTelefon, "eroareTelefon", Validare.telefon(campTelefon.value)),
      marcheaza(campSolicitare, "eroareSolicitare", valideazaSolicitare(campSolicitare.value)),
      marcheaza(campAcord, "eroareAcord", campAcord.checked ? "" : "Trebuie să fii de acord pentru a putea fi contactat."),
    ];
    if (verificari.includes(false)) {
      formProgramare.querySelector(".is-invalid")?.focus();
      return;
    }

    // 2. trimitere la server (api/programari.php), care validează din nou și salvează în baza de date
    const buton = formProgramare.querySelector("button[type=submit]");
    buton.disabled = true;
    try {
      await Api.programari.creeaza({
        nume: campNume.value,
        prenume: campPrenume.value,
        telefon: campTelefon.value,
        solicitare: campSolicitare.value,
        acord: campAcord.checked,
        masina_id: clientConectat && selectMasina.value ? Number(selectMasina.value) : null,
      });

      mesajSucces.innerHTML = clientConectat
        ? '<i class="bi bi-check-circle-fill"></i> Mulțumim! Programarea a fost trimisă. Statusul o să-l vezi în <a href="cont.html">Contul meu</a>.'
        : '<i class="bi bi-check-circle-fill"></i> Mulțumim! Am primit solicitarea și te sunăm în cel mai scurt timp.';
      mesajSucces.classList.remove("d-none");
      formProgramare.reset();
      completeazaDinCont();
      actualizeazaContor();
      mesajSucces.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (err) {
      arataEroriServer(err, HARTA);
      if (!Object.keys(err.campuri || {}).length) {
        mesajEroare.textContent = err.message;
        mesajEroare.classList.remove("d-none");
      }
    } finally {
      buton.disabled = false;
    }
  });

  // ---------- Precompletare din link ----------
  // Butoanele „Programează” de pe pagina Servicii duc la contact.html?serviciu=Geometrie%20roți
  const serviciuAles = new URLSearchParams(window.location.search).get("serviciu");
  if (serviciuAles) {
    campSolicitare.value = `Doresc programare pentru: ${serviciuAles}. `;
    actualizeazaContor();
  }

  // ---------- Client conectat: completăm datele lui și lista de mașini ----------
  async function completeazaDinCont() {
    if (!clientConectat) return;
    campNume.value = clientConectat.nume;
    campPrenume.value = clientConectat.prenume;
    campTelefon.value = clientConectat.telefon;

    let masini = [];
    try { masini = await Api.masini.lista(); } catch (e) { /* fără mașini */ }
    selectMasina.innerHTML = "";
    selectMasina.add(new Option(masini.length ? "Alege mașina" : "Nu ai mașini salvate", ""));
    masini.forEach(m => selectMasina.add(new Option(`${m.marca} ${m.model} (${m.nr})`, m.id)));
    if (masini.length === 1) selectMasina.value = masini[0].id;
    document.getElementById("grupMasina").classList.remove("d-none");
  }

  Auth.eu().then(u => {
    if (!u || u.rol !== "client") return;
    clientConectat = u;
    completeazaDinCont();

    const nota = document.getElementById("notaCont");
    nota.innerHTML = '<i class="bi bi-person-check-fill"></i> ';
    nota.append(`Ești conectat ca ${u.prenume} ${u.nume}. Programarea va apărea în `);
    const link = document.createElement("a");
    link.href = "cont.html";
    link.textContent = "Contul meu";
    nota.append(link, ", cu statusul ei.");
  });
}

// =========================================================
// 2. Meniul lateral: cine este conectat
// =========================================================
const sideUser = document.getElementById("sideUser");
if (sideUser) {
  Auth.eu().then(u => {
    if (!u) return;
    document.getElementById("sideLogin")?.classList.add("d-none");   // conectat: ascundem „Intră în cont”
    sideUser.innerHTML = '<i class="bi bi-person-check-fill"></i> ';
    const nume = document.createElement("a");
    nume.href = Auth.paginaRol(u.rol);
    nume.textContent = u.rol === "admin" ? "Administrator" : u.prenume;
    const iesire = document.createElement("button");
    iesire.type = "button";
    iesire.className = "side-logout";
    iesire.textContent = "Deconectare";
    iesire.addEventListener("click", () => Auth.deconectare());
    sideUser.append(nume, iesire);
    sideUser.classList.remove("d-none");
  });
}

// =========================================================
// Telefonul animat din hero: conversație client ↔ service
// =========================================================
const MESAJ_CLIENT = "Bună, am o problemă la mașină, mă puteți ajuta?";
const MESAJ_SERVICE = "Bună, spune-ne problema ta printr-un mesaj sau oferă-ne mai multe detalii la numărul de contact.";

const chatBody = document.getElementById("chatBody");
const chatInput = document.getElementById("chatInputText");
const chatStatus = document.getElementById("chatStatus");
const chatSend = document.querySelector(".chat-send");

// pauză: await asteapta(1000) = așteaptă 1 secundă
const asteapta = ms => new Promise(rezolva => setTimeout(rezolva, ms));

// ora curentă, ex. "14:05"
function oraCurenta() {
  return new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });
}

// Creează o bulă de mesaj. tip = "client" sau "service"
function creeazaBula(text, tip) {
  const bula = document.createElement("div");
  bula.className = `bubble bubble-${tip}`;
  bula.textContent = text;

  const meta = document.createElement("span");
  meta.className = "bubble-meta";
  meta.textContent = oraCurenta() + " ";
  if (tip === "client") {
    const bifa = document.createElement("i");
    bifa.className = "bi bi-check2";   // o bifă = trimis
    meta.appendChild(bifa);
  }
  bula.appendChild(meta);
  return bula;
}

// Indicatorul „scrie...” (trei puncte animate)
function creeazaTyping() {
  const t = document.createElement("div");
  t.className = "typing";
  t.innerHTML = "<span></span><span></span><span></span>";
  return t;
}

// Readuce telefonul la starea inițială (doar eticheta „Astăzi”)
function reseteazaChat() {
  chatBody.querySelectorAll(".bubble, .typing").forEach(el => el.remove());
  chatBody.classList.remove("dispare");
  chatInput.textContent = "Mesaj";
  chatInput.classList.remove("scrie");
  chatStatus.textContent = "online";
}

// Scenariul complet, repetat la nesfârșit
async function pornesteChatul() {
  while (true) {
    reseteazaChat();
    await asteapta(1000);

    // 1. clientul scrie mesajul literă cu literă
    chatInput.classList.add("scrie");
    chatInput.textContent = "";
    for (const litera of MESAJ_CLIENT) {
      chatInput.textContent += litera;
      await asteapta(45);
    }
    await asteapta(400);

    // 2. apasă „Trimite”
    chatSend.classList.add("apasat");
    await asteapta(150);
    chatSend.classList.remove("apasat");
    chatInput.textContent = "Mesaj";
    chatInput.classList.remove("scrie");

    const bulaClient = creeazaBula(MESAJ_CLIENT, "client");
    chatBody.appendChild(bulaClient);
    const bifa = bulaClient.querySelector("i");

    // 3. bifele: livrat (două bife), apoi citit (albastre)
    await asteapta(700);
    bifa.className = "bi bi-check2-all";
    await asteapta(700);
    bifa.classList.add("citit");

    // 4. service-ul scrie...
    await asteapta(400);
    chatStatus.textContent = "scrie...";
    const typing = creeazaTyping();
    chatBody.appendChild(typing);
    await asteapta(2200);

    // 5. răspunsul service-ului
    typing.remove();
    chatStatus.textContent = "online";
    chatBody.appendChild(creeazaBula(MESAJ_SERVICE, "service"));

    // 6. pauză ca să poată fi citit, apoi o luăm de la capăt
    await asteapta(6000);
    chatBody.classList.add("dispare");
    await asteapta(600);
  }
}

if (chatBody && chatInput && chatStatus && chatSend) {
  // Dacă utilizatorul a cerut în sistem „mai puține animații”, arătăm direct conversația finală
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const bulaClient = creeazaBula(MESAJ_CLIENT, "client");
    bulaClient.querySelector("i").className = "bi bi-check2-all citit";
    chatBody.appendChild(bulaClient);
    chatBody.appendChild(creeazaBula(MESAJ_SERVICE, "service"));
  } else {
    pornesteChatul();
  }
}

// =========================================================
// Pagina Echipa: dacă lipsește poza unui membru, rămân inițialele
// =========================================================
document.querySelectorAll(".team-img").forEach(img => {
  const ascunde = () => img.classList.add("d-none");
  // poza poate să fi eșuat deja înainte să ruleze scriptul
  if (img.complete && img.naturalWidth === 0) ascunde();
  img.addEventListener("error", ascunde);
});
