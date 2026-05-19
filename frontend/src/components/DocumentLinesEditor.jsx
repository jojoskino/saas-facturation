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

export default function DocumentLinesEditor({ lines, onChange, discountPercent = 0, onDiscountChange }) {
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

  return (
    <div className="doc-lines">
      <style>{`
        .doc-lines { display: grid; gap: 10px; }
        .doc-lines-table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .doc-lines-table th, .doc-lines-table td { border: 1px solid var(--color-border); padding: 6px; }
        .doc-lines-table input { width: 100%; border: 1px solid var(--color-border); border-radius: 6px; padding: 6px 8px; }
        .doc-lines-totals { display: grid; gap: 4px; justify-items: end; font-size: 13px; }
        .doc-lines-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .doc-lines-discount { display: flex; gap: 8px; align-items: center; margin-top: 4px; }
        .doc-lines-discount input { width: 72px; }
      `}</style>
      <table className="doc-lines-table">
        <thead>
          <tr>
            <th>Description <span className="field-required">*</span></th>
            <th>Qté <span className="field-required">*</span></th>
            <th>PU HT <span className="field-required">*</span></th>
            <th>TVA %</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={index}>
              <td>
                <input
                  value={line.description}
                  onChange={(e) => updateLine(index, "description", e.target.value)}
                  placeholder="Prestation"
                />
              </td>
              <td>
                <input
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
              <td>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.unit_price}
                  onChange={(e) => updateLine(index, "unit_price", e.target.value)}
                />
              </td>
              <td>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={line.tax_rate}
                  onChange={(e) => updateLine(index, "tax_rate", e.target.value)}
                />
              </td>
              <td>
                <button type="button" onClick={() => removeLine(index)} disabled={lines.length <= 1}>
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="doc-lines-actions">
        <button type="button" className="quo-btn" onClick={addLine}>
          + Ligne
        </button>
        {onDiscountChange ? (
          <label className="doc-lines-discount">
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
      <div className="doc-lines-totals">
        <div>HT : {totals.subtotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</div>
        <div>TVA : {totals.taxAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</div>
        <strong>TTC : {totals.total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}</strong>
      </div>
    </div>
  );
}
