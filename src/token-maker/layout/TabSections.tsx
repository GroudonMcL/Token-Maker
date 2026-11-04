import { ArrowRight } from 'lucide-react';
import { Section } from '../components';
import { SECTION_CONTENT } from '../sections';
import { PANEL_TABS, sectionById, type PanelTab, type SectionId } from './sections';
import { SectionPlaceholder } from './SectionPlaceholder';

/** The tab after this one, or null for the last. */
const nextTab = (tab: PanelTab): PanelTab | null => PANEL_TABS[PANEL_TABS.indexOf(tab) + 1] ?? null;

/**
 * A tab's sections: one with a plain heading, or several opening one at a
 * time. A button at the bottom opens the next tab.
 */
export function TabSections({
  tab,
  openSection,
  setOpenSection,
  onNext,
}: {
  tab: PanelTab;
  openSection: SectionId | null;
  setOpenSection: (id: SectionId | null) => void;
  /** Opens a tab: given, the next tab gets a button at the bottom. */
  onNext?: (id: string) => void;
}) {
  const fixed = tab.sections.length === 1;
  const next = nextTab(tab);
  return (
    <>
      {tab.sections.map((sid) => {
        const s = sectionById(sid);
        const Content = SECTION_CONTENT[sid];
        return (
          <Section
            key={sid}
            id={`section-${sid}`}
            title={s.title}
            icon={s.icon}
            fixed={fixed}
            open={openSection === sid}
            onOpenChange={(o) => setOpenSection(o ? sid : null)}
          >
            {Content ? <Content /> : <SectionPlaceholder text={s.placeholder} />}
          </Section>
        );
      })}
      {next && onNext && (
        <div className="tab-next">
          <button type="button" className="btn btn--primary tab-next__btn" data-testid="next-tab" onClick={() => onNext(next.id)}>
            {next.icon}
            {next.label}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}
