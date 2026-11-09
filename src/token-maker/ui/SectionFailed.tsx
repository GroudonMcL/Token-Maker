import { reloadPage } from './reload';

/** What a section shows when its code couldn't be loaded, or it failed to draw. */
export function SectionFailed({ retry }: { retry: () => void }) {
  return (
    <div className="control-group" role="alert">
      <p className="control__hint control__hint--error">
        This part of the editor couldn't be loaded. If the site has just been updated, reload the page; your token is kept.
      </p>
      <div className="row">
        <button type="button" className="btn btn--small" onClick={retry}>
          Try again
        </button>{' '}
        <button type="button" className="btn btn--small" onClick={reloadPage}>
          Reload the page
        </button>
      </div>
    </div>
  );
}
