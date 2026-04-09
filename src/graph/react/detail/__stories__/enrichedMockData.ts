/**
 * Enriched mock data for detail panel stories.
 * Built from real pipelex dry-run output (pipeline_09 + pipe types from other pipelines).
 */
import type { GraphSpec, GraphSpecNode, ConceptInfo, PipeBlueprintUnion } from "@graph/types";

export const CONCEPT_DOCUMENTSUMMARY: ConceptInfo = {
  code: "DocumentSummary",
  domain_code: "document_batch",
  description: "Combined summary of all pages",
  structure_class_name: "document_batch__DocumentSummary",
  refines: "native.Text",
  json_schema: {
    description: "Combined summary of all pages",
    properties: {
      text: {
        title: "Text",
        type: "string",
      },
    },
    required: ["text"],
    title: "document_batch__DocumentSummary",
    type: "object",
  },
} as any as ConceptInfo;

export const CONCEPT_PAGESUMMARY: ConceptInfo = {
  code: "PageSummary",
  domain_code: "document_batch",
  description: "Summary of a single page",
  structure_class_name: "document_batch__PageSummary",
  refines: "native.Text",
  json_schema: {
    description: "Summary of a single page",
    properties: {
      text: {
        title: "Text",
        type: "string",
      },
    },
    required: ["text"],
    title: "document_batch__PageSummary",
    type: "object",
  },
} as any as ConceptInfo;

export const CONCEPT_DOCUMENT: ConceptInfo = {
  code: "Document",
  domain_code: "native",
  description: "A document",
  structure_class_name: "DocumentContent",
  refines: null,
  json_schema: {
    properties: {
      url: {
        description: "The document URL: pipelex storage URL, HTTP/HTTPS URL, or base64 data URL",
        title: "Url",
        type: "string",
      },
      public_url: {
        anyOf: [
          {
            type: "string",
          },
          {
            type: "null",
          },
        ],
        default: null,
        description: "The public HTTPS URL of the document",
        title: "Public Url",
      },
      mime_type: {
        anyOf: [
          {
            type: "string",
          },
          {
            type: "null",
          },
        ],
        default: null,
        description: "The MIME type of the document",
        title: "Mime Type",
      },
      filename: {
        anyOf: [
          {
            type: "string",
          },
          {
            type: "null",
          },
        ],
        default: null,
        description: "The original filename of the document",
        title: "Filename",
      },
      title: {
        anyOf: [
          {
            type: "string",
          },
          {
            type: "null",
          },
        ],
        default: null,
        description: "The title of the document or source",
        title: "Title",
      },
      snippet: {
        anyOf: [
          {
            type: "string",
          },
          {
            type: "null",
          },
        ],
        default: null,
        description: "A text snippet or excerpt from the document",
        title: "Snippet",
      },
    },
    required: ["url"],
    title: "DocumentContent",
    type: "object",
  },
} as any as ConceptInfo;

export const CONCEPT_IMAGE: ConceptInfo = {
  code: "Image",
  domain_code: "native",
  description: "An image",
  structure_class_name: "ImageContent",
  refines: null,
  json_schema: {
    $defs: {
      ImageSize: {
        properties: {
          width: {
            title: "Width",
            type: "integer",
          },
          height: {
            title: "Height",
            type: "integer",
          },
        },
        required: ["width", "height"],
        title: "ImageSize",
        type: "object",
      },
    },
    properties: {
      url: {
        description: "The image URL: pipelex storage URL, HTTP/HTTPS URL, or base64 data URL",
        title: "Url",
        type: "string",
      },
      public_url: {
        anyOf: [
          {
            type: "string",
          },
          {
            type: "null",
          },
        ],
        default: null,
        description: "The public URL of the image",
        title: "Public Url",
      },
      source_prompt: {
        anyOf: [
          {
            type: "string",
          },
          {
            type: "null",
          },
        ],
        default: null,
        description: "The source prompt of the image",
        title: "Source Prompt",
      },
      source_negative_prompt: {
        anyOf: [
          {
            type: "string",
          },
          {
            type: "null",
          },
        ],
        default: null,
        description: "The source negative prompt of the image",
        title: "Source Negative Prompt",
      },
      caption: {
        anyOf: [
          {
            type: "string",
          },
          {
            type: "null",
          },
        ],
        default: null,
        description: "The caption of the image",
        title: "Caption",
      },
      mime_type: {
        anyOf: [
          {
            type: "string",
          },
          {
            type: "null",
          },
        ],
        default: null,
        description: "The MIME type of the image",
        title: "Mime Type",
      },
      size: {
        anyOf: [
          {
            $ref: "#/$defs/ImageSize",
          },
          {
            type: "null",
          },
        ],
        default: null,
        description: "The size in pixels (width and height) of the image",
      },
      filename: {
        anyOf: [
          {
            type: "string",
          },
          {
            type: "null",
          },
        ],
        default: null,
        description: "The original filename of the image",
        title: "Filename",
      },
    },
    required: ["url"],
    title: "ImageContent",
    type: "object",
  },
} as any as ConceptInfo;

export const CONCEPT_PAGE: ConceptInfo = {
  code: "Page",
  domain_code: "native",
  description:
    "The content of a page of a document, comprising text and linked images and an optional page view image",
  structure_class_name: "PageContent",
  refines: null,
  json_schema: {
    $defs: {
      ImageContent: {
        properties: {
          url: {
            description: "The image URL: pipelex storage URL, HTTP/HTTPS URL, or base64 data URL",
            title: "Url",
            type: "string",
          },
          public_url: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "The public URL of the image",
            title: "Public Url",
          },
          source_prompt: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "The source prompt of the image",
            title: "Source Prompt",
          },
          source_negative_prompt: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "The source negative prompt of the image",
            title: "Source Negative Prompt",
          },
          caption: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "The caption of the image",
            title: "Caption",
          },
          mime_type: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "The MIME type of the image",
            title: "Mime Type",
          },
          size: {
            anyOf: [
              {
                $ref: "#/$defs/ImageSize",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "The size in pixels (width and height) of the image",
          },
          filename: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "The original filename of the image",
            title: "Filename",
          },
        },
        required: ["url"],
        title: "ImageContent",
        type: "object",
      },
      ImageSize: {
        properties: {
          width: {
            title: "Width",
            type: "integer",
          },
          height: {
            title: "Height",
            type: "integer",
          },
        },
        required: ["width", "height"],
        title: "ImageSize",
        type: "object",
      },
      TextAndImagesContent: {
        properties: {
          text: {
            anyOf: [
              {
                $ref: "#/$defs/TextContent",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "A text content",
          },
          images: {
            anyOf: [
              {
                items: {
                  $ref: "#/$defs/ImageContent",
                },
                type: "array",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "A list of images that were extracted from the text",
            title: "Images",
          },
          raw_html: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "The raw HTML of the fetched page, if requested",
            title: "Raw Html",
          },
        },
        title: "TextAndImagesContent",
        type: "object",
      },
      TextContent: {
        properties: {
          text: {
            title: "Text",
            type: "string",
          },
        },
        required: ["text"],
        title: "TextContent",
        type: "object",
      },
    },
    properties: {
      text_and_images: {
        $ref: "#/$defs/TextAndImagesContent",
        description: "The text and images content extracted from the page",
      },
      page_view: {
        anyOf: [
          {
            $ref: "#/$defs/ImageContent",
          },
          {
            type: "null",
          },
        ],
        default: null,
        description: "The screenshot of the page",
      },
    },
    required: ["text_and_images"],
    title: "PageContent",
    type: "object",
  },
} as any as ConceptInfo;

export const CONCEPT_SEARCHRESULT: ConceptInfo = {
  code: "SearchResult",
  domain_code: "native",
  description: "A search result with answer and sources",
  structure_class_name: "SearchResultContent",
  refines: null,
  json_schema: {
    $defs: {
      DocumentContent: {
        properties: {
          url: {
            description:
              "The document URL: pipelex storage URL, HTTP/HTTPS URL, or base64 data URL",
            title: "Url",
            type: "string",
          },
          public_url: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "The public HTTPS URL of the document",
            title: "Public Url",
          },
          mime_type: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "The MIME type of the document",
            title: "Mime Type",
          },
          filename: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "The original filename of the document",
            title: "Filename",
          },
          title: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "The title of the document or source",
            title: "Title",
          },
          snippet: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "A text snippet or excerpt from the document",
            title: "Snippet",
          },
        },
        required: ["url"],
        title: "DocumentContent",
        type: "object",
      },
    },
    description: "Represents the result of a search query with an answer and list of sources.",
    properties: {
      answer: {
        title: "Answer",
        type: "string",
      },
      sources: {
        items: {
          $ref: "#/$defs/DocumentContent",
        },
        title: "Sources",
        type: "array",
      },
    },
    required: ["answer"],
    title: "SearchResultContent",
    type: "object",
  },
} as any as ConceptInfo;

export const CONCEPT_TEXT: ConceptInfo = {
  code: "Text",
  domain_code: "native",
  description: "A text",
  structure_class_name: "TextContent",
  refines: null,
  json_schema: {
    properties: {
      text: {
        title: "Text",
        type: "string",
      },
    },
    required: ["text"],
    title: "TextContent",
    type: "object",
  },
} as any as ConceptInfo;

export const CONCEPT_CANDIDATEPROFILE: ConceptInfo = {
  code: "CandidateProfile",
  domain_code: "recruitment",
  description: "Structured profile of a job candidate",
  structure_class_name: "recruitment__CandidateProfile",
  refines: null,
  json_schema: {
    description: "Structured profile of a job candidate",
    properties: {
      name: {
        description: "Full name",
        title: "Name",
        type: "string",
      },
      skills: {
        anyOf: [
          {
            items: {},
            type: "array",
          },
          {
            type: "null",
          },
        ],
        default: null,
        description: "Key skills",
        title: "Skills",
      },
      experience_years: {
        anyOf: [
          {
            type: "integer",
          },
          {
            type: "null",
          },
        ],
        default: null,
        description: "Years of experience",
        title: "Experience Years",
      },
      summary: {
        description: "Brief profile summary",
        title: "Summary",
        type: "string",
      },
    },
    required: ["name", "summary"],
    title: "recruitment__CandidateProfile",
    type: "object",
  },
} as any as ConceptInfo;

export const CONCEPT_MATCHSCORE: ConceptInfo = {
  code: "MatchScore",
  domain_code: "recruitment",
  description: "Score for how well a candidate matches a role",
  structure_class_name: "recruitment__MatchScore",
  refines: null,
  json_schema: {
    description: "Score for how well a candidate matches a role",
    properties: {
      score: {
        description: "Match score 0-100",
        title: "Score",
        type: "number",
      },
      strengths: {
        anyOf: [
          {
            items: {},
            type: "array",
          },
          {
            type: "null",
          },
        ],
        default: null,
        description: "Key strengths",
        title: "Strengths",
      },
      gaps: {
        anyOf: [
          {
            items: {},
            type: "array",
          },
          {
            type: "null",
          },
        ],
        default: null,
        description: "Skill gaps",
        title: "Gaps",
      },
      recommendation: {
        description: "Hiring recommendation",
        title: "Recommendation",
        type: "string",
      },
    },
    required: ["score", "recommendation"],
    title: "recruitment__MatchScore",
    type: "object",
  },
} as any as ConceptInfo;

export const CONCEPT_REPORT: ConceptInfo = {
  code: "Report",
  domain_code: "recruitment",
  description: "Formatted screening report",
  structure_class_name: "recruitment__Report",
  refines: "native.Text",
  json_schema: {
    description: "Formatted screening report",
    properties: {
      text: {
        title: "Text",
        type: "string",
      },
    },
    required: ["text"],
    title: "recruitment__Report",
    type: "object",
  },
} as any as ConceptInfo;

export const CONCEPT_EVALUATION: ConceptInfo = {
  code: "Evaluation",
  domain_code: "recruitment",
  description: "Structured evaluation of a candidate against a role",
  structure_class_name: "recruitment__Evaluation",
  refines: null,
  json_schema: {
    description: "Structured evaluation of a candidate against a role",
    properties: {
      score: {
        description: "Overall evaluation score 0-100",
        title: "Score",
        type: "number",
      },
      summary: {
        description: "Brief evaluation summary",
        title: "Summary",
        type: "string",
      },
      criteria: {
        description: "Evaluation criteria breakdown",
        items: { type: "object" },
        title: "Criteria",
        type: "array",
      },
    },
    required: ["score", "summary"],
    title: "recruitment__Evaluation",
    type: "object",
  },
} as any as ConceptInfo;

export const CONCEPT_TECHNICAL_EVALUATION: ConceptInfo = {
  code: "TechnicalEvaluation",
  domain_code: "recruitment",
  description: "Technical skills evaluation with coding assessment results",
  structure_class_name: "recruitment__TechnicalEvaluation",
  refines: "recruitment.Evaluation",
  json_schema: {
    description: "Technical skills evaluation with coding assessment results",
    properties: {
      score: {
        description: "Overall evaluation score 0-100",
        title: "Score",
        type: "number",
      },
      summary: {
        description: "Brief evaluation summary",
        title: "Summary",
        type: "string",
      },
      criteria: {
        description: "Evaluation criteria breakdown",
        items: { type: "object" },
        title: "Criteria",
        type: "array",
      },
      languages: {
        description: "Programming languages assessed",
        items: { type: "string" },
        title: "Languages",
        type: "array",
      },
      coding_score: {
        description: "Coding challenge score 0-100",
        title: "Coding Score",
        type: "number",
      },
      system_design_score: {
        description: "System design assessment score 0-100",
        title: "System Design Score",
        type: "number",
      },
    },
    required: ["score", "summary", "languages", "coding_score"],
    title: "recruitment__TechnicalEvaluation",
    type: "object",
  },
} as any as ConceptInfo;

export const CONCEPT_CLASSIFIEDTEXT: ConceptInfo = {
  code: "ClassifiedText",
  domain_code: "translation",
  description: "Text with detected language",
  structure_class_name: "translation__ClassifiedText",
  refines: null,
  json_schema: {
    description: "Text with detected language",
    properties: {
      text: {
        description: "The original text",
        title: "Text",
        type: "string",
      },
      language: {
        description: "Detected language code",
        enum: ["english", "french", "spanish", "german", "other"],
        title: "Language",
        type: "string",
      },
    },
    required: ["text", "language"],
    title: "translation__ClassifiedText",
    type: "object",
  },
} as any as ConceptInfo;

export const CONCEPT_TRANSLATEDTEXT: ConceptInfo = {
  code: "TranslatedText",
  domain_code: "translation",
  description: "Text translated to English",
  structure_class_name: "translation__TranslatedText",
  refines: "native.Text",
  json_schema: {
    description: "Text translated to English",
    properties: {
      text: {
        title: "Text",
        type: "string",
      },
    },
    required: ["text"],
    title: "translation__TranslatedText",
    type: "object",
  },
} as any as ConceptInfo;

export const PIPE_SUMMARIZE_PAGE_BATCH: PipeBlueprintUnion = {
  pipe_category: "PipeController",
  type: "PipeBatch",
  code: "summarize_page_batch",
  domain_code: "document_batch",
  description: "Batch processing for summarize_page",
  inputs: {
    pages: {
      concept: {
        code: "Page",
        domain_code: "native",
        description:
          "The content of a page of a document, comprising text and linked images and an optional page view image",
        structure_class_name: "PageContent",
        refines: null,
      },
      multiplicity: null,
    },
  },
  output: {
    concept: {
      code: "PageSummary",
      domain_code: "document_batch",
      description: "Summary of a single page",
      structure_class_name: "document_batch__PageSummary",
      refines: "native.Text",
    },
    multiplicity: null,
  },
  branch_pipe_code: "summarize_page",
  batch_params: {
    input_list_stuff_name: "pages",
    input_item_stuff_name: "page",
  },
} as any as PipeBlueprintUnion;

