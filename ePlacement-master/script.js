const navItems = Array.from(document.querySelectorAll(".nav-item"));
const pages = {
  home: document.getElementById("home-page"),
  clinics: document.getElementById("clinics-page"),
  simulation: document.getElementById("simulation-page"),
  placement: document.getElementById("placement-page"),
};

const PAGE_LABELS = {
  home: "Home",
  clinics: "Clinic Dashboard",
  simulation: "Simulation",
  placement: "Penempatan Calon · Simulation",
};

const SIM_STORAGE_KEY = "eplacement-simulation-state";
const PLAYER_NAME_STORAGE_KEY = "eplacement-player-name";
const LEADERBOARD_STORAGE_KEY = "eplacement-simulation-leaderboard";
const CURRENT_TAB_KEY = "eplacement-current-tab";
localStorage.removeItem("eplacement-fixed-selangor-clinics");

function getMalaysiaDateStamp() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

const simulationDate = getMalaysiaDateStamp();
const SIM_BASE_TIME = new Date(`${simulationDate}T11:59:50+08:00`).getTime();
const SIM_OPEN_TIME = new Date(`${simulationDate}T12:00:00+08:00`).getTime();
const SIM_WAIT_MS = SIM_OPEN_TIME - SIM_BASE_TIME;
let simulationState = loadSimulationState();
let unlockedOnThisLoad = isSimulationOpen();

function loadSimulationState() {
  try {
    const saved = localStorage.getItem(SIM_STORAGE_KEY);
    return saved ? JSON.parse(saved) : { status: "ready" };
  } catch {
    return { status: "ready" };
  }
}

function saveSimulationState() {
  localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify(simulationState));
}

function loadLeaderboard() {
  try {
    const saved = JSON.parse(localStorage.getItem(LEADERBOARD_STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

let leaderboardEntries = loadLeaderboard();

function saveLeaderboard() {
  localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(leaderboardEntries));
}

function isSimulationRunning() {
  return simulationState.status === "running";
}

function isSimulationEnded() {
  return simulationState.status === "ended";
}

function getOpenRealTime() {
  return isSimulationRunning() || isSimulationEnded()
    ? simulationState.startedAt + SIM_WAIT_MS
    : null;
}

function isSimulationOpen() {
  const openRealTime = getOpenRealTime();
  return Boolean(openRealTime && Date.now() >= openRealTime);
}

function getSimulatedNow() {
  if (isSimulationRunning()) {
    return new Date(SIM_BASE_TIME + Date.now() - simulationState.startedAt);
  }

  if (isSimulationEnded()) {
    return new Date(SIM_BASE_TIME + simulationState.completedAt - simulationState.startedAt);
  }

  return new Date(SIM_BASE_TIME);
}

function setTab(tabName) {
  const current = pages[tabName] ? tabName : "home";
  document.body.dataset.currentTab = current;
  localStorage.setItem(CURRENT_TAB_KEY, current);
  const pageLabel = document.getElementById("pageLabel");
  if (pageLabel) pageLabel.textContent = PAGE_LABELS[current];

  if (current === "placement" && isSimulationOpen()) {
    unlockedOnThisLoad = true;
  }

  navItems.forEach((item) => {
    item.classList.toggle("active", item.dataset.tab === current);
  });

  Object.entries(pages).forEach(([name, page]) => {
    page.classList.toggle("active", name === current);
  });

  updatePlacementAvailability();
  window.scrollTo({ top: 0, behavior: "auto" });
}

navItems.forEach((item) => {
  item.addEventListener("click", () => setTab(item.dataset.tab));
});

document.querySelectorAll("[data-tab-link]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    setTab(link.dataset.tabLink);
  });
});

const sourceFacilityData = Array.isArray(window.GIRET_FACILITY_DATA)
  ? window.GIRET_FACILITY_DATA
  : [];

const allClinicRecords = sourceFacilityData
  .flatMap((entry) => entry.clinics.map((clinic) => ({ ...clinic, state: entry.state })))
  .sort((a, b) =>
    a.state.localeCompare(b.state)
    || a.district.localeCompare(b.district)
    || a.name.localeCompare(b.name)
  );

