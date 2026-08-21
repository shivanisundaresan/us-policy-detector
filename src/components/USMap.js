import React from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import topology from 'us-atlas/states-10m.json';
import fipsToUsps from '../data/fipsToUsps';
import states from '../data/states.json';
import './USMap.css';

const STATUS_FILL = {
  active: '#059669',
  pending: '#F59E0B',
  none: '#D1D5DB',
};

function USMap({ selected, onSelect }) {
  return (
    <div className="us-map">
      <ComposableMap
        projection="geoAlbersUsa"
        projectionConfig={{ scale: 1000 }}
        width={975}
        height={610}
        style={{ width: '100%', height: 'auto' }}
      >
        <Geographies geography={topology}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const fips = String(geo.id).padStart(2, '0');
              const usps = fipsToUsps[fips];
              const entry = usps ? states[usps] : null;
              const status = entry?.status || 'none';
              const fill = STATUS_FILL[status];
              const isSelected = usps && selected.includes(usps);

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={() => usps && onSelect(usps)}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${entry?.name || 'state'}`}
                  aria-pressed={isSelected}
                  style={{
                    default: {
                      fill,
                      stroke: isSelected ? '#000' : '#fff',
                      strokeWidth: isSelected ? 2 : 1,
                      outline: 'none',
                      cursor: usps ? 'pointer' : 'default',
                    },
                    hover: {
                      fill,
                      fillOpacity: 0.75,
                      stroke: isSelected ? '#000' : '#111',
                      strokeWidth: isSelected ? 2 : 1.25,
                      outline: 'none',
                      cursor: usps ? 'pointer' : 'default',
                    },
                    pressed: {
                      fill,
                      stroke: '#000',
                      strokeWidth: 2,
                      outline: 'none',
                    },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      <ul className="us-map-legend">
        <li>
          <span className="swatch" style={{ background: STATUS_FILL.active }} />
          Comprehensive law in effect
        </li>
        <li>
          <span className="swatch" style={{ background: STATUS_FILL.pending }} />
          Law passed, not yet in effect
        </li>
        <li>
          <span className="swatch" style={{ background: STATUS_FILL.none }} />
          No comprehensive law
        </li>
      </ul>
    </div>
  );
}

export default USMap;
