import type { SVGProps } from "react";

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

export const PlusIcon = icon(<path d="M12 5v14M5 12h14" />);
export const MinusIcon = icon(<path d="M5 12h14" />);
export const XIcon = icon(<path d="M18 6 6 18M6 6l12 12" />);
export const CheckIcon = icon(<path d="M20 6 9 17l-5-5" />);
export const ChevronDownIcon = icon(<path d="m6 9 6 6 6-6" />);
export const ChevronRightIcon = icon(<path d="m9 18 6-6-6-6" />);
export const ChevronLeftIcon = icon(<path d="m15 18-6-6 6-6" />);
export const CalendarIcon = icon(
  <>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </>,
);
export const ArrowUpIcon = icon(<path d="M12 19V5m-7 7 7-7 7 7" />);
export const ArrowDownIcon = icon(<path d="M12 5v14m7-7-7 7-7-7" />);
export const ArrowLeftIcon = icon(<path d="M19 12H5m7 7-7-7 7-7" />);
export const SearchIcon = icon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </>,
);
export const EyeIcon = icon(
  <>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </>,
);
export const EyeOffIcon = icon(
  <>
    <path d="M10.7 5.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.9 3.9M6.6 6.6A16.7 16.7 0 0 0 2 12s3.5 7 10 7c1.5 0 2.9-.4 4.1-1M3 3l18 18" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </>,
);
export const TrashIcon = icon(
  <>
    <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M10 11v6M14 11v6" />
  </>,
);
export const CopyIcon = icon(
  <>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </>,
);
export const UndoIcon = icon(<path d="M3 7v6h6M3 13a9 9 0 1 0 3-7.7" />);
export const DotsIcon = icon(
  <>
    <circle cx="5" cy="12" r="1" fill="currentColor" />
    <circle cx="12" cy="12" r="1" fill="currentColor" />
    <circle cx="19" cy="12" r="1" fill="currentColor" />
  </>,
);
export const ArchiveIcon = icon(
  <>
    <rect x="2" y="4" width="20" height="5" rx="1" />
    <path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9M10 13h4" />
  </>,
);
export const RestoreIcon = icon(
  <>
    <path d="M3 12a9 9 0 1 0 2.6-6.3M3 3v5h5" />
    <path d="M12 8v4l3 2" />
  </>,
);
export const LayersIcon = icon(
  <>
    <path d="m12 2 9 5-9 5-9-5 9-5Z" />
    <path d="m3 12 9 5 9-5M3 17l9 5 9-5" />
  </>,
);
export const TagIcon = icon(
  <>
    <path d="M12 2H2v10l9.3 9.3a1 1 0 0 0 1.4 0l8.6-8.6a1 1 0 0 0 0-1.4L12 2Z" />
    <circle cx="7" cy="7" r="1" fill="currentColor" />
  </>,
);
export const PencilIcon = icon(
  <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3Z" />,
);
export const SparkleIcon = icon(
  <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m14.4-6.4-2.1 2.1M8.7 15.3l-2.1 2.1m0-10.8 2.1 2.1m6.6 6.6 2.1 2.1" />,
);
export const DownloadIcon = icon(<path d="M12 4v12m-5-5 5 5 5-5M4 20h16" />);
export const UploadIcon = icon(
  <path d="M12 16V4m-5 5 5-5 5 5M4 20h16" />,
);
export const FileIcon = icon(
  <>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" />
    <path d="M14 2v6h6" />
  </>,
);
export const CloudCheckIcon = icon(
  <>
    <path d="M17.5 19a4.5 4.5 0 0 0 .4-9A7 7 0 0 0 4.3 12.6 4 4 0 0 0 6 19h11.5Z" />
    <path d="m9 13 2 2 4-4" />
  </>,
);
export const CloudSyncIcon = icon(
  <>
    <path d="M17.5 19a4.5 4.5 0 0 0 .4-9A7 7 0 0 0 4.3 12.6 4 4 0 0 0 6 19h11.5Z" />
    <path d="M12 10v4l2.5 1.5" />
  </>,
);
export const CommandIcon = icon(
  <path d="M9 9V6a3 3 0 1 0-3 3h3Zm0 0v6m0-6h6m-6 6v3a3 3 0 1 1-3-3h3Zm6-6h3a3 3 0 1 0-3-3v3Zm0 0v6m0 0h3a3 3 0 1 1-3 3v-3Z" />,
);
export const WarningIcon = icon(
  <>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4m0 4h.01" />
  </>,
);
export const GripIcon = icon(
  <>
    <circle cx="9" cy="6" r="1" fill="currentColor" />
    <circle cx="15" cy="6" r="1" fill="currentColor" />
    <circle cx="9" cy="12" r="1" fill="currentColor" />
    <circle cx="15" cy="12" r="1" fill="currentColor" />
    <circle cx="9" cy="18" r="1" fill="currentColor" />
    <circle cx="15" cy="18" r="1" fill="currentColor" />
  </>,
);
export const GitBranchIcon = icon(
  <>
    <circle cx="6" cy="6" r="2.5" />
    <circle cx="6" cy="18" r="2.5" />
    <circle cx="18" cy="8" r="2.5" />
    <path d="M6 8.5v7M18 10.5c0 3-2.5 4-5 4H9" />
  </>,
);