function initializeClinicDashboard() {
  const tableBody = document.getElementById("clinicTableBody");
  const searchInput = document.getElementById("clinicSearch");
  const stateFilter = document.getElementById("stateFilter");
  const districtFilter = document.getElementById("districtFilter");
  const resultCount = document.getElementById("clinicResultCount");
  const emptyState = document.getElementById("clinicEmpty");
  if (!tableBody || !searchInput || !stateFilter || !districtFilter) return;

  [...new Set(allClinicRecords.map((clinic) => clinic.state))]
    .sort((a, b) => a.localeCompare(b))
    .forEach((state) => stateFilter.add(new Option(state, state)));

  function updateDistrictOptions() {
    const selectedState = stateFilter.value;
    const currentDistrict = districtFilter.value;
    const districts = [...new Set(allClinicRecords
      .filter((clinic) => !selectedState || clinic.state === selectedState)
      .map((clinic) => clinic.district))]
      .sort((a, b) => a.localeCompare(b));
    districtFilter.replaceChildren(new Option("All districts", ""));
    districts.forEach((district) => districtFilter.add(new Option(district, district)));
    if (districts.includes(currentDistrict)) districtFilter.value = currentDistrict;
  }

  function renderClinicTable() {
    const query = searchInput.value.trim().toLocaleLowerCase("en-MY");
    const selectedState = stateFilter.value;
    const selectedDistrict = districtFilter.value;
    const matches = allClinicRecords.filter((clinic) => {
      const searchable = `${clinic.name} ${clinic.code} ${clinic.district} ${clinic.state}`.toLocaleLowerCase("en-MY");
      return (!query || searchable.includes(query))
        && (!selectedState || clinic.state === selectedState)
        && (!selectedDistrict || clinic.district === selectedDistrict);
    });

    const fragment = document.createDocumentFragment();
    matches.forEach((clinic) => {
      const row = document.createElement("tr");
      [clinic.name, clinic.code, clinic.district, clinic.state].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      fragment.appendChild(row);
    });
    tableBody.replaceChildren(fragment);
    if (resultCount) resultCount.textContent = matches.length.toLocaleString("en-MY");
    if (emptyState) emptyState.classList.toggle("hidden", matches.length > 0);
  }

  searchInput.addEventListener("input", renderClinicTable);
  stateFilter.addEventListener("change", () => {
    updateDistrictOptions();
    renderClinicTable();
  });
  districtFilter.addEventListener("change", renderClinicTable);
  updateDistrictOptions();
  renderClinicTable();

}

const STATE_DISPLAY_ORDER = [
  "MELAKA",
  "PERLIS",
  "WP KUALA LUMPUR",
  "PAHANG",
  "SABAH",
  "NEGERI SEMBILAN",
  "KELANTAN",
  "TERENGGANU",
  "SELANGOR",
  "PULAU PINANG",
  "WP PUTRAJAYA",
  "WP LABUAN",
  "PERAK",
  "SARAWAK",
  "JOHOR",
  "KEDAH",
  "ILK",
];

// Simulation assumption: a typical competing candidate confirms in about 18 seconds.
// Demand multipliers shorten this for popular states; KKM does not publish live timing data.
const BASE_COMPETITOR_PICK_MS = 18000;
const MIN_COMPETITOR_REACTION_MS = 2000;
const COMPETITOR_CLAIM_RATE = 0.88;
const STATE_DEMAND_MULTIPLIERS = {
  "WP KUALA LUMPUR": 2.3,
  "SELANGOR": 2,
  "WP PUTRAJAYA": 1.6,
  "PULAU PINANG": 1.4,
  "JOHOR": 1.3,
  "MELAKA": 1.15,
  "PERAK": 1.1,
};

function createSimulationSeed() {
  if (window.crypto?.getRandomValues) {
    return window.crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return Math.floor(Math.random() * 0x100000000);
}

function createSeededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 0x100000000;
  };
}

