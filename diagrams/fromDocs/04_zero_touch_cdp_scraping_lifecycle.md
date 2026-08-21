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

    state "Phase 2: Automated CDP Attachment & DOM Traversal" as P2 {
        PageLoadedInCDP --> ConnectCDPPort9222 : Scraper connects to http://127.0.0.1:9222/json
        ConnectCDPPort9222 --> AutoDismissModals : Smart Auto-Accept (Dismiss Partner Portal Modals)
        AutoDismissModals --> DeepDOMExtraction : Recursively traverse Category & Subcategory tables
        DeepDOMExtraction --> ExtractAttributes : Extract SKU, Description, Option Type, List Price, Constraints
    }

    state "Phase 3: Staging Isolation & Pre-Commit Validation" as P3 {
        ExtractAttributes --> WriteToStagingDir : Save raw scrape to /outputs/temp/staging_{chassis}/
        WriteToStagingDir --> SchemaValidation : Validate against CatalogMasterSchema (Zod)
        SchemaValidation --> FormatAudit : Enforce clean regex (isValidHpeSKU, numeric Current Qty)
        FormatAudit --> PriceTrailDiff : Calculate SHA-256 Checksum Diff & Price History Trails
    }

    state "Phase 4: 100% Quality Certification Gate" as P4 {
        PriceTrailDiff --> RunPortfolioAudit : Execute 15-check Excel & JSON audit (verify_all.js)
        state check_gate <<choice>>
        RunPortfolioAudit --> check_gate
        check_gate --> AbortRollback : ❌ Any validation failure
        check_gate --> AtomicPromotion : ✅ 100% PASS (Zero warnings/errors)
    }

    state "Phase 5: Master Promotion & Cloud RAG Sync" as P5 {
        AtomicPromotion --> SafeWriteJsonAtomic : safeWriteJsonAtomic() -> outputs/{Family}/{Gen}/{Model}/
        SafeWriteJsonAtomic --> GenerateMasterExcel : Generate 19-sheet Master Excel Workbook
        GenerateMasterExcel --> KnowledgeSync : Build Markdown Charter & Upload to Google NotebookLM
        KnowledgeSync --> TelemetryLedger : Log Action Ledger & Benchmark KPIs
    }

    AbortRollback --> [*] : Staging cleaned up, production outputs protected
    TelemetryLedger --> [*] : Certified Scrape Complete
```
