import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import './Glossary.css';

const TERMS = [
  {
    id: 'private-right-of-action',
    term: 'Private right of action',
    definition:
      'Whether individuals can personally sue a company for violating their privacy rights, rather than relying on a government agency to enforce the law.',
  },
  {
    id: 'universal-opt-out-signal-gpc',
    term: 'Universal opt-out signal (GPC)',
    definition:
      "A browser setting that automatically tells every website you visit that you don't want your data sold.",
  },
  {
    id: 'cure-period',
    term: 'Cure period',
    definition:
      'A grace period between when a company is caught violating the law and when they can be fined, giving them time to fix the problem first.',
  },
  {
    id: 'attorney-general-enforcement',
    term: 'Attorney General enforcement',
    definition:
      "The state's AG office investigates and prosecutes violations. Consumers themselves cannot sue.",
  },
  {
    id: 'dedicated-privacy-agency',
    term: 'Dedicated privacy agency',
    definition:
      'A standalone government body focused specifically on privacy enforcement. California is the only US state with one.',
  },
];

function Glossary() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);

  return (
    <div className="glossary-page">
      <Header />

      <main className="glossary-main">
        <h1>Glossary</h1>
        <p className="glossary-intro">
          Plain-English definitions for the legal terms that appear in the state comparison.
        </p>

        {TERMS.map(({ id, term, definition }) => (
          <section key={id} id={id} className="glossary-term">
            <h2>{term}</h2>
            <p>{definition}</p>
          </section>
        ))}
      </main>
    </div>
  );
}

export default Glossary;