function shuffleWithRandom(items, random) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function getAvailableClinicCount(totalClinics, random) {
  const availabilityRate = 0.15 + random() * 0.1;
  return Math.max(1, Math.min(totalClinics, Math.round(totalClinics * availabilityRate)));
}

function getCompetitorClaimAfterMs(state, random) {
  if (random() > COMPETITOR_CLAIM_RATE) return null;
  const demandMultiplier = STATE_DEMAND_MULTIPLIERS[state] || 1;
  const variableMean = (BASE_COMPETITOR_PICK_MS - MIN_COMPETITOR_REACTION_MS) / demandMultiplier;
  return Math.round(MIN_COMPETITOR_REACTION_MS - Math.log(1 - random()) * variableMean);
}

function buildRandomizedFacilityData(seed) {
  const random = createSeededRandom(seed);
  return [...sourceFacilityData]
    .sort((a, b) => STATE_DISPLAY_ORDER.indexOf(a.state) - STATE_DISPLAY_ORDER.indexOf(b.state))
    .map((entry) => {
    const shuffledClinics = shuffleWithRandom(entry.clinics, random);
    const availableCount = getAvailableClinicCount(shuffledClinics.length, random);
    return {
      ...entry,
      totalClinics: entry.clinics.length,
      clinics: shuffledClinics.slice(0, availableCount).map((clinic) => ({
        ...clinic,
        competitorClaimAfterMs: getCompetitorClaimAfterMs(entry.state, random),
      })),
    };
  });
}

if ((isSimulationRunning() || isSimulationEnded()) && !Number.isInteger(simulationState.facilitySeed)) {
  simulationState = { ...simulationState, facilitySeed: createSimulationSeed() };
  saveSimulationState();
}

let facilityData = buildRandomizedFacilityData(simulationState.facilitySeed ?? 0);

let selectedPlacement = "";
let selectedPlacementCode = "";
let rerenderFacilityOptions = () => {};
let refreshCompetitorAvailability = () => {};
const cascade = document.getElementById("facilityCascade");

