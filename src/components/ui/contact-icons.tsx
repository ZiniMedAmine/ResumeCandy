import { createElement, type SVGProps } from "react";
import type { ContactType } from "@/lib/contacts";
import { CalendarIcon, GlobeIcon, LinkIcon } from "./icons";

/**
 * Line icons for the header's links and details, drawn in the same 24-unit,
 * 1.8-stroke idiom as `icons.tsx` so a GitHub mark sits next to a phone icon
 * without looking pasted in. They are simplified outlines, not the official
 * logos — recognisable at contact-line size, and monochrome so they follow the
 * resume's text or accent colour.
 *
 * Purely decorative on the paper: every contact still prints its text, which
 * is what parsers read.
 */
function icon(path: React.ReactNode) {
  return function Icon(props: SVGProps<SVGSVGElement>) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...props}
      >
        {path}
      </svg>
    );
  };
}

const LinkedInIcon = icon(
  <>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M8 10.5V17M8 7.5v.01M12 17v-6.5M12 13.5a2.5 2.5 0 0 1 5 0V17" />
  </>,
);
const GitHubIcon = icon(
  <>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </>,
);
const GitLabIcon = icon(
  <path d="m22 13.3-3.3-10a.4.4 0 0 0-.8 0l-2.3 6.7H8.4L6.1 3.3a.4.4 0 0 0-.8 0L2 13.3a.7.7 0 0 0 .3.8L12 21l9.7-6.9a.7.7 0 0 0 .3-.8Z" />,
);
const BitbucketIcon = icon(
  <>
    <path d="M3 4h18l-2.6 16H5.6z" />
    <path d="M9.5 15h5l.8-5H8.7z" />
  </>,
);
const StackOverflowIcon = icon(
  <path d="M5 15v5h13v-5M8 17h7M8.5 13.5l7 1.5M9.6 10l6.4 3M11.6 6.6l5.4 4.4M14.6 3.4l4 5.4" />,
);
const LeetCodeIcon = icon(<path d="M14.5 4 7.6 11a1.5 1.5 0 0 0 0 2.1L14.5 20M10.5 12H19M16.5 7l2 2" />);
const HackerRankIcon = icon(
  <>
    <path d="M12 2 20.7 7v10L12 22l-8.7-5V7z" />
    <path d="M9.5 8v8M14.5 8v8M9.5 12h5" />
  </>,
);
const KaggleIcon = icon(<path d="M7 3v18M17 4l-7 8 7.5 8M10 12h1" />);
const HuggingFaceIcon = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 14.5a4 4 0 0 0 7 0M9 9.5v.5M15 9.5v.5" />
  </>,
);
const CodePenIcon = icon(
  <path d="M12 2 22 8.5v7L12 22 2 15.5v-7zM12 22v-6.5M22 8.5l-10 7-10-7M2 15.5l10-7 10 7M12 2v6.5" />,
);
const DevIcon = icon(
  <>
    <rect x="2" y="5" width="20" height="14" rx="2.5" />
    <path d="M6 9v6h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2zM13.5 9h-2v6h2M11.5 12H13M15.5 9l1.25 6L18 9" />
  </>,
);
const MediumIcon = icon(
  <>
    <ellipse cx="7" cy="12" rx="5" ry="5.5" />
    <ellipse cx="16.5" cy="12" rx="2.5" ry="5.2" />
    <path d="M21.5 7v10" />
  </>,
);
const SubstackIcon = icon(<path d="M5 4h14M5 8h14M5 12h14v8.5l-7-4-7 4z" />);
const BehanceIcon = icon(
  <>
    <path d="M2.5 7H7a2.5 2.5 0 0 1 0 5H2.5zM2.5 12H7.5a2.5 2.5 0 0 1 0 5h-5zM2.5 7v10" />
    <path d="M14 13.5h7.5a3.75 3.75 0 1 0-1.2 2.8M15 7.5h5" />
  </>,
);
const DribbbleIcon = icon(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M19.13 5.09C15.22 9.14 10 10.44 2.25 10.94M21.75 12.84c-6.62-1.41-12.14 1-16.38 6.32M8.56 2.75c4.37 6 6 9.42 8 17.72" />
  </>,
);
const ArtStationIcon = icon(<path d="M2.5 17.5 4.5 21h12l-2-3.5zM9.5 4h5L21.5 16l-2.5 4.4zM8 15.5l4-7 4 7z" />);
const FigmaIcon = icon(
  <path d="M5 5.5A3.5 3.5 0 0 1 8.5 2H12v7H8.5A3.5 3.5 0 0 1 5 5.5zM12 2h3.5a3.5 3.5 0 1 1 0 7H12zM12 12.5a3.5 3.5 0 1 1 7 0 3.5 3.5 0 1 1-7 0zM5 19.5A3.5 3.5 0 0 1 8.5 16H12v3.5a3.5 3.5 0 1 1-7 0zM5 12.5A3.5 3.5 0 0 1 8.5 9H12v7H8.5A3.5 3.5 0 0 1 5 12.5z" />,
);
const YouTubeIcon = icon(
  <>
    <path d="M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.6 49.6 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.6 49.6 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
    <path d="m10 15 5-3-5-3z" />
  </>,
);
const VimeoIcon = icon(
  <path d="M22 7.5c-.1 2-1.5 4.7-4.2 8.1-2.8 3.6-5.1 5.4-7 5.4-1.2 0-2.2-1.1-3-3.3L6.2 12c-.6-2.2-1.2-3.3-1.9-3.3-.1 0-.6.3-1.4.9L2 8.4l2.6-2.4C5.8 5 6.7 4.4 7.3 4.4c1.4-.1 2.3.8 2.6 2.9.4 2.2.6 3.6.8 4.2.4 1.8.8 2.7 1.3 2.7.4 0 .9-.6 1.6-1.7.7-1.1 1.1-2 1.2-2.6.1-1-.3-1.5-1.2-1.5-.4 0-.9.1-1.3.3.9-2.8 2.5-4.2 4.9-4.1 1.8.1 2.6 1.2 2.5 3.5z" />,
);
const XLogoIcon = icon(<path d="M4 4h4.5L20 20h-4.5zM4 20l6.6-6.6M20 4l-6.4 6.4" />);
const InstagramIcon = icon(
  <>
    <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <path d="M17.5 6.5h.01" />
  </>,
);
const FacebookIcon = icon(<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />);
const TikTokIcon = icon(<path d="M9 12a4 4 0 1 0 4 4V3c.5 2.5 2.5 4.5 5 5" />);
const OrcidIcon = icon(
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M8.5 10v7M8.5 7v.01M11.5 7.5V17h2a4.75 4.75 0 0 0 0-9.5z" />
  </>,
);
const ScholarIcon = icon(
  <>
    <path d="M12 3 2 9.5l10 6.5 10-6.5z" />
    <path d="M6 12v4.5c0 1.7 2.7 3.5 6 3.5s6-1.8 6-3.5V12" />
  </>,
);
const ResearchGateIcon = icon(
  <>
    <rect x="2.5" y="3" width="19" height="18" rx="3" />
    <path d="M6.5 16V8h2.25a2.25 2.25 0 0 1 0 4.5H6.5M9 12.5 10.5 16M18 9.5a2.5 2.5 0 1 0 0 5V12h-1.25" />
  </>,
);
const UpworkIcon = icon(
  <path d="M3 6v5a3.5 3.5 0 0 0 7 0V6M10 10c1 3.5 2.5 5.5 4.75 5.5a3.25 3.25 0 0 0 0-6.5C12 9 11 12 10.5 16.5L10 20" />,
);
const MaltIcon = icon(
  <>
    <rect x="3" y="3" width="18" height="18" rx="9" />
    <path d="M7.5 15.5v-4a2 2 0 0 1 4 0v4M11.5 11.5a2 2 0 0 1 4 0v4" />
  </>,
);
const TelegramIcon = icon(<path d="m22 2-7 20-4-9-9-4zM22 2 11 13" />);
const WhatsAppIcon = icon(
  <>
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z" />
    <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .75A3.5 3.5 0 0 1 10.75 11.5l.75-1-1-2z" />
  </>,
);
const PortfolioIcon = icon(
  <>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
  </>,
);
const BlogIcon = icon(<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />);
const FlagIcon = icon(
  <path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 8 2a6 6 0 0 0 3.6-1.2.5.5 0 0 1 .4.5v10.4a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.5" />,
);
const CarIcon = icon(
  <>
    <path d="M19 17h2a1 1 0 0 0 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4a1 1 0 0 0 1 1h2M9 17h6" />
    <circle cx="7" cy="17" r="2" />
    <circle cx="17" cy="17" r="2" />
  </>,
);
const PassportIcon = icon(
  <>
    <rect x="4" y="2.5" width="16" height="19" rx="2" />
    <circle cx="12" cy="10" r="3.5" />
    <path d="M9 17.5h6" />
  </>,
);
const ClockIcon = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>,
);
const InfoIcon = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </>,
);

