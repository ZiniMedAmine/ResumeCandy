/**
 * The interface dictionary — every word the *application* says.
 *
 * This file is the contract: `type Dictionary = typeof en`, so French and
 * Arabic are checked against its shape and a missing or misspelled key is a
 * compile error rather than a string that quietly renders as a key name.
 *
 * What does NOT belong here: anything printed on the résumé. Section headings,
 * month names and the word for an ongoing role live in `lib/locale.ts` and
 * follow the *document's* language, so an Arabic CV can be edited in an
 * English interface and vice versa. The rule of thumb is simple — if it ends
 * up in the PDF it is not in this file.
 *
 * Keys are grouped by where they are read, not by what they say, so a screen
 * can be translated by reading one block top to bottom.
 */

import { plural } from "../translate";

export const en = {
  /* ---------------------------------- app ---------------------------------- */
  app: {
    // The product name is a proper noun and stays identical in every language.
    name: "ResumeCandy",
    tagline: "One resume per career — unlimited tailored versions per resume.",
  },

  /* -------------------------------- common --------------------------------- */
  common: {
    cancel: "Cancel",
    save: "Save",
    close: "Close",
    done: "Done",
    delete: "Delete",
    rename: "Rename",
    undo: "Undo",
    dismiss: "Dismiss",
    show: "Show",
    restore: "Restore",
    archive: "Archive",
    duplicate: "Duplicate",
    more: "More",
    confirm: "Confirm",
    reset: "Reset",
    empty: "empty",
    /** The base version every resume has; capitalised as a name in the UI. */
    defaultVersion: "Default",
    themeToggle: "Switch between light and dark",
  },

  /* --------------------------------- auth ---------------------------------- */
  auth: {
    metaSignIn: "Sign in — ResumeCandy",
    metaSignUp: "Create an account — ResumeCandy",
    signInTitle: "Welcome back",
    signInSubtitle: "Sign in to pick up where you left off.",
    signUpTitle: "Create your account",
    signUpSubtitle: "One account holds every resume and all of their versions.",
    name: "Name",
    email: "Email",
    password: "Password",
    namePlaceholder: "Ada Lovelace",
    emailPlaceholder: "you@example.com",
    newPasswordPlaceholder: "At least 8 characters",
    currentPasswordPlaceholder: "Your password",
    pending: "Just a moment…",
    createAccount: "Create account",
    signIn: "Sign in",
    haveAccount: "Already have an account?",
    newHere: "New here?",
    toSignIn: "Sign in",
    toSignUp: "Create an account",
    errorName: "Please enter your name.",
    errorEmail: "Please enter a valid email address.",
    errorPassword: "Use at least 8 characters.",
    errorEmailTaken: "That email is already registered.",
    errorMissing: "Enter your email and password.",
    errorCredentials: "That email and password don’t match an account.",
  },

  /* -------------------------------- sidebar -------------------------------- */
  sidebar: {
    resumes: "Resumes",
    account: "My account",
    signOut: "Sign out",
    storedLocally: "Stored on this machine.",
  },

  /* ------------------------------- dashboard ------------------------------- */
  dashboard: {
    title: "My resumes",
    subtitle: "One resume per career, with unlimited tailored versions inside each.",
    newResume: "New resume",
    careerOrRole: "Career or role",
    rolePlaceholder: "e.g. Product Manager",
    chooseTemplate: "Choose template",
    tileHint: "A separate identity with its own content and versions.",
    emptyResume: "Empty resume",
    openResume: "Open {name}",
    optionsFor: "Options for {name}",
    edited: "edited",
    versionCount: plural({ one: "{n} version", other: "{n} versions" }),
    renameResume: "Rename resume",
    downloadPdf: "Download PDF",
    deleteResume: "Delete resume",
    deleteTitle: "Delete “{name}”?",
    deleteBody:
      "The resume with all of its versions and content will be permanently deleted. This cannot be undone.",
  },

  /* ------------------------------- new resume ------------------------------ */
  newResume: {
    backToResumes: "Back to resumes",
    step1: "Step 1 of 2",
    step2: "Step 2 of 2",
    nameTitle: "Name your resume",
    nameHint: "Name it after the career or role it targets — you’ll pick a template next.",
    continue: "Continue",
    chooseTemplateTitle: "Choose a template",
    forName: "For {name}.",
    switchLater: "You can switch template and restyle everything later in Customize.",
    language: "Language of the resume",
    languageHint:
      "Sets the writing direction, dates and section headings. This is the language of the document itself — you can add a version in another language at any time.",
    moreTemplates: "More templates coming",
    moreTemplatesHint:
      "Extra layouts will appear here and can be applied to resumes you’ve already made.",
    create: "Create resume",
    startsWith: "Starts you in the editor with {template}.",
  },

  /* -------------------------------- account -------------------------------- */
  account: {
    title: "My account",
    subtitle: "Who you’re signed in as and what this collection holds.",
    memberSince: "Member since",
    resumes: "Resumes",
    versionsAcross: "Versions across all resumes",
    collectionAge: "Collection age",
    interfaceLanguage: "Interface language",
    interfaceLanguageHint:
      "The language of this app’s buttons, menus and dialogs. Every resume keeps its own language, and switching here never changes a document.",
  },

  /* --------------------------------- editor -------------------------------- */
  editor: {
    content: "Content",
    customize: "Customize",
    saving: "Saving…",
    saved: "Saved",
    allSaved: "All changes saved",
    customizationCount: plural({ one: "{n} customization", other: "{n} customizations" }),
    seeDifferences: "See what differs from the Default",
    switchVersion: "Switch version (Ctrl+K)",
    manageVersions: "Manage versions",
    download: "Download",
    preparingPdf: "Preparing PDF…",
    downloadAsPdf: "Download {name} as PDF",
    newVersion: "New version",
  },

  /* -------------------------------- content -------------------------------- */
  content: {
    personalDetails: "Personal details",
    personalDetailsHint: "Name, contact, summary",
    addContent: "Add Content",
    addContentTitle: "Add content",
    fullName: "Full name",
    fullNamePlaceholder: "Ada Lovelace",
    headline: "Headline",
    headlinePlaceholder: "Software Engineer",
    email: "Email",
    emailPlaceholder: "you@example.com",
    phone: "Phone",
    phonePlaceholder: "+1 555 000 0000",
    location: "Location",
    locationPlaceholder: "City, Country",
    website: "Website",
    websitePlaceholder: "yoursite.dev",
    summary: "Summary",
    summaryPlaceholder: "Two or three sentences that frame your profile…",
  },

  /* --------------------------------- section ------------------------------- */
  section: {
    dragToReorder: "Drag to reorder section",
    editHeading: "Edit heading",
    options: "Section options",
    hideInVersion: "Hide in this version",
    resetToDefault: "Reset section to Default",
    copyCustomizations: "Copy section customizations…",
    deleteFromAll: "Delete from all versions",
    deleteTitle: "Delete section “{name}”?",
    deleteBody:
      "The section and everything inside it will be deleted from the Default and every version. This cannot be scoped to one version — hide it there instead.",
    deleteEverywhere: "Delete everywhere",
    expand: "Expand section",
    collapse: "Collapse section",
    empty: "Empty",
    entryCount: plural({ one: "{n} entry", other: "{n} entries" }),
    customized: "customized",
    onlyInThisVersion: "(only in this version)",
  },

  /* ---------------------------------- entry -------------------------------- */
  entry: {
    edit: "Edit entry",
    editTitle: "Edit entry",
    customizedHere: "customized here",
    showInVersion: "Show in this version",
    hideInVersion: "Hide in this version",
    removeLocal: "Remove (only exists in this version)",
    deleteFromAll: "Delete from all versions",
    deleteEntry: "Delete entry",
    moreOptions: "More options",
    more: "More",
    resetToDefault: "Reset entry to Default",
    resetItemToDefault: "Reset item to Default",
    copyCustomization: "Copy customization to versions…",
    addToDefault: "Add to Default (all versions)",
    removeFromVersion: "Remove from this version",
    deleteTitle: "Delete “{name}”?",
    deleteBody:
      "This deletes it from the Default and every version of this resume, including any per-version customizations of it. Versions that only need it gone from themselves should hide it instead.",
    hiddenInThisVersion: "hidden in this version",
    onlyHere: "Only here",
    onlyHereTitle: "This item exists only in this version",
    customizedInThisVersion: "Customized in this version",
  },

  /* ------------------------------- summaries -------------------------------- */
  summary: {
    untitledRole: "Untitled role",
    untitledDegree: "Untitled degree",
    untitledProject: "Untitled project",
    untitledGroup: "Untitled group",
    untitledCertification: "Untitled certification",
    untitledReference: "Untitled reference",
    untitledLanguage: "Untitled language",
    emptyParagraph: "Empty paragraph",
    skillCount: plural({ one: "{n} skill", other: "{n} skills" }),
  },

  /* --------------------------------- kinds --------------------------------- */
  kind: {
    header: "Header",
    section: "Section",
    experience: "Experience",
    education: "Education",
    project: "Project",
    skillGroup: "Skill group",
    skill: "Skill",
    bullet: "Bullet",
    certification: "Certification",
    reference: "Reference",
    language: "Language",
    text: "Text",
    paragraph: "Paragraph",
    entry: "Entry",
  },

  /* --------------------------------- fields -------------------------------- */
  field: {
    fullName: "Full name",
    headline: "Headline",
    email: "Email",
    phone: "Phone",
    location: "Location",
    website: "Website",
    summary: "Summary",
    title: "Title",
    sectionType: "Section type",
    company: "Company",
    startDate: "Start date",
    endDate: "End date",
    school: "School",
    degree: "Degree",
    field: "Field of study",
    name: "Name",
    url: "URL",
    description: "Description",
    text: "Text",
    issuer: "Issuer",
    date: "Date",
    level: "Level",
  },

  /* ------------------------------ entry fields ------------------------------ */
  fields: {
    projectName: "Project name",
    groupName: "Group name",
    certification: "Certification",
    language: "Language",
    highlights: "Highlights",
    details: "Details",
    skills: "Skills",
    addBullet: "Add bullet",
    addSkill: "Skill",
    dragToReorder: "Drag to reorder",
    removeSkill: "Remove skill",
    hideSkill: "Hide skill in this version",
    hiddenSkill: "Hidden in this version — click to show",
    placeholder: {
      title: "Senior Engineer",
      company: "Acme Corp",
      location: "Remote",
      city: "City",
      degree: "B.Sc.",
      school: "University…",
      field: "Computer Science",
      projectName: "OpenMetrics",
      url: "github.com/…",
      projectDescription: "One-liner about the project…",
      groupName: "Languages",
      certification: "AWS SAA",
      issuer: "Amazon Web Services",
      referenceName: "Jane Doe",
      referenceTitle: "Engineering Manager",
      referenceEmail: "jane@acme.com",
      phone: "+1 555 000 0000",
      languageName: "English",
      level: "Native / C1 / Fluent",
      paragraph: "Write the paragraph as it should appear on the resume…",
      bullet: "Achievement or responsibility…",
      skill: "Skill",
    },
  },

  /* ------------------------------- date field ------------------------------- */
  date: {
    pick: "Pick a date",
    choose: "Choose a date",
    previousYear: "Previous year",
    nextYear: "Next year",
    yearOnly: "{year} only",
    yearOnlyHint: "Use the year without a month",
    clear: "Clear",
    clearDate: "Clear date",
    customText: "Custom text",
    customPlaceholder: "e.g. Summer 2023",
  },

  /* ------------------------------- provenance ------------------------------- */
  provenance: {
    customized: "Customized",
    customizedField: "This field is customized in this version",
    resetToDefault: "Reset to Default",
    pushToDefault: "Push to Default",
    copyToVersions: "Copy to versions…",
    updatesVersions: "Updates {inheriting} of {total} versions",
  },

  /* -------------------------------- customize ------------------------------- */
  customize: {
    rail: {
      document: "Document",
      templates: "Templates",
      layout: "Layout",
      fontsize: "Font Size",
      spacing: "Spacing",
      entries: "Entries",
      headings: "Headings",
      font: "Font",
      colors: "Colors",
      header: "Header",
      links: "Links",
      footer: "Footer",
    },
    group: {
      document: "Document Settings",
      templates: "Design Templates",
      layout: "Layout",
      fontsize: "Font Size",
      spacing: "Spacing",
      entries: "Entry Layout",
      headings: "Section Headings",
      font: "Font",
      colors: "Colors",
      header: "Header",
      links: "Link Styling",
      footer: "Footer",
    },
    onDefaultNotice:
      "You’re customizing the Default — these design choices flow into every version that hasn’t overridden them.",
    onVersionNotice: "Design changes here apply to {name} only.",
    resetDesign: "Reset design",
    resetDot: "Customized in this version — click to follow the Default again",
    resumeLanguage: "Resume language",
    resumeLanguageHint:
      "The language this resume is written in — separate from the language of this app. Sets the text direction, dates and headings. Give each language its own version.",
    arabicNumerals: "Arabic numerals",
    arabicNumeralsHint: "Write dates as ٢٠٢٢ instead of 2022.",
    pageFormat: "Page format",
    pageFormatHint: "{hint} — content that overflows continues on a new page.",
    dateFormat: "Date format",
    dateFormatHint:
      "Applies to every date on the resume. Dates you typed freehand are left alone.",
    template: "Template",
    columns: "Columns",
    sidebarWidth: "Side column width",
    sectionOrder: "Section order",
    sectionOrderEmpty: "Add a section in the Content tab first.",
    mixHint:
      "Sections set to Full span the whole width and are printed above the two-column area.",
    moveBetweenColumns: "Move between columns",
    dragToReorder: "Drag to reorder",
    untitled: "Untitled",
    fontSize: "Base font size",
    nameSize: "Full name",
    titleSize: "Professional title",
    headingSize: "Section headings",
    entryHeaderSize: "Entry header",
    lineHeight: "Line height",
    sectionSpacing: "Space between elements",
    marginX: "Left & right margin",
    marginY: "Top & bottom margin",
    structure: "Structure",
    datePosition: "Date & location position",
    subtitlePlacement: "Subtitle placement",
    headingStyle: "Style",
    headingCase: "Capitalization",
    headingIcons: "Icons",
    bodyFont: "Body font",
    nameFont: "Name font",
    sameAsBody: "Same as body font",
    accentColor: "Accent color",
    customHex: "Custom hex",
    applyAccentTo: "Apply accent color to",
    headerAlign: "Text alignment",
    headerDetails: "Details arrangement",
    headerSeparator: "Separator",
    showPhoto: "Show photo",
    showPhotoHint: "A placeholder circle until photo uploads land",
    linkUnderline: "Underline",
    linkAccent: "Accent color",
    linkIcon: "Link icon",
    footerPageNumbers: "Page numbers",
    footerEmail: "Email",
    footerName: "Name",
    footerHint:
      "The footer prints inside the bottom margin of every page. Widen it under Spacing if it feels cramped.",
  },

  /* --------------------------- design option labels -------------------------- */
  /**
   * Keyed by the stored value, so `lib/design.ts` stays a catalogue of what the
   * options *are* rather than a copy deck of what they are called.
   */
  design: {
    template: {
      classic: { name: "Classic", description: "Serif, centered header, ruled sections" },
      modern: { name: "Modern", description: "Sans-serif, accent header, sidebar column" },
    },
    // Paper sizes are international standards and keep their names everywhere.
    pageFormat: { a4: "A4", letter: "Letter", legal: "Legal" },
    columns: { one: "One", two: "Two", mix: "Mix" },
    sectionColumn: { main: "Main", side: "Side", full: "Full" },
    entryStructure: { full: "Full width", columns: "Columns" },
    datePosition: { right: "Right", left: "Left", split: "Split" },
    subtitlePlacement: { sameLine: "Same line", below: "Below title" },
    headingStyle: {
      underline: "Underline",
      plain: "Plain",
      box: "Box",
      bar: "Left bar",
      background: "Filled",
      double: "Double rule",
    },
    headingCase: { capitalize: "Capitalize", uppercase: "UPPERCASE" },
    headingIcons: { none: "None", outline: "Outline", filled: "Filled" },
    headerAlign: { left: "Left", center: "Center" },
    headerDetails: { inline: "Inline", stacked: "Stacked" },
    headerSeparator: { icon: "Icon", bullet: "Bullet", bar: "Bar" },
    accentTarget: {
      accentName: "Name",
      accentSubtitle: "Company / subtitle",
      accentHeadings: "Section headings",
      accentHeadingLine: "Heading rules",
      accentBullets: "Bullets & chips",
      accentDates: "Dates",
    },
    accent: {
      maroon: "Maroon",
      charcoal: "Charcoal",
      slate: "Slate",
      navy: "Navy",
      royal: "Royal",
      sky: "Sky",
      indigo: "Indigo",
      violet: "Violet",
      teal: "Teal",
      emerald: "Emerald",
      amber: "Amber",
      rose: "Rose",
    },
  },

  /* ----------------------------- section presets ---------------------------- */
  /**
   * What the app says *about* a section type. The heading it prints lives in
   * `lib/locale.ts` and follows the résumé's language instead — that split is
   * the whole point of keeping these two files apart.
   */
  sections: {
    description: {
      education: "Your degrees and schools, with focus, honours or exchange terms.",
      experience: "Roles and employment history, including internships.",
      skills: "The hard and soft skills that make you stand out.",
      languages: "Languages you speak and how fluent you are in each.",
      certifications: "Industry certificates and licences, with issuer and date.",
      interests: "Personal interests that support your story and cultural fit.",
      projects: "Key projects, with your role, the challenge and the impact.",
      courses: "Online or in-person courses and trainings you completed.",
      awards: "Recognitions from industry, competitions or academia.",
      organisations: "Memberships and volunteering, including your role.",
      publications: "Articles, papers or books you wrote or contributed to.",
      references: "Referees from managers or coworkers, with contact details.",
      declaration: "A closing statement, signed off in your own words.",
      custom: "Anything else — free paragraphs under a heading you choose.",
    },
    add: {
      entry: "Add entry",
      skillGroup: "Add skill group",
      language: "Add language",
      certificate: "Add certificate",
      interestGroup: "Add interest group",
      project: "Add project",
      course: "Add course",
      award: "Add award",
      organisation: "Add organisation",
      publication: "Add publication",
      reference: "Add reference",
      paragraph: "Add paragraph",
    },
  },

  /* -------------------------------- versions -------------------------------- */
  versions: {
    /* switcher */
    searchPlaceholder: "Highlight a resume or version…",
    esc: "esc",
    legendDefault: "Default",
    legendVersion: "Version",
    legendEditing: "Editing",
    createNamed: "Create “{name}” ↵",
    clickHint: "click a node to open it",
    rootLabel: "Resumes",
    archived: "archived",
    versionCount: plural({ one: "{n} version", other: "{n} versions" }),

    /* manager */
    managerTitle: "Manage versions",
    tabActive: "Active",
    tabArchived: "Archived",
    tabTrash: "Trash",
    managerSearch: "Search name or tag…",
    trashNotice: "Trashed versions are permanently deleted after 30 days.",
    colVersion: "Version",
    colTags: "Tags",
    colCustomized: "Customized",
    colOpened: "Opened",
    emptyTrash: "Trash is empty.",
    emptyArchived: "Nothing archived.",
    emptyActive: "No versions match.",
    defaultBadge: "default",
    currentBadge: "current",
    fromVersion: "from {name}",
    addTag: "+ tag",
    tagsPlaceholder: "comma, separated",
    editTags: "Edit tags",
    openVersion: "Open this version",
    optionsFor: "Options for {name}",
    deleteForever: "Delete forever",
    deleteForeverTitle: "Permanently delete “{name}”?",
    deleteForeverBody:
      "This removes the version and all of its customizations forever. This cannot be undone.",
    restoreFromArchive: "Restore from archive",
    moveToTrash: "Move to Trash",
    selectedCount: "{n} selected",

    /* new version */
    newTitle: "New version",
    name: "Name",
    namePlaceholder: "e.g. Google, Stripe, Berlin startups…",
    startFrom: "Start from",
    defaultSuffix: " (Default)",
    fromDefaultHint: "Starts identical to the Default — customize from there.",
    fromVersionHint:
      "Copies that version’s customizations as a starting point. Content stays linked to the Default.",
    language: "Language",
    sameLanguageHint: "The language this version is written in.",
    newLanguageHint:
      "Section headings arrive translated. Rewrite the rest as you go — every field you change is tracked as a customization.",
    create: "Create version",

    /* copy dialogs */
    copyFrom: "Copy from “{name}”",
    whatToCopy: "What to copy",
    nothingToCopy: "This version has no customizations to copy.",
    intoVersions: "Into versions",
    noOtherVersions: "No other versions yet.",
    pushInsteadHint:
      "To apply a customization to the Default itself, use “Push to Default” on the field instead.",
    copyToCount: plural({ one: "Copy to {n} version", other: "Copy to {n} versions" }),
    copyToNone: "Copy to … versions",
    itemBadge: "item",
    removedItem: "(removed item)",
    copyValueTitle: "Copy value to versions",
    copyIntoDefaultHint:
      "Copying into the Default changes the value every inheriting version sees.",
    copyValue: "Copy value",
  },

  /* ----------------------------- customizations ----------------------------- */
  customizations: {
    title: "Customizations",
    hiddenInDefaultTitle: "Hidden in Default",
    differenceCount: plural({
      one: "{n} difference from the Default",
      other: "{n} differences from the Default",
    }),
    excludedFromDefault: "Items excluded from the Default only",
    closePanel: "Close panel",
    nothingHidden: "Nothing hidden in the Default.",
    identical: "Identical to the Default.",
    identicalHint:
      "Edit any field while viewing this version and it becomes a customization — everything else keeps following the Default.",
    resumeGroup: "Resume",
    addToDefault: "Add to Default (all versions)",
    removeFromVersion: "Remove from this version",
    showInDefault: "Show in Default",
    resetItem: "Reset this item to the Default",
    hiddenHere: "hidden here",
    reordered: "reordered",
    onlyInThisVersion: "only in this version",
    copyToVersions: "Copy to versions…",
    resetAll: "Reset all",
    resetVersionTitle: "Reset “{name}”?",
    resetVersionBody:
      "All customizations will be removed and this version will match the Default exactly. You can undo right after.",
    resetVersionConfirm: "Reset version",
  },

  /* --------------------------------- toasts --------------------------------- */
  /**
   * Built inside the zustand store, which is not a component and cannot use a
   * hook — so the store emits `{ key, params }` and the toast host translates
   * at render. Every key here must therefore be reachable by name.
   */
  toast: {
    saveFailed: "Failed to save — your last change may not persist",
    customizedFor: "Customized for {name} — other versions keep the Default",
    hiddenInDefault: "Hidden in the Default — versions keep their own visibility",
    hiddenInVersion: "Hidden in {name} — it stays in the Default",
    removedFrom: "Removed from {name}",
    deletedEverywhere: "Deleted from the Default and every version",
    fieldReset: "Field reset to the Default value",
    resetToDefault: "Reset to the Default",
    sectionReset: "Section reset to the Default",
    versionReset: "{name} reset to the Default",
    pushedToDefault: "Pushed to the Default — versions without their own edit now use it",
    addedToDefault: "Added to the Default — now part of every version",
    copiedToVersions: plural({
      one: "Copied to {n} version",
      other: "Copied to {n} versions",
    }),
    valueCopiedToVersions: plural({
      one: "Value copied to {n} version",
      other: "Value copied to {n} versions",
    }),
    headingsTranslated: plural({
      one: "{n} heading translated — renamed ones were left alone",
      other: "{n} headings translated — renamed ones were left alone",
    }),
    designReset: "Design reset — {name} now follows the Default",
    duplicatedAs: "Duplicated as “{name}”",
    versionArchived: "“{name}” archived",
    versionTrashed: "“{name}” moved to Trash — kept for 30 days",
    versionDeleted: "“{name}” permanently deleted",
    bulkArchived: plural({ one: "{n} version archived", other: "{n} versions archived" }),
    bulkRestored: plural({ one: "{n} version restored", other: "{n} versions restored" }),
    bulkTrashed: plural({
      one: "{n} version moved to Trash",
      other: "{n} versions moved to Trash",
    }),
    pdfStarted: "PDF download started",
    pdfFailed: "Could not create the PDF. Please try again.",
    languageChanged: "Interface language changed",
  },
};

/**
 * The shape every other dictionary must match, declared here rather than in
 * `index.ts` so the translations can import it without a module cycle.
 */
export type Dictionary = typeof en;
