/**
 * Tenant configuration. Everything business-specific the UI shows comes from here,
 * so a different business can be configured without touching components.
 * Contact details marked SAMPLE are placeholders until the client provides real ones.
 */
export type LineKey = "tax" | "insurance";
export type BusinessMode = "all" | LineKey;

export const business = {
  id: "doc-moise",
  name: "Doc Moise Enterprises",
  shortName: "Doc Moise",
  monogram: "DM",
  type: "Tax & Life Insurance Agency",
  website: "https://vipinsurance365.com",
  owner: {
    name: "Moise Peterson",
    firstName: "Moise",
    title: "CEO",
    // Drop the photo at web/public/images/moise-peterson.jpg. Initials show until it exists.
    image: "/images/moise-peterson.jpg",
    email: "moise@docmoise-demo.com", // SAMPLE
  },
  phone: "(555) 365-0100", // SAMPLE
  email: "office@docmoise-demo.com", // SAMPLE
  address: "Sample address · update in Settings", // SAMPLE
  hours: "Mon–Fri 9:00 AM – 6:00 PM · Sat 10:00 AM – 2:00 PM",
  poweredBy: "Mithoo",
  lines: {
    tax: {
      label: "Tax",
      noun: "tax client",
      services: ["Individual Tax Return", "Business Tax Return", "Tax Consultation", "Tax Preparation", "Amended Return"],
      stages: ["New Lead", "Intake", "Waiting for Documents", "Documents Received", "In Preparation", "Review", "Filed", "Completed"],
      documents: ["W-2", "1099", "Photo ID", "Social Security Card", "Previous Tax Return", "Business Income Documents"],
    },
    insurance: {
      label: "Insurance",
      noun: "insurance client",
      services: ["Term Life", "Whole Life", "IUL", "Final Expense", "Living Benefits"],
      stages: ["New Lead", "Contacted", "Appointment", "Quote", "Application", "Underwriting", "Approved", "Active Policy"],
      documents: ["Application", "Identification", "Medical Information", "Policy Documents", "Beneficiary Information"],
    },
  },
  appointmentServices: ["Tax Consultation", "Tax Preparation", "Life Insurance Consultation", "Policy Review", "Needs Analysis"],
  roles: ["Owner", "Manager", "Tax Preparer", "Insurance Agent", "Marketing", "Staff"] as const,
} as const;

export const modeLabel: Record<BusinessMode, string> = { all: "All Business", tax: "Tax", insurance: "Insurance" };
