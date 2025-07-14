const form = document.getElementById("client-form");
const clientsDiv = document.getElementById("clients");
const historyDiv = document.getElementById("history");
const totalDisplay = document.getElementById("total");
const alertSound = document.getElementById("alertSound");

let total = parseFloat(localStorage.getItem("total")) || 0;
totalDisplay.textContent = `Total do dia: R$ ${total.toFixed(2)}`;

let activeClients = JSON.parse(localStorage.getItem("activeClients")) || [];
let clientHistory = JSON.parse(localStorage.getItem("clientHistory")) || [];

let clientPage = 0;
const clientsPerPage = 6;

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("name").value;
  const hours = parseInt(document.getElementById("hours").value);
  const payment = document.getElementById("payment").value;

  const now = new Date();
  const end = new Date(now.getTime() + hours * 60 * 60 * 1000);

  const client = {
    id: Date.now(),
    name,
    start: now.toISOString(),
    end: end.toISOString(),
    payment,
    hours,
    paused: false,
    remainingTime: null
  };

  activeClients.push(client);
  saveClients();
  renderClients();
  form.reset();
});

function renderClients() {
  clientsDiv.innerHTML = "";

  if (activeClients.length === 0) {
    clientsDiv.innerHTML = '<p style="text-align:center; color:gray;">Sem clientes ativos no momento.</p>';
    return;
  }

  const start = clientPage * clientsPerPage;
  const end = start + clientsPerPage;
  const clientsToShow = activeClients.slice(start, end);

  const container = document.createElement("div");
  container.className = "card-container";

  clientsToShow.forEach((client) => {
    const card = createClientCard(client);
    container.appendChild(card);
  });

  clientsDiv.appendChild(container);
  renderClientPagination();
}

function renderClientPagination() {
  const totalPages = Math.ceil(activeClients.length / clientsPerPage);
  if (totalPages <= 1) return;

  const controls = document.createElement("div");
  controls.className = "pagination-controls";

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "Anterior";
  prevBtn.disabled = clientPage === 0;
  prevBtn.onclick = () => {
    clientPage--;
    renderClients();
  };

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Próximo";
  nextBtn.disabled = clientPage >= totalPages - 1;
  nextBtn.onclick = () => {
    clientPage++;
    renderClients();
  };

  controls.appendChild(prevBtn);
  controls.appendChild(nextBtn);
  clientsDiv.appendChild(controls);
}

function createClientCard(client) {
  const card = document.createElement("div");
  card.className = "card";

  const startTime = new Date(client.start);
  let endTime = new Date(client.end);

  const info = document.createElement("div");
  info.className = "info";

  const saidaElement = document.createElement("p");
  saidaElement.innerHTML = `Saída prevista: ${endTime.toLocaleTimeString()}`;

  info.innerHTML = `
    <p><strong>${client.name}</strong></p>
    <p>Entrada: ${startTime.toLocaleTimeString()}</p>
  `;
  info.appendChild(saidaElement);
  info.innerHTML += `<p>Pagamento: ${client.payment}</p>`;

  const timer = document.createElement("div");
  timer.className = "timer";

  const updateTime = () => {
    const finished = updateTimer(timer, endTime);
    if (finished) {
      timer.textContent = "Tempo esgotado";
      timer.style.color = "red";
      alertSound?.play();
    }
  };

  let interval = setInterval(() => {
    if (!client.paused) updateTime();
  }, 1000);

  updateTime();

  const pauseBtn = document.createElement("button");
  pauseBtn.classList.add("pause-btn");
  pauseBtn.textContent = "Pausar";
  pauseBtn.onclick = () => {
    if (!client.paused) {
      client.remainingTime = endTime - new Date();
      client.paused = true;
      pauseBtn.textContent = "Retomar";
    } else {
      endTime = new Date(Date.now() + client.remainingTime);
      client.end = endTime.toISOString();
      client.remainingTime = null;
      client.paused = false;
      pauseBtn.textContent = "Pausar";
    }
    saveClients();
  };

  const doneBtn = document.createElement("button");
  doneBtn.className = "done-btn";
  doneBtn.textContent = "Encerrar";

  doneBtn.onclick = () => {
    const now = new Date();
    saidaElement.innerHTML = `<strong>Saída real:</strong> ${now.toLocaleTimeString()}`;
    clearInterval(interval);
    timer.textContent = "Encerrado";

    encerrarCliente(client, now, startTime);
  };

  card.appendChild(info);
  card.appendChild(timer);
  card.appendChild(pauseBtn);
  card.appendChild(doneBtn);

  return card;
}

