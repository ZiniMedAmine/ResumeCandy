import type { SectionType } from "@/lib/resume/types";
import {
  AwardIcon,
  BookIcon,
  BookOpenIcon,
  BriefcaseIcon,
  BuildingIcon,
  FolderIcon,
  GlobeIcon,
  GradCapIcon,
  HeartIcon,
  MedalIcon,
  PuzzleIcon,
  SignatureIcon,
  UsersIcon,
} from "./icons";

/**
 * One icon per section type, shared by the editor cards, the add-content
 * picker and the printed headings — so a section looks like itself wherever
 * it shows up.
 */
export const SECTION_ICONS: Record<SectionType, React.ComponentType<{ className?: string }>> = {
  experience: BriefcaseIcon,
  education: GradCapIcon,
  projects: FolderIcon,
  skills: PuzzleIcon,
  certifications: AwardIcon,
  references: UsersIcon,
  languages: GlobeIcon,
  interests: HeartIcon,
  courses: BookIcon,
  awards: MedalIcon,
  organisations: BuildingIcon,
  publications: BookOpenIcon,
  declaration: SignatureIcon,
  custom: PuzzleIcon,
};

export function sectionIcon(type: SectionType | string | undefined) {
  return SECTION_ICONS[type as SectionType] ?? BriefcaseIcon;
}