type IconComponent = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

export const CONTACT_ICONS: Record<ContactType, IconComponent> = {
  linkedin: LinkedInIcon,
  github: GitHubIcon,
  gitlab: GitLabIcon,
  bitbucket: BitbucketIcon,
  stackoverflow: StackOverflowIcon,
  leetcode: LeetCodeIcon,
  hackerrank: HackerRankIcon,
  kaggle: KaggleIcon,
  huggingface: HuggingFaceIcon,
  codepen: CodePenIcon,
  devto: DevIcon,
  medium: MediumIcon,
  substack: SubstackIcon,
  behance: BehanceIcon,
  dribbble: DribbbleIcon,
  artstation: ArtStationIcon,
  figma: FigmaIcon,
  youtube: YouTubeIcon,
  vimeo: VimeoIcon,
  x: XLogoIcon,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  tiktok: TikTokIcon,
  orcid: OrcidIcon,
  scholar: ScholarIcon,
  researchgate: ResearchGateIcon,
  upwork: UpworkIcon,
  malt: MaltIcon,
  telegram: TelegramIcon,
  whatsapp: WhatsAppIcon,
  portfolio: PortfolioIcon,
  blog: BlogIcon,
  link: LinkIcon,
  nationality: FlagIcon,
  birthDate: CalendarIcon,
  drivingLicense: CarIcon,
  workPermit: PassportIcon,
  availability: ClockIcon,
  info: InfoIcon,
};

export function contactIcon(type: unknown): IconComponent {
  return CONTACT_ICONS[type as ContactType] ?? GlobeIcon;
}

/** Renders the icon for a contact type (or a header field) by name. */
export function ContactIcon({
  type,
  className,
}: {
  type: unknown;
  className?: string;
}) {
  return createElement(contactIcon(type), { className });
}