if (cascade) {
  const trigger = cascade.querySelector(".cascade-trigger");
  const cascadeMenu = cascade.querySelector(".cascade-menu");
  const selected = document.getElementById("facilitySelected");
  const stateList = document.getElementById("stateList");
  const categoryList = document.getElementById("categoryList");
  const clinicList = document.getElementById("clinicList");
  let activeStateIndex = -1;

  function setColumnEmpty(column, isEmpty) {
    column.classList.toggle("empty", isEmpty);
  }

  function showNextMobileColumn(column) {
    if (!window.matchMedia("(max-width: 760px)").matches) return;
    requestAnimationFrame(() => {
      cascadeMenu.scrollTo({ left: column.offsetLeft, behavior: "smooth" });
    });
  }

  function createOption(text, onHover, onClick, isActive = false) {
    const option = document.createElement("button");
    option.className = `cascade-option${isActive ? " active" : ""}`;
    option.type = "button";
    option.textContent = text;

    const arrow = document.createElement("span");
    arrow.className = "arrow";
    arrow.textContent = ">";
    option.appendChild(arrow);

    option.addEventListener("mouseenter", onHover);
    option.addEventListener("focus", onHover);
    option.addEventListener("click", onClick || onHover);
    return option;
  }

  function getCompetitorElapsedMs() {
    const openRealTime = getOpenRealTime();
    if (!openRealTime) return 0;
    const currentTime = isSimulationEnded() ? simulationState.completedAt : Date.now();
    return Math.max(0, currentTime - openRealTime);
  }

  function isClinicClaimed(clinic) {
    return clinic.competitorClaimAfterMs !== null
      && getCompetitorElapsedMs() >= clinic.competitorClaimAfterMs;
  }

  function getOpenClinicCount(entry) {
    return entry.clinics.filter((clinic) => !isClinicClaimed(clinic)).length;
  }

  function renderStates() {
    stateList.textContent = "";
    facilityData.forEach((entry, index) => {
      const option = createOption(
        `${entry.state} (${getOpenClinicCount(entry)})`,
        () => activateState(index),
        () => activateState(index),
        index === activeStateIndex
      );
      option.dataset.stateIndex = String(index);
      stateList.appendChild(option);
    });
  }

  function activateState(index, advanceOnMobile = true) {
    activeStateIndex = index;
    stateList.querySelectorAll(".cascade-option").forEach((option) => {
      option.classList.toggle("active", Number(option.dataset.stateIndex) === index);
    });
    renderCategory();
    clinicList.textContent = "";
    setColumnEmpty(clinicList, true);
    if (advanceOnMobile) showNextMobileColumn(categoryList);
  }

  function renderCategory() {
    const entry = facilityData[activeStateIndex];
    categoryList.textContent = "";
    setColumnEmpty(categoryList, !entry);

    if (!entry) return;

    const option = createOption(
      `Klinik Pergigian (${getOpenClinicCount(entry)})`,
      renderClinics,
      renderClinics,
      true
    );
    categoryList.appendChild(option);
  }

  function renderClinics() {
    const entry = facilityData[activeStateIndex];
    clinicList.textContent = "";
    setColumnEmpty(clinicList, !entry);

    if (!entry) return;

    const nameCounts = entry.clinics.reduce((counts, clinic) => {
      counts.set(clinic.name, (counts.get(clinic.name) || 0) + 1);
      return counts;
    }, new Map());

    entry.clinics.forEach((clinic) => {
      const clinicLabel = nameCounts.get(clinic.name) > 1
        ? `${clinic.name} (${clinic.district})`
        : clinic.name;
      const isClaimed = isClinicClaimed(clinic);
      const option = document.createElement("button");
      option.className = `cascade-option${isClaimed ? " disabled" : ""}`;
      option.type = "button";
      option.dataset.clinicCode = clinic.code;
      option.dataset.clinicLabel = clinicLabel;
      option.disabled = isClaimed;
      option.textContent = isClaimed ? `${clinicLabel} (Telah dipilih)` : clinicLabel;
      if (isClaimed) option.title = "Klinik ini telah dipilih oleh calon lain";
      option.addEventListener("click", () => {
        selectedPlacement = clinicLabel;
        selectedPlacementCode = clinic.code;
        const openCount = getOpenClinicCount(entry);
        selected.textContent = `${entry.state} (${openCount}) / Klinik Pergigian (${openCount}) / ${clinicLabel} (1)`;
        cascade.classList.remove("open");
        trigger.setAttribute("aria-expanded", "false");
        trigger.blur();
      });
      clinicList.appendChild(option);
    });
    showNextMobileColumn(clinicList);
  }

  trigger.addEventListener("click", () => {
    const isOpen = cascade.classList.toggle("open");
    trigger.setAttribute("aria-expanded", String(isOpen));
    if (isOpen) {
      stateList.scrollTop = 0;
      cascadeMenu.scrollLeft = 0;
    }
    if (isOpen && activeStateIndex === -1) {
      activateState(0, false);
    }
  });

  document.addEventListener("click", (event) => {
    if (!cascade.contains(event.target)) {
      cascade.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    }
  });

  rerenderFacilityOptions = () => {
    activeStateIndex = -1;
    renderStates();
    stateList.scrollTop = 0;
    categoryList.textContent = "";
    clinicList.textContent = "";
    setColumnEmpty(categoryList, true);
    setColumnEmpty(clinicList, true);
  };

  refreshCompetitorAvailability = () => {
    if (!isSimulationOpen()) return;

    const selectedClinic = facilityData
      .flatMap((entry) => entry.clinics)
      .find((clinic) => clinic.code === selectedPlacementCode);
    if (selectedClinic && isClinicClaimed(selectedClinic)) {
      selectedPlacement = "";
      selectedPlacementCode = "";
      selected.textContent = "Pilihan telah diambil. Sila pilih semula";
      setPlacementWorkflowStage("placement");
    }

    if (cascade.classList.contains("open")) {
      stateList.querySelectorAll(".cascade-option").forEach((option) => {
        const entry = facilityData[Number(option.dataset.stateIndex)];
        if (entry && option.firstChild) {
          option.firstChild.nodeValue = `${entry.state} (${getOpenClinicCount(entry)})`;
        }
      });

      const activeEntry = facilityData[activeStateIndex];
      const categoryOption = categoryList.querySelector(".cascade-option");
      if (activeEntry && categoryOption?.firstChild) {
        categoryOption.firstChild.nodeValue = `Klinik Pergigian (${getOpenClinicCount(activeEntry)})`;
      }

      clinicList.querySelectorAll(".cascade-option").forEach((option) => {
        const clinic = activeEntry?.clinics.find((item) => item.code === option.dataset.clinicCode);
        if (!clinic) return;
        const isClaimed = isClinicClaimed(clinic);
        option.disabled = isClaimed;
        option.classList.toggle("disabled", isClaimed);
        option.textContent = isClaimed
          ? `${option.dataset.clinicLabel} (Telah dipilih)`
          : option.dataset.clinicLabel;
        option.title = isClaimed ? "Klinik ini telah dipilih oleh calon lain" : "";
      });
    }
  };

  rerenderFacilityOptions();
}

