# Keystone Architecture Diagram

```mermaid
flowchart LR
    A[WhatsApp Chats] --> B[Ingest Layer]
    C[Email Threads] --> B
    D[Site Notes / PDFs / Meeting Text] --> B
    E[Manual Upload / Paste] --> B

    B --> F[Normalize & Parse Messages]
    F --> G[Project Message Store]
    G --> H[AI Analysis Engine\nGroq + Structured Extraction]

    H --> I[Tasks / Actions]
    H --> J[Decisions & Approvals]
    H --> K[Conflicts / Contradictions]
    H --> L[Project Digest & Summary]
    H --> M[Searchable Project Memory]

    G --> N[Dashboard]
    I --> N
    J --> N
    K --> N
    L --> N
    M --> N

    N --> O[Project Team]
    O --> P[Review / Approve / Resolve]
    P --> G
```

## What this system does
- Captures communication from multiple sources
- Converts raw updates into structured project data
- Extracts tasks, deadlines, approvals, and contradictions
- Stores all history in a searchable memory layer
- Helps the team review and act on the latest project status quickly

## Demo note
This diagram shows the real architecture of the app in a way that is easy to present during a project demo without exposing the underlying implementation complexity.
