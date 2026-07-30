import { count } from "drizzle-orm";
import { nanoid } from "nanoid";
import { ranksBetween } from "../lib/resume/rank";
import type { NodeKind } from "../lib/resume/types";
import { db } from "./index";
import {
  collections,
  nodeOverrides,
  nodes,
  resumes,
  versions,
} from "./schema";

const DEV_USER_ID = "dev";

interface SeedNode {
  id: string;
  parentId: string | null;
  kind: NodeKind;
  rank: string;
  data: Record<string, unknown>;
  ownerVersionId?: string | null;
}

/**
 * Seed a realistic Software Engineer resume with Default / Google / Amazon
 * versions, plus a small Sales resume, so every feature has data to bite on.
 * Idempotent: does nothing when a collection already exists.
 */
export function ensureSeeded(): void {
  const [{ value: existing }] = db.select({ value: count() }).from(collections).all();
  if (existing > 0) return;

  db.transaction((tx) => {
    const collectionId = nanoid();
    tx.insert(collections).values({ id: collectionId, userId: DEV_USER_ID }).run();

    /* ------------------------- Software Engineer ------------------------- */
    const seResumeId = nanoid();
    tx.insert(resumes)
      .values({ id: seResumeId, collectionId, name: "Software Engineer", slug: "software-engineer" })
      .run();

    const vDefault = nanoid();
    const vGoogle = nanoid();
    const vAmazon = nanoid();
    tx.insert(versions)
      .values([
        { id: vDefault, resumeId: seResumeId, name: "Default", isBase: 1, lastOpenedAt: Date.now() },
        {
          id: vGoogle,
          resumeId: seResumeId,
          name: "Google",
          createdFromVersionId: vDefault,
          tags: ["big-tech"],
          // Per-version design override: Google runs a navy accent.
          settingsPatch: { accentColor: "#1e3a8a" },
        },
        { id: vAmazon, resumeId: seResumeId, name: "Amazon", createdFromVersionId: vDefault, tags: ["big-tech"] },
      ])
      .run();

    const seNodes: SeedNode[] = [];
    const id = () => nanoid();
    const push = (n: SeedNode) => (seNodes.push(n), n.id);

    const topRanks = ranksBetween(null, null, 6);
    push({
      id: id(),
      parentId: null,
      kind: "header",
      rank: topRanks[0],
      data: {
        fullName: "Amine Zini",
        headline: "Full-Stack Software Engineer",
        email: "zini.m.amine@gmail.com",
        phone: "+212 600 000 000",
        location: "Casablanca, Morocco",
        website: "aminezini.dev",
        summary:
          "Full-stack engineer with 6 years of experience building web platforms end to end. Comfortable owning features from database schema to pixel-perfect UI, with a bias for shipping and measuring.",
      },
    });

    const secExp = push({
      id: id(),
      parentId: null,
      kind: "section",
      rank: topRanks[1],
      data: { title: "Work Experience", sectionType: "experience" },
    });
    const secEdu = push({
      id: id(),
      parentId: null,
      kind: "section",
      rank: topRanks[2],
      data: { title: "Education", sectionType: "education" },
    });
    const secProj = push({
      id: id(),
      parentId: null,
      kind: "section",
      rank: topRanks[3],
      data: { title: "Projects", sectionType: "projects" },
    });
    const secSkills = push({
      id: id(),
      parentId: null,
      kind: "section",
      rank: topRanks[4],
      data: { title: "Skills", sectionType: "skills" },
    });
    const secCerts = push({
      id: id(),
      parentId: null,
      kind: "section",
      rank: topRanks[5],
      data: { title: "Certifications", sectionType: "certifications" },
    });

    // Experiences
    const expRanks = ranksBetween(null, null, 3);
    const exp1 = push({
      id: id(),
      parentId: secExp,
      kind: "experience",
      rank: expRanks[0],
      data: {
        company: "Nimbus Analytics",
        title: "Senior Software Engineer",
        location: "Remote",
        startDate: "2022-03",
        endDate: "Present",
      },
    });
    const exp1Bullets = ranksBetween(null, null, 4);
    const b11 = push({
      id: id(),
      parentId: exp1,
      kind: "bullet",
      rank: exp1Bullets[0],
      data: { text: "Led the rebuild of the reporting pipeline, cutting dashboard load times from 8s to 700ms for 40k daily users." },
    });
    push({
      id: id(),
      parentId: exp1,
      kind: "bullet",
      rank: exp1Bullets[1],
      data: { text: "Designed a multi-tenant permissions model adopted across three product lines." },
    });
    const b13 = push({
      id: id(),
      parentId: exp1,
      kind: "bullet",
      rank: exp1Bullets[2],
      data: { text: "Mentored four junior engineers; two promoted within a year." },
    });
    push({
      id: id(),
      parentId: exp1,
      kind: "bullet",
      rank: exp1Bullets[3],
      data: { text: "Introduced contract testing between 12 services, reducing integration incidents by 60%." },
    });

    const exp2 = push({
      id: id(),
      parentId: secExp,
      kind: "experience",
      rank: expRanks[1],
      data: {
        company: "Atlas Commerce",
        title: "Software Engineer",
        location: "Casablanca, Morocco",
        startDate: "2019-06",
        endDate: "2022-02",
      },
    });
    const exp2Bullets = ranksBetween(null, null, 3);
    push({
      id: id(),
      parentId: exp2,
      kind: "bullet",
      rank: exp2Bullets[0],
      data: { text: "Built the checkout and payments flow processing $2M/month across three payment providers." },
    });
    push({
      id: id(),
      parentId: exp2,
      kind: "bullet",
      rank: exp2Bullets[1],
      data: { text: "Shipped a real-time inventory sync that eliminated overselling during flash sales." },
    });
    push({
      id: id(),
      parentId: exp2,
      kind: "bullet",
      rank: exp2Bullets[2],
      data: { text: "Migrated a jQuery storefront to React with zero downtime over four months." },
    });

    const exp3 = push({
      id: id(),
      parentId: secExp,
      kind: "experience",
      rank: expRanks[2],
      data: {
        company: "Freelance",
        title: "Web Developer",
        location: "Casablanca, Morocco",
        startDate: "2018-01",
        endDate: "2019-05",
      },
    });
    push({
      id: id(),
      parentId: exp3,
      kind: "bullet",
      rank: ranksBetween(null, null, 1)[0],
      data: { text: "Delivered 15+ client sites and internal tools for local businesses, from brief to deployment." },
    });

    // Education
    push({
      id: id(),
      parentId: secEdu,
      kind: "education",
      rank: ranksBetween(null, null, 1)[0],
      data: {
        school: "Mohammed V University",
        degree: "B.Sc.",
        field: "Computer Science",
        location: "Rabat, Morocco",
        startDate: "2014",
        endDate: "2018",
      },
    });

    // Projects
    const projRanks = ranksBetween(null, null, 2);
    const proj1 = push({
      id: id(),
      parentId: secProj,
      kind: "project",
      rank: projRanks[0],
      data: {
        name: "OpenMetrics",
        url: "github.com/aminezini/openmetrics",
        description: "Open-source uptime and latency monitor.",
      },
    });
    push({
      id: id(),
      parentId: proj1,
      kind: "bullet",
      rank: ranksBetween(null, null, 1)[0],
      data: { text: "2.1k GitHub stars; probes 10k endpoints/minute from a single node." },
    });
    push({
      id: id(),
      parentId: secProj,
      kind: "project",
      rank: projRanks[1],
      data: {
        name: "Tajine",
        url: "tajine.dev",
        description: "A recipe-box PWA with offline sync, used by 3k monthly cooks.",
      },
    });

    // Skills
    const groupRanks = ranksBetween(null, null, 3);
    const sg1 = push({
      id: id(),
      parentId: secSkills,
      kind: "skillGroup",
      rank: groupRanks[0],
      data: { name: "Languages" },
    });
    const langRanks = ranksBetween(null, null, 4);
    ["TypeScript", "Python", "Go", "SQL"].forEach((name, i) =>
      push({ id: id(), parentId: sg1, kind: "skill", rank: langRanks[i], data: { name } }),
    );
    const sg2 = push({
      id: id(),
      parentId: secSkills,
      kind: "skillGroup",
      rank: groupRanks[1],
      data: { name: "Frameworks" },
    });
    const fwRanks = ranksBetween(null, null, 4);
    ["React", "Next.js", "Node.js", "Django"].forEach((name, i) =>
      push({ id: id(), parentId: sg2, kind: "skill", rank: fwRanks[i], data: { name } }),
    );
    const sg3 = push({
      id: id(),
      parentId: secSkills,
      kind: "skillGroup",
      rank: groupRanks[2],
      data: { name: "Infrastructure" },
    });
    const infraRanks = ranksBetween(null, null, 4);
    ["PostgreSQL", "Redis", "Docker", "AWS"].forEach((name, i) =>
      push({ id: id(), parentId: sg3, kind: "skill", rank: infraRanks[i], data: { name } }),
    );

    // Certifications
    push({
      id: id(),
      parentId: secCerts,
      kind: "certification",
      rank: ranksBetween(null, null, 1)[0],
      data: { name: "AWS Certified Solutions Architect – Associate", issuer: "Amazon Web Services", date: "2023-11" },
    });

    // Google-only bullet: a version-local node.
    const googleLocalBullet: SeedNode = {
      id: id(),
      parentId: exp1,
      kind: "bullet",
      rank: ranksBetween(exp1Bullets[3], null, 1)[0],
      data: { text: "Presented the pipeline architecture at a Google Cloud community meetup." },
      ownerVersionId: vGoogle,
    };
    seNodes.push(googleLocalBullet);

    tx.insert(nodes)
      .values(
        seNodes.map((n) => ({
          id: n.id,
          resumeId: seResumeId,
          parentId: n.parentId,
          kind: n.kind,
          rank: n.rank,
          data: n.data,
          ownerVersionId: n.ownerVersionId ?? null,
        })),
      )
      .run();

    // Sample overlays: Google tailors the headline + a bullet; Amazon
    // tweaks the headline, hides the mentoring bullet and reorders bullets.
    const headerId = seNodes[0].id;
    tx.insert(nodeOverrides)
      .values([
        {
          versionId: vGoogle,
          nodeId: headerId,
          patch: { headline: "Software Engineer — Distributed Systems" },
          hidden: null,
          rank: null,
        },
        {
          versionId: vGoogle,
          nodeId: b11,
          patch: { text: "Led the rebuild of a petabyte-scale reporting pipeline on BigQuery, cutting dashboard load times from 8s to 700ms." },
          hidden: null,
          rank: null,
        },
        {
          versionId: vAmazon,
          nodeId: headerId,
          patch: { headline: "Software Engineer — Scalable Commerce Systems" },
          hidden: null,
          rank: null,
        },
        {
          versionId: vAmazon,
          nodeId: b13,
          patch: null,
          hidden: 1,
          rank: null,
        },
        {
          versionId: vAmazon,
          nodeId: b11,
          patch: null,
          hidden: null,
          // Moved to the end of the bullet list in Amazon only.
          rank: ranksBetween(exp1Bullets[3], null, 1)[0],
        },
      ])
      .run();

    /* ------------------------------- Sales ------------------------------- */
    const salesResumeId = nanoid();
    tx.insert(resumes)
      .values({ id: salesResumeId, collectionId, name: "Sales Representative", slug: "sales-representative" })
      .run();
    const vSalesDefault = nanoid();
    tx.insert(versions)
      .values([
        { id: vSalesDefault, resumeId: salesResumeId, name: "Default", isBase: 1 },
        { id: nanoid(), resumeId: salesResumeId, name: "HubSpot", createdFromVersionId: vSalesDefault, tags: ["saas"] },
      ])
      .run();

    const salesRanks = ranksBetween(null, null, 2);
    const salesHeader = {
      id: nanoid(),
      resumeId: salesResumeId,
      parentId: null,
      kind: "header" as const,
      rank: salesRanks[0],
      data: {
        fullName: "Amine Zini",
        headline: "B2B Sales Representative",
        email: "zini.m.amine@gmail.com",
        phone: "+212 600 000 000",
        location: "Casablanca, Morocco",
        website: "",
        summary: "Consultative seller with a track record of beating quota in SaaS.",
      },
      ownerVersionId: null,
    };
    const salesSec = {
      id: nanoid(),
      resumeId: salesResumeId,
      parentId: null,
      kind: "section" as const,
      rank: salesRanks[1],
      data: { title: "Work Experience", sectionType: "experience" },
      ownerVersionId: null,
    };
    const salesExp = {
      id: nanoid(),
      resumeId: salesResumeId,
      parentId: salesSec.id,
      kind: "experience" as const,
      rank: ranksBetween(null, null, 1)[0],
      data: {
        company: "Atlas Commerce",
        title: "Account Executive",
        location: "Casablanca, Morocco",
        startDate: "2020-01",
        endDate: "Present",
      },
      ownerVersionId: null,
    };
    const salesBullet = {
      id: nanoid(),
      resumeId: salesResumeId,
      parentId: salesExp.id,
      kind: "bullet" as const,
      rank: ranksBetween(null, null, 1)[0],
      data: { text: "Closed $1.2M ARR in 2024 at 130% of quota." },
      ownerVersionId: null,
    };
    tx.insert(nodes).values([salesHeader, salesSec, salesExp, salesBullet]).run();
  });
}

/** Standalone: `npm run db:seed` (uses tsx). */
if (process.argv[1]?.replace(/\\/g, "/").endsWith("db/seed.ts")) {
  ensureSeeded();
  console.log("Seed complete.");
}