/* ------------------------- section & customize icons ------------------------ */

export const UserIcon = icon(
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.5-6.5 8-6.5s8 2.5 8 6.5" />
  </>,
);
export const BriefcaseIcon = icon(
  <>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 12h18" />
  </>,
);
export const GradCapIcon = icon(
  <>
    <path d="m2 9 10-5 10 5-10 5-10-5Z" />
    <path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5M22 9v5" />
  </>,
);
export const FolderIcon = icon(
  <path d="M3 7V5a2 2 0 0 1 2-2h4l2 3h8a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />,
);
export const PuzzleIcon = icon(
  <path d="M10 3.5a1.5 1.5 0 0 1 3 0V5h4a1 1 0 0 1 1 1v4h1.5a1.5 1.5 0 0 1 0 3H18v4a1 1 0 0 1-1 1h-4v1.5a1.5 1.5 0 0 1-3 0V18H6a1 1 0 0 1-1-1v-4H3.5a1.5 1.5 0 0 1 0-3H5V6a1 1 0 0 1 1-1h4V3.5Z" />,
);
export const AwardIcon = icon(
  <>
    <circle cx="12" cy="9" r="6" />
    <path d="m9 14.5-1.5 6L12 18l4.5 2.5-1.5-6" />
  </>,
);
export const UsersIcon = icon(
  <>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" />
    <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M17.5 14.7c2.3.6 4 2.4 4 5.3" />
  </>,
);
export const SignOutIcon = icon(
  <>
    <path d="M9 21H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3" />
    <path d="m16 16 4-4-4-4M20 12H9" />
  </>,
);
export const SunIcon = icon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
  </>,
);
export const MoonIcon = icon(<path d="M20 14.5A8.2 8.2 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />);
export const BookIcon = icon(
  <>
    <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v15H5.5A1.5 1.5 0 0 0 4 19.5v-15Z" />
    <path d="M4 19.5A1.5 1.5 0 0 1 5.5 18H19v3H5.5A1.5 1.5 0 0 1 4 19.5Z" />
  </>,
);
export const BookOpenIcon = icon(
  <>
    <path d="M12 6.5C10.5 5 8.5 4.5 6 4.5H3v14h3c2.5 0 4.5.5 6 2" />
    <path d="M12 6.5C13.5 5 15.5 4.5 18 4.5h3v14h-3c-2.5 0-4.5.5-6 2" />
    <path d="M12 6.5v14" />
  </>,
);
export const BuildingIcon = icon(
  <>
    <path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16" />
    <path d="M15 9h3a2 2 0 0 1 2 2v10M2 21h20" />
    <path d="M8 7h3M8 11h3M8 15h3" />
  </>,
);
export const HeartIcon = icon(
  <path d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7 3.1c0 4.9-7 9.3-7 9.3Z" />,
);
export const MedalIcon = icon(
  <>
    <path d="M7.5 3 10 8m6.5-5L14 8" />
    <circle cx="12" cy="14.5" r="5.5" />
    <path d="m12 12 .9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2L9 14.2l2-.3.9-1.9Z" />
  </>,
);
export const SignatureIcon = icon(
  <>
    <path d="M3 17c3.5 0 4.5-11 7-11s1.5 9 4 9c1.5 0 2-2 3.5-2" />
    <path d="M3 21h18" />
  </>,
);
export const PaletteIcon = icon(
  <>
    <path d="M12 21a9 9 0 1 1 9-9c0 2.5-2 3-3.5 3H15a2 2 0 0 0-1.5 3.3c.4.5.6 1.7-1.5 1.7Z" />
    <circle cx="7.5" cy="11.5" r="1" fill="currentColor" />
    <circle cx="10.5" cy="7.5" r="1" fill="currentColor" />
    <circle cx="15" cy="7.5" r="1" fill="currentColor" />
  </>,
);
export const TypeIcon = icon(<path d="M5 6V4h14v2M12 4v16m-3 0h6" />);
export const TemplateIcon = icon(
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M9 9v12" />
  </>,
);
export const SpacingIcon = icon(
  <path d="M12 4v16M4 8h16M4 16h16" />,
);
export const MarginsIcon = icon(
  <>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <rect x="7.5" y="7.5" width="9" height="9" rx="1" />
  </>,
);
export const MailIcon = icon(
  <>
    <rect x="2.5" y="5" width="19" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </>,
);
export const PhoneIcon = icon(
  <path d="M5 3h4l2 5-2.5 1.5a12 12 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z" />,
);
export const PinIcon = icon(
  <>
    <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </>,
);
export const GlobeIcon = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
  </>,
);
export const LinkIcon = icon(
  <path d="M10 14a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.1M14 10a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.1-1.1" />,
);
