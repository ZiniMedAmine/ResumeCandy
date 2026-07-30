import type { NodeData, NodeKind, ResolvedNode } from "./resume/types";

/**
 * A small, obviously-generic resume used only to preview templates. Rendering
 * the real templates over sample content shows exactly what a choice looks
 * like — far more honest than a drawing of grey rectangles.
 */

let seq = 0;

function node(kind: NodeKind, data: NodeData, children: ResolvedNode[] = []): ResolvedNode {
  seq += 1;
  return {
    id: `sample-${seq}`,
    parentId: null,
    kind,
    rank: `a${seq}`,
    data,
    status: "base",
    customizedFields: [],
    hidden: false,
    reordered: false,
    children,
  };
}

function section(title: string, sectionType: string, children: ResolvedNode[]): ResolvedNode {
  return node("section", { title, sectionType }, children);
}

function bullet(text: string): ResolvedNode {
  return node("bullet", { text });
}

/** Roots of the sample resume, ready to hand to ResumePreview. */
export function sampleResumeRoots(): ResolvedNode[] {
  seq = 0;
  return [
    node("header", {
      fullName: "Alex Morgan",
      headline: "Product Designer",
      email: "alex@example.com",
      phone: "+1 555 0134",
      location: "Berlin, Germany",
      website: "alexmorgan.design",
      summary:
        "Product designer with eight years shaping data-heavy tools for technical teams, from first sketch through shipped release.",
    }),
    section("Work Experience", "experience", [
      node(
        "experience",
        {
          company: "Northwind Labs",
          title: "Senior Product Designer",
          location: "Berlin",
          startDate: "2021-04",
          endDate: "Present",
        },
        [
          bullet("Led the redesign of the analytics workspace, lifting weekly active use by 34%."),
          bullet("Built and maintained the design system adopted by four product teams."),
        ],
      ),
      node(
        "experience",
        {
          company: "Kestrel Studio",
          title: "Product Designer",
          location: "Remote",
          startDate: "2018-01",
          endDate: "2021-03",
        },
        [bullet("Shipped onboarding flows that cut time-to-first-value from days to minutes.")],
      ),
    ]),
    section("Education", "education", [
      node("education", {
        school: "University of Amsterdam",
        degree: "B.A.",
        field: "Interaction Design",
        location: "Amsterdam",
        startDate: "2013",
        endDate: "2017",
      }),
    ]),
    section("Skills", "skills", [
      node("skillGroup", { name: "Design" }, [
        node("skill", { name: "Figma" }),
        node("skill", { name: "Prototyping" }),
        node("skill", { name: "Design systems" }),
      ]),
      node("skillGroup", { name: "Research" }, [
        node("skill", { name: "Usability testing" }),
        node("skill", { name: "Interviews" }),
      ]),
    ]),
    section("Certifications", "certifications", [
      node("certification", {
        name: "Certified Accessibility Practitioner",
        issuer: "IAAP",
        date: "2023-06",
      }),
    ]),
  ];
}
