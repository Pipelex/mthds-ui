import { describe, it, expect } from "vitest";
import {
  conceptPlainName,
  humanizeIdentifier,
  isGenericConcept,
  outcomeLabel,
  sentenceCase,
  stripDomain,
} from "../humanize";

describe("humanizeIdentifier", () => {
  it("splits snake, kebab, camel and Pascal case into a sentence", () => {
    expect(humanizeIdentifier("job_offer")).toBe("Job offer");
    expect(humanizeIdentifier("job-offer")).toBe("Job offer");
    expect(humanizeIdentifier("candidateProfile")).toBe("Candidate profile");
    expect(humanizeIdentifier("CandidateProfile")).toBe("Candidate profile");
  });

  it("spells words without a vowel, and the listed ones, as acronyms", () => {
    expect(humanizeIdentifier("extract_cv")).toBe("Extract CV");
    expect(humanizeIdentifier("rfp_document")).toBe("RFP document");
    expect(humanizeIdentifier("pr_url")).toBe("PR URL");
    expect(humanizeIdentifier("ai_summary")).toBe("AI summary");
    expect(humanizeIdentifier("html")).toBe("HTML");
  });

  it("keeps a run of capitals together", () => {
    expect(humanizeIdentifier("PDFDocument")).toBe("PDF document");
    expect(humanizeIdentifier("parseHTMLPage")).toBe("Parse HTML page");
  });

  it("writes abbreviations and units without a vowel as words", () => {
    expect(humanizeIdentifier("compare_price_vs_cost")).toBe("Compare price vs cost");
    expect(humanizeIdentifier("nth_item")).toBe("Nth item");
    expect(humanizeIdentifier("weight_kg")).toBe("Weight kg");
    expect(humanizeIdentifier("duration_hrs")).toBe("Duration hrs");
    expect(humanizeIdentifier("msg")).toBe("Msg");
    expect(humanizeIdentifier("src_text")).toBe("Src text");
    // Written in capitals, a word is still spelled as written.
    expect(humanizeIdentifier("SRC_TEXT")).toBe("SRC TEXT");
  });

  it("writes a plural acronym with a lowercase s, but not an acronym ending in s", () => {
    expect(humanizeIdentifier("cvs")).toBe("CVs");
    expect(humanizeIdentifier("screen_cvs")).toBe("Screen CVs");
    expect(humanizeIdentifier("css_rules")).toBe("CSS rules");
    expect(humanizeIdentifier("sms")).toBe("SMS");
  });

  it("separates digits and keeps them as written", () => {
    expect(humanizeIdentifier("step2")).toBe("Step 2");
  });

  it("humanizes a dotted ref by its last segment", () => {
    expect(humanizeIdentifier("recruitment.CandidateProfile")).toBe("Candidate profile");
  });

  it("returns an empty string for an empty identifier", () => {
    expect(humanizeIdentifier("")).toBe("");
    expect(humanizeIdentifier("  __ ")).toBe("");
  });
});

describe("concept names", () => {
  it("strips a domain", () => {
    expect(stripDomain("recruitment.CandidateProfile")).toBe("CandidateProfile");
    expect(stripDomain("Text")).toBe("Text");
  });

  it("gives natives that do not read as words their plain name", () => {
    expect(conceptPlainName("YesNo")).toBe("Yes or no");
    expect(conceptPlainName("native.TextAndImages")).toBe("Text and images");
    expect(conceptPlainName("Html")).toBe("HTML");
    expect(conceptPlainName("Text")).toBe("Text");
    expect(conceptPlainName("hiring.ScreeningReport")).toBe("Screening report");
  });

  it("knows which natives name no particular content", () => {
    expect(isGenericConcept("Anything")).toBe(true);
    expect(isGenericConcept("native.Dynamic")).toBe(true);
    expect(isGenericConcept("Text")).toBe(false);
    expect(isGenericConcept("hiring.Anything")).toBe(true);
  });
});

describe("sentenceCase", () => {
  it("collapses whitespace, capitalizes and drops one closing period", () => {
    expect(sentenceCase("  extract the\n   pages.  ")).toBe("Extract the pages");
    expect(sentenceCase("wait...")).toBe("Wait...");
    expect(sentenceCase("Already fine")).toBe("Already fine");
    expect(sentenceCase("")).toBe("");
  });
});

describe("outcomeLabel", () => {
  it("humanizes an outcome and names the default branch", () => {
    expect(outcomeLabel("english")).toBe("English");
    expect(outcomeLabel("high_priority")).toBe("High priority");
    expect(outcomeLabel("default")).toBe("Otherwise");
    expect(outcomeLabel("true")).toBe("Yes");
    expect(outcomeLabel("False")).toBe("No");
    expect(outcomeLabel("false | default")).toBe("No or otherwise");
  });

  it("joins the outcomes of a branch taken on several", () => {
    expect(outcomeLabel("needs_review | default")).toBe("Needs review or otherwise");
    expect(outcomeLabel("a|b")).toBe("A or b");
  });
});