const placementTitle = document.getElementById("placement-title");
const placementSelectionStage = document.getElementById("placementSelectionStage");
const acknowledgementStage = document.getElementById("acknowledgementStage");
const choiceTimer = document.getElementById("choiceTimer");
const stepOne = document.getElementById("stepOne");
const stepTwo = document.getElementById("stepTwo");
const stepThree = document.getElementById("stepThree");
const stepOneDot = document.getElementById("stepOneDot");
const stepLineOne = document.getElementById("stepLineOne");
const stepLineTwo = document.getElementById("stepLineTwo");
const ackPlacement = document.getElementById("ackPlacement");
const successToast = document.getElementById("successToast");
const toAcknowledgement = document.getElementById("toAcknowledgement");
const backToPlacement = document.getElementById("backToPlacement");
const confirmApplication = document.getElementById("confirmApplication");
const acknowledgementCheckbox = document.getElementById("acknowledgementCheckbox");
const placementPanel = document.querySelector(".placement-panel");
const placementLiveContent = document.getElementById("placementLiveContent");
const placementLocked = document.getElementById("placementLocked");
const startSimulation = document.getElementById("startSimulation");
const retrySimulation = document.getElementById("retrySimulation");
const retrySimulationPlacement = document.getElementById("retrySimulationPlacement");
const simulationStatus = document.getElementById("simulationStatus");
const simulationResult = document.getElementById("simulationResult");
const simulationResultActions = document.getElementById("simulationResultActions");
const simulationPlayerName = document.getElementById("simulationPlayerName");
const leaderboardBody = document.getElementById("leaderboardBody");
const clearLeaderboard = document.getElementById("clearLeaderboard");

function renderLeaderboard() {
  if (!leaderboardBody) return;

  leaderboardBody.textContent = "";
  const sortedEntries = [...leaderboardEntries]
    .sort((a, b) => a.durationMs - b.durationMs)
    .slice(0, 10);

  if (sortedEntries.length === 0) {
    const row = document.createElement("tr");
    row.className = "leaderboard-empty";
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "No completed practice runs yet.";
    row.appendChild(cell);
    leaderboardBody.appendChild(row);
    return;
  }

  sortedEntries.forEach((entry, index) => {
    const row = document.createElement("tr");
    const values = [
      String(index + 1),
      entry.playerName,
      entry.clinicName || "—",
      formatDuration(entry.durationMs),
      new Intl.DateTimeFormat("en-MY", {
        dateStyle: "medium",
        timeStyle: "medium",
        timeZone: "Asia/Kuala_Lumpur",
      }).format(new Date(entry.completedAt)),
    ];
    values.forEach((value) => {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.appendChild(cell);
    });
    leaderboardBody.appendChild(row);
  });
}

if (simulationPlayerName) {
  simulationPlayerName.value = isSimulationRunning() || isSimulationEnded()
    ? simulationState.playerName || ""
    : localStorage.getItem(PLAYER_NAME_STORAGE_KEY) || "";
  simulationPlayerName.addEventListener("input", () => {
    simulationPlayerName.setCustomValidity("");
    localStorage.setItem(PLAYER_NAME_STORAGE_KEY, simulationPlayerName.value);
  });
}

