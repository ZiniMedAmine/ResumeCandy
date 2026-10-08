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
    profile: "Master profile",
    tailor: "Tailor to a job",
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
    ats: "ATS check",
    atsTitle: "ATS readiness: {score}/100",
    job: "Job & links",
    jobTitle: "Job posting, links and description for {name}",
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
    fitPage: "Fit to 1 page",
    fitPageTitle: "Tighten type and spacing until the PDF fits on one page",
    fitting: "Fitting…",
    newVersion: "New version",
  },

  /* -------------------------------- content -------------------------------- */
  content: {
    photo: "Photo",
    uploadPhoto: "Upload photo",
    changePhoto: "Change",
    removePhoto: "Remove photo",
    photoHint: "Printed when Show photo is on (Customize → Header). Cropped to a square.",
    linksTitle: "Links & personal details",
    linksHint:
      "LinkedIn, GitHub, Behance, portfolio, nationality… Added on a named version, an item stays on that version only.",
    addLink: "Add link or detail",
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
    contact: "Link or detail",
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
    photo: "Photo",
    value: "Value",
    label: "Label",
    type: "Type",
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
    companyUrl: "Company website",
    schoolUrl: "School website",
    credentialUrl: "Credential URL",
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
      companyUrl: "acme.com",
      schoolUrl: "university.edu",
      credentialUrl: "credly.com/badges/…",
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
    headerLayout: "Layout",
    nameCase: "Name capitalization",
    photoShape: "Photo shape",
    photoSize: "Photo size",
    bulletStyle: "Bullet style",
    skillStyle: "Skills display",
    linkText: "Show links as",
    linkTextHint:
      "Full addresses stay readable to applicant tracking systems, which read the printed text and ignore hidden link targets.",
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
    showPhotoHint: "Upload it under Personal details. ATS ignore photos, and US/UK recruiters often prefer none.",
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
    headerLayout: { stacked: "Stacked", split: "Split", banner: "Banner" },
    nameCase: { normal: "As typed", uppercase: "UPPERCASE" },
    photoShape: { circle: "Circle", rounded: "Rounded", square: "Square" },
    bulletStyle: { dot: "• Dot", dash: "– Dash", square: "▪ Square", arrow: "› Arrow" },
    skillStyle: { inline: "Inline", chips: "Chips", list: "List" },
    linkText: { url: "Full URL", name: "Name only" },
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
      accentIcons: "Contact icons",
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
    photoFailed: "That image could not be read. Try a JPG or PNG.",
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
    fitDone: "Fitted on one page",
    alreadyOnePage: "Already fits on one page",
    fitTooLong: "Still {n} pages at the smallest comfortable size — cut a few bullets",
    coverCopied: "Cover letter copied",
    languageChanged: "Interface language changed",
  },

  /* ------------------------- header links & details ------------------------ */
  contacts: {
    pastePlaceholder: "Paste a profile URL — LinkedIn, GitHub, Behance…",
    group: { network: "Profiles", web: "Websites", detail: "Personal details" },
    /** Names for the non-brand types; brands (LinkedIn…) are never translated. */
    type: {
      portfolio: "Portfolio",
      blog: "Blog",
      link: "Other link",
      nationality: "Nationality",
      birthDate: "Date of birth",
      drivingLicense: "Driving licence",
      workPermit: "Work authorization",
      availability: "Availability / notice",
      info: "Other detail",
    },
    changeType: "Change type",
    labelPlaceholder: "Label (optional)",
    infoLabelPlaceholder: "Label, e.g. Visa",
    open: "Open link",
    empty: "No links yet — add your LinkedIn, GitHub or portfolio.",
  },

  /* -------------------------------- ATS check ------------------------------- */
  ats: {
    title: "ATS check",
    subtitle: "How applicant tracking systems will read {name}",
    close: "Close ATS check",
    great: "Ready to send",
    good: "Almost there",
    low: "Needs work",
    toImprove: "To improve",
    passed: "Looks good",
    words: plural({ one: "{n} word", other: "{n} words" }),
    keywordsTitle: "Keyword match",
    keywordsEmpty: "Paste the job description under Job & links to see which of its key terms this version mentions.",
    addJobDescription: "Add job description",
    coverage: "{coverage}% of the posting’s key terms appear in this version",
    found: "Found",
    missing: "Missing",
    missingHint: "Work the missing terms in where they are true — in a bullet, a skill or the summary.",
    checks: {
      name: {
        title: "Full name",
        pass: "Your name is at the top, where parsers look for it.",
        issue: "Add your full name — without it the application can’t be matched to you.",
      },
      email: {
        title: "Email",
        pass: "A valid email address is listed.",
        issue: "Add a valid email address — it is how recruiters reply.",
      },
      phone: {
        title: "Phone",
        pass: "A phone number is listed.",
        issue: "Add a phone number — many ATS flag profiles without one.",
      },
      location: {
        title: "Location",
        pass: "Your location is listed.",
        issue: "Add a city and country — location is one of the first filters recruiters apply.",
      },
      profiles: {
        title: "Profile links",
        pass: "At least one profile link is listed.",
        issue: "Add LinkedIn, GitHub or a portfolio under Personal details.",
      },
      summary: {
        title: "Summary",
        pass: "A summary frames your profile.",
        issue: "Add a 2–4 sentence summary (under ~900 characters) — it is read first.",
      },
      experience: {
        title: "Experience section",
        pass: "An Experience section is present.",
        issue: "Add an Experience section — ATS look for it by type and heading.",
      },
      education: {
        title: "Education section",
        pass: "An Education section is present.",
        issue: "Add an Education section — many filters require one.",
      },
      skills: {
        title: "Skills",
        pass: plural({ one: "{n} skill listed for keyword searches.", other: "{n} skills listed for keyword searches." }),
        issue: "Add a Skills section — keyword searches match against it.",
      },
      dates: {
        title: "Dates",
        pass: "Every role and degree has dates.",
        issue: plural({
          one: "{n} entry has no dates — ATS compute years of experience from them.",
          other: "{n} entries have no dates — ATS compute years of experience from them.",
        }),
      },
      bullets: {
        title: "Achievements",
        pass: "Every role has bullet points.",
        issue: plural({
          one: "{n} role has no bullet points — say what you did and achieved.",
          other: "{n} roles have no bullet points — say what you did and achieved.",
        }),
      },
      bulletLength: {
        title: "Bullet length",
        pass: "Bullets are concise.",
        issue: plural({
          one: "{n} bullet runs over {max} characters — split it.",
          other: "{n} bullets run over {max} characters — split them.",
        }),
      },
      headings: {
        title: "Section headings",
        pass: "All headings are standard, so parsers know where to file each section.",
        issue: "Non-standard headings: {titles}. Parsers may not know where to file them.",
      },
      columns: {
        title: "Single column",
        pass: "Content flows in one column — the safest reading order.",
        issue: "Side columns can be read out of order by older ATS. Prefer One column (Customize → Layout) for online applications.",
      },
      photo: {
        title: "Photo",
        pass: "No photo — ATS ignore images anyway.",
        issue: "A photo is shown. ATS skip it, and US/UK recruiters often prefer CVs without one.",
      },
      fontSize: {
        title: "Font size",
        pass: "Body text is large enough to parse reliably.",
        issue: "Body text is {size}px — raise it to at least 11px.",
      },
      linkText: {
        title: "Visible links",
        pass: "Link addresses are printed as text, so parsers can read them.",
        issue: "Links show names only, and parsers can’t see the hidden address. Switch to Full URL (Customize → Link Styling).",
      },
      length: {
        title: "Length",
        pass: "{n} words — a healthy length.",
        issue: "{n} words — aim for between {min} and {max}.",
      },
    },
  },

  /* ------------------------ version links & job posting ---------------------- */
  jobs: {
    title: "Job & links",
    subtitle: "Attached to {name} only — never printed on the resume.",
    close: "Close",
    linksTitle: "Attached links",
    linksEmpty:
      "Attach the posting you tailored this version for, the application portal or the recruiter’s profile — so you always know where this CV went.",
    addLink: "Attach a link",
    urlPlaceholder: "https://…",
    labelPlaceholder: "Label (optional)",
    open: "Open in a new tab",
    remove: "Remove link",
    kind: {
      posting: "Job posting",
      application: "Application",
      company: "Company",
      contact: "Recruiter / contact",
      other: "Other",
    },
    linkCount: plural({ one: "{n} link", other: "{n} links" }),
    descriptionTitle: "Job description",
    descriptionHint: "Paste the posting. The ATS check compares its key terms with this version.",
    descriptionPlaceholder: "Paste the job description here…",
    coverTitle: "Cover letter",
    coverHint: "Written from your master profile for this job description. Edit freely — it is never printed on the resume.",
    coverWrite: "Write cover letter",
    coverWriting: "Writing…",
    coverRewrite: "Rewrite",
    coverCopy: "Copy",
    coverDownload: "PDF",
    coverNeedsJob: "Paste the job description above first.",
    coverPlaceholder: "Your cover letter…",
  },

  /* ----------------------------- master profile ----------------------------- */
  profile: {
    title: "Master profile",
    subtitle:
      "Everything you have done, know and achieved, in one place. Tailored resumes are written only from this — nothing in them is invented.",
    placeholder:
      "# Your Name — Master Profile\n\n## Identity\n- Location, work permit, email, phone, LinkedIn, GitHub…\n\n## Experience\n### Title — Company\n**Mar 2022 – Present | City, Country**\n- What you did, with which tools, and the measurable result\n\n## Projects\n## Education\n## Skills\n## Certifications\n## Languages",
    importFile: "Import a file",
    importHint: "Markdown or plain text, such as a profile written for another tool.",
    importFailed: "That file could not be read. Use a .md or .txt file.",
    save: "Save",
    saving: "Saving…",
    saved: "Saved",
    unsaved: "Unsaved changes",
    words: plural({ one: "{n} word", other: "{n} words" }),
    tipsTitle: "What to include",
    tip1: "Every role, with dates, location and every bullet you have ever written for it.",
    tip2: "The numbers: volumes, time saved, users, money, team size. Tailoring never invents them.",
    tip3: "Projects, certifications, languages with their level, and your work permit status.",
    tip4: "Write it once, in any language — each tailored resume is written in the posting’s.",
    tailorCta: "Tailor to a job",
  },

  /* --------------------------------- tailor --------------------------------- */
  tailor: {
    title: "Tailor to a job",
    subtitle:
      "Paste a job posting. Claude checks how well you fit it against your master profile, then writes a one-page resume for it in the template you choose.",
    noProfileTitle: "Start with your master profile",
    noProfileBody:
      "Tailored resumes are written only from your master profile. Add it first: an old CV, your LinkedIn summary, projects and the numbers you are proud of.",
    noProfileCta: "Set up my profile",
    jobLabel: "Job description",
    jobPlaceholder: "Paste the full job posting here…",
    urlLabel: "Link to the posting (optional)",
    urlPlaceholder: "https://…",
    templateLabel: "Template",
    languageLabel: "Language of the resume",
    languageAuto: "Match the posting",
    coverLetter: "Also write a cover letter",
    check: "Check my fit",
    checking: "Reading the posting against your profile…",
    skipCheck: "Skip the check and generate",
    generate: "Generate tailored resume",
    generateAnyway: "Generate anyway",
    generating: "Writing your resume…",
    generatingHint: "This usually takes about a minute; a cover letter adds a little more. Keep this tab open.",
    doneTitle: "Your tailored resume is ready",
    doneHint: "It opens in the editor and fits itself on one page. Read every line before sending: you are the final check.",
    openResume: "Open resume",
    changeJob: "Change the job",
    verdict: {
      greenlit: "Good fit — apply",
      borderline: "Borderline — your call",
      notAdvised: "Not advised",
    },
    verdictBody: {
      greenlit: "You meet the hard requirements. The resume will lead with the strengths below.",
      borderline: "You meet most but not all hard requirements. The gaps may come up in interview.",
      notAdvised:
        "The gap is wide enough that a CV would have to stretch the truth. Roles closer to your profile are a better use of your time.",
    },
    hardScore: "Hard requirements",
    overallScore: "Overall",
    requirements: "Requirements",
    category: { hard: "Required", nice: "Nice to have", soft: "Soft skill" },
    status: { match: "Match", partial: "Partial", mitigable: "Learnable", gap: "Gap" },
    strengths: "Your strengths for this role",
    framing: "How the resume will frame the gaps",
    errorTitle: "Claude could not finish",
    details: "Details",
    retry: "Try again",
    error: {
      "cli-missing":
        "ResumeCandy talks to Claude through the Claude Code command-line tool, which was not found on this machine. Install Claude Code, run “claude” once in a terminal to sign in with your Claude account, then restart ResumeCandy. If it is installed somewhere else, set CLAUDE_CLI_PATH in .env.local.",
      "not-signed-in":
        "Claude Code is not signed in (or its sign-in expired). Run “claude” in a terminal, sign in with your Claude account, and try again.",
      timeout: "Claude took too long to answer. Try again in a moment.",
      failed: "Something went wrong while talking to Claude.",
      "bad-output": "Claude’s answer came back incomplete. Try again.",
      "no-profile": "Your master profile is empty.",
      "no-job": "Paste the job description first.",
    },
  },
};

/**
 * The shape every other dictionary must match, declared here rather than in
 * `index.ts` so the translations can import it without a module cycle.
 */
export type Dictionary = typeof en;