export const PIPE_ANALYZE_CANDIDATE: PipeBlueprintUnion = {
  pipe_category: "PipeOperator",
  type: "PipeLLM",
  code: "analyze_candidate",
  domain_code: "recruitment",
  description: "Analyze CV to build candidate profile",
  inputs: {
    pages: {
      concept: {
        code: "Page",
        domain_code: "native",
        description:
          "The content of a page of a document, comprising text and linked images and an optional page view image",
        structure_class_name: "PageContent",
        refines: null,
      },
      multiplicity: true,
    },
  },
  output: {
    concept: {
      code: "CandidateProfile",
      domain_code: "recruitment",
      description: "Structured profile of a job candidate",
      structure_class_name: "recruitment__CandidateProfile",
      refines: null,
    },
    multiplicity: null,
  },
  llm_prompt_spec: {
    templating_style: null,
    system_prompt_blueprint: null,
    prompt_blueprint: {
      template: "Analyze this CV and extract a structured candidate profile:\n\n@pages\n",
      templating_style: null,
      category: "llm_prompt",
      extra_context: null,
    },
    user_image_references: null,
    user_document_references: null,
    system_image_references: null,
    system_document_references: null,
  },
  llm_choices: {
    for_text: null,
    for_object: null,
  },
  structuring_method: null,
  output_multiplicity: null,
} as any as PipeBlueprintUnion;

export const PIPE_COMPOSE_REPORT: PipeBlueprintUnion = {
  pipe_category: "PipeOperator",
  type: "PipeCompose",
  code: "compose_report",
  domain_code: "recruitment",
  description: "Compose final screening report",
  inputs: {
    profile: {
      concept: {
        code: "CandidateProfile",
        domain_code: "recruitment",
        description: "Structured profile of a job candidate",
        structure_class_name: "recruitment__CandidateProfile",
        refines: null,
      },
      multiplicity: null,
    },
    match: {
      concept: {
        code: "MatchScore",
        domain_code: "recruitment",
        description: "Score for how well a candidate matches a role",
        structure_class_name: "recruitment__MatchScore",
        refines: null,
      },
      multiplicity: null,
    },
    card_image: {
      concept: {
        code: "Image",
        domain_code: "native",
        description: "An image",
        structure_class_name: "ImageContent",
        refines: null,
      },
      multiplicity: null,
    },
  },
  output: {
    concept: {
      code: "Report",
      domain_code: "recruitment",
      description: "Formatted screening report",
      structure_class_name: "recruitment__Report",
      refines: "native.Text",
    },
    multiplicity: null,
  },
  template:
    '# Candidate Screening Report\n\n## Candidate: {{ profile.name|format() }}\n{{ profile.summary|format() }}\n\n## Match Score: {{ match.score|format() }}/100\n{{ match.recommendation|format() }}\n\n## Strengths\n{{ match.strengths|tag("match.strengths") }}\n\n## Gaps\n{{ match.gaps|tag("match.gaps") }}\n',
  templating_style: null,
  category: "basic",
  extra_context: null,
  construct_blueprint: null,
} as any as PipeBlueprintUnion;

export const PIPE_CV_SCREENING: PipeBlueprintUnion = {
  pipe_category: "PipeController",
  type: "PipeSequence",
  code: "cv_screening",
  domain_code: "recruitment",
  description: "Full CV screening pipeline",
  inputs: {
    cv: {
      concept: {
        code: "Document",
        domain_code: "native",
        description: "A document",
        structure_class_name: "DocumentContent",
        refines: null,
      },
      multiplicity: null,
    },
  },
  output: {
    concept: {
      code: "Report",
      domain_code: "recruitment",
      description: "Formatted screening report",
      structure_class_name: "recruitment__Report",
      refines: "native.Text",
    },
    multiplicity: null,
  },
  sequential_sub_pipes: [
    {
      pipe_code: "extract_cv",
      output_name: "pages",
      output_multiplicity: null,
      batch_params: null,
    },
    {
      pipe_code: "analyze_candidate",
      output_name: "profile",
      output_multiplicity: null,
      batch_params: null,
    },
    {
      pipe_code: "enrich_candidate",
      output_name: "search_result",
      output_multiplicity: null,
      batch_params: null,
    },
    {
      pipe_code: "score_match",
      output_name: "match",
      output_multiplicity: null,
      batch_params: null,
    },
    {
      pipe_code: "compose_report",
      output_name: "report",
      output_multiplicity: null,
      batch_params: null,
    },
  ],
} as any as PipeBlueprintUnion;

export const PIPE_ENRICH_CANDIDATE: PipeBlueprintUnion = {
  pipe_category: "PipeController",
  type: "PipeParallel",
  code: "enrich_candidate",
  domain_code: "recruitment",
  description: "Search online and generate profile card in parallel",
  inputs: {
    profile: {
      concept: {
        code: "CandidateProfile",
        domain_code: "recruitment",
        description: "Structured profile of a job candidate",
        structure_class_name: "recruitment__CandidateProfile",
        refines: null,
      },
      multiplicity: null,
    },
  },
  output: {
    concept: {
      code: "SearchResult",
      domain_code: "native",
      description: "A search result with answer and sources",
      structure_class_name: "SearchResultContent",
      refines: null,
    },
    multiplicity: null,
  },
  parallel_sub_pipes: [
    {
      pipe_code: "search_candidate",
      output_name: "search_result",
      output_multiplicity: null,
      batch_params: null,
    },
    {
      pipe_code: "generate_card",
      output_name: "card_image",
      output_multiplicity: null,
      batch_params: null,
    },
  ],
  add_each_output: true,
  combined_output: null,
} as any as PipeBlueprintUnion;

export const PIPE_EXTRACT_CV: PipeBlueprintUnion = {
  pipe_category: "PipeOperator",
  type: "PipeExtract",
  code: "extract_cv",
  domain_code: "recruitment",
  description: "Extract pages from CV document",
  inputs: {
    cv: {
      concept: {
        code: "Document",
        domain_code: "native",
        description: "A document",
        structure_class_name: "DocumentContent",
        refines: null,
      },
      multiplicity: null,
    },
  },
  output: {
    concept: {
      code: "Page",
      domain_code: "native",
      description:
        "The content of a page of a document, comprising text and linked images and an optional page view image",
      structure_class_name: "PageContent",
      refines: null,
    },
    multiplicity: true,
  },
  extract_choice: null,
  should_caption_images: false,
  max_page_images: null,
  should_include_page_views: false,
  page_views_dpi: null,
  render_js: null,
  include_raw_html: null,
  image_stuff_name: null,
  document_stuff_name: "cv",
} as any as PipeBlueprintUnion;

export const PIPE_GENERATE_CARD: PipeBlueprintUnion = {
  pipe_category: "PipeOperator",
  type: "PipeImgGen",
  code: "generate_card",
  domain_code: "recruitment",
  description: "Generate candidate profile card image",
  inputs: {
    profile: {
      concept: {
        code: "CandidateProfile",
        domain_code: "recruitment",
        description: "Structured profile of a job candidate",
        structure_class_name: "recruitment__CandidateProfile",
        refines: null,
      },
      multiplicity: null,
    },
  },
  output: {
    concept: {
      code: "Image",
      domain_code: "native",
      description: "An image",
      structure_class_name: "ImageContent",
      refines: null,
    },
    multiplicity: null,
  },
  img_gen_prompt_blueprint: {
    prompt_blueprint: {
      template: "Professional profile card for $profile.name, $profile.summary",
      templating_style: null,
      category: "img_gen_prompt",
      extra_context: null,
    },
    negative_prompt_blueprint: null,
    image_references: null,
  },
  img_gen_choice: null,
  aspect_ratio: null,
  is_raw: null,
  seed: null,
  background: null,
  output_format: null,
  output_multiplicity: 1,
} as any as PipeBlueprintUnion;

export const PIPE_SCORE_MATCH: PipeBlueprintUnion = {
  pipe_category: "PipeOperator",
  type: "PipeLLM",
  code: "score_match",
  domain_code: "recruitment",
  description: "Score candidate-role match",
  inputs: {
    profile: {
      concept: {
        code: "CandidateProfile",
        domain_code: "recruitment",
        description: "Structured profile of a job candidate",
        structure_class_name: "recruitment__CandidateProfile",
        refines: null,
      },
      multiplicity: null,
    },
    search_result: {
      concept: {
        code: "SearchResult",
        domain_code: "native",
        description: "A search result with answer and sources",
        structure_class_name: "SearchResultContent",
        refines: null,
      },
      multiplicity: null,
    },
  },
  output: {
    concept: {
      code: "MatchScore",
      domain_code: "recruitment",
      description: "Score for how well a candidate matches a role",
      structure_class_name: "recruitment__MatchScore",
      refines: null,
    },
    multiplicity: null,
  },
  llm_prompt_spec: {
    templating_style: null,
    system_prompt_blueprint: null,
    prompt_blueprint: {
      template:
        "Based on this candidate profile and online research, score how well they match our open role:\n\nProfile:\n@profile\n\nOnline research:\n@search_result\n",
      templating_style: null,
      category: "llm_prompt",
      extra_context: null,
    },
    user_image_references: null,
    user_document_references: null,
    system_image_references: null,
    system_document_references: null,
  },
  llm_choices: {
    for_text: null,
    for_object: null,
  },
  structuring_method: null,
  output_multiplicity: null,
} as any as PipeBlueprintUnion;

export const PIPE_SEARCH_CANDIDATE: PipeBlueprintUnion = {
  pipe_category: "PipeOperator",
  type: "PipeSearch",
  code: "search_candidate",
  domain_code: "recruitment",
  description: "Search for candidate online presence",
  inputs: {
    profile: {
      concept: {
        code: "CandidateProfile",
        domain_code: "recruitment",
        description: "Structured profile of a job candidate",
        structure_class_name: "recruitment__CandidateProfile",
        refines: null,
      },
      multiplicity: null,
    },
  },
  output: {
    concept: {
      code: "SearchResult",
      domain_code: "native",
      description: "A search result with answer and sources",
      structure_class_name: "SearchResultContent",
      refines: null,
    },
    multiplicity: null,
  },
  search_choice: null,
  prompt_blueprint: {
    template: "$profile.name professional background",
    templating_style: null,
    category: "basic",
    extra_context: null,
  },
  include_images_override: null,
  max_results_override: null,
  from_date: null,
  to_date: null,
  include_domains: null,
  exclude_domains: null,
  is_structured_output: false,
} as any as PipeBlueprintUnion;

export const PIPE_ROUTE_TRANSLATION: PipeBlueprintUnion = {
  pipe_category: "PipeController",
  type: "PipeCondition",
  code: "route_translation",
  domain_code: "translation",
  description: "Route based on detected language",
  inputs: {
    classified: {
      concept: {
        code: "ClassifiedText",
        domain_code: "translation",
        description: "Text with detected language",
        structure_class_name: "translation__ClassifiedText",
        refines: null,
      },
      multiplicity: null,
    },
  },
  output: {
    concept: {
      code: "TranslatedText",
      domain_code: "translation",
      description: "Text translated to English",
      structure_class_name: "translation__TranslatedText",
      refines: "native.Text",
    },
    multiplicity: null,
  },
  expression: "{{ classified.language }}",
  outcome_map: {
    english: "passthrough",
    french: "translate_french",
  },
  default_outcome: "translate_other",
  add_alias_from_expression_to: null,
} as any as PipeBlueprintUnion;

export const NODE_CV_SCREENING: GraphSpecNode = {
  id: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_0",
  kind: "controller",
  pipe_code: "cv_screening",
  pipe_type: "PipeSequence",
  status: "succeeded",
  timing: {
    started_at: "2026-04-03T14:57:11.047897Z",
    ended_at: "2026-04-03T14:57:11.186103Z",
    duration: 0.138206,
  },
  io: {
    inputs: [
      {
        name: "cv",
        concept: "Document",
        content_type: "GOOKsyHdIFoCXapRKGBB",
        preview: null,
        size: null,
        digest: "Bka68",
        data: {
          url: "bOdnkjxhgKEjvvjXicgQ",
          public_url: "ppCMFzcVThLWIwltQjEy",
          mime_type: "GOOKsyHdIFoCXapRKGBB",
          filename: "otNPAtmcavqPBscAqpBa",
          title: "SWqQvsIUyGkWfxejdfVV",
          snippet: "TgYbzGofgMadXXDzwIeq",
        },
        data_text: "SWqQvsIUyGkWfxejdfVV (bOdnkjxhgKEjvvjXicgQ)\n  TgYbzGofgMadXXDzwIeq\n",
        data_html:
          '<a href="ppCMFzcVThLWIwltQjEy" class="msg-document">SWqQvsIUyGkWfxejdfVV</a><br/><small>TgYbzGofgMadXXDzwIeq</small>',
        extra: {},
      },
    ],
    outputs: [
      {
        name: "report",
        concept: "Report",
        content_type: null,
        preview: null,
        size: null,
        digest: "PjyhE",
        data: {
          text: "# Candidate Screening Report\n\n## Candidate: TaKrdhoCHeAMMZkkWqdo\ncCPVariYGKOZKOVQcHxB\n\n## Match Score: -4770523658292.34/100\nbLqgIYysxBkMvKfKSiuL\n\n## Strengths\nmatch.strengths: ```\n['94ba']\n```\n\n## Gaps\nmatch.gaps: ```\n['df38']\n```",
        },
        data_text:
          "                                     Candidate Screening Report                                     \n\nCandidate: TaKrdhoCHeAMMZkkWqdo                                                                     \n\ncCPVariYGKOZKOVQcHxB                                                                                \n\nMatch Score: -4770523658292.34/100                                                                  \n\nbLqgIYysxBkMvKfKSiuL                                                                                \n\nStrengths                                                                                           \n\nmatch.strengths: ``` ['94ba']                                                                       \n\n                                                                                                    \n                                                                                                    \n ## Gaps                                                                                            \n match.gaps: ```                                                                                    \n ['df38']                                                                                           \n                                                                                                    \n",
        data_html:
          "# Candidate Screening Report\n\n## Candidate: TaKrdhoCHeAMMZkkWqdo\ncCPVariYGKOZKOVQcHxB\n\n## Match Score: -4770523658292.34/100\nbLqgIYysxBkMvKfKSiuL\n\n## Strengths\nmatch.strengths: ```\n[&#x27;94ba&#x27;]\n```\n\n## Gaps\nmatch.gaps: ```\n[&#x27;df38&#x27;]\n```",
        extra: {},
      },
    ],
  },
  error: null,
  tags: {},
  metrics: {},
} as any as GraphSpecNode;

