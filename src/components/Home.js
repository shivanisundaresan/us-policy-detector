import React, { useState, useCallback } from 'react';
import Header from './Header';
import USMap from './USMap';
import SelectionTray from './SelectionTray';
import ComparisonTable from './ComparisonTable';
import EditorialLine from './EditorialLine';
import states from '../data/states.json';
import lastUpdated from '../data/lastUpdated';
import './Home.css';

function Home() {
  const [selected, setSelected] = useState([]);

  const handleSelect = useCallback((usps) => {
    setSelected((prev) => {
      if (prev.includes(usps)) return prev.filter((s) => s !== usps);
      if (prev.length >= 2) return prev;
      return [...prev, usps];
    });
  }, []);

  const handleRemove = useCallback((usps) => {
    setSelected((prev) => prev.filter((s) => s !== usps));
  }, []);

  const handleClear = useCallback(() => setSelected([]), []);

  const a = selected[0] ? states[selected[0]] : null;
  const b = selected[1] ? states[selected[1]] : null;

  return (
    <div className="home-page">
      <Header />

      <main className="home-main">
        <section className="hero">
          <h1>Your privacy rights depend on your zip code.</h1>
          <p>Click any two states to see how their data privacy laws compare.</p>
        </section>

        <USMap selected={selected} onSelect={handleSelect} />

        <SelectionTray
          selected={selected}
          onRemove={handleRemove}
          onClear={handleClear}
        />

        {a && b && (
          <section className="comparison-section">
            <ComparisonTable a={a} b={b} />
            <EditorialLine a={a} b={b} />
          </section>
        )}
      </main>

      <footer className="site-footer">
        <p>
          Data compiled from IAPP and Mayer Brown state privacy trackers.
          Last updated {lastUpdated}. Not legal advice.{' '}
          <a href="/glossary">Glossary of legal terms</a>.
        </p>
      </footer>
    </div>
  );
}

export default Home;
