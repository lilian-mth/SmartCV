import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Configuration obligatoire du worker pour le parsing côté navigateur
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * Extrait et nettoie le texte brut d'un fichier PDF côté client.
 * @param {File} file - Fichier PDF issu d'un input ou d'un drag & drop.
 * @returns {Promise<string>} Texte complet extrait du PDF.
 */
export async function extractTextFromPdf(file) {
  if (!file || file.type !== "application/pdf") {
    throw new Error("Veuillez sélectionner un fichier au format PDF valide.");
  }

  // Lecture du fichier en mémoire (ArrayBuffer) sans l'envoyer sur un serveur
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let fullText = "";

  // Parcours séquentiel de toutes les pages du document
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Reconstruction des lignes en préservant les sauts de ligne signalés par PDF.js
    const pageText = textContent.items
      .map((item) => item.str + (item.hasEOL ? "\n" : " "))
      .join("");

    fullText += pageText + "\n\n";
  }

  // Nettoyage des espaces multiples et lignes vides excessives
  const cleanedText = fullText
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Sécurité : détection des CV scannés (images sans couche texte) ou vides
  if (cleanedText.length < 50) {
    throw new Error(
      "Impossible d'extraire suffisamment de texte (moins de 50 caractères). Ce PDF est probablement une image scannée sans OCR."
    );
  }

  return cleanedText;
}