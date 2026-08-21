import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

function Header() {
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="header-title">US Privacy Law Comparison</Link>
        <nav className="header-nav">
          <Link to="/glossary">Glossary</Link>
        </nav>
      </div>
    </header>
  );
}

export default Header;
