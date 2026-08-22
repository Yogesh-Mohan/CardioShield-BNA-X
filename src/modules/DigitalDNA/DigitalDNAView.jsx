/**
 * DigitalDNAView.jsx — Step 6 UI: 3D structure + node inspector panel.
 *
 * The scene consumes THE processed feature vector (useFeatureState).
 * Side panel shows: feature name · source · current value · normalized
 * value · status · contribution to the Digital DNA.
 *
 * Digital DNA = data-driven representation of multidimensional physiological
 * signals — not biological/genetic DNA.
 */

import React, { useRef, useState } from 'react';
import { useFeatureState } from '../../processing/useFeatureState';
import { FEATURE_MAP } from '../../data/sensorSchema';
import DnaScene from './DnaScene';
import './DigitalDNA.css';

function fmt(v, d) {
  return v == null || Number.isNaN(v) ? '—' : Number(v).toFixed(d);
}

export default function DigitalDNAView() {
  const featureState = useFeatureState();
  const sceneRef = useRef(null);
  const [hovered, setHovered] = useState(null);
  const [selected, setSelected] = useState(null);

  const activeId = hovered ?? selected;
  const feat = activeId && featureState ? featureState.features[activeId] : null;
  const meta = activeId ? FEATURE_MAP[activeId] : null;

  return (
    <section className="dna-view">
      <div className="glass-panel dna-stage-panel">
        <div className="dna-stage-head">
          <div>
            <h3>DIGITAL BNA CONSTRUCT</h3>
            <p className="dna-subtitle">
              Data-driven representation of multidimensional physiological signals
              <span className="demo-inline"> · demo visualization</span>
            </p>
          </div>
          <button
            className="ctl-btn reset"
            onClick={() => {
              sceneRef.current?.resetView();
              setSelected(null);
            }}
          >
            ⟲ RESET VIEW
          </button>
        </div>

        <div className="dna-stage">
          <DnaScene
            ref={sceneRef}
            featureState={featureState}
            onHoverNode={setHovered}
            onSelectNode={setSelected}
          />
          {!featureState && (
            <div className="dna-empty">Start the engine to generate BNA construct.</div>
          )}
          <div className="dna-hint">
            drag • orbit | scroll • zoom | right-drag • pan | click node • focus
          </div>
        </div>
      </div>

      {/* Node Inspector */}
      <aside className="glass-panel dna-inspector">
        <h3>FEATURE INSPECTOR</h3>
        {!activeId || !feat ? (
          <div className="inspector-empty">
            Hover or click any node in the BNA network to inspect its physiological feature.
          </div>
        ) : (
          <>
            <div className="inspector-title">{meta?.label ?? feat.id}</div>
            <div className="inspector-source">{meta?.source}</div>
            <dl className="inspector-rows">
              <div><dt>Current value</dt><dd>{fmt(feat.cleaned, feat.decimals)} {feat.unit}</dd></div>
              <div><dt>Normalized</dt><dd>{fmt(feat.normalized, 3)}</dd></div>
              <div><dt>Status</dt>
                <dd><span className={`derived-status s-${feat.status.toLowerCase()}`}>{feat.status}</span></dd>
              </div>
              <div><dt>Contribution</dt><dd>{feat.contribution > 0 ? '+' : ''}{fmt(feat.contribution, 3)}</dd></div>
              <div><dt>Weight</dt><dd>{fmt(feat.weight, 2)}</dd></div>
            </dl>
            <p className="inspector-desc">{meta?.description}</p>
            <div className="contribution-bar-wrap">
              <div
                className={`contribution-bar ${feat.contribution >= 0 ? 'pos' : 'neg'}`}
                style={{
                  width: `${Math.min(Math.abs(feat.contribution) / 0.35, 1) * 100}%`,
                }}
              />
            </div>
          </>
        )}
        <p className="terminology-note">
          Digital BNA = data-driven representation of multidimensional physiological signals.
        </p>
      </aside>
    </section>
  );
}
