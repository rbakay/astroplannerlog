// Simple AstroPlanner TSV parser + UI

const state = {
  search: "",
  type: "__all__",
  const: "__all__",
  scope: "__all__",
  date: "__all__",
};

let allLogs = [];
let visibleLimit = 20; // how many logs to show at once

const fileInput = document.getElementById("fileInput");
const fileLabel = document.getElementById("fileLabel");
const statsLogs = document.getElementById("statsLogs");
const statsObjects = document.getElementById("statsObjects");
const searchInput = document.getElementById("searchInput");
const typeFilter = document.getElementById("typeFilter");
const constFilter = document.getElementById("constFilter");
const scopeFilter = document.getElementById("scopeFilter");
const dateFilter = document.getElementById("dateFilter");
const logsList = document.getElementById("logsList");

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  fileLabel.textContent = file.name;

  const reader = new FileReader();
  reader.onload = (event) => {
    const text = event.target.result;
    localStorage.setItem("astroplannerlog:lastFileText", text);
    localStorage.setItem("astroplannerlog:lastFileName", file.name);
    handleNewData(text);
  };
  reader.readAsText(file, "utf-8");
});

searchInput.addEventListener("input", () => {
  state.search = searchInput.value.trim().toLowerCase();
  visibleLimit = 20;
  render();
});

typeFilter.addEventListener("change", () => {
  state.type = typeFilter.value;
  visibleLimit = 20;
  render();
});

constFilter.addEventListener("change", () => {
  state.const = constFilter.value;
  visibleLimit = 20;
  render();
});

scopeFilter.addEventListener("change", () => {
  state.scope = scopeFilter.value;
  visibleLimit = 20;
  render();
});

dateFilter.addEventListener("change", () => {
  state.date = dateFilter.value;
  visibleLimit = 20;
  render();
});

function handleNewData(text) {
  allLogs = parseAstroPlannerTSV(text);
  visibleLimit = 20;
  buildFilters(allLogs);
  render();
}

function parseAstroPlannerTSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (!lines.length) return [];

  const headerCells = lines[0].split("\t");
  const map = {};
  headerCells.forEach((h, idx) => {
    const key = h.trim().toLowerCase();
    map[key] = idx;
  });

  const getCell = (rowCells, key) => {
    const idx = map[key];
    if (idx == null) return "";
    return (rowCells[idx] || "").trim();
  };

  const logs = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split("\t");
    if (!cells.some((c) => c.trim() !== "")) continue;

    const id = getCell(cells, "id");
    const name = getCell(cells, "name");
    const type = getCell(cells, "type");
    const constellation = getCell(cells, "const");
    const telescope = getCell(cells, "telescope");
    const datetime = getCell(cells, "local date/time");
    const notes = getCell(cells, "notes");
    const rating = getCell(cells, "rating");
    const eyepiece = getCell(cells, "eyepiece");
    const filter = getCell(cells, "filter");
    const opticalAid = getCell(cells, "optical aid");
    const plan = getCell(cells, "plan");

    if (!id && !name && !notes) continue;

    logs.push({
      id,
      name,
      objectKey: id || name || "Unknown object",
      type,
      constellation,
      telescope,
      datetime,
      notes,
      rating,
      eyepiece,
      filter,
      opticalAid,
      plan,
    });
  }

  return logs;
}

function parseDateTime(str) {
  if (!str) return 0;
  const [datePart, timePart = "00:00"] = str.split(" ");
  const [d, m, y] = datePart.split(".").map((v) => parseInt(v, 10));
  const [hh, mm] = timePart.split(":").map((v) => parseInt(v, 10));
  if (!y || !m || !d) return 0;
  return new Date(y, (m || 1) - 1, d, hh || 0, mm || 0).getTime();
}

