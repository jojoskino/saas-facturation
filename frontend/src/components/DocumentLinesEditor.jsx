import { useMemo } from "react";

const emptyLine = () => ({
  description: "",
  quantity: "1",
  unit_price: "",
  tax_rate: "0",
});

export function createEmptyLine() {
  return emptyLine();
}

export function computeLineTotals(lines, discountPercent = 0) {
  let subtotal = 0;
  let taxAmount = 0;
  for (const line of lines) {
    const qty = Number.parseFloat(line.quantity) || 0;
    const unit = Number.parseFloat(line.unit_price) || 0;
    const rate = Number.parseFloat(line.tax_rate) || 0;
    const lineSub = Math.round(qty * unit * 100) / 100;
    const lineTax = Math.round(lineSub * (rate / 100) * 100) / 100;
    subtotal += lineSub;
    taxAmount += lineTax;
  }
  subtotal = Math.round(subtotal * 100) / 100;
  taxAmount = Math.round(taxAmount * 100) / 100;
  const gross = Math.round((subtotal + taxAmount) * 100) / 100;
  const discount = Math.max(0, Math.min(100, Number.parseFloat(discountPercent) || 0));
  const discountAmount = Math.round(gross * (discount / 100) * 100) / 100;
  const total = Math.round((gross - discountAmount) * 100) / 100;
  return { subtotal, taxAmount, total };
}

function isBlankLine(line) {
  return !String(line.description || "").trim() && !String(line.unit_price ?? "").trim();
}

function isUnitPriceMissing(line) {
  return String(line.unit_price ?? "").trim() === "";
}

/**
 * @returns {{ valid: boolean, issues: Record<number, string[]> }}
 */
export function validateDocumentLines(lines) {
  const rows = Array.isArray(lines) && lines.length > 0 ? lines : [emptyLine()];
  /** @type {Record<number, string[]>} */
  const issues = {};

  const rowsToCheck = rows
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => !isBlankLine(line) || rows.length === 1);

  if (rowsToCheck.length === 0) {
    issues[0] = ["description", "unit_price"];
    return { valid: false, issues };
  }

  let hasCompleteLine = false;

  for (const { line, index } of rowsToCheck) {
    const rowIssues = [];
    if (!String(line.description || "").trim()) rowIssues.push("description");
    if (isUnitPriceMissing(line)) rowIssues.push("unit_price");

    if (rowIssues.length) {
      issues[index] = rowIssues;
    } else {
      hasCompleteLine = true;
    }
  }

  return { valid: Object.keys(issues).length === 0 && hasCompleteLine, issues };
}

export function isDocumentLineFieldHinted(issues, index, field) {
  return Boolean(issues?.[index]?.includes(field));
}

