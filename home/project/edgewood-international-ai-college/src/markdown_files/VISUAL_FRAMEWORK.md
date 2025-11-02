
# Manda Network - Visual Framework

This document provides a visual representation of the application's architecture, user flows, and component interactions using Mermaid diagrams.

## High-Level Architecture

```mermaid
graph TD
    subgraph CLIENT [Client (Next.js/React)]
        A[User Interface] --> B{React Components};
        B --> C[ShadCN UI];
        B --> D[Tailwind CSS];
        A --> E[Next.js App Router];
    end

    subgraph SERVER [Server-Side (Next.js)]
        E --> F[Server Components];
        E --> G[Server Actions];
    end

    subgraph BACKEND [Backend Services]
        H[Firebase Auth]
        I[Firebase Realtime DB]
        J[Genkit AI Flows]
        K[Firebase Storage]
    end

    G --> H;
    G --> I;
    G --> J;
    G --> K;
    
    subgraph AI_MODELS [AI/ML (Genkit)]
        J --> L[Google AI Platform];
    end

    style CLIENT fill:#D6EAF8,stroke:#333,stroke-width:2px
    style SERVER fill:#D1F2EB,stroke:#333,stroke-width:2px
    style BACKEND fill:#FCF3CF,stroke:#333,stroke-width:2px
    style AI_MODELS fill:#FDEDEC,stroke:#333,stroke-width:2px
```

## User Onboarding Flow

This diagram illustrates the logic for the new user tutorial.

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant OnboardingComponent
    participant FirebaseDB

    User->>Browser: Logs in for the first time
    Browser->>OnboardingComponent: Mounts component
    OnboardingComponent->>FirebaseDB: getHeroData() for 'onboardingEnabled' setting
    FirebaseDB-->>OnboardingComponent: Returns 'true'
    OnboardingComponent->>Browser: Check localStorage for 'onboarding_completed'
    alt 'onboarding_completed' not found
        Browser-->>OnboardingComponent: null
        OnboardingComponent->>User: Show Onboarding Dialog (Step 1)
        User->>OnboardingComponent: Clicks "Next"
        OnboardingComponent->>User: Show Onboarding Dialog (Step 2)
        User->>OnboardingComponent: Clicks "Finish"
        OnboardingComponent->>Browser: Set localStorage 'onboarding_completed' to 'true'
        OnboardingComponent->>User: Close Dialog
    else 'onboarding_completed' is 'true'
        Browser-->>OnboardingComponent: 'true'
        OnboardingComponent->>User: Do nothing (component returns null)
    end
```

## Security Visual Framework

This diagram illustrates the security layers, from user authentication to database access rules.

```mermaid
graph LR
    A[User] -->|HTTPS| B(Next.js Frontend);

    subgraph FIREBASE [Firebase]
        C[Firebase Authentication]
        D[Firebase Realtime DB]
        E[Database Security Rules]
    end

    B -->|Login/Signup| C;
    C -->|"Auth Token (JWT)"| B;
    B -->|"Server Actions"| F[Next.js Backend];
    F -->|"Authenticated Requests"| D;
    D -- Enforces --> E;
    E -- Defines Access --> D;

    style FIREBASE fill:#FDEBD0,stroke:#F39C12,stroke-width:2px
```

## Database Framework

This diagram shows a more detailed version of the Firebase Realtime Database schema and relationships.

```mermaid
erDiagram
    USERS ||--o{ USER_COURSES : "has"
    USERS ||--o{ SUBMISSIONS : "submits"
    USERS ||--o{ HACKATHON_SUBMISSIONS : "submits"
    USERS ||--o{ LEARNING_GOALS : "has"
    USERS ||--o{ ACHIEVEMENTS : "earns"
    USERS }o--|| ORGANIZATIONS : "is member of"

    COURSES ||--o{ USER_COURSES : "is subject of"
    COURSES ||--o{ MODULES : "contains"
    COURSES ||--o{ EXAM_QUESTIONS : "has"
    COURSES ||--o{ PROJECT : "has"
    
    MODULES ||--o{ LESSONS : "contains"
    
    HACKATHONS ||--o{ HACKATHON_SUBMISSIONS : "has"
    
    USERS {
        string uid PK
        string displayName
        string email
        string organizationId FK
    }
    
    USER_COURSES {
        string userId PK
        string courseId PK
        int progress
        bool completed
    }

    COURSES {
        string courseId PK
        string title
        string category
    }

    MODULES {
        string moduleId PK
        string courseId FK
        string title
    }
    
    LESSONS {
        string lessonId PK
        string moduleId FK
        string title
    }
    
    EXAM_QUESTIONS {
        string questionId PK
        string courseId FK
        string text
    }

    PROJECT {
        string projectId PK
        string courseId FK
        string title
    }

    SUBMISSIONS {
        string submissionId PK
        string userId FK
        string courseId FK
        bool graded
    }

    HACKATHONS {
        string hackathonId PK
        string title
        string startDate
    }
    
    HACKATHON_SUBMISSIONS {
        string submissionId PK
        string hackathonId FK
        string userId FK
        string projectName
    }
    
    ORGANIZATIONS {
        string orgId PK
        string name
        string ownerId FK
    }

    LEARNING_GOALS {
        string goalId PK
        string userId FK
        string text
    }
    
    ACHIEVEMENTS {
        string achievementId PK
        string userId FK
        string name
    }
```
