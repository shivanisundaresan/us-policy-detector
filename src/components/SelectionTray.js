import React from 'react';
import states from '../data/states.json';
import './SelectionTray.css';

function SelectionTray({ selected, onRemove, onClear }) {
  if (selected.length === 0) {
    return (
      <div className="selection-tray selection-tray-empty">
        <span className="tray-prompt">Click a state on the map to begin.</span>
      </div>
    );
  }

  return (
    <div className="selection-tray">
      <div className="tray-chips">
        {selected.map((usps) => (
          <button
            key={usps}
            type="button"
            className="tray-chip"
            onClick={() => onRemove(usps)}
            aria-label={`Remove ${states[usps].name}`}
          >
            {states[usps].name}
            <span aria-hidden="true" className="chip-x">×</span>
          </button>
        ))}
      </div>

      {selected.length === 1 && (
        <span className="tray-prompt">Pick a second state to compare.</span>
      )}

      <button type="button" className="tray-clear" onClick={onClear}>
        Clear
      </button>
    </div>
  );
}

export default SelectionTray;