function formatAmount(value) {
  return value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function DocumentLinesEditor({
  lines,
  onChange,
  discountPercent = 0,
  onDiscountChange,
  lineHints = null,
}) {
  const totals = useMemo(() => computeLineTotals(lines, discountPercent), [lines, discountPercent]);

  function updateLine(index, field, value) {
    const next = lines.map((line, i) => (i === index ? { ...line, [field]: value } : line));
    onChange(next);
  }

  function addLine() {
    onChange([...lines, emptyLine()]);
  }

  function removeLine(index) {
    onChange(lines.filter((_, i) => i !== index));
  }

  function inputClass(index, field) {
    return isDocumentLineFieldHinted(lineHints, index, field)
      ? "doc-lines-editor__input doc-lines-editor__input--hint"
      : "doc-lines-editor__input";
  }

  function cellClass(index, field) {
    return isDocumentLineFieldHinted(lineHints, index, field)
      ? "doc-lines-editor__cell doc-lines-editor__cell--hint"
      : "doc-lines-editor__cell";
  }

  return (
    <div className="doc-lines-editor">
      <style>{`
        .doc-lines-editor { display: grid; gap: 12px; }
        .doc-lines-editor__table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .doc-lines-editor__table th,
        .doc-lines-editor__table td { border: 1px solid var(--color-border); padding: 6px; }
        .doc-lines-editor__cell { background: #fff; transition: background 0.15s ease; }
        .doc-lines-editor__cell--hint { background: #fff9f9; }
        .doc-lines-editor__input {
          width: 100%;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          padding: 6px 8px;
          font-size: 13px;
          background: #fff;
          transition: border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
        }
        .doc-lines-editor__input--hint {
          border-color: #f0caca;
          background: #fff8f8;
          box-shadow: inset 0 0 0 1px rgba(235, 140, 140, 0.12);
        }
        .doc-lines-editor__footer {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
          padding-top: 4px;
        }
        .doc-lines-editor__actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }
        .doc-lines-editor__actions .quo-btn {
          font-size: 13px;
        }
        .doc-lines-editor__discount {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          font-size: 13px;
          color: var(--color-text-muted);
          font-weight: 500;
        }
        .doc-lines-editor__discount input {
          width: 72px;
          border: 1px solid var(--color-border);
          border-radius: 6px;
          padding: 6px 8px;
          font-size: 13px;
          color: var(--color-text);
        }
        .doc-lines-editor__totals {
          margin: 0;
          min-width: 200px;
          display: grid;
          gap: 6px;
          padding: 10px 12px;
          border-radius: 10px;
          background: #f8fafc;
          border: 1px solid #e8edf3;
        }
        .doc-lines-editor__total-row {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 16px;
          font-size: 13px;
          line-height: 1.4;
        }
        .doc-lines-editor__total-row dt {
          margin: 0;
          font-weight: 500;
          color: #64748b;
          letter-spacing: 0.02em;
        }
        .doc-lines-editor__total-row dd {
          margin: 0;
          font-weight: 600;
          font-variant-numeric: tabular-nums;
          color: var(--color-text);
        }
        .doc-lines-editor__total-row--main {
          margin-top: 2px;
          padding-top: 8px;
          border-top: 1px solid #e2e8f0;
        }
        .doc-lines-editor__total-row--main dt {
          color: var(--color-text);
          font-weight: 600;
        }
        .doc-lines-editor__total-row--main dd {
          font-weight: 700;
          color: var(--color-primary, #14213d);
        }
      `}</style>
      <table className="doc-lines-editor__table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Qté</th>
            <th>PU HT</th>
            <th>TVA %</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={index}>
              <td className={cellClass(index, "description")}>
                <input
                  className={inputClass(index, "description")}
                  value={line.description}
                  onChange={(e) => updateLine(index, "description", e.target.value)}
                  placeholder="Prestation"
                />
              </td>
              <td className="doc-lines-editor__cell">
                <input
                  className="doc-lines-editor__input"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={line.quantity}
                  onChange={(e) => updateLine(index, "quantity", e.target.value)}
                  onBlur={(e) => {
                    const n = Math.max(0, Math.round(Number.parseFloat(e.target.value) || 0));
                    updateLine(index, "quantity", String(n));
                  }}
                />
              </td>
              <td className={cellClass(index, "unit_price")}>
                <input
                  className={inputClass(index, "unit_price")}
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unit_price}
                  onChange={(e) => updateLine(index, "unit_price", e.target.value)}
                />
              </td>
              <td className="doc-lines-editor__cell">
                <input
                  className="doc-lines-editor__input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={line.tax_rate}
                  onChange={(e) => updateLine(index, "tax_rate", e.target.value)}
                />
              </td>
              <td className="doc-lines-editor__cell">
                <button type="button" onClick={() => removeLine(index)} disabled={lines.length <= 1}>
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="doc-lines-editor__footer">
        <div className="doc-lines-editor__actions">
          <button type="button" className="quo-btn" onClick={addLine}>
            + Ligne
          </button>
          {onDiscountChange ? (
            <label className="doc-lines-editor__discount">
              Remise %
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={discountPercent}
                onChange={(e) => onDiscountChange(e.target.value)}
              />
            </label>
          ) : null}
        </div>
        <dl className="doc-lines-editor__totals">
          <div className="doc-lines-editor__total-row">
            <dt>HT</dt>
            <dd>{formatAmount(totals.subtotal)}</dd>
          </div>
          <div className="doc-lines-editor__total-row">
            <dt>TVA</dt>
            <dd>{formatAmount(totals.taxAmount)}</dd>
          </div>
          <div className="doc-lines-editor__total-row doc-lines-editor__total-row--main">
            <dt>TTC</dt>
            <dd>{formatAmount(totals.total)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