export const NODE_EXTRACT_CV: GraphSpecNode = {
  id: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_1",
  kind: "operator",
  pipe_code: "extract_cv",
  pipe_type: "PipeExtract",
  status: "succeeded",
  timing: {
    started_at: "2026-04-03T14:57:11.057496Z",
    ended_at: "2026-04-03T14:57:11.069894Z",
    duration: 0.012398,
  },
  io: {
    inputs: [
      {
        name: "cv",
        concept: "Document",
        content_type: "GOOKsyHdIFoCXapRKGBB",
        preview: null,
        size: null,
        digest: "Bka68",
        data: {
          url: "bOdnkjxhgKEjvvjXicgQ",
          public_url: "ppCMFzcVThLWIwltQjEy",
          mime_type: "GOOKsyHdIFoCXapRKGBB",
          filename: "otNPAtmcavqPBscAqpBa",
          title: "SWqQvsIUyGkWfxejdfVV",
          snippet: "TgYbzGofgMadXXDzwIeq",
        },
        data_text: "SWqQvsIUyGkWfxejdfVV (bOdnkjxhgKEjvvjXicgQ)\n  TgYbzGofgMadXXDzwIeq\n",
        data_html:
          '<a href="ppCMFzcVThLWIwltQjEy" class="msg-document">SWqQvsIUyGkWfxejdfVV</a><br/><small>TgYbzGofgMadXXDzwIeq</small>',
        extra: {},
      },
    ],
    outputs: [
      {
        name: "pages",
        concept: "Page",
        content_type: null,
        preview: null,
        size: null,
        digest: "FiHCz",
        data: {
          items: [
            {
              text_and_images: {
                text: {
                  text: "DRY RUN: OCR text",
                },
                images: [],
                raw_html: null,
              },
              page_view: null,
            },
            {
              text_and_images: {
                text: {
                  text: "DRY RUN: OCR text",
                },
                images: [],
                raw_html: null,
              },
              page_view: null,
            },
            {
              text_and_images: {
                text: {
                  text: "DRY RUN: OCR text",
                },
                images: [],
                raw_html: null,
              },
              page_view: null,
            },
            {
              text_and_images: {
                text: {
                  text: "DRY RUN: OCR text",
                },
                images: [],
                raw_html: null,
              },
              page_view: null,
            },
          ],
        },
        data_text:
          "   1    \u2502 DRY RUN: OCR text                                                     \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n   2    \u2502 DRY RUN: OCR text                                                     \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n   3    \u2502 DRY RUN: OCR text                                                     \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n   4    \u2502 DRY RUN: OCR text                                                     \n",
        data_html:
          "<ul><li><table><tr><th>text_and_images</th><td>DRY RUN: OCR text</td></tr></table></li><li><table><tr><th>text_and_images</th><td>DRY RUN: OCR text</td></tr></table></li><li><table><tr><th>text_and_images</th><td>DRY RUN: OCR text</td></tr></table></li><li><table><tr><th>text_and_images</th><td>DRY RUN: OCR text</td></tr></table></li></ul>",
        extra: {},
      },
    ],
  },
  error: null,
  tags: {},
  metrics: {},
} as any as GraphSpecNode;

export const NODE_ANALYZE_CANDIDATE: GraphSpecNode = {
  id: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_2",
  kind: "operator",
  pipe_code: "analyze_candidate",
  pipe_type: "PipeLLM",
  status: "succeeded",
  timing: {
    started_at: "2026-04-03T14:57:11.075260Z",
    ended_at: "2026-04-03T14:57:11.090902Z",
    duration: 0.015642,
  },
  io: {
    inputs: [
      {
        name: "pages",
        concept: "Page",
        content_type: null,
        preview: null,
        size: null,
        digest: "FiHCz",
        data: {
          items: [
            {
              text_and_images: {
                text: {
                  text: "DRY RUN: OCR text",
                },
                images: [],
                raw_html: null,
              },
              page_view: null,
            },
            {
              text_and_images: {
                text: {
                  text: "DRY RUN: OCR text",
                },
                images: [],
                raw_html: null,
              },
              page_view: null,
            },
            {
              text_and_images: {
                text: {
                  text: "DRY RUN: OCR text",
                },
                images: [],
                raw_html: null,
              },
              page_view: null,
            },
            {
              text_and_images: {
                text: {
                  text: "DRY RUN: OCR text",
                },
                images: [],
                raw_html: null,
              },
              page_view: null,
            },
          ],
        },
        data_text:
          "   1    \u2502 DRY RUN: OCR text                                                     \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n   2    \u2502 DRY RUN: OCR text                                                     \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n   3    \u2502 DRY RUN: OCR text                                                     \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n   4    \u2502 DRY RUN: OCR text                                                     \n",
        data_html:
          "<ul><li><table><tr><th>text_and_images</th><td>DRY RUN: OCR text</td></tr></table></li><li><table><tr><th>text_and_images</th><td>DRY RUN: OCR text</td></tr></table></li><li><table><tr><th>text_and_images</th><td>DRY RUN: OCR text</td></tr></table></li><li><table><tr><th>text_and_images</th><td>DRY RUN: OCR text</td></tr></table></li></ul>",
        extra: {},
      },
    ],
    outputs: [
      {
        name: "profile",
        concept: "CandidateProfile",
        content_type: null,
        preview: null,
        size: null,
        digest: "dTK33",
        data: {
          name: "TaKrdhoCHeAMMZkkWqdo",
          skills: ["d6e9ebf7"],
          experience_years: 1906,
          summary: "cCPVariYGKOZKOVQcHxB",
        },
        data_text:
          " Attribute                          \u2503 Value                                     \n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2547\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n name                               \u2502 TaKrdhoCHeAMMZkkWqdo                      \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n skills                             \u2502   1   \u2502 d6e9ebf7                          \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n experience_years                   \u2502 1906                                      \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n summary                            \u2502 cCPVariYGKOZKOVQcHxB                      \n",
        data_html:
          "<table><tr><th>name</th><td>TaKrdhoCHeAMMZkkWqdo</td></tr><tr><th>skills</th><td><ul><li>d6e9ebf7</li></ul></td></tr><tr><th>experience_years</th><td>1906</td></tr><tr><th>summary</th><td>cCPVariYGKOZKOVQcHxB</td></tr></table>",
        extra: {},
      },
    ],
  },
  error: null,
  tags: {},
  metrics: {},
} as any as GraphSpecNode;

export const NODE_ENRICH_CANDIDATE: GraphSpecNode = {
  id: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_3",
  kind: "controller",
  pipe_code: "enrich_candidate",
  pipe_type: "PipeParallel",
  status: "succeeded",
  timing: {
    started_at: "2026-04-03T14:57:11.096112Z",
    ended_at: "2026-04-03T14:57:11.137867Z",
    duration: 0.041755,
  },
  io: {
    inputs: [
      {
        name: "profile",
        concept: "CandidateProfile",
        content_type: null,
        preview: null,
        size: null,
        digest: "dTK33",
        data: {
          name: "TaKrdhoCHeAMMZkkWqdo",
          skills: ["d6e9ebf7"],
          experience_years: 1906,
          summary: "cCPVariYGKOZKOVQcHxB",
        },
        data_text:
          " Attribute                          \u2503 Value                                     \n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2547\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n name                               \u2502 TaKrdhoCHeAMMZkkWqdo                      \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n skills                             \u2502   1   \u2502 d6e9ebf7                          \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n experience_years                   \u2502 1906                                      \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n summary                            \u2502 cCPVariYGKOZKOVQcHxB                      \n",
        data_html:
          "<table><tr><th>name</th><td>TaKrdhoCHeAMMZkkWqdo</td></tr><tr><th>skills</th><td><ul><li>d6e9ebf7</li></ul></td></tr><tr><th>experience_years</th><td>1906</td></tr><tr><th>summary</th><td>cCPVariYGKOZKOVQcHxB</td></tr></table>",
        extra: {},
      },
    ],
    outputs: [
      {
        name: "search_result",
        concept: "SearchResult",
        content_type: null,
        preview: null,
        size: null,
        digest: "GRzJ5",
        data: {
          answer: "ZpSpBIZInbWYCZMlDPBM",
          sources: [
            {
              url: "IYkhPEVtBTePgEhILeZH",
              public_url: "lIwZXDvcPOyTKDAHzcuB",
              mime_type: "YsaCElBbMThmLEntNfcP",
              filename: "DavkkhRIbOGIJUrtdLur",
              title: "gLSHtbNuYdnnYaQVosKk",
              snippet: "VcAjqVsNyTnZZbqTjyNG",
            },
            {
              url: "MnOVNEptCaBawGEIQygg",
              public_url: "BpKfhqUGvVqezKezeVqS",
              mime_type: "wOBZuntjbYVrYEwtKHog",
              filename: "UmBQNxOKhvfbcYdCHJjj",
              title: "IhAtxMkghWjYRAxxfbgo",
              snippet: "MvrxIKnPAScnpcDVyjor",
            },
            {
              url: "ZbVuwRsNOrIqytGyherg",
              public_url: "pgbkiHAEhDtSZiQmBJgi",
              mime_type: "dqANvVPzUfdEKpfjWETf",
              filename: "KNWoZfMryzrbWBlEDJNS",
              title: "wkBXURPlWqMAtuuBosaz",
              snippet: "hfUjJpckCJICNExipysq",
            },
          ],
        },
        data_text:
          "Search Result:\nZpSpBIZInbWYCZMlDPBM                                                                                \n\nSources (3):\ngLSHtbNuYdnnYaQVosKk (IYkhPEVtBTePgEhILeZH)\n  VcAjqVsNyTnZZbqTjyNG\n\nIhAtxMkghWjYRAxxfbgo (MnOVNEptCaBawGEIQygg)\n  MvrxIKnPAScnpcDVyjor\n\nwkBXURPlWqMAtuuBosaz (ZbVuwRsNOrIqytGyherg)\n  hfUjJpckCJICNExipysq\n",
        data_html:
          '<div><p>ZpSpBIZInbWYCZMlDPBM</p><h4>Sources</h4><ul><li><a href="lIwZXDvcPOyTKDAHzcuB" class="msg-document">gLSHtbNuYdnnYaQVosKk</a><br/><small>VcAjqVsNyTnZZbqTjyNG</small></li><li><a href="BpKfhqUGvVqezKezeVqS" class="msg-document">IhAtxMkghWjYRAxxfbgo</a><br/><small>MvrxIKnPAScnpcDVyjor</small></li><li><a href="pgbkiHAEhDtSZiQmBJgi" class="msg-document">wkBXURPlWqMAtuuBosaz</a><br/><small>hfUjJpckCJICNExipysq</small></li></ul></div>',
        extra: {},
      },
      {
        name: "card_image",
        concept: "Image",
        content_type: "image/jpeg",
        preview: null,
        size: null,
        digest: "b2t2n",
        data: {
          url: "https://storage.googleapis.com/public_test_files_7fa6_4277_9ab/fashion/fashion_photo_1.jpg",
          public_url:
            "https://storage.googleapis.com/public_test_files_7fa6_4277_9ab/fashion/fashion_photo_1.jpg",
          source_prompt: "Professional profile card for TaKrdhoCHeAMMZkkWqdo, cCPVariYGKOZKOVQcHxB",
          source_negative_prompt: null,
          caption: null,
          mime_type: "image/jpeg",
          size: {
            width: 1024,
            height: 1024,
          },
          filename: null,
        },
        data_text:
          "Image:\nURL: https://storage.googleapis.com/public_test_files_7fa6_4277_9ab/fashion/fashion_photo_1.jpg     \nPublic URL: Open Image\nSize: 1024x1024\nMIME Type: image/jpeg\n\nSource Prompt:\nProfessional profile card for TaKrdhoCHeAMMZkkWqdo, cCPVariYGKOZKOVQcHxB\n",
        data_html:
          '<img src="https://storage.googleapis.com/public_test_files_7fa6_4277_9ab/fashion/fashion_photo_1.jpg" class="msg-img">',
        extra: {},
      },
    ],
  },
  error: null,
  tags: {},
  metrics: {},
} as any as GraphSpecNode;

export const NODE_SEARCH_CANDIDATE: GraphSpecNode = {
  id: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_4",
  kind: "operator",
  pipe_code: "search_candidate",
  pipe_type: "PipeSearch",
  status: "succeeded",
  timing: {
    started_at: "2026-04-03T14:57:11.103262Z",
    ended_at: "2026-04-03T14:57:11.112414Z",
    duration: 0.009152,
  },
  io: {
    inputs: [
      {
        name: "profile",
        concept: "CandidateProfile",
        content_type: null,
        preview: null,
        size: null,
        digest: "dTK33",
        data: {
          name: "TaKrdhoCHeAMMZkkWqdo",
          skills: ["d6e9ebf7"],
          experience_years: 1906,
          summary: "cCPVariYGKOZKOVQcHxB",
        },
        data_text:
          " Attribute                          \u2503 Value                                     \n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2547\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n name                               \u2502 TaKrdhoCHeAMMZkkWqdo                      \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n skills                             \u2502   1   \u2502 d6e9ebf7                          \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n experience_years                   \u2502 1906                                      \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n summary                            \u2502 cCPVariYGKOZKOVQcHxB                      \n",
        data_html:
          "<table><tr><th>name</th><td>TaKrdhoCHeAMMZkkWqdo</td></tr><tr><th>skills</th><td><ul><li>d6e9ebf7</li></ul></td></tr><tr><th>experience_years</th><td>1906</td></tr><tr><th>summary</th><td>cCPVariYGKOZKOVQcHxB</td></tr></table>",
        extra: {},
      },
    ],
    outputs: [
      {
        name: "search_result",
        concept: "SearchResult",
        content_type: null,
        preview: null,
        size: null,
        digest: "GRzJ5",
        data: {
          answer: "ZpSpBIZInbWYCZMlDPBM",
          sources: [
            {
              url: "IYkhPEVtBTePgEhILeZH",
              public_url: "lIwZXDvcPOyTKDAHzcuB",
              mime_type: "YsaCElBbMThmLEntNfcP",
              filename: "DavkkhRIbOGIJUrtdLur",
              title: "gLSHtbNuYdnnYaQVosKk",
              snippet: "VcAjqVsNyTnZZbqTjyNG",
            },
            {
              url: "MnOVNEptCaBawGEIQygg",
              public_url: "BpKfhqUGvVqezKezeVqS",
              mime_type: "wOBZuntjbYVrYEwtKHog",
              filename: "UmBQNxOKhvfbcYdCHJjj",
              title: "IhAtxMkghWjYRAxxfbgo",
              snippet: "MvrxIKnPAScnpcDVyjor",
            },
            {
              url: "ZbVuwRsNOrIqytGyherg",
              public_url: "pgbkiHAEhDtSZiQmBJgi",
              mime_type: "dqANvVPzUfdEKpfjWETf",
              filename: "KNWoZfMryzrbWBlEDJNS",
              title: "wkBXURPlWqMAtuuBosaz",
              snippet: "hfUjJpckCJICNExipysq",
            },
          ],
        },
        data_text:
          "Search Result:\nZpSpBIZInbWYCZMlDPBM                                                                                \n\nSources (3):\ngLSHtbNuYdnnYaQVosKk (IYkhPEVtBTePgEhILeZH)\n  VcAjqVsNyTnZZbqTjyNG\n\nIhAtxMkghWjYRAxxfbgo (MnOVNEptCaBawGEIQygg)\n  MvrxIKnPAScnpcDVyjor\n\nwkBXURPlWqMAtuuBosaz (ZbVuwRsNOrIqytGyherg)\n  hfUjJpckCJICNExipysq\n",
        data_html:
          '<div><p>ZpSpBIZInbWYCZMlDPBM</p><h4>Sources</h4><ul><li><a href="lIwZXDvcPOyTKDAHzcuB" class="msg-document">gLSHtbNuYdnnYaQVosKk</a><br/><small>VcAjqVsNyTnZZbqTjyNG</small></li><li><a href="BpKfhqUGvVqezKezeVqS" class="msg-document">IhAtxMkghWjYRAxxfbgo</a><br/><small>MvrxIKnPAScnpcDVyjor</small></li><li><a href="pgbkiHAEhDtSZiQmBJgi" class="msg-document">wkBXURPlWqMAtuuBosaz</a><br/><small>hfUjJpckCJICNExipysq</small></li></ul></div>',
        extra: {},
      },
    ],
  },
  error: null,
  tags: {},
  metrics: {},
} as any as GraphSpecNode;

