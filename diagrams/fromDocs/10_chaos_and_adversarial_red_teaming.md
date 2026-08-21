# Chaos Resilience & Adversarial Red-Teaming Architecture

This diagram illustrates the resilience safety nets and continuous background stress-testing architecture documented in `docs/WORKFLOWS_AND_LEARNINGS.md` (`scripts/adversarial_agent.js`, `tests/test_failure_modes_and_chaos.js`).

```mermaid
graph TD
    subgraph "Adversarial Red-Teaming Agent (scripts/adversarial_agent.js)"
        ADV["Continuous Red-Team Loop<br/>(Simulates corrupted BOQs, missing SKUs & extreme configurations)"]
        MUTATE["Mutation Engine<br/>• Strip mandatory fan kits<br/>• Inject cross-generation CPUs<br/>• Mix x4 and x8 DDR5 memory<br/>• Omit RAID cache batteries<br/>• Overload PCIe riser lanes"]
    end

    subgraph "Failure Injection & Chaos Scenarios"
        C1["Chaos 1: Cloud NotebookLM Outage<br/>(Simulates CLI failure / offline network)"]
        C2["Chaos 2: Gemini 429 Quota Exhaustion<br/>(Simulates entire API key pool depleted)"]
        C3["Chaos 3: Corrupted Knowledge Deltas<br/>(Simulates malformed JSON on disk)"]
        C4["Chaos 4: Frankenstein Chaos BOQ<br/>(Simulates multi-violation RFPs)"]
        C5["Chaos 5: Fractional Division Anomaly<br/>(Simulates odd item distribution)"]
        C6["Chaos 6: File System Interruption<br/>(Simulates mid-write process crashes)"]
    end

    subgraph "Resilience Fallbacks & Safety Nets"
        F1["Local Dual-Layer RAG Search<br/>(Seamless instant fallback without throwing)"]
        F2["FIFO Key Queue Quota Lockout Cooldown<br/>(Calculates seconds until UTC rollover)"]
        F3["Generic Safe Delta Ingestion Fallback"]
        F4["Mandatory HITL Review Trigger (Score < 0.75)"]
        F5["Improbability Index Human Confirmation Modal"]
        F6["safeWriteJsonAtomic() Temporary File Swapping"]
    end

    subgraph "Observability & Telemetry Verification"
        LEDGER["pipeline_telemetry.json<br/>Logs failure modes, fallback usage & confidence scores"]
        BENCHMARK["Automated Regression Benchmark<br/>(test_boq_eval_benchmarks.js)"]
    end

    %% Flows
    ADV --> MUTATE
    MUTATE --> C1 & C2 & C3 & C4 & C5 & C6
    C1 --> F1
    C2 --> F2
    C3 --> F3
    C4 --> F4
    C5 --> F5
    C6 --> F6
    F1 & F2 & F3 & F4 & F5 & F6 --> LEDGER
    LEDGER --> BENCHMARK
```