function setPlacementWorkflowStage(stage) {
  const isAcknowledgement = stage === "acknowledgement";

  placementTitle.textContent = isAcknowledgement ? "Pengakuan" : "Penempatan";
  placementSelectionStage.classList.toggle("active", !isAcknowledgement);
  acknowledgementStage.classList.toggle("active", isAcknowledgement);
  choiceTimer.classList.toggle("hidden", !isAcknowledgement);
  successToast.classList.remove("show");

  stepOne.className = `step ${isAcknowledgement ? "done" : "current"}`;
  stepTwo.className = `step ${isAcknowledgement ? "current" : "upcoming"}`;
  stepThree.className = "step upcoming";
  stepOneDot.textContent = isAcknowledgement ? "✓" : "1";
  stepLineOne.classList.toggle("done", isAcknowledgement);
  stepLineTwo.classList.remove("done");

  if (isAcknowledgement) {
    ackPlacement.textContent = selectedPlacement || "-";
  }
}

function formatDuration(ms) {
  const totalMs = Math.max(0, ms);
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const centiseconds = Math.floor((totalMs % 1000) / 10);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

function getPracticeDuration() {
  const openRealTime = getOpenRealTime();
  const completedAt = isSimulationEnded() ? simulationState.completedAt : Date.now();
  return openRealTime ? completedAt - openRealTime : 0;
}

function resetPlacementWorkflow() {
  selectedPlacement = "";
  selectedPlacementCode = "";
  const selected = document.getElementById("facilitySelected");
  if (selected) selected.textContent = "Select";
  if (ackPlacement) ackPlacement.textContent = "-";
  if (acknowledgementCheckbox) acknowledgementCheckbox.checked = false;
  if (confirmApplication) confirmApplication.disabled = true;
  if (cascade) {
    cascade.classList.remove("open");
    cascade.querySelector(".cascade-trigger").setAttribute("aria-expanded", "false");
  }
  setPlacementWorkflowStage("placement");
}

function updateSimulationControls() {
  startSimulation.classList.toggle("hidden", isSimulationRunning() || isSimulationEnded());
  retrySimulation.classList.toggle("hidden", !isSimulationEnded());
  retrySimulationPlacement.classList.toggle("hidden", !isSimulationEnded());
  simulationResult.classList.toggle("hidden", !isSimulationEnded());
  simulationResultActions.classList.toggle("hidden", !isSimulationEnded());
  if (simulationPlayerName) {
    simulationPlayerName.disabled = isSimulationRunning() || isSimulationEnded();
  }

  if (simulationState.status === "ready") {
    simulationStatus.textContent = "The simulation clock starts at 11:59:50 AM.";
  } else if (isSimulationRunning()) {
    const openRealTime = getOpenRealTime();
    const remaining = Math.max(0, openRealTime - Date.now());
    simulationStatus.textContent = remaining > 0
      ? `Simulation running. The placement form opens in ${Math.ceil(remaining / 1000)} seconds.`
      : "The placement form is open. Select “Penempatan Calon” in the sidebar to continue.";
  } else {
    const duration = formatDuration(getPracticeDuration());
    simulationStatus.textContent = `Practice complete. Your time: ${duration}.`;
    simulationResult.textContent = `Practice complete. Your time: ${duration}.`;
  }
}

function updatePlacementAvailability() {
  const canShowPlacement = isSimulationEnded() || (isSimulationRunning() && unlockedOnThisLoad);
  placementPanel.classList.toggle("locked", !canShowPlacement);
  placementLiveContent.classList.toggle("hidden", !canShowPlacement);
  placementLocked.classList.toggle("hidden", canShowPlacement);
}

function startSimulationRun() {
  const playerName = simulationPlayerName?.value.trim() || "";
  if (!playerName) {
    simulationPlayerName?.setCustomValidity("Please enter the simulation player's name.");
    simulationPlayerName?.reportValidity();
    simulationPlayerName?.focus();
    return;
  }
  simulationPlayerName.setCustomValidity("");
  localStorage.setItem(PLAYER_NAME_STORAGE_KEY, playerName);
  simulationState = {
    status: "running",
    startedAt: Date.now(),
    facilitySeed: createSimulationSeed(),
    playerName,
  };
  facilityData = buildRandomizedFacilityData(simulationState.facilitySeed);
  rerenderFacilityOptions();
  unlockedOnThisLoad = false;
  saveSimulationState();
  resetPlacementWorkflow();
  updateClock();
  updateSimulationControls();
  updatePlacementAvailability();
}

function retrySimulationRun() {
  simulationState = { status: "ready" };
  unlockedOnThisLoad = false;
  saveSimulationState();
  resetPlacementWorkflow();
  updateClock();
  updateSimulationControls();
  updatePlacementAvailability();
  setTab("simulation");
}

if (toAcknowledgement) {
  toAcknowledgement.addEventListener("click", () => {
    refreshCompetitorAvailability();
    if (!selectedPlacement) {
      cascade.classList.add("open");
      cascade.querySelector(".cascade-trigger").setAttribute("aria-expanded", "true");
      return;
    }

    setPlacementWorkflowStage("acknowledgement");
  });
}

if (backToPlacement) {
  backToPlacement.addEventListener("click", () => setPlacementWorkflowStage("placement"));
}

if (acknowledgementCheckbox && confirmApplication) {
  confirmApplication.disabled = !acknowledgementCheckbox.checked;
  acknowledgementCheckbox.addEventListener("change", () => {
    confirmApplication.disabled = !acknowledgementCheckbox.checked;
  });
}

if (confirmApplication) {
  confirmApplication.addEventListener("click", () => {
    if (!acknowledgementCheckbox?.checked) return;
    refreshCompetitorAvailability();
    if (!selectedPlacement) return;

    if (isSimulationRunning()) {
      const completedAt = Date.now();
      simulationState = {
        ...simulationState,
        status: "ended",
        completedAt,
      };
      saveSimulationState();
      leaderboardEntries.push({
        playerName: simulationState.playerName || "Unknown Player",
        clinicName: selectedPlacement,
        durationMs: getPracticeDuration(),
        completedAt,
      });
      saveLeaderboard();
      renderLeaderboard();
    }
    successToast.classList.add("show");
    updateSimulationControls();
    updatePlacementAvailability();
  });
}

if (startSimulation) {
  startSimulation.addEventListener("click", startSimulationRun);
}

if (retrySimulation) {
  retrySimulation.addEventListener("click", retrySimulationRun);
}

if (retrySimulationPlacement) {
  retrySimulationPlacement.addEventListener("click", retrySimulationRun);
}

if (clearLeaderboard) {
  clearLeaderboard.addEventListener("click", () => {
    if (leaderboardEntries.length === 0) return;
    if (!window.confirm("Clear all practice results saved in this browser?")) return;
    leaderboardEntries = [];
    saveLeaderboard();
    renderLeaderboard();
  });
}

const menuToggle = document.getElementById("menuToggle");
const sidebarClose = document.getElementById("sidebarClose");
if (menuToggle) {
  menuToggle.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("sidebar-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });
  navItems.forEach((item) => item.addEventListener("click", () => {
    document.body.classList.remove("sidebar-open");
    menuToggle.setAttribute("aria-expanded", "false");
  }));
}

if (sidebarClose && menuToggle) {
  sidebarClose.addEventListener("click", () => {
    document.body.classList.remove("sidebar-open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.focus();
  });
}

renderLeaderboard();
initializeClinicDashboard();
function updateClock() {
  const clock = document.getElementById("clock");
  const now = getSimulatedNow();
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Kuala_Lumpur",
  }).formatToParts(now);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  if (clock) {
    clock.textContent = `${values.day}/${values.month}/${values.year} ${values.hour}:${values.minute}:${values.second} ${values.dayPeriod}`;
  }
  updateSimulationControls();
  updatePlacementAvailability();
  refreshCompetitorAvailability();
}

setTab(localStorage.getItem(CURRENT_TAB_KEY) || "home");
updateClock();
setInterval(updateClock, 1000);