export const NODE_GENERATE_CARD: GraphSpecNode = {
  id: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_5",
  kind: "operator",
  pipe_code: "generate_card",
  pipe_type: "PipeImgGen",
  status: "succeeded",
  timing: {
    started_at: "2026-04-03T14:57:11.116899Z",
    ended_at: "2026-04-03T14:57:11.130852Z",
    duration: 0.013953,
  },
  io: {
    inputs: [
      {
        name: "profile",
        concept: "CandidateProfile",
        content_type: null,
        preview: null,
        size: null,
        digest: "dTK33",
        data: {
          name: "TaKrdhoCHeAMMZkkWqdo",
          skills: ["d6e9ebf7"],
          experience_years: 1906,
          summary: "cCPVariYGKOZKOVQcHxB",
        },
        data_text:
          " Attribute                          \u2503 Value                                     \n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2547\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n name                               \u2502 TaKrdhoCHeAMMZkkWqdo                      \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n skills                             \u2502   1   \u2502 d6e9ebf7                          \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n experience_years                   \u2502 1906                                      \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n summary                            \u2502 cCPVariYGKOZKOVQcHxB                      \n",
        data_html:
          "<table><tr><th>name</th><td>TaKrdhoCHeAMMZkkWqdo</td></tr><tr><th>skills</th><td><ul><li>d6e9ebf7</li></ul></td></tr><tr><th>experience_years</th><td>1906</td></tr><tr><th>summary</th><td>cCPVariYGKOZKOVQcHxB</td></tr></table>",
        extra: {},
      },
    ],
    outputs: [
      {
        name: "card_image",
        concept: "Image",
        content_type: "image/jpeg",
        preview: null,
        size: null,
        digest: "b2t2n",
        data: {
          url: "https://storage.googleapis.com/public_test_files_7fa6_4277_9ab/fashion/fashion_photo_1.jpg",
          public_url:
            "https://storage.googleapis.com/public_test_files_7fa6_4277_9ab/fashion/fashion_photo_1.jpg",
          source_prompt: "Professional profile card for TaKrdhoCHeAMMZkkWqdo, cCPVariYGKOZKOVQcHxB",
          source_negative_prompt: null,
          caption: null,
          mime_type: "image/jpeg",
          size: {
            width: 1024,
            height: 1024,
          },
          filename: null,
        },
        data_text:
          "Image:\nURL: https://storage.googleapis.com/public_test_files_7fa6_4277_9ab/fashion/fashion_photo_1.jpg     \nPublic URL: Open Image\nSize: 1024x1024\nMIME Type: image/jpeg\n\nSource Prompt:\nProfessional profile card for TaKrdhoCHeAMMZkkWqdo, cCPVariYGKOZKOVQcHxB\n",
        data_html:
          '<img src="https://storage.googleapis.com/public_test_files_7fa6_4277_9ab/fashion/fashion_photo_1.jpg" class="msg-img">',
        extra: {},
      },
    ],
  },
  error: null,
  tags: {},
  metrics: {},
} as any as GraphSpecNode;

export const NODE_SCORE_MATCH: GraphSpecNode = {
  id: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_6",
  kind: "operator",
  pipe_code: "score_match",
  pipe_type: "PipeLLM",
  status: "succeeded",
  timing: {
    started_at: "2026-04-03T14:57:11.144224Z",
    ended_at: "2026-04-03T14:57:11.162547Z",
    duration: 0.018323,
  },
  io: {
    inputs: [
      {
        name: "profile",
        concept: "CandidateProfile",
        content_type: null,
        preview: null,
        size: null,
        digest: "dTK33",
        data: {
          name: "TaKrdhoCHeAMMZkkWqdo",
          skills: ["d6e9ebf7"],
          experience_years: 1906,
          summary: "cCPVariYGKOZKOVQcHxB",
        },
        data_text:
          " Attribute                          \u2503 Value                                     \n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2547\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n name                               \u2502 TaKrdhoCHeAMMZkkWqdo                      \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n skills                             \u2502   1   \u2502 d6e9ebf7                          \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n experience_years                   \u2502 1906                                      \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n summary                            \u2502 cCPVariYGKOZKOVQcHxB                      \n",
        data_html:
          "<table><tr><th>name</th><td>TaKrdhoCHeAMMZkkWqdo</td></tr><tr><th>skills</th><td><ul><li>d6e9ebf7</li></ul></td></tr><tr><th>experience_years</th><td>1906</td></tr><tr><th>summary</th><td>cCPVariYGKOZKOVQcHxB</td></tr></table>",
        extra: {},
      },
      {
        name: "search_result",
        concept: "SearchResult",
        content_type: null,
        preview: null,
        size: null,
        digest: "GRzJ5",
        data: {
          answer: "ZpSpBIZInbWYCZMlDPBM",
          sources: [
            {
              url: "IYkhPEVtBTePgEhILeZH",
              public_url: "lIwZXDvcPOyTKDAHzcuB",
              mime_type: "YsaCElBbMThmLEntNfcP",
              filename: "DavkkhRIbOGIJUrtdLur",
              title: "gLSHtbNuYdnnYaQVosKk",
              snippet: "VcAjqVsNyTnZZbqTjyNG",
            },
            {
              url: "MnOVNEptCaBawGEIQygg",
              public_url: "BpKfhqUGvVqezKezeVqS",
              mime_type: "wOBZuntjbYVrYEwtKHog",
              filename: "UmBQNxOKhvfbcYdCHJjj",
              title: "IhAtxMkghWjYRAxxfbgo",
              snippet: "MvrxIKnPAScnpcDVyjor",
            },
            {
              url: "ZbVuwRsNOrIqytGyherg",
              public_url: "pgbkiHAEhDtSZiQmBJgi",
              mime_type: "dqANvVPzUfdEKpfjWETf",
              filename: "KNWoZfMryzrbWBlEDJNS",
              title: "wkBXURPlWqMAtuuBosaz",
              snippet: "hfUjJpckCJICNExipysq",
            },
          ],
        },
        data_text:
          "Search Result:\nZpSpBIZInbWYCZMlDPBM                                                                                \n\nSources (3):\ngLSHtbNuYdnnYaQVosKk (IYkhPEVtBTePgEhILeZH)\n  VcAjqVsNyTnZZbqTjyNG\n\nIhAtxMkghWjYRAxxfbgo (MnOVNEptCaBawGEIQygg)\n  MvrxIKnPAScnpcDVyjor\n\nwkBXURPlWqMAtuuBosaz (ZbVuwRsNOrIqytGyherg)\n  hfUjJpckCJICNExipysq\n",
        data_html:
          '<div><p>ZpSpBIZInbWYCZMlDPBM</p><h4>Sources</h4><ul><li><a href="lIwZXDvcPOyTKDAHzcuB" class="msg-document">gLSHtbNuYdnnYaQVosKk</a><br/><small>VcAjqVsNyTnZZbqTjyNG</small></li><li><a href="BpKfhqUGvVqezKezeVqS" class="msg-document">IhAtxMkghWjYRAxxfbgo</a><br/><small>MvrxIKnPAScnpcDVyjor</small></li><li><a href="pgbkiHAEhDtSZiQmBJgi" class="msg-document">wkBXURPlWqMAtuuBosaz</a><br/><small>hfUjJpckCJICNExipysq</small></li></ul></div>',
        extra: {},
      },
    ],
    outputs: [
      {
        name: "match",
        concept: "MatchScore",
        content_type: null,
        preview: null,
        size: null,
        digest: "XBAEg",
        data: {
          score: -4770523658292.34,
          strengths: ["94ba"],
          gaps: ["df38"],
          recommendation: "bLqgIYysxBkMvKfKSiuL",
        },
        data_text:
          " Attribute                        \u2503 Value                                       \n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2547\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n score                            \u2502 -4770523658292.34                           \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n strengths                        \u2502   1   \u2502 94ba                                \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n gaps                             \u2502   1   \u2502 df38                                \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n recommendation                   \u2502 bLqgIYysxBkMvKfKSiuL                        \n",
        data_html:
          "<table><tr><th>score</th><td>-4770523658292.34</td></tr><tr><th>strengths</th><td><ul><li>94ba</li></ul></td></tr><tr><th>gaps</th><td><ul><li>df38</li></ul></td></tr><tr><th>recommendation</th><td>bLqgIYysxBkMvKfKSiuL</td></tr></table>",
        extra: {},
      },
    ],
  },
  error: null,
  tags: {},
  metrics: {},
} as any as GraphSpecNode;

export const NODE_COMPOSE_REPORT: GraphSpecNode = {
  id: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_7",
  kind: "operator",
  pipe_code: "compose_report",
  pipe_type: "PipeCompose",
  status: "succeeded",
  timing: {
    started_at: "2026-04-03T14:57:11.169352Z",
    ended_at: "2026-04-03T14:57:11.182138Z",
    duration: 0.012786,
  },
  io: {
    inputs: [
      {
        name: "profile",
        concept: "CandidateProfile",
        content_type: null,
        preview: null,
        size: null,
        digest: "dTK33",
        data: {
          name: "TaKrdhoCHeAMMZkkWqdo",
          skills: ["d6e9ebf7"],
          experience_years: 1906,
          summary: "cCPVariYGKOZKOVQcHxB",
        },
        data_text:
          " Attribute                          \u2503 Value                                     \n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2547\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n name                               \u2502 TaKrdhoCHeAMMZkkWqdo                      \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n skills                             \u2502   1   \u2502 d6e9ebf7                          \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n experience_years                   \u2502 1906                                      \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n summary                            \u2502 cCPVariYGKOZKOVQcHxB                      \n",
        data_html:
          "<table><tr><th>name</th><td>TaKrdhoCHeAMMZkkWqdo</td></tr><tr><th>skills</th><td><ul><li>d6e9ebf7</li></ul></td></tr><tr><th>experience_years</th><td>1906</td></tr><tr><th>summary</th><td>cCPVariYGKOZKOVQcHxB</td></tr></table>",
        extra: {},
      },
      {
        name: "match",
        concept: "MatchScore",
        content_type: null,
        preview: null,
        size: null,
        digest: "XBAEg",
        data: {
          score: -4770523658292.34,
          strengths: ["94ba"],
          gaps: ["df38"],
          recommendation: "bLqgIYysxBkMvKfKSiuL",
        },
        data_text:
          " Attribute                        \u2503 Value                                       \n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2547\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n score                            \u2502 -4770523658292.34                           \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n strengths                        \u2502   1   \u2502 94ba                                \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n gaps                             \u2502   1   \u2502 df38                                \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n recommendation                   \u2502 bLqgIYysxBkMvKfKSiuL                        \n",
        data_html:
          "<table><tr><th>score</th><td>-4770523658292.34</td></tr><tr><th>strengths</th><td><ul><li>94ba</li></ul></td></tr><tr><th>gaps</th><td><ul><li>df38</li></ul></td></tr><tr><th>recommendation</th><td>bLqgIYysxBkMvKfKSiuL</td></tr></table>",
        extra: {},
      },
      {
        name: "card_image",
        concept: "Image",
        content_type: "image/jpeg",
        preview: null,
        size: null,
        digest: "b2t2n",
        data: {
          url: "https://storage.googleapis.com/public_test_files_7fa6_4277_9ab/fashion/fashion_photo_1.jpg",
          public_url:
            "https://storage.googleapis.com/public_test_files_7fa6_4277_9ab/fashion/fashion_photo_1.jpg",
          source_prompt: "Professional profile card for TaKrdhoCHeAMMZkkWqdo, cCPVariYGKOZKOVQcHxB",
          source_negative_prompt: null,
          caption: null,
          mime_type: "image/jpeg",
          size: {
            width: 1024,
            height: 1024,
          },
          filename: null,
        },
        data_text:
          "Image:\nURL: https://storage.googleapis.com/public_test_files_7fa6_4277_9ab/fashion/fashion_photo_1.jpg     \nPublic URL: Open Image\nSize: 1024x1024\nMIME Type: image/jpeg\n\nSource Prompt:\nProfessional profile card for TaKrdhoCHeAMMZkkWqdo, cCPVariYGKOZKOVQcHxB\n",
        data_html:
          '<img src="https://storage.googleapis.com/public_test_files_7fa6_4277_9ab/fashion/fashion_photo_1.jpg" class="msg-img">',
        extra: {},
      },
    ],
    outputs: [
      {
        name: "report",
        concept: "Report",
        content_type: null,
        preview: null,
        size: null,
        digest: "PjyhE",
        data: {
          text: "# Candidate Screening Report\n\n## Candidate: TaKrdhoCHeAMMZkkWqdo\ncCPVariYGKOZKOVQcHxB\n\n## Match Score: -4770523658292.34/100\nbLqgIYysxBkMvKfKSiuL\n\n## Strengths\nmatch.strengths: ```\n['94ba']\n```\n\n## Gaps\nmatch.gaps: ```\n['df38']\n```",
        },
        data_text:
          "                                     Candidate Screening Report                                     \n\nCandidate: TaKrdhoCHeAMMZkkWqdo                                                                     \n\ncCPVariYGKOZKOVQcHxB                                                                                \n\nMatch Score: -4770523658292.34/100                                                                  \n\nbLqgIYysxBkMvKfKSiuL                                                                                \n\nStrengths                                                                                           \n\nmatch.strengths: ``` ['94ba']                                                                       \n\n                                                                                                    \n                                                                                                    \n ## Gaps                                                                                            \n match.gaps: ```                                                                                    \n ['df38']                                                                                           \n                                                                                                    \n",
        data_html:
          "# Candidate Screening Report\n\n## Candidate: TaKrdhoCHeAMMZkkWqdo\ncCPVariYGKOZKOVQcHxB\n\n## Match Score: -4770523658292.34/100\nbLqgIYysxBkMvKfKSiuL\n\n## Strengths\nmatch.strengths: ```\n[&#x27;94ba&#x27;]\n```\n\n## Gaps\nmatch.gaps: ```\n[&#x27;df38&#x27;]\n```",
        extra: {},
      },
    ],
  },
  error: null,
  tags: {},
  metrics: {},
} as any as GraphSpecNode;

export const NODE_FAILED: GraphSpecNode = {
  id: "mock:failed_node",
  kind: "operator",
  pipe_code: "broken_pipe",
  pipe_type: "PipeLLM",
  status: "failed",
  timing: {
    started_at: "2024-06-01T12:00:00Z",
    ended_at: "2024-06-01T12:00:01Z",
    duration: 1.0,
  },
  io: {
    inputs: [],
    outputs: [],
  },
  error: {
    error_type: "LLMGenerationError",
    message: "API rate limit exceeded. Please retry after 60 seconds.",
    stack:
      'Traceback:\n  File "pipe_llm.py", line 142\n    raise LLMGenerationError(msg)\nLLMGenerationError: API rate limit exceeded',
  },
  tags: {},
  metrics: {},
} as any as GraphSpecNode;

