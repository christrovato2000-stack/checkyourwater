/**
 * Static metadata for the community action toolkit pages.
 * Used by the landing page, breadcrumbs, and "more resources" sidebars.
 */

export interface ToolkitResource {
  slug: string;
  href: string;
  title: string;
  cardTitle: string;
  blurb: string;
  icon: "envelope" | "document" | "megaphone" | "people";
}

export const TOOLKIT_RESOURCES: ToolkitResource[] = [
  {
    slug: "council-letter",
    href: "/toolkit/council-letter",
    title: "Letter Template: PFAS in Your Drinking Water",
    cardTitle: "Write to Your City Council",
    blurb: "A customizable letter template citing your local PFAS data.",
    icon: "envelope",
  },
  {
    slug: "records-request",
    href: "/toolkit/records-request",
    title: "Public Records Request Template: PFAS Testing Data",
    cardTitle: "File a Public Records Request",
    blurb:
      "Request your utility's full PFAS testing results and treatment plans.",
    icon: "document",
  },
  {
    slug: "meeting-guide",
    href: "/toolkit/meeting-guide",
    title: "How to Speak at a City Council Meeting About PFAS",
    cardTitle: "Speak at a Public Meeting",
    blurb:
      "How to prepare a 3-minute public comment that gets results.",
    icon: "megaphone",
  },
  {
    slug: "organizing-guide",
    href: "/toolkit/organizing-guide",
    title: "Community Organizing Guide: Responding to PFAS Contamination",
    cardTitle: "Organize Your Community",
    blurb:
      "Step-by-step guide from first discovery to sustained advocacy.",
    icon: "people",
  },
];

export function getToolkitResource(slug: string): ToolkitResource | null {
  return TOOLKIT_RESOURCES.find((r) => r.slug === slug) ?? null;
}

export function otherToolkitResources(slug: string): ToolkitResource[] {
  return TOOLKIT_RESOURCES.filter((r) => r.slug !== slug);
}
