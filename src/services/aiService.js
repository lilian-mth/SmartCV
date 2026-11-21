import {
  getCvSystemPrompt,
  getAnalysisSystemPrompt,
  buildCvUserMessage,
  buildAnalysisUserMessage,
} from "./prompts.js";

/**
 * Fonction interne générique pour appeler le relais /api/chat et parser le JSON.
 */
async function callChatApi(messages) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, jsonMode: true }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Erreur serveur (${response.status})`);
  }

  try {
    // Nettoyage défensif au cas où le modèle entourerait quand même le JSON de ```json ... ```
    const cleanJsonString = data.result
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();

    return JSON.parse(cleanJsonString);
  } catch (parseErr) {
    console.error("Réponse brute invalide :", data.result);
    throw new Error("L'IA a renvoyé un format JSON invalide. Réessaie.");
  }
}

/**
 * Génère un nouveau CV ou met à jour un CV existant.
 * @param {string} userPrompt - Demande de l'utilisateur.
 * @param {'fr' | 'en'} lang - Langue du CV.
 * @param {object | null} currentCvJson - JSON du CV actuel (pour l'affinage conversationnel).
 */
export async function generateOrUpdateCv(userPrompt, lang = "fr", currentCvJson = null) {
  if (!userPrompt || !userPrompt.trim()) {
    throw new Error("Le prompt ne peut pas être vide.");
  }

  const messages = [
    { role: "system", content: getCvSystemPrompt(lang) },
    { role: "user", content: buildCvUserMessage(userPrompt, currentCvJson) },
  ];

  const cvData = await callChatApi(messages);

  // Vérification minimale des rubriques clés du contrat de données
  const requiredKeys = ["nom", "titre", "resume", "competences", "experiences", "projets", "formations"];
  for (const key of requiredKeys) {
    if (!(key in cvData)) {
      throw new Error(`Structure de CV incomplète : champ '${key}' manquant.`);
    }
  }

  return cvData;
}

/**
 * Analyse le texte brut d'un CV PDF par rapport à un poste cible.
 * @param {string} cvRawText - Texte extrait via pdfParser.js.
 * @param {string} targetRole - Intitulé du poste visé.
 * @param {'fr' | 'en'} lang - Langue de l'évaluation.
 */
export async function analyzeCvText(cvRawText, targetRole, lang = "fr") {
  if (!cvRawText || cvRawText.trim().length < 50) {
    throw new Error("Le texte du CV est trop court pour être analysé.");
  }
  if (!targetRole || !targetRole.trim()) {
    throw new Error("Veuillez indiquer un poste cible.");
  }

  const messages = [
    { role: "system", content: getAnalysisSystemPrompt(lang) },
    { role: "user", content: buildAnalysisUserMessage(cvRawText, targetRole) },
  ];

  const analysisData = await callChatApi(messages);

  // Validation minimale du schéma d'analyse
  if (
    typeof analysisData.score_global !== "number" ||
    !Array.isArray(analysisData.points_forts) ||
    !Array.isArray(analysisData.points_faibles) ||
    !Array.isArray(analysisData.suggestions_amelioration)
  ) {
    throw new Error("La structure de l'analyse renvoyée par l'IA est invalide.");
  }

  return analysisData;
}