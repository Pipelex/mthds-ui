import type { PipeCardData } from "../../pipeCardTypes";

export const manyInputs: PipeCardData = {
  pipeCode: "aggregate_all_sources",
  pipeType: "PipeLLM",
  description: "Combine data from multiple sources into a unified analysis",
  status: "succeeded",
  inputs: Array.from({ length: 50 }, (_, i) => ({
    name: `source_${String(i + 1).padStart(2, "0")}`,
    concept: i % 3 === 0 ? "Document" : i % 3 === 1 ? "Text" : "SearchResult",
  })),
  outputs: [{ name: "unified_analysis", concept: "AnalysisReport" }],
};

export const longOutputName: PipeCardData = {
  pipeCode: "extract_metadata",
  pipeType: "PipeExtract",
  description: "Extract document metadata",
  status: "succeeded",
  inputs: [{ name: "document", concept: "Document" }],
  outputs: [
    {
      name: "extracted_comprehensive_metadata_including_author_title_date_keywords_abstract_references_and_all_supplementary_information_fields_that_were_found_in_the_original_document_structure",
      concept: "ComprehensiveDocumentMetadataWithAllFieldsIncludingNestedStructuresAndArrays",
    },
  ],
};

export const longDescription: PipeCardData = {
  pipeCode: "analyze_document",
  pipeType: "PipeLLM",
  description:
    "This pipe performs an extremely thorough and comprehensive analysis of the provided document, " +
    "examining every section in detail including but not limited to: executive summary evaluation, " +
    "methodology assessment, data quality verification, statistical significance testing, " +
    "cross-referencing with known literature and established research findings in the field, " +
    "identification of potential biases and limitations, extraction of key findings and insights, " +
    "generation of actionable recommendations based on the analysis results, and finally " +
    "a complete quality assurance check to ensure all findings are properly supported by evidence " +
    "from the source material. The analysis covers multiple dimensions including linguistic quality, " +
    "factual accuracy, logical coherence, and practical applicability of the conclusions drawn.",
  status: "running",
  inputs: [
    { name: "document", concept: "Document" },
    { name: "analysis_config", concept: "AnalysisConfiguration" },
  ],
  outputs: [{ name: "report", concept: "DetailedAnalysisReport" }],
};

export const longPipeCode: PipeCardData = {
  pipeCode:
    "extract_and_normalize_all_candidate_information_from_multiple_document_sources_with_validation",
  pipeType: "PipeFunc",
  description: "Normalize candidate data from various sources",
  status: "succeeded",
  inputs: [{ name: "raw_data", concept: "RawCandidateData" }],
  outputs: [{ name: "normalized", concept: "NormalizedCandidateData" }],
};

export const everythingAtOnce: PipeCardData = {
  pipeCode:
    "ultra_comprehensive_multi_source_document_analysis_and_cross_reference_validation_pipeline_step",
  pipeType: "PipeLLM",
  description:
    "This pipe performs an extremely thorough and comprehensive analysis of the provided documents, " +
    "examining every section in detail including executive summary evaluation, methodology assessment, " +
    "data quality verification, statistical significance testing, cross-referencing with known " +
    "literature and established research findings, identification of biases, extraction of insights, " +
    "generation of recommendations, and a complete quality assurance check ensuring all findings " +
    "are properly supported by evidence from the source material across all input documents.",
  status: "failed",
  inputs: [
    ...Array.from({ length: 12 }, (_, i) => ({
      name: `source_document_collection_${String(i + 1).padStart(2, "0")}`,
      concept: "ComprehensiveDocumentCollection",
    })),
    { name: "analysis_configuration_with_extended_options", concept: "AnalysisConfiguration" },
    {
      name: "reference_database_connection_parameters",
      concept: "DatabaseConnectionConfiguration",
    },
    { name: "output_formatting_preferences", concept: "FormattingPreferences" },
  ],
  outputs: [
    {
      name: "comprehensive_analysis_report_with_all_cross_references_and_validation_results_included",
      concept: "ComprehensiveMultiSourceAnalysisReportWithValidation",
    },
  ],
};

export const minimal: PipeCardData = {
  pipeCode: "passthrough",
  pipeType: "PipeFunc",
  description: "Pass input through unchanged",
  status: "succeeded",
  inputs: [{ name: "input", concept: "Text" }],
  outputs: [{ name: "output", concept: "Text" }],
};

export const longInputNames: PipeCardData = {
  pipeCode: "merge_profiles",
  pipeType: "PipeCompose",
  description: "Merge multiple candidate profiles into a unified view",
  status: "succeeded",
  inputs: [
    {
      name: "primary_candidate_professional_experience_history",
      concept: "ProfessionalExperienceTimeline",
    },
    {
      name: "secondary_educational_background_and_certifications",
      concept: "EducationalRecord",
    },
    { name: "skills", concept: "Text" },
  ],
  outputs: [{ name: "merged_profile", concept: "UnifiedCandidateProfile" }],
};

export const truncShortBoth: PipeCardData = {
  pipeCode: "step_a",
  pipeType: "PipeFunc",
  description: "Short name and concept — pill fits naturally",
  status: "succeeded",
  inputs: [
    { name: "data", concept: "Text" },
    { name: "config", concept: "JSON" },
  ],
  outputs: [{ name: "result", concept: "Text" }],
};

export const truncMediumNameLongConcept: PipeCardData = {
  pipeCode: "step_b",
  pipeType: "PipeLLM",
  description: "Medium name, long concept — concept truncates first",
  status: "succeeded",
  inputs: [
    { name: "user_profile", concept: "ComprehensiveUserProfileWithPreferences" },
    { name: "search_query", concept: "NaturalLanguageSearchQueryWithFilters" },
  ],
  outputs: [{ name: "response", concept: "StructuredAnalysisResponse" }],
};

export const truncLongNameShortConcept: PipeCardData = {
  pipeCode: "step_c",
  pipeType: "PipeExtract",
  description: "Long name, short concept — concept drops, name truncates",
  status: "succeeded",
  inputs: [
    { name: "primary_candidate_professional_experience_history_document", concept: "Doc" },
    { name: "secondary_educational_background_certifications_list", concept: "Text" },
  ],
  outputs: [{ name: "extracted_normalized_candidate_data_output", concept: "JSON" }],
};

export const truncLongBoth: PipeCardData = {
  pipeCode: "step_d",
  pipeType: "PipeCompose",
  description: "Both long — concept drops entirely, name truncates with ellipsis",
  status: "succeeded",
  inputs: [
    {
      name: "comprehensive_multi_source_document_analysis_input_collection",
      concept: "ComprehensiveDocumentCollectionWithMetadata",
    },
    {
      name: "reference_database_connection_parameters_and_credentials",
      concept: "DatabaseConnectionConfigurationExtended",
    },
  ],
  outputs: [
    {
      name: "final_validated_cross_referenced_analysis_report_output",
      concept: "ComprehensiveMultiSourceAnalysisReport",
    },
  ],
};

export const truncMixedSizes: PipeCardData = {
  pipeCode: "step_e",
  pipeType: "PipeSearch",
  description: "Mixed sizes — each pill should be as wide as its content",
  status: "running",
  inputs: [
    { name: "q", concept: "Text" },
    { name: "user_profile_data", concept: "UserProfile" },
    {
      name: "extremely_long_variable_name_that_will_definitely_need_truncation",
      concept: "Config",
    },
  ],
  outputs: [{ name: "results", concept: "SearchResult" }],
};
