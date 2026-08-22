# Zero-Touch CDP Scraping & Staging Isolation Lifecycle

This diagram illustrates the **Zero-Touch Scraping Lifecycle** (`scripts/lib/cdp.js`, `scripts/lib/dom_extract.js`, `scripts/lib/navigate_oca.js`, `.agents/skills/oca-catalog-scraper/SKILL.md`).

```mermaid
stateDiagram-v2
    [*] --> StandaloneChromeLaunch : 1. User launches persistent Chrome with remote debugging on port 9222

    state "Phase 1: Human SSO & Portal Entry (Zero-Touch Boundary)" as P1 {
        StandaloneChromeLaunch --> HumanSSOLogin : Opens partner.hpe.com
        HumanSSOLogin --> NavigatesToOCA : User completes 2FA / SSO & clicks OCA link
        NavigatesToOCA --> PageLoadedInCDP : OCA WebLogic Configuration page loaded
    }

    state "Phase 2: Automated CDP Attachment & DOM Traversal (Stages 1-5)" as P2 {
        PageLoadedInCDP --> ConnectCDPPort9222 : Step 1: getOCATarget() (Prioritizes real OCA URLs, excludes localhost)
        ConnectCDPPort9222 --> SolutionRootNav : Step 2: Solution Root Discovery & Pre-flight
        SolutionRootNav --> CategoryDiscovery : Step 3: Priority-ordered Node Title & Menu Activation
        CategoryDiscovery --> AdaptiveExpansion : Step 4: Full Page Section Expansion (Adaptive Threshold)
        AdaptiveExpansion --> DeepDOMExtraction : Step 5: DOM & Row Scraping (Hardware, Services, Headers)
    }

    state "Phase 3: Staging Isolation & Post-Flight Audit (Stages 6-8)" as P3 {
        DeepDOMExtraction --> WriteToStagingDir : Save raw scrape to /outputs/temp/staging_{chassis}_{ts}/
        WriteToStagingDir --> RulesEngineAndTSV : Step 6: Aspect Rules Parsing & TSV Intermediates
        RulesEngineAndTSV --> BuildMasterExcel : Step 7: Build Catalog JSON & 15-20 Sheet Master Excel
        BuildMasterExcel --> StagingQualityAudit : Step 8: 7-Check Quality Audit Gate (verify_excel_tally.js)
    }

    state "Phase 4: 100% Quality Certification Gate" as P4 {
        state check_gate <<choice>>
        StagingQualityAudit --> check_gate
        check_gate --> AbortRollback : ❌ Any validation failure (Mark failed_staging_*, Live 100% Intact)
        check_gate --> AtomicPromotion : ✅ 100% PASS (Zero warnings/errors)
    }

    state "Phase 5: Master Promotion & Cloud RAG Sync (Stages 9-10)" as P5 {
        AtomicPromotion --> PromoteLiveWorkspace : Step 9: promoteStagingDirectory() with .bak Rollback Guard
        PromoteLiveWorkspace --> KnowledgeSync : Build Markdown Payload & Sync to Google NotebookLM
        KnowledgeSync --> RegistryAndLedgerSync : Step 10: Fail-Hard Portfolio Registry & Action Ledger Sync
        RegistryAndLedgerSync --> TelemetryLedger : Log Telemetry Metrics & Emit 100% Complete SSE
    }

    AbortRollback --> [*] : Staging isolated/cleaned, production outputs protected
    TelemetryLedger --> [*] : Certified Scrape Complete
```
