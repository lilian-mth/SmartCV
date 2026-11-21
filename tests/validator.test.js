import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getCvSystemPrompt, getAnalysisSystemPrompt, buildCvUserMessage } from "../src/services/prompts.js";

/**
 * Fonctions de validation structurelle des sorties IA
 */
function validateCvSchema(cv) {
  const requiredKeys = ["nom", "titre", "resume", "competences", "experiences", "projets", "formations"];
  for (const key of requiredKeys) {
    if (!(key in cv)) return false;
  }
  return (
    typeof cv.nom === "string" &&
    cv.nom.trim().length > 0 &&
    Array.isArray(cv.competences) &&
    Array.isArray(cv.experiences) &&
    Array.isArray(cv.projets) &&
    Array.isArray(cv.formations)
  );
}

function validateAnalysisSchema(analysis) {
  return (
    typeof analysis.score_global === "number" &&
    analysis.score_global >= 0 &&
    analysis.score_global <= 100 &&
    typeof analysis.adequation_poste === "string" &&
    Array.isArray(analysis.points_forts) &&
    analysis.points_forts.length > 0 &&
    Array.isArray(analysis.points_faibles) &&
    analysis.points_faibles.length > 0 &&
    Array.isArray(analysis.suggestions_amelioration) &&
    analysis.suggestions_amelioration.length > 0
  );
}

function validateExtractedPdfText(text) {
  if (!text || text.trim().length < 50) {
    throw new Error("PDF vide ou scanné sans couche texte.");
  }
  return true;
}

describe("SmartCV - Tests de validation & Prompts", () => {
  it("1. Valide qu'un objet CV contient bien les 7 rubriques requises", () => {
    const validCv = {
      nom: "Camille Laurent",
      titre: "Développeur Python & Cybersécurité",
      resume: "Développeur Python avec 3 ans d'expérience en sécurité applicative.",
      competences: ["Python", "Docker", "Linux"],
      experiences: [{ poste: "Ingénieur Sécurité", entreprise: "CyberSAS", periode: "2023-2026", missions: ["Audit"] }],
      projets: [{ nom: "Scanner", description: "CLI Python", technologies: ["Python"] }],
      formations: [{ diplome: "Cycle Ingénieur", etablissement: "EFREI Paris", annee: "2026" }],
    };

    assert.equal(validateCvSchema(validCv), true);

    const incompleteCv = { nom: "Camille", titre: "Dev" };
    assert.equal(validateCvSchema(incompleteCv), false);
  });

  it("2. Valide qu'un objet Analyse contient un score entre 0 et 100 et des listes non vides", () => {
    const validAnalysis = {
      score_global: 82,
      adequation_poste: "Très bon profil technique pour le poste.",
      points_forts: ["Maîtrise de Python", "Projets concrets déployés"],
      points_faibles: ["Manque de métriques chiffrées"],
      suggestions_amelioration: ["Quantifier l'impact de chaque projet"],
    };

    assert.equal(validateAnalysisSchema(validAnalysis), true);

    const invalidScoreAnalysis = { ...validAnalysis, score_global: 140 };
    assert.equal(validateAnalysisSchema(invalidScoreAnalysis), false);
  });

  it("3. Rejette proprement un texte PDF vide ou trop court (< 50 caractères)", () => {
    assert.throws(() => validateExtractedPdfText(""), /PDF vide ou scanné/);
    assert.throws(() => validateExtractedPdfText("Texte trop court"), /PDF vide ou scanné/);
    assert.equal(
      validateExtractedPdfText("Lilian Mathieu - Développeur Python et C++ avec projets déployés sur Cloudflare et Supabase."),
      true
    );
  });

  it("4. Génère des prompts bilingues FR/EN contenant la contrainte JSON", () => {
    assert.match(getCvSystemPrompt("fr"), /FRENCH/);
    assert.match(getCvSystemPrompt("en"), /ENGLISH/);
    assert.match(getAnalysisSystemPrompt("fr"), /JSON/);

    const updateMsg = buildCvUserMessage("Ajoute Docker", { nom: "Test" });
    assert.match(updateMsg, /JSON actuel du CV/);
  });
});