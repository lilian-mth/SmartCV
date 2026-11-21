/**
 * Échappe les caractères HTML pour éviter toute injection XSS depuis la réponse IA.
 */
function esc(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Transforme l'objet JSON du CV en HTML structuré au format feuille A4.
 */
export function renderCvHtml(cv, lang = "fr") {
  const labels = lang === "en"
    ? {
        summary: "Profile",
        skills: "Technical Skills",
        experience: "Professional Experience",
        projects: "Key Projects",
        education: "Education",
      }
    : {
        summary: "Profil",
        skills: "Compétences Techniques",
        experience: "Expériences Professionnelles",
        projects: "Projets Réalisés",
        education: "Formations",
      };

  const contact = cv.contact || {};
  const contactItems = [contact.email, contact.telephone, contact.localisation]
    .filter(Boolean)
    .map(esc)
    .join(" • ");

  const skillsHtml = (cv.competences || [])
    .map((skill) => `<span class="cv-skill-tag">${esc(skill)}</span>`)
    .join("");

  const expHtml = (cv.experiences || [])
    .map(
      (exp) => `
      <div class="cv-item">
        <div class="cv-item-header">
          <div>
            <strong>${esc(exp.poste)}</strong> — <span class="cv-company">${esc(exp.entreprise)}</span>
          </div>
          <span class="cv-date">${esc(exp.periode)}</span>
        </div>
        <ul class="cv-bullets">
          ${(exp.missions || []).map((m) => `<li>${esc(m)}</li>`).join("")}
        </ul>
      </div>`
    )
    .join("");

  const projHtml = (cv.projets || [])
    .map(
      (proj) => `
      <div class="cv-item">
        <div class="cv-item-header">
          <strong>${esc(proj.nom)}</strong>
          <span class="cv-tech-inline">${(proj.technologies || []).map(esc).join(", ")}</span>
        </div>
        <p class="cv-desc">${esc(proj.description)}</p>
      </div>`
    )
    .join("");

  const eduHtml = (cv.formations || [])
    .map(
      (edu) => `
      <div class="cv-item cv-edu-row">
        <div>
          <strong>${esc(edu.diplome)}</strong> — <span>${esc(edu.etablissement)}</span>
        </div>
        <span class="cv-date">${esc(edu.annee)}</span>
      </div>`
    )
    .join("");

  return `
    <article class="a4-sheet">
      <header class="cv-header">
        <h1 class="cv-name">${esc(cv.nom)}</h1>
        <p class="cv-title">${esc(cv.titre)}</p>
        ${contactItems ? `<p class="cv-contact">${contactItems}</p>` : ""}
      </header>

      <section class="cv-section">
        <h2>${labels.summary}</h2>
        <p class="cv-summary">${esc(cv.resume)}</p>
      </section>

      <section class="cv-section">
        <h2>${labels.skills}</h2>
        <div class="cv-skills-list">${skillsHtml}</div>
      </section>

      <section class="cv-section">
        <h2>${labels.experience}</h2>
        ${expHtml}
      </section>

      <section class="cv-section">
        <h2>${labels.projects}</h2>
        ${projHtml}
      </section>

      <section class="cv-section">
        <h2>${labels.education}</h2>
        ${eduHtml}
      </section>
    </article>
  `;
}