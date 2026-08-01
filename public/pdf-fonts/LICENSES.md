# Embedded PDF fonts

The PDF export and resume preview include these SIL Open Font License 1.1 fonts:

- Geist, Copyright 2023 Vercel and contributors — https://github.com/vercel/geist-font
- Source Serif 4, Copyright 2014–2023 Adobe and contributors — https://github.com/adobe-fonts/source-serif
- Amiri, Copyright 2010–2023 Khaled Hosny and contributors — https://github.com/aliftype/amiri
- IBM Plex Sans Arabic, Copyright 2017–2023 IBM Corp. — https://github.com/IBM/plex

The two Arabic families were chosen against two hard constraints, and a
replacement has to be checked against both before it is swapped in:

1. jsPDF's Arabic shaper rewrites letters as Arabic Presentation Forms-B
   codepoints (U+FE70–U+FEFF). A font that only does OpenType GSUB shaping —
   which is most modern Arabic fonts — renders nothing at all in the export.
2. The face must carry a full Latin set too. jsPDF binds one font per run and
   has no per-glyph fallback, so an Arabic-only font silently drops every
   email address, URL and Latin company name from the PDF. This ruled out
   Noto Naskh Arabic and Noto Sans Arabic, which contain no Latin letters.

Amiri is missing one codepoint, U+FE73 (tatweel with fathatan) — a
compatibility diacritic that does not occur in résumé text.

The original font-license texts are available from the linked upstream repositories.
