// Who made the artwork Frame Maker draws with (Help → Artwork credits): the
// photo textures are public domain (CC0) and are credited anyway. Every
// ornament is drawn by Frame Maker's own code. ASSETS-CREDITS.md says the
// same.

import { PICTURES } from '../project/pictures';

export function Credits() {
  return (
    <details className="credits">
      <summary>Artwork credits</summary>
      <p>Every ornament is drawn by Frame Maker's own code.</p>
      <p>
        The photo textures are from <a href="https://polyhaven.com" target="_blank" rel="noreferrer">Poly Haven</a> and{' '}
        <a href="https://ambientcg.com" target="_blank" rel="noreferrer">ambientCG</a>, public domain (CC0), made smaller for Frame Maker:{' '}
        {PICTURES.map((p, i) => (
          <span key={p.id}>
            {i > 0 && ', '}
            <a href={p.source} target="_blank" rel="noreferrer">
              {p.name}
            </a>
          </span>
        ))}
        .
      </p>
    </details>
  );
}
