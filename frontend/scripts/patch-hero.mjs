import fs from "fs";

const path = new URL("../src/pages/page.tsx", import.meta.url);
let c = fs.readFileSync(path, "utf8");

const re = /\s*<div className="mockup">[\s\S]*?<\/div>\s*<\/Reveal>/;
const replacement = `            <div className="hero-visual">
              <img
                src="/images/hero-app.png"
                alt="Aperçu du tableau de bord Facturo : devis, factures et suivi des paiements"
                loading="eager"
                decoding="async"
              />
              <span className="hero-visual-badge">
                <i className="fa-solid fa-chart-line" aria-hidden />
                Tableau de bord en temps réel
              </span>
            </div>
          </Reveal>`;

if (!re.test(c)) {
  console.error("Pattern not found");
  process.exit(1);
}

c = c.replace(re, replacement);
fs.writeFileSync(path, c);
console.log("Hero patched");