function buildFilters(logs) {
  const types = new Set();
  const consts = new Set();
  const scopes = new Set();
  const dates = new Set();

  logs.forEach((log) => {
    if (log.type) types.add(log.type);
    if (log.constellation) consts.add(log.constellation);
    if (log.telescope) scopes.add(log.telescope);
    if (log.datetime) {
      const datePart = log.datetime.split(" ")[0];
      if (datePart) dates.add(datePart);
    }
  });

  fillSelect(typeFilter, ["__all__", ...Array.from(types).sort()], "All types");
  fillSelect(constFilter, ["__all__", ...Array.from(consts).sort()], "All constellations");
  fillSelect(scopeFilter, ["__all__", ...Array.from(scopes).sort()], "All telescopes");

  const sortedDates = Array.from(dates).sort(
    (a, b) => parseDateTime(b + " 00:00") - parseDateTime(a + " 00:00")
  );
  fillSelect(dateFilter, ["__all__", ...sortedDates], "All dates");
}

function fillSelect(select, values, allLabel) {
  select.innerHTML = "";
  const frag = document.createDocumentFragment();

  const first = document.createElement("option");
  first.value = "__all__";
  first.textContent = allLabel;
  frag.appendChild(first);

  for (let i = 1; i < values.length; i++) {
    const v = values[i];
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    frag.appendChild(opt);
  }

  select.appendChild(frag);
}

function applyFilters(logs) {
  return logs.filter((log) => {
    if (state.type !== "__all__" && log.type !== state.type) return false;
    if (state.const !== "__all__" && log.constellation !== state.const) return false;
    if (state.scope !== "__all__" && log.telescope !== state.scope) return false;

    if (state.date !== "__all__") {
      const datePart = (log.datetime || "").split(" ")[0];
      if (datePart !== state.date) return false;
    }

    if (state.search) {
      const haystack =
        (log.id || "") +
        " " +
        (log.name || "") +
        " " +
        (log.notes || "") +
        " " +
        (log.type || "") +
        " " +
        (log.constellation || "") +
        " " +
        (log.telescope || "");
      if (!haystack.toLowerCase().includes(state.search)) return false;
    }

    return true;
  });
}

