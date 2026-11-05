import { useId, useState, type ReactNode } from 'react';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { useMenuStyle } from '../state/menuStyle';

/**
 * A collapsible panel section. Anything passed as `advanced`
 * goes in a nested "Advanced" drop-down, closed by default, so the simple
 * view stays simple (DESIGN.md §1).
 */
export function Section({
  title,
  icon,
  defaultOpen = false,
  advanced,
  children,
  id,
  open: openProp,
  onOpenChange,
  fixed = false,
  onReset,
}: {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  advanced?: ReactNode;
  children?: ReactNode;
  id?: string;
  /** Pass `open` + `onOpenChange` to control it from outside. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Always open, with a plain heading instead of the drop-down button (the only section on its tab). */
  fixed?: boolean;
  /** Given, a "Revert to default" button sits at the right of the heading. */
  onReset?: () => void;
}) {
  const [openState, setOpenState] = useState(defaultOpen);
  const open = fixed || (openProp ?? openState);
  const setOpen = (v: boolean) => {
    setOpenState(v);
    onOpenChange?.(v);
  };
  const bodyId = useId();
  return (
    <section className="section" data-open={open} data-control="section" id={id}>
      <div className="section__header">
        {fixed ? (
          <h2 className="section__heading">
            {icon && <span className="section__icon" aria-hidden="true">{icon}</span>}
            <span className="section__title">{title}</span>
          </h2>
        ) : (
        <button
          type="button"
          className="section__toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen(!open)}
        >
          {icon && <span className="section__icon" aria-hidden="true">{icon}</span>}
          <span className="section__title">{title}</span>
          <ChevronDown className="section__chevron" aria-hidden="true" size={18} />
        </button>
        )}
        {onReset && (
          <button type="button" className="btn btn--ghost btn--small section__reset" data-testid="section-reset" title={`Put the ${title} settings back to how a new token has them`} onClick={onReset}>
            <RotateCcw size={14} aria-hidden="true" />
            Revert to default
          </button>
        )}
      </div>
      <div className="section__body" id={bodyId} hidden={!open}>
        {children}
        {advanced && <Advanced>{advanced}</Advanced>}
      </div>
    </section>
  );
}

/**
 * The "Advanced" drop-down. The menu style decides how it shows: hidden
 * entirely (Simple), a closed drop-down (Advanced) or always open with no
 * drop-down (Expert).
 */
export function Advanced({ children }: { children: ReactNode }) {
  const style = useMenuStyle();
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  if (style === 'simple') return null;
  if (style === 'expert') {
    return (
      <div className="advanced advanced--expert" data-control="advanced">
        {children}
      </div>
    );
  }
  return (
    <div className="advanced" data-open={open} data-control="advanced">
      <div className="advanced__header">
        <button
          type="button"
          className="advanced__toggle"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen(!open)}
        >
          <ChevronDown className="advanced__chevron" aria-hidden="true" size={16} />
          Advanced
        </button>
      </div>
      <div className="advanced__body" id={bodyId} hidden={!open}>
        {children}
      </div>
    </div>
  );
}
