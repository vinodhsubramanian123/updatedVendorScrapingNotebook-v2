/**
 * /dashboard/src/components/index.js — Master Component Registry
 * 
 * Centralized export point for all domain components in the dashboard.
 */

// Layout Components
export { default as Header } from './Header';
export { default as SettingsDrawer } from './SettingsDrawer';
export { default as GlobalLoadingState } from './GlobalLoadingState';

// BOQ Engine Components
export { default as BoqUploader } from './BoqUploader';
export { default as ResolutionMatrix } from './ResolutionMatrix';
export { default as WorkflowStepper } from './WorkflowStepper';
export { default as WorkloadDnaCard } from './WorkloadDnaCard';
export { default as AmbiguityInbox } from './AmbiguityInbox';

// Catalog & Rule Components
export { default as CatalogExplorer } from './CatalogExplorer';
export { default as CatalogOverviewCard } from './CatalogOverviewCard';
export { default as ChassisSyncSummaryView } from './ChassisSyncSummaryView';
export { default as PriceAnalyticsCard } from './PriceAnalyticsCard';
export { default as RuleLogicVisualizer } from './RuleLogicVisualizer';
export { default as ConflictGraphInspector } from './ConflictGraphInspector';
export { default as RulesConfiguration } from './RulesConfiguration';

// Scraper Components
export { default as ScraperTriggerCard } from './ScraperTriggerCard';
export { default as VendorScraperProgress } from './VendorScraperProgress';
export { default as ScrapingHistorySection } from './ScrapingHistorySection';
export { default as CdpHealthBadge } from './CdpHealthBadge';
export { default as TaskStatusBadge } from './TaskStatusBadge';

// RAG & AI Components
export { default as NotebookRagDrawer } from './NotebookRagDrawer';
export { default as NotebookLmHealthBadge } from './NotebookLmHealthBadge';

// Telemetry & Observability Components
export { default as TelemetryCard } from './TelemetryCard';
export { default as TaskHistoryCard } from './TaskHistoryCard';
export { default as ExportHistoryCard } from './ExportHistoryCard';
export { default as ArtifactInspector } from './ArtifactInspector';
export { default as TraceabilityInspector } from './TraceabilityInspector';

// Reconciliation & Feedback Components
export { default as PartnerReconciliationView } from './PartnerReconciliationView';
export { default as VendorBomVerificationModal } from './VendorBomVerificationModal';
export { default as FeedbackModal } from './FeedbackModal';
export { default as UserFeedbackDrawer } from './UserFeedbackDrawer';
