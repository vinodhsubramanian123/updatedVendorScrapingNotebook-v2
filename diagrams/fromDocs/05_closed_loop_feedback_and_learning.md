# Closed-Loop Autonomous Feedback & Knowledge Learning Lifecycle

This diagram demonstrates how the system captures errors from human review and HPE Partner Portal validation rejections, learns new hardware rules, and syncs them bi-directionally to Google NotebookLM (`scripts/lib/feedback_loop.js`, `scripts/lib/knowledge_sync.js`, `.agents/skills/knowledge-sync-skill/SKILL.md`).

```mermaid
graph TD
    subgraph "Validation Trial & Error Detection"
        PORTAL["HPE Partner Portal / OCA UI Trial<br/>(Presales Engineer tests BOM configuration)"]
        REJECT["Portal Rejection / CLIC Error<br/><i>e.g. 'ERR_STORAGE_BATTERY: MR416i-o requires P01366-B21'</i>"]
        HITL["Human-in-the-Loop Feedback Drawer<br/>(POST /api/feedback — User submits error message)"]
    end

    subgraph "Feedback Processing & Rule Ingestion Engine"
        F_PROCESS["processPortalFeedback() Engine<br/>(scripts/lib/feedback_loop.js)"]
        REGEX_EXTRACT["Error Pattern & SKU Extractor<br/>• Affected SKU: P55415-B21<br/>• Required Dependency SKU: P01366-B21<br/>• Error Classification: PERMANENT_PHYSICAL_DEPENDENCY"]
        TAXONOMY["Scope Taxonomy Classifier<br/>1. UNIVERSAL_VENDOR (All HPE servers)<br/>2. FAMILY_GEN (e.g. ProLiant Gen12)<br/>3. CHASSIS_SPECIFIC (e.g. DL380 8SFF)"]
    end

    subgraph "Atomic Persistence & Master Knowledge Registry"
        SAFE_WRITE["safeWriteJsonAtomic()<br/>(Transactional JSON write)"]
        CHASSIS_DELTAS["Chassis Local History<br/>outputs/{Chassis}/history/catalog_deltas.json"]
        MASTER_REGISTRY["Master Knowledge Registry<br/>outputs/history/master_knowledge_registry.json"]
    end

    subgraph "Dual RAG Knowledge Synchronization"
        DRIFT["inspectKnowledgeDrift()<br/>(Compares SHA-256 hashes & detected deltas)"]
        PAYLOAD_BUILD["generateNotebookSyncPayload()<br/>(Clean Markdown Charter Note with Discontinued & Diffs)"]
        NLM_DELETE["Delete Stale Source via lastSyncedSourceId"]
        NLM_UPLOAD["nlm CLI: Upload Fresh Markdown Charter Note to NotebookLM"]
        LOCAL_INDEX["Local RAG Dual-Layer Search Index<br/>(scripts/lib/local_rag_search.js)"]
    end

    subgraph "Next BOQ Evaluation Run (Self-Healing Rule Application)"
        EVAL["Deterministic 7-Aspect Math Engine<br/>(scripts/lib/boq_evaluator.js)"]
        AUTO_FIX["Autonomous Pre-Check Injection<br/>✅ P01366-B21 auto-injected before customer sees error!"]
    end

    %% Flows
    PORTAL --> REJECT
    REJECT --> HITL
    HITL --> F_PROCESS
    F_PROCESS --> REGEX_EXTRACT
    REGEX_EXTRACT --> TAXONOMY
    TAXONOMY --> SAFE_WRITE
    SAFE_WRITE --> CHASSIS_DELTAS
    CHASSIS_DELTAS --> MASTER_REGISTRY
    MASTER_REGISTRY --> DRIFT
    DRIFT --> PAYLOAD_BUILD
    PAYLOAD_BUILD --> NLM_DELETE --> NLM_UPLOAD
    PAYLOAD_BUILD --> LOCAL_INDEX
    MASTER_REGISTRY --> EVAL
    EVAL --> AUTO_FIX
```
