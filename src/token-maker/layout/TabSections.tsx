import { Section } from '../components';
import { SECTION_CONTENT } from '../sections';
import { sectionById, type PanelTab, type SectionId } from './sections';
import { SectionPlaceholder } from './SectionPlaceholder';

/** A tab's sections: one with a plain heading, or several opening one at a time. */
export function TabSections({ tab, openSection, setOpenSection }: { tab: PanelTab; openSection: SectionId | null; setOpenSection: (id: SectionId | null) => void }) {
  const fixed = tab.sections.length === 1;
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
    </>
  );
}