function encerrarCliente(client, now, startTime) {
  const dia = String(now.getDate()).padStart(2, "0");
  const mes = String(now.getMonth() + 1).padStart(2, "0");
  const ano = now.getFullYear();
  const dataFormatada = `${dia}/${mes}/${ano}`;
  const dataId = `dia-${dia}-${mes}-${ano}`;

  let sectionDia = document.getElementById(dataId);
  if (!sectionDia) {
    const titulo = document.createElement("h3");
    titulo.textContent = `📅 Histórico do Dia ${dataFormatada}`;

    sectionDia = document.createElement("div");
    sectionDia.id = dataId;
    sectionDia.className = "historico-por-dia";

    historyDiv.appendChild(titulo);
    historyDiv.appendChild(sectionDia);
  }

  const clientRecord = {
    id: client.id,
    name: client.name,
    start: startTime.toISOString(),
    end: now.toISOString(),
    payment: client.payment,
    hours: client.hours
  };

  clientHistory.push(clientRecord);
  localStorage.setItem("clientHistory", JSON.stringify(clientHistory));

  total += client.hours * 5;
  totalDisplay.textContent = `Total do dia: R$ ${total.toFixed(2)}`;
  localStorage.setItem("total", total.toString());

  activeClients = activeClients.filter((c) => c.id !== client.id);
  saveClients();
  renderClients();
  renderSavedHistory();
}

function updateTimer(element, endTime) {
  const now = new Date();
  const diff = endTime - now;
  if (diff <= 0) {
    element.textContent = "00:00:00";
    return true;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  element.textContent = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return false;
}

function saveClients() {
  localStorage.setItem("activeClients", JSON.stringify(activeClients));
}

function renderSavedHistory() {
  historyDiv.innerHTML = "";

  if (clientHistory.length === 0) {
    historyDiv.innerHTML = '<p style="text-align:center; color:gray;">Não houve clientes hoje.</p>';
    return;
  }

  const grouped = {};
  clientHistory.forEach((client) => {
    const endTime = new Date(client.end);
    const key = `${endTime.getFullYear()}-${endTime.getMonth()}-${endTime.getDate()}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(client);
  });

  for (const key in grouped) {
    renderHistoryDay(grouped[key]);
  }
}

function renderHistoryDay(clients) {
  const endTime = new Date(clients[0].end);
  const dia = String(endTime.getDate()).padStart(2, "0");
  const mes = String(endTime.getMonth() + 1).padStart(2, "0");
  const ano = endTime.getFullYear();
  const dataFormatada = `${dia}/${mes}/${ano}`;
  const dataId = `dia-${dia}-${mes}-${ano}`;

  const titulo = document.createElement("h3");
  titulo.textContent = `📅 Histórico do Dia ${dataFormatada}`;

  const sectionDia = document.createElement("div");
  sectionDia.id = dataId;
  sectionDia.className = "historico-por-dia";

  let page = 0;
  const perPage = 6;

  const renderPage = () => {
    sectionDia.innerHTML = "";
    const container = document.createElement("div");
    container.className = "card-container";

    const slice = clients.slice(page * perPage, (page + 1) * perPage);
    slice.forEach((client) => {
      const startTime = new Date(client.start);
      const endTime = new Date(client.end);

      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="info">
          <p><strong>${client.name}</strong></p>
          <p>Entrada: ${startTime.toLocaleTimeString()}</p>
          <p>Saída real: ${endTime.toLocaleTimeString()}</p>
          <p>Pagamento: ${client.payment}</p>
          <p>Tempo contratado: ${client.hours}h</p>
          <p>Valor pago: R$ ${(client.hours * 5).toFixed(2)}</p>
        </div>
      `;

      // botão para renovar horas contratadas após o tempo esgotar
      const renewBtn = document.createElement("button");
      renewBtn.classList.add("renew-btn");
      renewBtn.textContent = "Renovar";
      renewBtn.onclick = () => {
        const inputHours = prompt(`Quantas horas deseja adicionar para ${client.name}?`, client.hours);
        const newHours = parseFloat(inputHours);

        if (isNaN(newHours) || newHours <= 0) {
          alert("Digite um valor válido.");
          return;
        }

        const newNow = new Date();
        const newEnd = new Date(newNow.getTime() + newHours * 60 * 60 * 1000);

        const renewedClient = {
          id: Date.now(),
          name: client.name,
          start: newNow.toISOString(),
          end: newEnd.toISOString(),
          payment: client.payment,
          hours: newHours,
          paused: false,
          remainingTime: null
        };

        activeClients.push(renewedClient);
        saveClients();
        renderClients();
        alert(`Cliente ${client.name} renovado com mais ${newHours}h.`);
      };


      card.appendChild(renewBtn);
      container.appendChild(card);
    });

    sectionDia.appendChild(container);

    const totalPages = Math.ceil(clients.length / perPage);
    if (totalPages > 1) {
      const controls = document.createElement("div");
      controls.className = "pagination-controls";

      const prevBtn = document.createElement("button");
      prevBtn.textContent = "Anterior";
      prevBtn.disabled = page === 0;
      prevBtn.onclick = () => {
        page--;
        renderPage();
      };

      const nextBtn = document.createElement("button");
      nextBtn.textContent = "Próximo";
      nextBtn.disabled = page >= totalPages - 1;
      nextBtn.onclick = () => {
        page++;
        renderPage();
      };

      controls.appendChild(prevBtn);
      controls.appendChild(nextBtn);
      sectionDia.appendChild(controls);
    }
  };

  renderPage();

  historyDiv.appendChild(titulo);
  historyDiv.appendChild(sectionDia);
}

renderClients();
renderSavedHistory();
