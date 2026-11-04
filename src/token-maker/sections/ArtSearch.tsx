import { ExternalLink } from 'lucide-react';
import { useId, useState } from 'react';
import { ControlLabel, Toggle } from '../components';
import { AI_FILTER_HINT, ART_SEARCH_EXTRA, ART_SEARCH_SITES, artSearchTerm, artSearchUrl } from '../config/artSearchSites';

/**
 * "Find art online": opens each site's own search results in a new tab.
 * Nothing is fetched here; the user brings a picture back by pasting,
 * dropping or linking it (useGlobalImport, WebAddress).
 */
export function ArtSearch() {
  const id = useId();
  const [text, setText] = useState('');
  const [addExtra, setAddExtra] = useState(true);
  // On unless switched off (owner request): leave out AI-made pictures where the site allows it.
  const [noAi, setNoAi] = useState(true);
  const term = artSearchTerm(text, addExtra);
  return (
    <div className="control" data-control="art-search">
      <ControlLabel htmlFor={id} label="Find art online" />
      <input
        id={id}
        className="text-input"
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        placeholder="e.g. goblin shaman"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || !term) return;
          e.preventDefault();
          window.open(artSearchUrl(ART_SEARCH_SITES[0]!, term, noAi), '_blank', 'noopener,noreferrer');
        }}
      />
      <div className="toggle-pair">
        <Toggle label={`Add “${ART_SEARCH_EXTRA}”`} checked={addExtra} onChange={setAddExtra} />
        <Toggle label="Leave out AI art" checked={noAi} onChange={setNoAi} />
      </div>
      <div className="art-search__sites" role="group" aria-label="Search on">
        {ART_SEARCH_SITES.map((site) =>
          term ? (
            <a key={site.name} className="btn btn--small" href={artSearchUrl(site, term, noAi)} target="_blank" rel="noopener noreferrer">
              {site.name}
              <ExternalLink size={14} aria-hidden="true" />
            </a>
          ) : (
            // A link can't be disabled, so an empty box shows plain disabled buttons.
            <button key={site.name} type="button" className="btn btn--small" disabled>
              {site.name}
            </button>
          ),
        )}
      </div>
      {noAi && <p className="control__hint">{AI_FILTER_HINT}</p>}
      <p className="control__hint">Found something? Copy the image and paste it here, drag it in, or paste its link.</p>
    </div>
  );
}
