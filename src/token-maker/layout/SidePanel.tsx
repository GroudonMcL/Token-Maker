import { useEffect, useRef } from 'react';
import type { PanelTab, SectionId } from './sections';
import { TabSections } from './TabSections';

/** Desktop/tablet right-hand panel: only the tab chosen in the tool rail. */
export function SidePanel({
  tab,
  panelId,
  openSection,
  setOpenSection,
  setTab,
}: {
  tab: PanelTab;
  panelId: string;
  openSection: SectionId | null;
  setOpenSection: (id: SectionId | null) => void;
  setTab: (id: string) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  // A new tab starts at its top.
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
  }, [tab.id]);
  // The sections above it may have just closed, so bring the opened one into view.
  useEffect(() => {
    if (openSection) ref.current?.querySelector(`#section-${openSection}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [openSection]);
  return (
    <aside ref={ref} className="side-panel" aria-label="Token settings">
      <div className="side-panel__tab" id={panelId} role="tabpanel" aria-label={tab.label}>
        <TabSections tab={tab} openSection={openSection} setOpenSection={setOpenSection} onNext={setTab} />
      </div>
    </aside>
  );
}
