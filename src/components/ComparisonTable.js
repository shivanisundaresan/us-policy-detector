import React from 'react';
import './ComparisonTable.css';

const FIELDS = [
  { key: 'lawName',                label: 'Law name',                                            type: 'text',    anchor: null },
  { key: 'effectiveDate',          label: 'Effective date',                                      type: 'text',    anchor: null },
  { key: 'appliesTo',              label: 'Applies to businesses with',                          type: 'text',    anchor: null },
  { key: 'rightToDelete',          label: 'Right to delete personal data',                       type: 'bool',    anchor: null },
  { key: 'rightToOptOutProfiling', label: 'Right to opt out of profiling/automated decisions',   type: 'bool',    anchor: null },
  { key: 'privateRightOfAction',   label: 'Can consumers sue companies directly?',               type: 'pra',     anchor: 'private-right-of-action' },
  { key: 'universalOptOut',        label: 'Universal opt-out signal (GPC) required',             type: 'bool',    anchor: 'universal-opt-out-signal-gpc' },
  { key: 'curePeriod',             label: 'Cure period before enforcement',                      type: 'text',    anchor: 'cure-period' },
  { key: 'enforcement',            label: 'Enforcement',                                         type: 'text',    anchor: 'attorney-general-enforcement' },
];

function renderCell(type, value) {
  if (type === 'bool') {
    return value
      ? <span className="check-yes" aria-label="Yes">✓</span>
      : <span className="check-no"  aria-label="No">✗</span>;
  }
  if (type === 'pra') {
    if (value === 'full')    return <span className="check-yes" aria-label="Yes">✓</span>;
    if (value === 'limited') return <span className="check-yes" aria-label="Yes, limited">✓ (limited)</span>;
    return <span className="check-no"  aria-label="No">✗</span>;
  }
  return value;
}

function ComparisonTable({ a, b }) {
  return (
    <div className="comparison-wrap">
      <table className="comparison-table" aria-label={`Comparison of ${a.name} and ${b.name}`}>
        <thead>
          <tr>
            <th scope="col" className="col-label">Provision</th>
            <th scope="col">{a.name}</th>
            <th scope="col">{b.name}</th>
          </tr>
        </thead>
        <tbody>
          {FIELDS.map(({ key, label, type, anchor }) => {
            const va = a[key];
            const vb = b[key];
            const differ = va !== vb;

            return (
              <tr key={key} className={differ ? 'row-differ' : ''}>
                <th scope="row" className="col-label">
                  {anchor
                    ? <a href={`/glossary#${anchor}`}>{label}</a>
                    : label}
                </th>
                <td data-label={a.name}>{renderCell(type, va)}</td>
                <td data-label={b.name}>{renderCell(type, vb)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default ComparisonTable;
