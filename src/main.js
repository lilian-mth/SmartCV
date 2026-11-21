import { generateOrUpdateCv, analyzeCvText } from "./services/aiService.js";
import { extractTextFromPdf } from "./services/pdfParser.js";
import { renderCvHtml } from "./components/cvRenderer.js";
import { renderAnalysisHtml } from "./components/analysisRenderer.js";

// État global de l'application
const state = {
  lang: "fr",
  currentCvJson: null,
  showRawJson: false,
  selectedPdfFile: null,
};

// Éléments DOM — Navigation & Langue
const views = {
  home: document.getElementById("viewHome"),
  generator: document.getElementById("viewGenerator"),
  analyzer: document.getElementById("viewAnalyzer"),
};

function switchView(viewName) {
  Object.entries(views).forEach(([key, el]) => {
    el.classList.toggle("hidden", key !== viewName);
  });
}

document.getElementById("btnLogoHome").addEventListener("click", () => switchView("home"));
document.getElementById("cardGoGenerator").addEventListener("click", () => switchView("generator"));
document.getElementById("cardGoAnalyzer").addEventListener("click", () => switchView("analyzer"));

document.querySelectorAll("[data-nav]").forEach((btn) => {
  btn.addEventListener("click", () => switchView(btn.dataset.nav));
});

document.querySelectorAll(".lang-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.lang = btn.dataset.lang;
    document.querySelectorAll(".lang-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    if (state.currentCvJson) {
      updateCvDisplay();
    }
  });
});

// ==========================================
// VUE GÉNÉRATEUR DE CV
// ==========================================
const genForm = document.getElementById("genForm");
const genPromptInput = document.getElementById("genPromptInput");

function autoResizeTextarea() {
  genPromptInput.style.height = "auto";
  genPromptInput.style.height = `${Math.min(genPromptInput.scrollHeight, 180)}px`;
}

genPromptInput.addEventListener("input", autoResizeTextarea);
const genSubmitBtn = document.getElementById("genSubmitBtn");
const genStatus = document.getElementById("genStatus");
const genEmptyState = document.getElementById("genEmptyState");
const cvPreviewContainer = document.getElementById("cvPreviewContainer");
const cvRawJsonBox = document.getElementById("cvRawJsonBox");
const btnToggleRawJson = document.getElementById("btnToggleRawJson");
const btnExportPdf = document.getElementById("btnExportPdf");

function setGenStatus(msg, isError = false) {
  if (!msg) {
    genStatus.classList.add("hidden");
    genStatus.classList.remove("loading", "error");
    return;
  }
  genStatus.textContent = msg;
  genStatus.classList.remove("hidden");
  genStatus.classList.toggle("error", isError);
  genStatus.classList.toggle("loading", !isError);
}

function updateCvDisplay() {
  genEmptyState.classList.add("hidden");
  btnToggleRawJson.classList.remove("hidden");
  btnExportPdf.classList.remove("hidden");

  cvPreviewContainer.innerHTML = renderCvHtml(state.currentCvJson, state.lang);
  cvRawJsonBox.textContent = JSON.stringify(state.currentCvJson, null, 2);

  cvPreviewContainer.classList.toggle("hidden", state.showRawJson);
  cvRawJsonBox.classList.toggle("hidden", !state.showRawJson);
}

// Touche Entrée envoie le formulaire (Shift+Entrée fait un saut de ligne)
genPromptInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    genForm.requestSubmit();
  }
});

genForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const prompt = genPromptInput.value.trim();
  if (!prompt) return;

  genSubmitBtn.disabled = true;
  setGenStatus(state.currentCvJson ? "Mise à jour du CV en cours..." : "Génération du CV en cours...");

  try {
    const updatedCv = await generateOrUpdateCv(prompt, state.lang, state.currentCvJson);
    state.currentCvJson = updatedCv;
    genPromptInput.value = "";
    setGenStatus("");
    updateCvDisplay();
    autoResizeTextarea();
  } catch (err) {
    setGenStatus(err.message, true);
  } finally {
    genSubmitBtn.disabled = false;
    genPromptInput.focus();
  }
});

btnToggleRawJson.addEventListener("click", () => {
  state.showRawJson = !state.showRawJson;
  btnToggleRawJson.textContent = state.showRawJson ? "Voir Aperçu A4" : "Voir JSON";
  updateCvDisplay();
});

btnExportPdf.addEventListener("click", () => {
  window.print();
});

// ==========================================
// VUE ANALYSEUR DE CV PDF
// ==========================================
const dropZone = document.getElementById("dropZone");
const pdfFileInput = document.getElementById("pdfFileInput");
const dropZoneLabel = document.getElementById("dropZoneLabel");
const anaForm = document.getElementById("anaForm");
const targetRoleInput = document.getElementById("targetRoleInput");
const anaSubmitBtn = document.getElementById("anaSubmitBtn");
const anaStatus = document.getElementById("anaStatus");
const anaEmptyState = document.getElementById("anaEmptyState");
const analysisResultContainer = document.getElementById("analysisResultContainer");



function setAnaStatus(msg, isError = false) {
  if (!msg) {
    anaStatus.classList.add("hidden");
    anaStatus.classList.remove("loading", "error");
    return;
  }
  anaStatus.textContent = msg;
  anaStatus.classList.remove("hidden");
  anaStatus.classList.toggle("error", isError);
  anaStatus.classList.toggle("loading", !isError);
}

function handleSelectedFile(file) {
  if (!file || file.type !== "application/pdf") {
    setAnaStatus("Veuillez sélectionner uniquement un fichier PDF.", true);
    return;
  }
  state.selectedPdfFile = file;
  setAnaStatus("");
  dropZone.classList.add("has-file");
  dropZoneLabel.innerHTML = `Fichier prêt : <strong>${file.name}</strong> (${Math.round(file.size / 1024)} Ko)`;
}

dropZone.addEventListener("click", () => pdfFileInput.click());

pdfFileInput.addEventListener("change", (e) => {
  if (e.target.files[0]) handleSelectedFile(e.target.files[0]);
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("drag-over");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("drag-over");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag-over");
  if (e.dataTransfer.files[0]) handleSelectedFile(e.dataTransfer.files[0]);
});

anaForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const targetRole = targetRoleInput.value.trim();

  if (!state.selectedPdfFile) {
    setAnaStatus("Glissez ou sélectionnez d'abord votre CV au format PDF.", true);
    return;
  }
  if (!targetRole) return;

  anaSubmitBtn.disabled = true;
  setAnaStatus("Extraction du texte PDF et analyse IA en cours...");

  try {
    const rawText = await extractTextFromPdf(state.selectedPdfFile);
    const analysis = await analyzeCvText(rawText, targetRole, state.lang);

    anaEmptyState.classList.add("hidden");
    analysisResultContainer.innerHTML = renderAnalysisHtml(analysis, targetRole, state.lang);
    analysisResultContainer.classList.remove("hidden");
    setAnaStatus("");
  } catch (err) {
    setAnaStatus(err.message, true);
  } finally {
    anaSubmitBtn.disabled = false;
  }
});