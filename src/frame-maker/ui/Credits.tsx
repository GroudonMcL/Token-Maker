// Who made the artwork Frame Maker draws with (Help → Artwork credits): the
// photo textures are public domain (CC0) and are credited anyway. The drawn
// ornaments are Frame Maker's own code; the library pictures (version 13) are
// the site's CC0 pictures. ASSETS-CREDITS.md lists each one.

import { PICTURES } from '../project/pictures';

export function Credits() {
  return (
    <details className="credits">
      <summary>Artwork credits</summary>
      <p>The drawn ornaments are Frame Maker's own code.</p>
      <p>
        The library pictures (roses, ornaments, treasure, effects…) are the same public-domain pictures Token Maker uses, mostly clipart
        from <a href="https://openclipart.org" target="_blank" rel="noreferrer">Openclipart</a> and sprites from{' '}
        <a href="https://kenney.nl" target="_blank" rel="noreferrer">Kenney</a>. Each is listed with its artist and source in the site's asset credits.
      </p>
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