export const ENRICHED_SPEC: GraphSpec = {
  graph_id: "608b9d8b-669a-41cf-ab49-92aa700c5462",
  created_at: "2026-04-03T14:57:11.047897Z",
  pipeline_ref: {
    domain: "recruitment",
    main_pipe: "cv_screening",
    entrypoint: null,
  },
  nodes: [
    {
      id: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_0",
      kind: "controller",
      pipe_code: "cv_screening",
      pipe_type: "PipeSequence",
      status: "succeeded",
      timing: {
        started_at: "2026-04-03T14:57:11.047897Z",
        ended_at: "2026-04-03T14:57:11.186103Z",
        duration: 0.138206,
      },
      io: {
        inputs: [
          {
            name: "cv",
            concept: "Document",
            content_type: "GOOKsyHdIFoCXapRKGBB",
            preview: null,
            size: null,
            digest: "Bka68",
            data: {
              url: "bOdnkjxhgKEjvvjXicgQ",
              public_url: "ppCMFzcVThLWIwltQjEy",
              mime_type: "GOOKsyHdIFoCXapRKGBB",
              filename: "otNPAtmcavqPBscAqpBa",
              title: "SWqQvsIUyGkWfxejdfVV",
              snippet: "TgYbzGofgMadXXDzwIeq",
            },
            data_text: "SWqQvsIUyGkWfxejdfVV (bOdnkjxhgKEjvvjXicgQ)\n  TgYbzGofgMadXXDzwIeq\n",
            data_html:
              '<a href="ppCMFzcVThLWIwltQjEy" class="msg-document">SWqQvsIUyGkWfxejdfVV</a><br/><small>TgYbzGofgMadXXDzwIeq</small>',
            extra: {},
          },
        ],
        outputs: [
          {
            name: "report",
            concept: "Report",
            content_type: null,
            preview: null,
            size: null,
            digest: "PjyhE",
            data: {
              text: "# Candidate Screening Report\n\n## Candidate: TaKrdhoCHeAMMZkkWqdo\ncCPVariYGKOZKOVQcHxB\n\n## Match Score: -4770523658292.34/100\nbLqgIYysxBkMvKfKSiuL\n\n## Strengths\nmatch.strengths: ```\n['94ba']\n```\n\n## Gaps\nmatch.gaps: ```\n['df38']\n```",
            },
            data_text:
              "                                     Candidate Screening Report                                     \n\nCandidate: TaKrdhoCHeAMMZkkWqdo                                                                     \n\ncCPVariYGKOZKOVQcHxB                                                                                \n\nMatch Score: -4770523658292.34/100                                                                  \n\nbLqgIYysxBkMvKfKSiuL                                                                                \n\nStrengths                                                                                           \n\nmatch.strengths: ``` ['94ba']                                                                       \n\n                                                                                                    \n                                                                                                    \n ## Gaps                                                                                            \n match.gaps: ```                                                                                    \n ['df38']                                                                                           \n                                                                                                    \n",
            data_html:
              "# Candidate Screening Report\n\n## Candidate: TaKrdhoCHeAMMZkkWqdo\ncCPVariYGKOZKOVQcHxB\n\n## Match Score: -4770523658292.34/100\nbLqgIYysxBkMvKfKSiuL\n\n## Strengths\nmatch.strengths: ```\n[&#x27;94ba&#x27;]\n```\n\n## Gaps\nmatch.gaps: ```\n[&#x27;df38&#x27;]\n```",
            extra: {},
          },
        ],
      },
      error: null,
      tags: {},
      metrics: {},
    },
    {
      id: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_1",
      kind: "operator",
      pipe_code: "extract_cv",
      pipe_type: "PipeExtract",
      status: "succeeded",
      timing: {
        started_at: "2026-04-03T14:57:11.057496Z",
        ended_at: "2026-04-03T14:57:11.069894Z",
        duration: 0.012398,
      },
      io: {
        inputs: [
          {
            name: "cv",
            concept: "Document",
            content_type: "GOOKsyHdIFoCXapRKGBB",
            preview: null,
            size: null,
            digest: "Bka68",
            data: {
              url: "bOdnkjxhgKEjvvjXicgQ",
              public_url: "ppCMFzcVThLWIwltQjEy",
              mime_type: "GOOKsyHdIFoCXapRKGBB",
              filename: "otNPAtmcavqPBscAqpBa",
              title: "SWqQvsIUyGkWfxejdfVV",
              snippet: "TgYbzGofgMadXXDzwIeq",
            },
            data_text: "SWqQvsIUyGkWfxejdfVV (bOdnkjxhgKEjvvjXicgQ)\n  TgYbzGofgMadXXDzwIeq\n",
            data_html:
              '<a href="ppCMFzcVThLWIwltQjEy" class="msg-document">SWqQvsIUyGkWfxejdfVV</a><br/><small>TgYbzGofgMadXXDzwIeq</small>',
            extra: {},
          },
        ],
        outputs: [
          {
            name: "pages",
            concept: "Page",
            content_type: null,
            preview: null,
            size: null,
            digest: "FiHCz",
            data: {
              items: [
                {
                  text_and_images: {
                    text: {
                      text: "DRY RUN: OCR text",
                    },
                    images: [],
                    raw_html: null,
                  },
                  page_view: null,
                },
                {
                  text_and_images: {
                    text: {
                      text: "DRY RUN: OCR text",
                    },
                    images: [],
                    raw_html: null,
                  },
                  page_view: null,
                },
                {
                  text_and_images: {
                    text: {
                      text: "DRY RUN: OCR text",
                    },
                    images: [],
                    raw_html: null,
                  },
                  page_view: null,
                },
                {
                  text_and_images: {
                    text: {
                      text: "DRY RUN: OCR text",
                    },
                    images: [],
                    raw_html: null,
                  },
                  page_view: null,
                },
              ],
            },
            data_text:
              "   1    \u2502 DRY RUN: OCR text                                                     \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n   2    \u2502 DRY RUN: OCR text                                                     \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n   3    \u2502 DRY RUN: OCR text                                                     \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n   4    \u2502 DRY RUN: OCR text                                                     \n",
            data_html:
              "<ul><li><table><tr><th>text_and_images</th><td>DRY RUN: OCR text</td></tr></table></li><li><table><tr><th>text_and_images</th><td>DRY RUN: OCR text</td></tr></table></li><li><table><tr><th>text_and_images</th><td>DRY RUN: OCR text</td></tr></table></li><li><table><tr><th>text_and_images</th><td>DRY RUN: OCR text</td></tr></table></li></ul>",
            extra: {},
          },
        ],
      },
      error: null,
      tags: {},
      metrics: {},
    },
    {
      id: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_2",
      kind: "operator",
      pipe_code: "analyze_candidate",
      pipe_type: "PipeLLM",
      status: "succeeded",
      timing: {
        started_at: "2026-04-03T14:57:11.075260Z",
        ended_at: "2026-04-03T14:57:11.090902Z",
        duration: 0.015642,
      },
      io: {
        inputs: [
          {
            name: "pages",
            concept: "Page",
            content_type: null,
            preview: null,
            size: null,
            digest: "FiHCz",
            data: {
              items: [
                {
                  text_and_images: {
                    text: {
                      text: "DRY RUN: OCR text",
                    },
                    images: [],
                    raw_html: null,
                  },
                  page_view: null,
                },
                {
                  text_and_images: {
                    text: {
                      text: "DRY RUN: OCR text",
                    },
                    images: [],
                    raw_html: null,
                  },
                  page_view: null,
                },
                {
                  text_and_images: {
                    text: {
                      text: "DRY RUN: OCR text",
                    },
                    images: [],
                    raw_html: null,
                  },
                  page_view: null,
                },
                {
                  text_and_images: {
                    text: {
                      text: "DRY RUN: OCR text",
                    },
                    images: [],
                    raw_html: null,
                  },
                  page_view: null,
                },
              ],
            },
            data_text:
              "   1    \u2502 DRY RUN: OCR text                                                     \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n   2    \u2502 DRY RUN: OCR text                                                     \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n   3    \u2502 DRY RUN: OCR text                                                     \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n   4    \u2502 DRY RUN: OCR text                                                     \n",
            data_html:
              "<ul><li><table><tr><th>text_and_images</th><td>DRY RUN: OCR text</td></tr></table></li><li><table><tr><th>text_and_images</th><td>DRY RUN: OCR text</td></tr></table></li><li><table><tr><th>text_and_images</th><td>DRY RUN: OCR text</td></tr></table></li><li><table><tr><th>text_and_images</th><td>DRY RUN: OCR text</td></tr></table></li></ul>",
            extra: {},
          },
        ],
        outputs: [
          {
            name: "profile",
            concept: "CandidateProfile",
            content_type: null,
            preview: null,
            size: null,
            digest: "dTK33",
            data: {
              name: "TaKrdhoCHeAMMZkkWqdo",
              skills: ["d6e9ebf7"],
              experience_years: 1906,
              summary: "cCPVariYGKOZKOVQcHxB",
            },
            data_text:
              " Attribute                          \u2503 Value                                     \n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2547\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n name                               \u2502 TaKrdhoCHeAMMZkkWqdo                      \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n skills                             \u2502   1   \u2502 d6e9ebf7                          \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n experience_years                   \u2502 1906                                      \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n summary                            \u2502 cCPVariYGKOZKOVQcHxB                      \n",
            data_html:
              "<table><tr><th>name</th><td>TaKrdhoCHeAMMZkkWqdo</td></tr><tr><th>skills</th><td><ul><li>d6e9ebf7</li></ul></td></tr><tr><th>experience_years</th><td>1906</td></tr><tr><th>summary</th><td>cCPVariYGKOZKOVQcHxB</td></tr></table>",
            extra: {},
          },
        ],
      },
      error: null,
      tags: {},
      metrics: {},
    },
    {
      id: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_3",
      kind: "controller",
      pipe_code: "enrich_candidate",
      pipe_type: "PipeParallel",
      status: "succeeded",
      timing: {
        started_at: "2026-04-03T14:57:11.096112Z",
        ended_at: "2026-04-03T14:57:11.137867Z",
        duration: 0.041755,
      },
      io: {
        inputs: [
          {
            name: "profile",
            concept: "CandidateProfile",
            content_type: null,
            preview: null,
            size: null,
            digest: "dTK33",
            data: {
              name: "TaKrdhoCHeAMMZkkWqdo",
              skills: ["d6e9ebf7"],
              experience_years: 1906,
              summary: "cCPVariYGKOZKOVQcHxB",
            },
            data_text:
              " Attribute                          \u2503 Value                                     \n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2547\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n name                               \u2502 TaKrdhoCHeAMMZkkWqdo                      \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n skills                             \u2502   1   \u2502 d6e9ebf7                          \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n experience_years                   \u2502 1906                                      \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n summary                            \u2502 cCPVariYGKOZKOVQcHxB                      \n",
            data_html:
              "<table><tr><th>name</th><td>TaKrdhoCHeAMMZkkWqdo</td></tr><tr><th>skills</th><td><ul><li>d6e9ebf7</li></ul></td></tr><tr><th>experience_years</th><td>1906</td></tr><tr><th>summary</th><td>cCPVariYGKOZKOVQcHxB</td></tr></table>",
            extra: {},
          },
        ],
        outputs: [
          {
            name: "search_result",
            concept: "SearchResult",
            content_type: null,
            preview: null,
            size: null,
            digest: "GRzJ5",
            data: {
              answer: "ZpSpBIZInbWYCZMlDPBM",
              sources: [
                {
                  url: "IYkhPEVtBTePgEhILeZH",
                  public_url: "lIwZXDvcPOyTKDAHzcuB",
                  mime_type: "YsaCElBbMThmLEntNfcP",
                  filename: "DavkkhRIbOGIJUrtdLur",
                  title: "gLSHtbNuYdnnYaQVosKk",
                  snippet: "VcAjqVsNyTnZZbqTjyNG",
                },
                {
                  url: "MnOVNEptCaBawGEIQygg",
                  public_url: "BpKfhqUGvVqezKezeVqS",
                  mime_type: "wOBZuntjbYVrYEwtKHog",
                  filename: "UmBQNxOKhvfbcYdCHJjj",
                  title: "IhAtxMkghWjYRAxxfbgo",
                  snippet: "MvrxIKnPAScnpcDVyjor",
                },
                {
                  url: "ZbVuwRsNOrIqytGyherg",
                  public_url: "pgbkiHAEhDtSZiQmBJgi",
                  mime_type: "dqANvVPzUfdEKpfjWETf",
                  filename: "KNWoZfMryzrbWBlEDJNS",
                  title: "wkBXURPlWqMAtuuBosaz",
                  snippet: "hfUjJpckCJICNExipysq",
                },
              ],
            },
            data_text:
              "Search Result:\nZpSpBIZInbWYCZMlDPBM                                                                                \n\nSources (3):\ngLSHtbNuYdnnYaQVosKk (IYkhPEVtBTePgEhILeZH)\n  VcAjqVsNyTnZZbqTjyNG\n\nIhAtxMkghWjYRAxxfbgo (MnOVNEptCaBawGEIQygg)\n  MvrxIKnPAScnpcDVyjor\n\nwkBXURPlWqMAtuuBosaz (ZbVuwRsNOrIqytGyherg)\n  hfUjJpckCJICNExipysq\n",
            data_html:
              '<div><p>ZpSpBIZInbWYCZMlDPBM</p><h4>Sources</h4><ul><li><a href="lIwZXDvcPOyTKDAHzcuB" class="msg-document">gLSHtbNuYdnnYaQVosKk</a><br/><small>VcAjqVsNyTnZZbqTjyNG</small></li><li><a href="BpKfhqUGvVqezKezeVqS" class="msg-document">IhAtxMkghWjYRAxxfbgo</a><br/><small>MvrxIKnPAScnpcDVyjor</small></li><li><a href="pgbkiHAEhDtSZiQmBJgi" class="msg-document">wkBXURPlWqMAtuuBosaz</a><br/><small>hfUjJpckCJICNExipysq</small></li></ul></div>',
            extra: {},
          },
          {
            name: "card_image",
            concept: "Image",
            content_type: "image/jpeg",
            preview: null,
            size: null,
            digest: "b2t2n",
            data: {
              url: "https://storage.googleapis.com/public_test_files_7fa6_4277_9ab/fashion/fashion_photo_1.jpg",
              public_url:
                "https://storage.googleapis.com/public_test_files_7fa6_4277_9ab/fashion/fashion_photo_1.jpg",
              source_prompt:
                "Professional profile card for TaKrdhoCHeAMMZkkWqdo, cCPVariYGKOZKOVQcHxB",
              source_negative_prompt: null,
              caption: null,
              mime_type: "image/jpeg",
              size: {
                width: 1024,
                height: 1024,
              },
              filename: null,
            },
            data_text:
              "Image:\nURL: https://storage.googleapis.com/public_test_files_7fa6_4277_9ab/fashion/fashion_photo_1.jpg     \nPublic URL: Open Image\nSize: 1024x1024\nMIME Type: image/jpeg\n\nSource Prompt:\nProfessional profile card for TaKrdhoCHeAMMZkkWqdo, cCPVariYGKOZKOVQcHxB\n",
            data_html:
              '<img src="https://storage.googleapis.com/public_test_files_7fa6_4277_9ab/fashion/fashion_photo_1.jpg" class="msg-img">',
            extra: {},
          },
        ],
      },
      error: null,
      tags: {},
      metrics: {},
    },
    {
      id: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_4",
      kind: "operator",
      pipe_code: "search_candidate",
      pipe_type: "PipeSearch",
      status: "succeeded",
      timing: {
        started_at: "2026-04-03T14:57:11.103262Z",
        ended_at: "2026-04-03T14:57:11.112414Z",
        duration: 0.009152,
      },
      io: {
        inputs: [
          {
            name: "profile",
            concept: "CandidateProfile",
            content_type: null,
            preview: null,
            size: null,
            digest: "dTK33",
            data: {
              name: "TaKrdhoCHeAMMZkkWqdo",
              skills: ["d6e9ebf7"],
              experience_years: 1906,
              summary: "cCPVariYGKOZKOVQcHxB",
            },
            data_text:
              " Attribute                          \u2503 Value                                     \n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2547\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n name                               \u2502 TaKrdhoCHeAMMZkkWqdo                      \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n skills                             \u2502   1   \u2502 d6e9ebf7                          \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n experience_years                   \u2502 1906                                      \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n summary                            \u2502 cCPVariYGKOZKOVQcHxB                      \n",
            data_html:
              "<table><tr><th>name</th><td>TaKrdhoCHeAMMZkkWqdo</td></tr><tr><th>skills</th><td><ul><li>d6e9ebf7</li></ul></td></tr><tr><th>experience_years</th><td>1906</td></tr><tr><th>summary</th><td>cCPVariYGKOZKOVQcHxB</td></tr></table>",
            extra: {},
          },
        ],
        outputs: [
          {
            name: "search_result",
            concept: "SearchResult",
            content_type: null,
            preview: null,
            size: null,
            digest: "GRzJ5",
            data: {
              answer: "ZpSpBIZInbWYCZMlDPBM",
              sources: [
                {
                  url: "IYkhPEVtBTePgEhILeZH",
                  public_url: "lIwZXDvcPOyTKDAHzcuB",
                  mime_type: "YsaCElBbMThmLEntNfcP",
                  filename: "DavkkhRIbOGIJUrtdLur",
                  title: "gLSHtbNuYdnnYaQVosKk",
                  snippet: "VcAjqVsNyTnZZbqTjyNG",
                },
                {
                  url: "MnOVNEptCaBawGEIQygg",
                  public_url: "BpKfhqUGvVqezKezeVqS",
                  mime_type: "wOBZuntjbYVrYEwtKHog",
                  filename: "UmBQNxOKhvfbcYdCHJjj",
                  title: "IhAtxMkghWjYRAxxfbgo",
                  snippet: "MvrxIKnPAScnpcDVyjor",
                },
                {
                  url: "ZbVuwRsNOrIqytGyherg",
                  public_url: "pgbkiHAEhDtSZiQmBJgi",
                  mime_type: "dqANvVPzUfdEKpfjWETf",
                  filename: "KNWoZfMryzrbWBlEDJNS",
                  title: "wkBXURPlWqMAtuuBosaz",
                  snippet: "hfUjJpckCJICNExipysq",
                },
              ],
            },
            data_text:
              "Search Result:\nZpSpBIZInbWYCZMlDPBM                                                                                \n\nSources (3):\ngLSHtbNuYdnnYaQVosKk (IYkhPEVtBTePgEhILeZH)\n  VcAjqVsNyTnZZbqTjyNG\n\nIhAtxMkghWjYRAxxfbgo (MnOVNEptCaBawGEIQygg)\n  MvrxIKnPAScnpcDVyjor\n\nwkBXURPlWqMAtuuBosaz (ZbVuwRsNOrIqytGyherg)\n  hfUjJpckCJICNExipysq\n",
            data_html:
              '<div><p>ZpSpBIZInbWYCZMlDPBM</p><h4>Sources</h4><ul><li><a href="lIwZXDvcPOyTKDAHzcuB" class="msg-document">gLSHtbNuYdnnYaQVosKk</a><br/><small>VcAjqVsNyTnZZbqTjyNG</small></li><li><a href="BpKfhqUGvVqezKezeVqS" class="msg-document">IhAtxMkghWjYRAxxfbgo</a><br/><small>MvrxIKnPAScnpcDVyjor</small></li><li><a href="pgbkiHAEhDtSZiQmBJgi" class="msg-document">wkBXURPlWqMAtuuBosaz</a><br/><small>hfUjJpckCJICNExipysq</small></li></ul></div>',
            extra: {},
          },
        ],
      },
      error: null,
      tags: {},
      metrics: {},
    },
    {
      id: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_5",
      kind: "operator",
      pipe_code: "generate_card",
      pipe_type: "PipeImgGen",
      status: "succeeded",
      timing: {
        started_at: "2026-04-03T14:57:11.116899Z",
        ended_at: "2026-04-03T14:57:11.130852Z",
        duration: 0.013953,
      },
      io: {
        inputs: [
          {
            name: "profile",
            concept: "CandidateProfile",
            content_type: null,
            preview: null,
            size: null,
            digest: "dTK33",
            data: {
              name: "TaKrdhoCHeAMMZkkWqdo",
              skills: ["d6e9ebf7"],
              experience_years: 1906,
              summary: "cCPVariYGKOZKOVQcHxB",
            },
            data_text:
              " Attribute                          \u2503 Value                                     \n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2547\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n name                               \u2502 TaKrdhoCHeAMMZkkWqdo                      \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n skills                             \u2502   1   \u2502 d6e9ebf7                          \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n experience_years                   \u2502 1906                                      \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n summary                            \u2502 cCPVariYGKOZKOVQcHxB                      \n",
            data_html:
              "<table><tr><th>name</th><td>TaKrdhoCHeAMMZkkWqdo</td></tr><tr><th>skills</th><td><ul><li>d6e9ebf7</li></ul></td></tr><tr><th>experience_years</th><td>1906</td></tr><tr><th>summary</th><td>cCPVariYGKOZKOVQcHxB</td></tr></table>",
            extra: {},
          },
        ],
        outputs: [
          {
            name: "card_image",
            concept: "Image",
            content_type: "image/jpeg",
            preview: null,
            size: null,
            digest: "b2t2n",
            data: {
              url: "https://storage.googleapis.com/public_test_files_7fa6_4277_9ab/fashion/fashion_photo_1.jpg",
              public_url:
                "https://storage.googleapis.com/public_test_files_7fa6_4277_9ab/fashion/fashion_photo_1.jpg",
              source_prompt:
                "Professional profile card for TaKrdhoCHeAMMZkkWqdo, cCPVariYGKOZKOVQcHxB",
              source_negative_prompt: null,
              caption: null,
              mime_type: "image/jpeg",
              size: {
                width: 1024,
                height: 1024,
              },
              filename: null,
            },
            data_text:
              "Image:\nURL: https://storage.googleapis.com/public_test_files_7fa6_4277_9ab/fashion/fashion_photo_1.jpg     \nPublic URL: Open Image\nSize: 1024x1024\nMIME Type: image/jpeg\n\nSource Prompt:\nProfessional profile card for TaKrdhoCHeAMMZkkWqdo, cCPVariYGKOZKOVQcHxB\n",
            data_html:
              '<img src="https://storage.googleapis.com/public_test_files_7fa6_4277_9ab/fashion/fashion_photo_1.jpg" class="msg-img">',
            extra: {},
          },
        ],
      },
      error: null,
      tags: {},
      metrics: {},
    },
    {
      id: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_6",
      kind: "operator",
      pipe_code: "score_match",
      pipe_type: "PipeLLM",
      status: "succeeded",
      timing: {
        started_at: "2026-04-03T14:57:11.144224Z",
        ended_at: "2026-04-03T14:57:11.162547Z",
        duration: 0.018323,
      },
      io: {
        inputs: [
          {
            name: "profile",
            concept: "CandidateProfile",
            content_type: null,
            preview: null,
            size: null,
            digest: "dTK33",
            data: {
              name: "TaKrdhoCHeAMMZkkWqdo",
              skills: ["d6e9ebf7"],
              experience_years: 1906,
              summary: "cCPVariYGKOZKOVQcHxB",
            },
            data_text:
              " Attribute                          \u2503 Value                                     \n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2547\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n name                               \u2502 TaKrdhoCHeAMMZkkWqdo                      \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n skills                             \u2502   1   \u2502 d6e9ebf7                          \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n experience_years                   \u2502 1906                                      \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n summary                            \u2502 cCPVariYGKOZKOVQcHxB                      \n",
            data_html:
              "<table><tr><th>name</th><td>TaKrdhoCHeAMMZkkWqdo</td></tr><tr><th>skills</th><td><ul><li>d6e9ebf7</li></ul></td></tr><tr><th>experience_years</th><td>1906</td></tr><tr><th>summary</th><td>cCPVariYGKOZKOVQcHxB</td></tr></table>",
            extra: {},
          },
          {
            name: "search_result",
            concept: "SearchResult",
            content_type: null,
            preview: null,
            size: null,
            digest: "GRzJ5",
            data: {
              answer: "ZpSpBIZInbWYCZMlDPBM",
              sources: [
                {
                  url: "IYkhPEVtBTePgEhILeZH",
                  public_url: "lIwZXDvcPOyTKDAHzcuB",
                  mime_type: "YsaCElBbMThmLEntNfcP",
                  filename: "DavkkhRIbOGIJUrtdLur",
                  title: "gLSHtbNuYdnnYaQVosKk",
                  snippet: "VcAjqVsNyTnZZbqTjyNG",
                },
                {
                  url: "MnOVNEptCaBawGEIQygg",
                  public_url: "BpKfhqUGvVqezKezeVqS",
                  mime_type: "wOBZuntjbYVrYEwtKHog",
                  filename: "UmBQNxOKhvfbcYdCHJjj",
                  title: "IhAtxMkghWjYRAxxfbgo",
                  snippet: "MvrxIKnPAScnpcDVyjor",
                },
                {
                  url: "ZbVuwRsNOrIqytGyherg",
                  public_url: "pgbkiHAEhDtSZiQmBJgi",
                  mime_type: "dqANvVPzUfdEKpfjWETf",
                  filename: "KNWoZfMryzrbWBlEDJNS",
                  title: "wkBXURPlWqMAtuuBosaz",
                  snippet: "hfUjJpckCJICNExipysq",
                },
              ],
            },
            data_text:
              "Search Result:\nZpSpBIZInbWYCZMlDPBM                                                                                \n\nSources (3):\ngLSHtbNuYdnnYaQVosKk (IYkhPEVtBTePgEhILeZH)\n  VcAjqVsNyTnZZbqTjyNG\n\nIhAtxMkghWjYRAxxfbgo (MnOVNEptCaBawGEIQygg)\n  MvrxIKnPAScnpcDVyjor\n\nwkBXURPlWqMAtuuBosaz (ZbVuwRsNOrIqytGyherg)\n  hfUjJpckCJICNExipysq\n",
            data_html:
              '<div><p>ZpSpBIZInbWYCZMlDPBM</p><h4>Sources</h4><ul><li><a href="lIwZXDvcPOyTKDAHzcuB" class="msg-document">gLSHtbNuYdnnYaQVosKk</a><br/><small>VcAjqVsNyTnZZbqTjyNG</small></li><li><a href="BpKfhqUGvVqezKezeVqS" class="msg-document">IhAtxMkghWjYRAxxfbgo</a><br/><small>MvrxIKnPAScnpcDVyjor</small></li><li><a href="pgbkiHAEhDtSZiQmBJgi" class="msg-document">wkBXURPlWqMAtuuBosaz</a><br/><small>hfUjJpckCJICNExipysq</small></li></ul></div>',
            extra: {},
          },
        ],
        outputs: [
          {
            name: "match",
            concept: "MatchScore",
            content_type: null,
            preview: null,
            size: null,
            digest: "XBAEg",
            data: {
              score: -4770523658292.34,
              strengths: ["94ba"],
              gaps: ["df38"],
              recommendation: "bLqgIYysxBkMvKfKSiuL",
            },
            data_text:
              " Attribute                        \u2503 Value                                       \n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2547\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n score                            \u2502 -4770523658292.34                           \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n strengths                        \u2502   1   \u2502 94ba                                \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n gaps                             \u2502   1   \u2502 df38                                \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n recommendation                   \u2502 bLqgIYysxBkMvKfKSiuL                        \n",
            data_html:
              "<table><tr><th>score</th><td>-4770523658292.34</td></tr><tr><th>strengths</th><td><ul><li>94ba</li></ul></td></tr><tr><th>gaps</th><td><ul><li>df38</li></ul></td></tr><tr><th>recommendation</th><td>bLqgIYysxBkMvKfKSiuL</td></tr></table>",
            extra: {},
          },
        ],
      },
      error: null,
      tags: {},
      metrics: {},
    },
    {
      id: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_7",
      kind: "operator",
      pipe_code: "compose_report",
      pipe_type: "PipeCompose",
      status: "succeeded",
      timing: {
        started_at: "2026-04-03T14:57:11.169352Z",
        ended_at: "2026-04-03T14:57:11.182138Z",
        duration: 0.012786,
      },
      io: {
        inputs: [
          {
            name: "profile",
            concept: "CandidateProfile",
            content_type: null,
            preview: null,
            size: null,
            digest: "dTK33",
            data: {
              name: "TaKrdhoCHeAMMZkkWqdo",
              skills: ["d6e9ebf7"],
              experience_years: 1906,
              summary: "cCPVariYGKOZKOVQcHxB",
            },
            data_text:
              " Attribute                          \u2503 Value                                     \n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2547\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n name                               \u2502 TaKrdhoCHeAMMZkkWqdo                      \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n skills                             \u2502   1   \u2502 d6e9ebf7                          \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n experience_years                   \u2502 1906                                      \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n summary                            \u2502 cCPVariYGKOZKOVQcHxB                      \n",
            data_html:
              "<table><tr><th>name</th><td>TaKrdhoCHeAMMZkkWqdo</td></tr><tr><th>skills</th><td><ul><li>d6e9ebf7</li></ul></td></tr><tr><th>experience_years</th><td>1906</td></tr><tr><th>summary</th><td>cCPVariYGKOZKOVQcHxB</td></tr></table>",
            extra: {},
          },
          {
            name: "match",
            concept: "MatchScore",
            content_type: null,
            preview: null,
            size: null,
            digest: "XBAEg",
            data: {
              score: -4770523658292.34,
              strengths: ["94ba"],
              gaps: ["df38"],
              recommendation: "bLqgIYysxBkMvKfKSiuL",
            },
            data_text:
              " Attribute                        \u2503 Value                                       \n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2547\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\n score                            \u2502 -4770523658292.34                           \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n strengths                        \u2502   1   \u2502 94ba                                \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n gaps                             \u2502   1   \u2502 df38                                \n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u253c\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n recommendation                   \u2502 bLqgIYysxBkMvKfKSiuL                        \n",
            data_html:
              "<table><tr><th>score</th><td>-4770523658292.34</td></tr><tr><th>strengths</th><td><ul><li>94ba</li></ul></td></tr><tr><th>gaps</th><td><ul><li>df38</li></ul></td></tr><tr><th>recommendation</th><td>bLqgIYysxBkMvKfKSiuL</td></tr></table>",
            extra: {},
          },
          {
            name: "card_image",
            concept: "Image",
            content_type: "image/jpeg",
            preview: null,
            size: null,
            digest: "b2t2n",
            data: {
              url: "https://storage.googleapis.com/public_test_files_7fa6_4277_9ab/fashion/fashion_photo_1.jpg",
              public_url:
                "https://storage.googleapis.com/public_test_files_7fa6_4277_9ab/fashion/fashion_photo_1.jpg",
              source_prompt:
                "Professional profile card for TaKrdhoCHeAMMZkkWqdo, cCPVariYGKOZKOVQcHxB",
              source_negative_prompt: null,
              caption: null,
              mime_type: "image/jpeg",
              size: {
                width: 1024,
                height: 1024,
              },
              filename: null,
            },
            data_text:
              "Image:\nURL: https://storage.googleapis.com/public_test_files_7fa6_4277_9ab/fashion/fashion_photo_1.jpg     \nPublic URL: Open Image\nSize: 1024x1024\nMIME Type: image/jpeg\n\nSource Prompt:\nProfessional profile card for TaKrdhoCHeAMMZkkWqdo, cCPVariYGKOZKOVQcHxB\n",
            data_html:
              '<img src="https://storage.googleapis.com/public_test_files_7fa6_4277_9ab/fashion/fashion_photo_1.jpg" class="msg-img">',
            extra: {},
          },
        ],
        outputs: [
          {
            name: "report",
            concept: "Report",
            content_type: null,
            preview: null,
            size: null,
            digest: "PjyhE",
            data: {
              text: "# Candidate Screening Report\n\n## Candidate: TaKrdhoCHeAMMZkkWqdo\ncCPVariYGKOZKOVQcHxB\n\n## Match Score: -4770523658292.34/100\nbLqgIYysxBkMvKfKSiuL\n\n## Strengths\nmatch.strengths: ```\n['94ba']\n```\n\n## Gaps\nmatch.gaps: ```\n['df38']\n```",
            },
            data_text:
              "                                     Candidate Screening Report                                     \n\nCandidate: TaKrdhoCHeAMMZkkWqdo                                                                     \n\ncCPVariYGKOZKOVQcHxB                                                                                \n\nMatch Score: -4770523658292.34/100                                                                  \n\nbLqgIYysxBkMvKfKSiuL                                                                                \n\nStrengths                                                                                           \n\nmatch.strengths: ``` ['94ba']                                                                       \n\n                                                                                                    \n                                                                                                    \n ## Gaps                                                                                            \n match.gaps: ```                                                                                    \n ['df38']                                                                                           \n                                                                                                    \n",
            data_html:
              "# Candidate Screening Report\n\n## Candidate: TaKrdhoCHeAMMZkkWqdo\ncCPVariYGKOZKOVQcHxB\n\n## Match Score: -4770523658292.34/100\nbLqgIYysxBkMvKfKSiuL\n\n## Strengths\nmatch.strengths: ```\n[&#x27;94ba&#x27;]\n```\n\n## Gaps\nmatch.gaps: ```\n[&#x27;df38&#x27;]\n```",
            extra: {},
          },
        ],
      },
      error: null,
      tags: {},
      metrics: {},
    },
  ],
  edges: [
    {
      id: "608b9d8b-669a-41cf-ab49-92aa700c5462:edge_0",
      source: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_0",
      target: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_1",
      kind: "contains",
      label: null,
      source_stuff_digest: null,
      target_stuff_digest: null,
      meta: {},
    },
    {
      id: "608b9d8b-669a-41cf-ab49-92aa700c5462:edge_1",
      source: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_0",
      target: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_2",
      kind: "contains",
      label: null,
      source_stuff_digest: null,
      target_stuff_digest: null,
      meta: {},
    },
    {
      id: "608b9d8b-669a-41cf-ab49-92aa700c5462:edge_2",
      source: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_0",
      target: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_3",
      kind: "contains",
      label: null,
      source_stuff_digest: null,
      target_stuff_digest: null,
      meta: {},
    },
    {
      id: "608b9d8b-669a-41cf-ab49-92aa700c5462:edge_3",
      source: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_3",
      target: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_4",
      kind: "contains",
      label: null,
      source_stuff_digest: null,
      target_stuff_digest: null,
      meta: {},
    },
    {
      id: "608b9d8b-669a-41cf-ab49-92aa700c5462:edge_4",
      source: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_3",
      target: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_5",
      kind: "contains",
      label: null,
      source_stuff_digest: null,
      target_stuff_digest: null,
      meta: {},
    },
    {
      id: "608b9d8b-669a-41cf-ab49-92aa700c5462:edge_5",
      source: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_0",
      target: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_6",
      kind: "contains",
      label: null,
      source_stuff_digest: null,
      target_stuff_digest: null,
      meta: {},
    },
    {
      id: "608b9d8b-669a-41cf-ab49-92aa700c5462:edge_6",
      source: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_0",
      target: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_7",
      kind: "contains",
      label: null,
      source_stuff_digest: null,
      target_stuff_digest: null,
      meta: {},
    },
    {
      id: "608b9d8b-669a-41cf-ab49-92aa700c5462:asm_edge_0",
      source: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_1",
      target: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_2",
      kind: "data",
      label: "pages",
      source_stuff_digest: null,
      target_stuff_digest: null,
      meta: {},
    },
    {
      id: "608b9d8b-669a-41cf-ab49-92aa700c5462:asm_edge_1",
      source: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_2",
      target: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_3",
      kind: "data",
      label: "profile",
      source_stuff_digest: null,
      target_stuff_digest: null,
      meta: {},
    },
    {
      id: "608b9d8b-669a-41cf-ab49-92aa700c5462:asm_edge_2",
      source: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_2",
      target: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_4",
      kind: "data",
      label: "profile",
      source_stuff_digest: null,
      target_stuff_digest: null,
      meta: {},
    },
    {
      id: "608b9d8b-669a-41cf-ab49-92aa700c5462:asm_edge_3",
      source: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_2",
      target: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_5",
      kind: "data",
      label: "profile",
      source_stuff_digest: null,
      target_stuff_digest: null,
      meta: {},
    },
    {
      id: "608b9d8b-669a-41cf-ab49-92aa700c5462:asm_edge_4",
      source: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_2",
      target: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_6",
      kind: "data",
      label: "profile",
      source_stuff_digest: null,
      target_stuff_digest: null,
      meta: {},
    },
    {
      id: "608b9d8b-669a-41cf-ab49-92aa700c5462:asm_edge_5",
      source: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_3",
      target: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_6",
      kind: "data",
      label: "search_result",
      source_stuff_digest: null,
      target_stuff_digest: null,
      meta: {},
    },
    {
      id: "608b9d8b-669a-41cf-ab49-92aa700c5462:asm_edge_6",
      source: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_2",
      target: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_7",
      kind: "data",
      label: "profile",
      source_stuff_digest: null,
      target_stuff_digest: null,
      meta: {},
    },
    {
      id: "608b9d8b-669a-41cf-ab49-92aa700c5462:asm_edge_7",
      source: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_6",
      target: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_7",
      kind: "data",
      label: "match",
      source_stuff_digest: null,
      target_stuff_digest: null,
      meta: {},
    },
    {
      id: "608b9d8b-669a-41cf-ab49-92aa700c5462:asm_edge_8",
      source: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_3",
      target: "608b9d8b-669a-41cf-ab49-92aa700c5462:node_7",
      kind: "data",
      label: "card_image",
      source_stuff_digest: null,
      target_stuff_digest: null,
      meta: {},
    },
  ],
  meta: {},
  pipe_registry: {
    "recruitment.cv_screening": {
      pipe_category: "PipeController",
      type: "PipeSequence",
      code: "cv_screening",
      domain_code: "recruitment",
      description: "Full CV screening pipeline",
      inputs: {
        cv: {
          concept: {
            code: "Document",
            domain_code: "native",
            description: "A document",
            structure_class_name: "DocumentContent",
            refines: null,
          },
          multiplicity: null,
        },
      },
      output: {
        concept: {
          code: "Report",
          domain_code: "recruitment",
          description: "Formatted screening report",
          structure_class_name: "recruitment__Report",
          refines: "native.Text",
        },
        multiplicity: null,
      },
      sequential_sub_pipes: [
        {
          pipe_code: "extract_cv",
          output_name: "pages",
          output_multiplicity: null,
          batch_params: null,
        },
        {
          pipe_code: "analyze_candidate",
          output_name: "profile",
          output_multiplicity: null,
          batch_params: null,
        },
        {
          pipe_code: "enrich_candidate",
          output_name: "search_result",
          output_multiplicity: null,
          batch_params: null,
        },
        {
          pipe_code: "score_match",
          output_name: "match",
          output_multiplicity: null,
          batch_params: null,
        },
        {
          pipe_code: "compose_report",
          output_name: "report",
          output_multiplicity: null,
          batch_params: null,
        },
      ],
    },
    "recruitment.extract_cv": {
      pipe_category: "PipeOperator",
      type: "PipeExtract",
      code: "extract_cv",
      domain_code: "recruitment",
      description: "Extract pages from CV document",
      inputs: {
        cv: {
          concept: {
            code: "Document",
            domain_code: "native",
            description: "A document",
            structure_class_name: "DocumentContent",
            refines: null,
          },
          multiplicity: null,
        },
      },
      output: {
        concept: {
          code: "Page",
          domain_code: "native",
          description:
            "The content of a page of a document, comprising text and linked images and an optional page view image",
          structure_class_name: "PageContent",
          refines: null,
        },
        multiplicity: true,
      },
      extract_choice: null,
      should_caption_images: false,
      max_page_images: null,
      should_include_page_views: false,
      page_views_dpi: null,
      render_js: null,
      include_raw_html: null,
      image_stuff_name: null,
      document_stuff_name: "cv",
    },
    "recruitment.analyze_candidate": {
      pipe_category: "PipeOperator",
      type: "PipeLLM",
      code: "analyze_candidate",
      domain_code: "recruitment",
      description: "Analyze CV to build candidate profile",
      inputs: {
        pages: {
          concept: {
            code: "Page",
            domain_code: "native",
            description:
              "The content of a page of a document, comprising text and linked images and an optional page view image",
            structure_class_name: "PageContent",
            refines: null,
          },
          multiplicity: true,
        },
      },
      output: {
        concept: {
          code: "CandidateProfile",
          domain_code: "recruitment",
          description: "Structured profile of a job candidate",
          structure_class_name: "recruitment__CandidateProfile",
          refines: null,
        },
        multiplicity: null,
      },
      llm_prompt_spec: {
        templating_style: null,
        system_prompt_blueprint: null,
        prompt_blueprint: {
          template: "Analyze this CV and extract a structured candidate profile:\n\n@pages\n",
          templating_style: null,
          category: "llm_prompt",
          extra_context: null,
        },
        user_image_references: null,
        user_document_references: null,
        system_image_references: null,
        system_document_references: null,
      },
      llm_choices: {
        for_text: null,
        for_object: null,
      },
      structuring_method: null,
      output_multiplicity: null,
    },
    "recruitment.enrich_candidate": {
      pipe_category: "PipeController",
      type: "PipeParallel",
      code: "enrich_candidate",
      domain_code: "recruitment",
      description: "Search online and generate profile card in parallel",
      inputs: {
        profile: {
          concept: {
            code: "CandidateProfile",
            domain_code: "recruitment",
            description: "Structured profile of a job candidate",
            structure_class_name: "recruitment__CandidateProfile",
            refines: null,
          },
          multiplicity: null,
        },
      },
      output: {
        concept: {
          code: "SearchResult",
          domain_code: "native",
          description: "A search result with answer and sources",
          structure_class_name: "SearchResultContent",
          refines: null,
        },
        multiplicity: null,
      },
      parallel_sub_pipes: [
        {
          pipe_code: "search_candidate",
          output_name: "search_result",
          output_multiplicity: null,
          batch_params: null,
        },
        {
          pipe_code: "generate_card",
          output_name: "card_image",
          output_multiplicity: null,
          batch_params: null,
        },
      ],
      add_each_output: true,
      combined_output: null,
    },
    "recruitment.search_candidate": {
      pipe_category: "PipeOperator",
      type: "PipeSearch",
      code: "search_candidate",
      domain_code: "recruitment",
      description: "Search for candidate online presence",
      inputs: {
        profile: {
          concept: {
            code: "CandidateProfile",
            domain_code: "recruitment",
            description: "Structured profile of a job candidate",
            structure_class_name: "recruitment__CandidateProfile",
            refines: null,
          },
          multiplicity: null,
        },
      },
      output: {
        concept: {
          code: "SearchResult",
          domain_code: "native",
          description: "A search result with answer and sources",
          structure_class_name: "SearchResultContent",
          refines: null,
        },
        multiplicity: null,
      },
      search_choice: null,
      prompt_blueprint: {
        template: "$profile.name professional background",
        templating_style: null,
        category: "basic",
        extra_context: null,
      },
      include_images_override: null,
      max_results_override: null,
      from_date: null,
      to_date: null,
      include_domains: null,
      exclude_domains: null,
      is_structured_output: false,
    },
    "recruitment.generate_card": {
      pipe_category: "PipeOperator",
      type: "PipeImgGen",
      code: "generate_card",
      domain_code: "recruitment",
      description: "Generate candidate profile card image",
      inputs: {
        profile: {
          concept: {
            code: "CandidateProfile",
            domain_code: "recruitment",
            description: "Structured profile of a job candidate",
            structure_class_name: "recruitment__CandidateProfile",
            refines: null,
          },
          multiplicity: null,
        },
      },
      output: {
        concept: {
          code: "Image",
          domain_code: "native",
          description: "An image",
          structure_class_name: "ImageContent",
          refines: null,
        },
        multiplicity: null,
      },
      img_gen_prompt_blueprint: {
        prompt_blueprint: {
          template: "Professional profile card for $profile.name, $profile.summary",
          templating_style: null,
          category: "img_gen_prompt",
          extra_context: null,
        },
        negative_prompt_blueprint: null,
        image_references: null,
      },
      img_gen_choice: null,
      aspect_ratio: null,
      is_raw: null,
      seed: null,
      background: null,
      output_format: null,
      output_multiplicity: 1,
    },
    "recruitment.score_match": {
      pipe_category: "PipeOperator",
      type: "PipeLLM",
      code: "score_match",
      domain_code: "recruitment",
      description: "Score candidate-role match",
      inputs: {
        profile: {
          concept: {
            code: "CandidateProfile",
            domain_code: "recruitment",
            description: "Structured profile of a job candidate",
            structure_class_name: "recruitment__CandidateProfile",
            refines: null,
          },
          multiplicity: null,
        },
        search_result: {
          concept: {
            code: "SearchResult",
            domain_code: "native",
            description: "A search result with answer and sources",
            structure_class_name: "SearchResultContent",
            refines: null,
          },
          multiplicity: null,
        },
      },
      output: {
        concept: {
          code: "MatchScore",
          domain_code: "recruitment",
          description: "Score for how well a candidate matches a role",
          structure_class_name: "recruitment__MatchScore",
          refines: null,
        },
        multiplicity: null,
      },
      llm_prompt_spec: {
        templating_style: null,
        system_prompt_blueprint: null,
        prompt_blueprint: {
          template:
            "Based on this candidate profile and online research, score how well they match our open role:\n\nProfile:\n@profile\n\nOnline research:\n@search_result\n",
          templating_style: null,
          category: "llm_prompt",
          extra_context: null,
        },
        user_image_references: null,
        user_document_references: null,
        system_image_references: null,
        system_document_references: null,
      },
      llm_choices: {
        for_text: null,
        for_object: null,
      },
      structuring_method: null,
      output_multiplicity: null,
    },
    "recruitment.compose_report": {
      pipe_category: "PipeOperator",
      type: "PipeCompose",
      code: "compose_report",
      domain_code: "recruitment",
      description: "Compose final screening report",
      inputs: {
        profile: {
          concept: {
            code: "CandidateProfile",
            domain_code: "recruitment",
            description: "Structured profile of a job candidate",
            structure_class_name: "recruitment__CandidateProfile",
            refines: null,
          },
          multiplicity: null,
        },
        match: {
          concept: {
            code: "MatchScore",
            domain_code: "recruitment",
            description: "Score for how well a candidate matches a role",
            structure_class_name: "recruitment__MatchScore",
            refines: null,
          },
          multiplicity: null,
        },
        card_image: {
          concept: {
            code: "Image",
            domain_code: "native",
            description: "An image",
            structure_class_name: "ImageContent",
            refines: null,
          },
          multiplicity: null,
        },
      },
      output: {
        concept: {
          code: "Report",
          domain_code: "recruitment",
          description: "Formatted screening report",
          structure_class_name: "recruitment__Report",
          refines: "native.Text",
        },
        multiplicity: null,
      },
      template:
        '# Candidate Screening Report\n\n## Candidate: {{ profile.name|format() }}\n{{ profile.summary|format() }}\n\n## Match Score: {{ match.score|format() }}/100\n{{ match.recommendation|format() }}\n\n## Strengths\n{{ match.strengths|tag("match.strengths") }}\n\n## Gaps\n{{ match.gaps|tag("match.gaps") }}\n',
      templating_style: null,
      category: "basic",
      extra_context: null,
      construct_blueprint: null,
    },
    "translation.route_translation": {
      pipe_category: "PipeController",
      type: "PipeCondition",
      code: "route_translation",
      domain_code: "translation",
      description: "Route based on detected language",
      inputs: {
        classified: {
          concept: {
            code: "ClassifiedText",
            domain_code: "translation",
            description: "Text with detected language",
            structure_class_name: "translation__ClassifiedText",
            refines: null,
          },
          multiplicity: null,
        },
      },
      output: {
        concept: {
          code: "TranslatedText",
          domain_code: "translation",
          description: "Text translated to English",
          structure_class_name: "translation__TranslatedText",
          refines: "native.Text",
        },
        multiplicity: null,
      },
      expression: "{{ classified.language }}",
      outcome_map: {
        english: "passthrough",
        french: "translate_french",
      },
      default_outcome: "translate_other",
      add_alias_from_expression_to: null,
    },
    "document_batch.summarize_page_batch": {
      pipe_category: "PipeController",
      type: "PipeBatch",
      code: "summarize_page_batch",
      domain_code: "document_batch",
      description: "Batch processing for summarize_page",
      inputs: {
        pages: {
          concept: {
            code: "Page",
            domain_code: "native",
            description:
              "The content of a page of a document, comprising text and linked images and an optional page view image",
            structure_class_name: "PageContent",
            refines: null,
          },
          multiplicity: null,
        },
      },
      output: {
        concept: {
          code: "PageSummary",
          domain_code: "document_batch",
          description: "Summary of a single page",
          structure_class_name: "document_batch__PageSummary",
          refines: "native.Text",
        },
        multiplicity: null,
      },
      branch_pipe_code: "summarize_page",
      batch_params: {
        input_list_stuff_name: "pages",
        input_item_stuff_name: "page",
      },
    },
  },
  concept_registry: {
    "recruitment.Report": {
      code: "Report",
      domain_code: "recruitment",
      description: "Formatted screening report",
      structure_class_name: "recruitment__Report",
      refines: "native.Text",
      json_schema: {
        description: "Formatted screening report",
        properties: {
          text: {
            title: "Text",
            type: "string",
          },
        },
        required: ["text"],
        title: "recruitment__Report",
        type: "object",
      },
    },
    "native.Document": {
      code: "Document",
      domain_code: "native",
      description: "A document",
      structure_class_name: "DocumentContent",
      refines: null,
      json_schema: {
        properties: {
          url: {
            description:
              "The document URL: pipelex storage URL, HTTP/HTTPS URL, or base64 data URL",
            title: "Url",
            type: "string",
          },
          public_url: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "The public HTTPS URL of the document",
            title: "Public Url",
          },
          mime_type: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "The MIME type of the document",
            title: "Mime Type",
          },
          filename: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "The original filename of the document",
            title: "Filename",
          },
          title: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "The title of the document or source",
            title: "Title",
          },
          snippet: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "A text snippet or excerpt from the document",
            title: "Snippet",
          },
        },
        required: ["url"],
        title: "DocumentContent",
        type: "object",
      },
    },
    "native.Page": {
      code: "Page",
      domain_code: "native",
      description:
        "The content of a page of a document, comprising text and linked images and an optional page view image",
      structure_class_name: "PageContent",
      refines: null,
      json_schema: {
        $defs: {
          ImageContent: {
            properties: {
              url: {
                description:
                  "The image URL: pipelex storage URL, HTTP/HTTPS URL, or base64 data URL",
                title: "Url",
                type: "string",
              },
              public_url: {
                anyOf: [
                  {
                    type: "string",
                  },
                  {
                    type: "null",
                  },
                ],
                default: null,
                description: "The public URL of the image",
                title: "Public Url",
              },
              source_prompt: {
                anyOf: [
                  {
                    type: "string",
                  },
                  {
                    type: "null",
                  },
                ],
                default: null,
                description: "The source prompt of the image",
                title: "Source Prompt",
              },
              source_negative_prompt: {
                anyOf: [
                  {
                    type: "string",
                  },
                  {
                    type: "null",
                  },
                ],
                default: null,
                description: "The source negative prompt of the image",
                title: "Source Negative Prompt",
              },
              caption: {
                anyOf: [
                  {
                    type: "string",
                  },
                  {
                    type: "null",
                  },
                ],
                default: null,
                description: "The caption of the image",
                title: "Caption",
              },
              mime_type: {
                anyOf: [
                  {
                    type: "string",
                  },
                  {
                    type: "null",
                  },
                ],
                default: null,
                description: "The MIME type of the image",
                title: "Mime Type",
              },
              size: {
                anyOf: [
                  {
                    $ref: "#/$defs/ImageSize",
                  },
                  {
                    type: "null",
                  },
                ],
                default: null,
                description: "The size in pixels (width and height) of the image",
              },
              filename: {
                anyOf: [
                  {
                    type: "string",
                  },
                  {
                    type: "null",
                  },
                ],
                default: null,
                description: "The original filename of the image",
                title: "Filename",
              },
            },
            required: ["url"],
            title: "ImageContent",
            type: "object",
          },
          ImageSize: {
            properties: {
              width: {
                title: "Width",
                type: "integer",
              },
              height: {
                title: "Height",
                type: "integer",
              },
            },
            required: ["width", "height"],
            title: "ImageSize",
            type: "object",
          },
          TextAndImagesContent: {
            properties: {
              text: {
                anyOf: [
                  {
                    $ref: "#/$defs/TextContent",
                  },
                  {
                    type: "null",
                  },
                ],
                default: null,
                description: "A text content",
              },
              images: {
                anyOf: [
                  {
                    items: {
                      $ref: "#/$defs/ImageContent",
                    },
                    type: "array",
                  },
                  {
                    type: "null",
                  },
                ],
                default: null,
                description: "A list of images that were extracted from the text",
                title: "Images",
              },
              raw_html: {
                anyOf: [
                  {
                    type: "string",
                  },
                  {
                    type: "null",
                  },
                ],
                default: null,
                description: "The raw HTML of the fetched page, if requested",
                title: "Raw Html",
              },
            },
            title: "TextAndImagesContent",
            type: "object",
          },
          TextContent: {
            properties: {
              text: {
                title: "Text",
                type: "string",
              },
            },
            required: ["text"],
            title: "TextContent",
            type: "object",
          },
        },
        properties: {
          text_and_images: {
            $ref: "#/$defs/TextAndImagesContent",
            description: "The text and images content extracted from the page",
          },
          page_view: {
            anyOf: [
              {
                $ref: "#/$defs/ImageContent",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "The screenshot of the page",
          },
        },
        required: ["text_and_images"],
        title: "PageContent",
        type: "object",
      },
    },
    "recruitment.CandidateProfile": {
      code: "CandidateProfile",
      domain_code: "recruitment",
      description: "Structured profile of a job candidate",
      structure_class_name: "recruitment__CandidateProfile",
      refines: null,
      json_schema: {
        description: "Structured profile of a job candidate",
        properties: {
          name: {
            description: "Full name",
            title: "Name",
            type: "string",
          },
          skills: {
            anyOf: [
              {
                items: {},
                type: "array",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "Key skills",
            title: "Skills",
          },
          experience_years: {
            anyOf: [
              {
                type: "integer",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "Years of experience",
            title: "Experience Years",
          },
          summary: {
            description: "Brief profile summary",
            title: "Summary",
            type: "string",
          },
        },
        required: ["name", "summary"],
        title: "recruitment__CandidateProfile",
        type: "object",
      },
    },
    "native.SearchResult": {
      code: "SearchResult",
      domain_code: "native",
      description: "A search result with answer and sources",
      structure_class_name: "SearchResultContent",
      refines: null,
      json_schema: {
        $defs: {
          DocumentContent: {
            properties: {
              url: {
                description:
                  "The document URL: pipelex storage URL, HTTP/HTTPS URL, or base64 data URL",
                title: "Url",
                type: "string",
              },
              public_url: {
                anyOf: [
                  {
                    type: "string",
                  },
                  {
                    type: "null",
                  },
                ],
                default: null,
                description: "The public HTTPS URL of the document",
                title: "Public Url",
              },
              mime_type: {
                anyOf: [
                  {
                    type: "string",
                  },
                  {
                    type: "null",
                  },
                ],
                default: null,
                description: "The MIME type of the document",
                title: "Mime Type",
              },
              filename: {
                anyOf: [
                  {
                    type: "string",
                  },
                  {
                    type: "null",
                  },
                ],
                default: null,
                description: "The original filename of the document",
                title: "Filename",
              },
              title: {
                anyOf: [
                  {
                    type: "string",
                  },
                  {
                    type: "null",
                  },
                ],
                default: null,
                description: "The title of the document or source",
                title: "Title",
              },
              snippet: {
                anyOf: [
                  {
                    type: "string",
                  },
                  {
                    type: "null",
                  },
                ],
                default: null,
                description: "A text snippet or excerpt from the document",
                title: "Snippet",
              },
            },
            required: ["url"],
            title: "DocumentContent",
            type: "object",
          },
        },
        description: "Represents the result of a search query with an answer and list of sources.",
        properties: {
          answer: {
            title: "Answer",
            type: "string",
          },
          sources: {
            items: {
              $ref: "#/$defs/DocumentContent",
            },
            title: "Sources",
            type: "array",
          },
        },
        required: ["answer"],
        title: "SearchResultContent",
        type: "object",
      },
    },
    "native.Image": {
      code: "Image",
      domain_code: "native",
      description: "An image",
      structure_class_name: "ImageContent",
      refines: null,
      json_schema: {
        $defs: {
          ImageSize: {
            properties: {
              width: {
                title: "Width",
                type: "integer",
              },
              height: {
                title: "Height",
                type: "integer",
              },
            },
            required: ["width", "height"],
            title: "ImageSize",
            type: "object",
          },
        },
        properties: {
          url: {
            description: "The image URL: pipelex storage URL, HTTP/HTTPS URL, or base64 data URL",
            title: "Url",
            type: "string",
          },
          public_url: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "The public URL of the image",
            title: "Public Url",
          },
          source_prompt: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "The source prompt of the image",
            title: "Source Prompt",
          },
          source_negative_prompt: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "The source negative prompt of the image",
            title: "Source Negative Prompt",
          },
          caption: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "The caption of the image",
            title: "Caption",
          },
          mime_type: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "The MIME type of the image",
            title: "Mime Type",
          },
          size: {
            anyOf: [
              {
                $ref: "#/$defs/ImageSize",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "The size in pixels (width and height) of the image",
          },
          filename: {
            anyOf: [
              {
                type: "string",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "The original filename of the image",
            title: "Filename",
          },
        },
        required: ["url"],
        title: "ImageContent",
        type: "object",
      },
    },
    "recruitment.MatchScore": {
      code: "MatchScore",
      domain_code: "recruitment",
      description: "Score for how well a candidate matches a role",
      structure_class_name: "recruitment__MatchScore",
      refines: null,
      json_schema: {
        description: "Score for how well a candidate matches a role",
        properties: {
          score: {
            description: "Match score 0-100",
            title: "Score",
            type: "number",
          },
          strengths: {
            anyOf: [
              {
                items: {},
                type: "array",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "Key strengths",
            title: "Strengths",
          },
          gaps: {
            anyOf: [
              {
                items: {},
                type: "array",
              },
              {
                type: "null",
              },
            ],
            default: null,
            description: "Skill gaps",
            title: "Gaps",
          },
          recommendation: {
            description: "Hiring recommendation",
            title: "Recommendation",
            type: "string",
          },
        },
        required: ["score", "recommendation"],
        title: "recruitment__MatchScore",
        type: "object",
      },
    },
    "translation.TranslatedText": {
      code: "TranslatedText",
      domain_code: "translation",
      description: "Text translated to English",
      structure_class_name: "translation__TranslatedText",
      refines: "native.Text",
      json_schema: {
        description: "Text translated to English",
        properties: {
          text: {
            title: "Text",
            type: "string",
          },
        },
        required: ["text"],
        title: "translation__TranslatedText",
        type: "object",
      },
    },
    "native.Text": {
      code: "Text",
      domain_code: "native",
      description: "A text",
      structure_class_name: "TextContent",
      refines: null,
      json_schema: {
        properties: {
          text: {
            title: "Text",
            type: "string",
          },
        },
        required: ["text"],
        title: "TextContent",
        type: "object",
      },
    },
    "translation.ClassifiedText": {
      code: "ClassifiedText",
      domain_code: "translation",
      description: "Text with detected language",
      structure_class_name: "translation__ClassifiedText",
      refines: null,
      json_schema: {
        description: "Text with detected language",
        properties: {
          text: {
            description: "The original text",
            title: "Text",
            type: "string",
          },
          language: {
            description: "Detected language code",
            enum: ["english", "french", "spanish", "german", "other"],
            title: "Language",
            type: "string",
          },
        },
        required: ["text", "language"],
        title: "translation__ClassifiedText",
        type: "object",
      },
    },
    "document_batch.DocumentSummary": {
      code: "DocumentSummary",
      domain_code: "document_batch",
      description: "Combined summary of all pages",
      structure_class_name: "document_batch__DocumentSummary",
      refines: "native.Text",
      json_schema: {
        description: "Combined summary of all pages",
        properties: {
          text: {
            title: "Text",
            type: "string",
          },
        },
        required: ["text"],
        title: "document_batch__DocumentSummary",
        type: "object",
      },
    },
    "document_batch.PageSummary": {
      code: "PageSummary",
      domain_code: "document_batch",
      description: "Summary of a single page",
      structure_class_name: "document_batch__PageSummary",
      refines: "native.Text",
      json_schema: {
        description: "Summary of a single page",
        properties: {
          text: {
            title: "Text",
            type: "string",
          },
        },
        required: ["text"],
        title: "document_batch__PageSummary",
        type: "object",
      },
    },
  },
} as any as GraphSpec;