function render() {
  const filtered = applyFilters(allLogs);

  // сортируем все подходящие логи по дате (новые сверху)
  const sorted = filtered
    .slice()
    .sort((a, b) => parseDateTime(b.datetime) - parseDateTime(a.datetime));

  const totalLogs = sorted.length;
  const uniqueObjects = new Set(sorted.map((l) => l.objectKey));

  // статистика – по всем отфильтрованным логам
  statsLogs.textContent = `Logs: ${totalLogs}`;
  statsObjects.textContent = `Objects: ${uniqueObjects.size}`;

  logsList.innerHTML = "";

  // ограничиваем видимые записи
  const visible = sorted.slice(0, visibleLimit);

  visible.forEach((log, index) => {
    const card = document.createElement("article");
    card.className = "log-card";

    const header = document.createElement("div");
    header.className = "log-header";

    const main = document.createElement("div");
    main.className = "log-main";

    const objEl = document.createElement("div");
    objEl.className = "log-object";

    if (log.id && log.name && log.name !== log.id) {
      objEl.textContent = `${log.id} (${log.name})`;
    } else if (log.id) {
      objEl.textContent = log.id;
    } else if (log.name) {
      objEl.textContent = log.name;
    } else {
      objEl.textContent = "Unknown object";
    }

    const subEl = document.createElement("div");
    subEl.className = "log-subtitle";
    subEl.textContent = "";

    main.appendChild(objEl);
    if (subEl.textContent) main.appendChild(subEl);

    const pills = document.createElement("div");
    pills.className = "pills-row";

    if (log.type) {
      const t = document.createElement("span");
      t.className = "pill pill-type";
      t.textContent = log.type;
      pills.appendChild(t);
    }

    if (log.constellation) {
      const c = document.createElement("span");
      c.className = "pill pill-const";
      c.textContent = log.constellation;
      pills.appendChild(c);
    }

    const summary = document.createElement("div");
    summary.className = "log-summary-row";

    const dateEl = document.createElement("div");
    dateEl.className = "log-date";
    dateEl.textContent = log.datetime || "";

    const scopeEl = document.createElement("div");
    scopeEl.className = "log-scope";
    scopeEl.textContent = log.telescope || "";

    summary.appendChild(dateEl);
    summary.appendChild(scopeEl);

    const toggle = document.createElement("div");
    toggle.className = "log-toggle";
    toggle.textContent = "›";

    header.appendChild(main);
    header.appendChild(pills);
    header.appendChild(summary);
    header.appendChild(toggle);

    const details = document.createElement("div");
    details.className = "log-details";

    const detailsInner = document.createElement("div");
    detailsInner.className = "log-details-inner";

    if (log.notes) {
      const notes = document.createElement("p");
      notes.className = "log-notes";
      notes.textContent = log.notes;
      detailsInner.appendChild(notes);
    }

    const metaRow = document.createElement("div");
    metaRow.className = "log-meta-row";

    if (log.rating) {
      const span = document.createElement("span");
      span.textContent = `Rating: ${log.rating}`;
      metaRow.appendChild(span);
    }
    if (log.eyepiece) {
      const span = document.createElement("span");
      span.textContent = `Eyepiece: ${log.eyepiece}`;
      metaRow.appendChild(span);
    }
    if (log.filter) {
      const span = document.createElement("span");
      span.textContent = `Filter: ${log.filter}`;
      metaRow.appendChild(span);
    }
    if (log.opticalAid) {
      const span = document.createElement("span");
      span.textContent = `Optical aid: ${log.opticalAid}`;
      metaRow.appendChild(span);
    }
    if (log.plan) {
      const span = document.createElement("span");
      span.textContent = `Plan: ${log.plan}`;
      metaRow.appendChild(span);
    }

    if (metaRow.childNodes.length > 0) {
      detailsInner.appendChild(metaRow);
    }

    details.appendChild(detailsInner);

    header.addEventListener("click", () => {
      const expanded = card.classList.toggle("expanded");
      if (expanded) {
        details.style.maxHeight = detailsInner.offsetHeight + 20 + "px";
      } else {
        details.style.maxHeight = "0";
      }
    });

    card.appendChild(header);
    card.appendChild(details);

    logsList.appendChild(card);

    if (index === 0 && log.notes) {
      setTimeout(() => {
        card.classList.add("expanded");
        details.style.maxHeight = detailsInner.offsetHeight + 20 + "px";
      }, 0);
    }
  });

  if (!visible.length) {
    const empty = document.createElement("div");
    empty.className = "log-card";
    empty.innerHTML =
      '<div class="log-header"><div class="log-main"><div class="log-object">No logs match your filters</div><div class="log-subtitle">Try changing filters or search text.</div></div></div>';
    logsList.appendChild(empty);
  }

  // кнопка "Show more", если есть ещё логи
  if (totalLogs > visible.length) {
    const btnWrapper = document.createElement("div");
    btnWrapper.style.display = "flex";
    btnWrapper.style.justifyContent = "center";
    btnWrapper.style.margin = "8px 0 0";

    const btn = document.createElement("button");
    btn.textContent = "Show more";
    btn.style.borderRadius = "999px";
    btn.style.border = "1px solid rgba(116,140,255,0.6)";
    btn.style.background = "rgba(12,16,40,0.9)";
    btn.style.color = "#f8f9ff";
    btn.style.padding = "8px 18px";
    btn.style.fontSize = "14px";
    btn.style.cursor = "pointer";

    btn.addEventListener("click", () => {
      visibleLimit += 20;
      render();
    });

    btnWrapper.appendChild(btn);
    logsList.appendChild(btnWrapper);
  }
}

// Restore last file from localStorage (for offline reopen)
document.addEventListener("DOMContentLoaded", () => {
  const lastText = localStorage.getItem("astroplannerlog:lastFileText");
  const lastName = localStorage.getItem("astroplannerlog:lastFileName");
  if (lastText) {
    if (lastName) fileLabel.textContent = lastName;
    handleNewData(lastText);
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("./service-worker.js")
        .then((registration) => {
          registration.update();
        })
        .catch((err) => console.error("SW registration failed", err));
    });
  }
});
