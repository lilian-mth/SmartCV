function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderAnalysisHtml(data, targetRole, lang = "fr") {
  const score = Math.max(0, Math.min(100, Math.round(data.score_global || 0)));
  const scoreClass = score >= 75 ? "score-high" : score >= 50 ? "score-mid" : "score-low";

  const labels = lang === "en"
    ? {
        target: "Target Role",
        strengths: "Strengths",
        weaknesses: "Weaknesses & Gaps",
        tips: "Actionable Improvements",
      }
    : {
        target: "Poste cible",
        strengths: "Points forts",
        weaknesses: "Points faibles & manques",
        tips: "Pistes d'amélioration",
      };

  const renderList = (items) =>
    (items || []).map((item) => `<li>${esc(item)}</li>`).join("");

  return `
    <div class="analysis-report">
      <div class="analysis-header-card">
        <div class="score-badge ${scoreClass}">
          <span class="score-number">${score}</span>
          <span class="score-max">/100</span>
        </div>
        <div class="analysis-summary">
          <span class="target-pill">${labels.target} : ${esc(targetRole)}</span>
          <p>${esc(data.adequation_poste)}</p>
        </div>
      </div>

      <div class="analysis-columns">
        <section class="ana-card ana-card-good">
          <h3>✓ ${labels.strengths}</h3>
          <ul>${renderList(data.points_forts)}</ul>
        </section>

        <section class="ana-card ana-card-warn">
          <h3>! ${labels.weaknesses}</h3>
          <ul>${renderList(data.points_faibles)}</ul>
        </section>

        <section class="ana-card ana-card-tips">
          <h3>→ ${labels.tips}</h3>
          <ul>${renderList(data.suggestions_amelioration)}</ul>
        </section>
      </div>
    </div>
  `;
}