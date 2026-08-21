import React from 'react';

const DIFF_KEYS = [
  'lawName',
  'effectiveDate',
  'appliesTo',
  'rightToDelete',
  'rightToOptOutProfiling',
  'privateRightOfAction',
  'universalOptOut',
  'curePeriod',
  'enforcement',
];

export function getEditorial(a, b) {
  const aHasLaw = a.status === 'active';
  const bHasLaw = b.status === 'active';

  if (aHasLaw && !bHasLaw) {
    return `Residents of ${a.name} have comprehensive data privacy rights. Residents of ${b.name} do not. Same internet, same companies, different rights.`;
  }
  if (bHasLaw && !aHasLaw) {
    return `Residents of ${b.name} have comprehensive data privacy rights. Residents of ${a.name} do not. Same internet, same companies, different rights.`;
  }

  if (a.privateRightOfAction !== b.privateRightOfAction) {
    const rank = { full: 2, limited: 1, no: 0 };
    const [strong, weak] = rank[a.privateRightOfAction] >= rank[b.privateRightOfAction] ? [a, b] : [b, a];
    return `A resident of ${strong.name} can sue companies directly for privacy violations. A resident of ${weak.name} cannot.`;
  }

  const diffCount = DIFF_KEYS.filter((k) => a[k] !== b[k]).length;
  if (diffCount >= 3) {
    return `Same right to privacy, ${diffCount} different sets of rules.`;
  }

  return null;
}

function EditorialLine({ a, b }) {
  const line = getEditorial(a, b);
  if (!line) return null;
  return <p className="editorial-line">{line}</p>;
}

export default EditorialLine;
