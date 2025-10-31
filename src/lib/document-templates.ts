
export const PITCH_DECK = `
# Manda Network - Investor Pitch Deck

This document contains the core content and narrative for our investor pitch deck. Each section corresponds to a slide or a key talking point.

---

### **Slide 1: Title Slide**

- **Image:** A powerful, aspirational image of a young Kenyan professional using a computer.
- **Title:** Manda Network
- **Tagline:** Upskilling Kenya for the A.I. Revolution.

---

### **Slide 2: The Problem**

- **Headline:** The Digital Skills Gap is a Major Hurdle for Kenya's Growth.
- **Key Point 1:** Rapid technological advancement, especially in A.I., is transforming industries globally and locally.
- **Key Point 2:** There is a significant mismatch between the skills demanded by the modern job market and the training provided by traditional education.
- **Statistic:** *"Over 50% of Kenyan graduates lack the job-ready skills needed for today's market."* (Source: Fuzu, 2022)

---

### **Slide 3: The Solution**

- **Headline:** Manda Network: Your A.I.-Powered Learning Partner.
- **What We Do:** We provide high-quality, affordable, and hyper-relevant online courses in technology, data science, and artificial intelligence.
- **Our Unique Edge:** We leverage the power of A.I. at every stage of the learning process:
    1.  **A.I.-Generated Content:** To create up-to-date, world-class courses in a fraction of the time.
    2.  **A.I. Tutoring:** A personalized A.I. tutor ("Gina") available 24/7 to guide and support every student.

---

### **Slide 4: Why Now? The Opportunity**

- **Market Size:** The global e-learning market is projected to reach $1 trillion by 2028. The African e-learning market is the fastest-growing in the world.
- **Government Push:** The Kenyan government's digital transformation agenda is creating massive demand for a digitally skilled workforce.
- **A.I. Tipping Point:** Generative A.I. (like Gemini) has made it possible to deliver personalized, high-quality education at an unprecedented scale and low cost.

---

### **Slide 5: Our Product**

- **Demonstration:** A brief walkthrough of the platform, highlighting:
    - The sleek, user-friendly course player.
    - An interaction with "Gina," the A.I. tutor.
    - The admin dashboard, showing how a new course can be generated in minutes.

---

### **Slide 6: Business Model**

- **B2C (Direct to Consumer):**
    - **Freemium:** Access to introductory lessons for free.
    - **Per-Course Fee:** Affordable, one-time payments for full course access and certification (e.g., via M-Pesa).
- **B2B (Corporate Training):**
    - **Cohort Training:** Customized training programs for businesses looking to upskill their teams.
    - **License Sales:** Bulk licenses for our course library.

---

### **Slide 7: Go-to-Market Strategy**

- **Phase 1: Digital First**
    - Targeted social media marketing (LinkedIn, Twitter).
    - SEO and content marketing (blog posts, tutorials) to establish thought leadership.
    - Partnerships with Kenyan tech influencers and bloggers.
- **Phase 2: Community and B2B**
    - Partnering with tech hubs, universities, and NGOs.
    - Direct sales outreach to corporations and SMEs.

---

### **Slide 8: The Team**

- **Founder/CEO:** [Your Name/Founder's Name] - Brief bio highlighting relevant experience (e.g., tech, education, entrepreneurship).
- **Advisors:** (Optional) List any key advisors with strong industry credentials.

---

### **Slide 9: The Ask**

- **We are seeking:** $250,000 in pre-seed funding.
- **Use of Funds:**
    - **40%:** Product Development (scaling the platform, mobile app).
    - **35%:** Marketing and Sales (customer acquisition).
    - **25%:** Content and Curriculum Expansion.

---

### **Slide 10: Our Vision**

- **Headline:** To become the leading platform for technology education in East Africa.
- **Long-term Goal:** To empower a generation of African innovators and leaders who will build the future with A.I.
- **Closing Image:** A diverse group of smiling, successful graduates.
- **Contact Info:** [Your Email], [Website URL]
`;

export const FRAMEWORK = `
# Manda Network - Technical Framework

This document outlines the core technologies and architectural principles that power the Manda Network platform.

## 1. Core Technologies

- **Frontend:** Next.js (React Framework) for server-side rendering, static site generation, and a seamless developer experience.
- **Styling:** Tailwind CSS for a utility-first CSS workflow, combined with ShadCN for pre-built, accessible UI components.
- **Backend:** Firebase (Platform-as-a-Service) for authentication, database, and hosting.
- **AI/ML:** Google's Genkit, an open-source framework for building production-ready AI-powered features, integrated with the Google AI Platform (Gemini models).
- **Database:** Firebase Realtime Database for live data synchronization and offline support.
- **Authentication:** Firebase Authentication for secure user management and social logins.

## 2. Architecture

The application follows a modern, serverless architecture that is scalable, maintainable, and cost-effective.

### 2.1 Frontend Architecture

- **Next.js App Router:** We leverage the App Router for file-based routing, nested layouts, and a clear separation between client and server components.
- **Server Components:** The majority of our components are React Server Components (RSCs) to minimize the client-side JavaScript bundle and improve initial page load times.
- **Client Components:** Interactive UI elements are implemented as Client Components ('use client') to allow for state management, event listeners, and browser-only APIs.

### 2.2 Backend Architecture

- **Server Actions:** We use Next.js Server Actions to handle form submissions and data mutations directly from our React components, providing a simplified and secure way to interact with the backend.
- **Firebase Integration:** Our backend logic (in Server Actions) interacts directly with Firebase services using the Firebase Admin SDK.
- **Genkit AI Flows:** Complex AI-driven tasks (like generating a course or tutoring a student) are encapsulated in Genkit "flows". These are robust, observable, and easily deployable functions that orchestrate calls to the Google AI models.

## 3. Data Flow

1.  **User Request:** A user interacts with the UI in their browser.
2.  **Next.js:** The request is handled by a Server Component or a Server Action.
3.  **Firebase:** For standard CRUD operations, the backend communicates directly with Firebase Auth and Realtime Database.
4.  **Genkit:** For AI-powered features, the backend triggers a specific Genkit flow.
5.  **Google AI:** The Genkit flow calls the appropriate Google AI model (e.g., Gemini) with a structured prompt.
6.  **Response:** The response flows back through the chain, ultimately updating the UI for the user.

## 4. Security

- **Authentication:** All user access is gated by Firebase Authentication.
- **Authorization:** Firebase Realtime Database security rules are used to control data access at a granular level, ensuring users can only read/write their own data.
- **Admin Access:** A custom claim (isAdmin) in Firebase Auth is used to grant privileged access to specific users for admin-level functionalities.
- **Environment Variables:** All sensitive keys and API credentials are stored securely as environment variables and are not exposed to the client-side.
`;

export const API = `
# Manda Network - API Documentation

This document outlines the API endpoints for the Manda Network application, detailing their purpose, request/response formats, and required permissions.

## 1. Authentication

All API endpoints are secured and require a valid Firebase Authentication ID token to be passed in the \`Authorization\` header of each request.

**Header Format:**
\`Authorization: Bearer <FIREBASE_ID_TOKEN>\`

## 2. Endpoints

### 2.1 Course Management

These endpoints are restricted to users with \`admin\` privileges.

#### **\`POST /api/courses\`**

- **Description:** Creates a new course using AI-generated content.
- **Request Body:**
  \`\`\`json
  {
    "title": "Introduction to Digital Marketing",
    "context": "A beginner-friendly course covering SEO, SEM, and social media marketing for small businesses in Kenya."
  }
  \`\`\`
- **Response (200 OK):**
  \`\`\`json
  {
    "courseId": "new-course-123",
    "title": "Introduction to Digital Marketing",
    "modules": [
      { "moduleId": "m1", "title": "Module 1: SEO Fundamentals" },
      { "moduleId": "m2", "title": "Module 2: Social Media Strategy" }
    ]
  }
  \`\`\`

#### **\`PUT /api/courses/{courseId}\`**

- **Description:** Updates an existing course.
- **Request Body:** The full updated course object.
- **Response (200 OK):**
  \`\`\`json
  {
    "message": "Course updated successfully"
  }
  \`\`\`

### 2.2 Student Interaction

These endpoints are for authenticated students.

#### **\`POST /api/tutor\`**

- **Description:** Interacts with the AI Tutor, "Gina".
- **Request Body:**
  \`\`\`json
  {
    "lessonContext": "The current lesson is about the basics of photosynthesis...",
    "studentQuery": "What is the chemical equation for photosynthesis?"
  }
  \`\`\`
- **Response (200 OK):**
  \`\`\`json
  {
    "response": "The chemical equation is 6CO2 + 6H2O → C6H12O6 + 6O2."
  }
  \`\`\`

#### **\`POST /api/exams/{examId}/submit\`**

- **Description:** Submits a student's answers for a final exam.
- **Request Body:**
  \`\`\`json
  {
    "answers": {
      "question1": "A",
      "question2": "C"
    }
  }
  \`\`\`
- **Response (200 OK):**
  \`\`\`json
  {
    "submissionId": "sub-456",
    "message": "Exam submitted for grading."
  }
  \`\`\`
`;

export const B2B_STRATEGY = `
# B2B Sales and Partnership Strategy

This document outlines the strategy for Manda Network to engage in Business-to-Business (B2B) sales and form strategic partnerships.

## 1. Target B2B Segments

Our primary B2B targets are organizations in Kenya and East Africa that require upskilling for their employees in the fields of technology, data science, and A.I.

- **Corporate Training:** Companies looking to train their workforce in specific tech skills.
- **SMEs (Small and Medium-sized Enterprises):** Businesses needing to adopt new technologies to improve efficiency and competitiveness.
- **NGOs and Non-profits:** Organizations focused on digital literacy and workforce development.
- **Academic Institutions:** Universities and colleges wishing to supplement their curriculum with specialized A.I. and tech courses.

## 2. B2B Service Offerings

We will offer tailored packages to meet the specific needs of each organization.

- **Cohort-Based Training:** Private, customized training programs for an organization's employees, delivered online or in a blended format.
- **Bulk Licensing:** Discounted access to our existing course library for a set number of employees.
- **Custom Course Development:** Partnering with organizations to create bespoke courses that address their unique challenges and goals.
- **"Train the Trainer" Programs:** Equipping an organization's internal trainers to deliver our curriculum.

## 3. Sales and Marketing Funnel (B2B)

1.  **Lead Generation:**
    - Targeted LinkedIn outreach to HR managers, L&D heads, and CTOs.
    - Content marketing (webinars, whitepapers) focused on the benefits of employee upskilling.
    - Attending industry conferences and networking events.

2.  **Needs Analysis:**
    - Initial consultation to understand the organization's goals, skill gaps, and budget.
    - A collaborative process to define the scope and objectives of the training program.

3.  **Proposal and Customization:**
    - Submitting a detailed proposal outlining the curriculum, delivery format, timeline, and pricing.
    - Iterating on the proposal based on client feedback.
`;

export const SEO_STRATEGY = `
# SEO and Content Marketing Strategy

This document outlines the Search Engine Optimization (SEO) and content marketing strategy for Manda Network to increase organic traffic, generate leads, and establish brand authority.

## 1. Target Audience and Keywords

Our primary audience consists of individuals in Kenya and East Africa searching for online courses and career development opportunities in technology.

### Primary Keywords:
- "Online courses Kenya"
- "AI courses in Nairobi"
- "Data science training Kenya"
- "Learn digital marketing online"
- "Best tech skills to learn in 2024"
- "How to become a data analyst in Kenya"

### Secondary Keywords (Long-tail):
- "Affordable Python courses for beginners"
- "Cybersecurity certification in East Africa"
- "What is generative AI?"
- "Manda Network reviews"

## 2. Content Strategy

We will create high-quality, relevant, and engaging content that addresses the needs and questions of our target audience.

### Content Pillars:
1.  **Educational Blog Posts:**
    - In-depth tutorials and guides related to our course offerings (e.g., "A Beginner's Guide to SQL").
    - "How-to" articles that solve common problems for our target audience (e.g., "How to Build a Professional Portfolio").
    - Explanations of complex topics (e.g., "What is Machine Learning and How Does It Work?").

2.  **Career-Focused Content:**
    - Articles on career paths in tech (e.g., "A Day in the Life of a Data Scientist").
    - Salary guides and job market analysis for the Kenyan tech industry.
    - Interviews with industry professionals and alumni.

3.  **Course Previews and Spotlights:**
    - Blog posts that provide a sneak peek into our courses.
    - Highlighting the benefits and key takeaways of specific programs.

4.  **News and Trends:**
    - Commentary on the latest trends in A.I. and technology in Africa.
    - Company news and updates.

## 3. On-Page SEO

- **Keyword Optimization:** Each piece of content will be optimized for a primary keyword, with secondary keywords used naturally throughout the text.
- **Title Tags and Meta Descriptions:** Compelling and keyword-rich titles and descriptions for all pages and blog posts.
- **Internal Linking:** Linking relevant articles and pages together to improve user navigation and distribute link equity.
- **Image Optimization:** Using descriptive alt text for all images.
- **Mobile-friendliness:** Ensuring the website is fully responsive and provides a great experience on all devices.

## 4. Off-Page SEO (Link Building)

- **Guest Posting:** Writing articles for reputable tech blogs and publications in Kenya and Africa.
- **Building Relationships with Journalists:** Reaching out to journalists and bloggers who cover technology and education.
- **Community Engagement:** Participating in online forums and social media groups related to tech in Kenya.
- **Partnership Links:** Securing backlinks from our B2B partners, universities, and community organizations.

## 5. Technical SEO

- **Site Speed:** Continuously optimizing page load times for a better user experience.
- **XML Sitemap:** Maintaining an up-to-date sitemap and submitting it to Google Search Console.
- **Crawlability:** Ensuring that search engines can easily crawl and index all important pages on our site.
- **Structured Data (Schema):** Implementing schema markup for courses, articles, and events to enhance our appearance in search results.

## 6. Measurement and KPIs

We will track the following metrics to measure the success of our SEO and content marketing efforts:
- **Organic Traffic:** Month-over-month growth in visitors from search engines.
- **Keyword Rankings:** Tracking our position in Google for target keywords.
- **Conversion Rate:** The percentage of organic visitors who sign up for a course or inquire about B2B services.
- **Backlinks:** The number and quality of new backlinks acquired.
`;

export const VISUAL_FRAMEWORK = `
# Manda Network - Visual Framework

This document provides a visual representation of the application's architecture, user flows, and component interactions using Mermaid diagrams.

## High-Level Architecture

\`\`\`mermaid
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
    end

    G --> H;
    G --> I;
    G --> J;

    F --> I;

    subgraph AIML [AI/ML (Genkit)]
        J --> K[Google AI Platform];
    end

    style CLIENT fill:#D6EAF8,stroke:#333,stroke-width:2px
    style SERVER fill:#D1F2EB,stroke:#333,stroke-width:2px
    style BACKEND fill:#FCF3CF,stroke:#333,stroke-width:2px
    style AIML fill:#FDEDEC,stroke:#333,stroke-width:2px
\`\`\`

## Database Framework

\`\`\`mermaid
erDiagram
    USERS {
        string uid PK "User ID"
        string email
        string displayName
        bool isAdmin
        string organizationId FK
    }

    COURSES {
        string courseId PK "Course ID"
        string title
        string description
        array modules
    }

    SUBMISSIONS {
        string submissionId PK "Submission ID"
        string userId FK
        string courseId FK
        string submittedAt
        bool graded
    }

    ORGANIZATIONS {
        string orgId PK "Organization ID"
        string name
        string ownerId FK
    }

    USERS ||--o{ SUBMISSIONS : submits
    COURSES ||--o{ SUBMISSIONS : for
    USERS }|--|| ORGANIZATIONS : belongs-to
\`\`\`
`;

export const PORTFOLIO_ROADMAP = `
# Manda Network - Portfolio Enhancement Roadmap

This document outlines a strategic roadmap for evolving the Student Portfolio feature from a simple certificate showcase into a comprehensive career-building and job-seeking tool.

## 1. Vision

To empower Manda Network graduates by providing them with a dynamic, professional, and shareable portfolio that effectively demonstrates their skills, projects, and achievements to potential employers. This turns our platform into a direct bridge between education and employment.

---

## 2. Core Feature Enhancements

### Phase 1: Rich Content & Skill Showcase

These features focus on allowing students to present a more complete picture of their capabilities.

**1. Project Showcase (Implemented):**
-   **Description:** Allows students to add personal or course-related projects to their portfolio.
-   **Fields:** Project Title, Description, Technologies Used, Image/Video Gallery, Link to Live Demo, Link to Source Code.

**2. Skill Tagging:**
-   **Description:** A dedicated section for students to list their technical and soft skills.
-   **Enhancement:** Skills could be automatically suggested or verified based on the courses they've completed.

**3. Hackathon Achievements:**
-   **Description:** An automated section that displays participation in Manda Network hackathons, including submitted projects and any awards or rankings achieved.

**4. Work & Education History:**
-   **Description:** Traditional resume sections for students to list their professional work experience and formal education history.

**5. Writing Samples:**
-   **Description:** An area to embed or link to blog posts, technical articles, or other writing samples to demonstrate communication skills.

**6. Featured Content:**
-   **Description:** Allow students to "pin" or "feature" their most impressive project or certificate, placing it at the top of their portfolio for maximum visibility.

---

### Phase 2: Professional & Networking Tools

These features transform the portfolio from a static page into an active career tool.

**7. Secure Contact Form:**
-   **Description:** A form for potential employers to contact the student directly through the platform without exposing the student's personal email address.

**8. Downloadable PDF Resume:**
-   **Description:** A one-click button to generate and download the entire portfolio as a professionally formatted PDF resume.

**9. Customizable URL:**
-   **Description:** Allow students to choose a personalized, memorable URL for their public portfolio (e.g., \`manda.network/portfolio/jane-doe\`).

**10. Testimonials & Recommendations:**
-   **Description:** A system where instructors or even peers can write recommendations that appear on the student's profile, adding social proof.

**11. "Open to Work" Status:**
-   **Description:** A badge or toggle that students can activate to signal to employers that they are actively seeking job opportunities. This could also make them appear in a special "Available for Hire" section.

---

### Phase 3: Engagement & Customization

These features enhance the user experience and provide valuable feedback.

**12. Portfolio Analytics:**
-   **Description:** A private dashboard for students showing metrics like portfolio views, link clicks, and contact form submissions over time.

**13. Customizable Layouts:**
-   **Description:** Provide 2-3 different visual themes or layout options that students can choose from to personalize the look and feel of their portfolio.

**14. Video Introduction:**
-   **Description:** Allow students to embed a short "elevator pitch" video to introduce themselves personally to visitors.

**15. Link to Personal Website:**
-   **Description:** A dedicated, prominent field for linking to an external personal blog or website.

---

### Phase 4: Deeper LMS Integration

These features create a more interconnected and gamified experience within the Manda Network ecosystem.

**16. Leaderboard Rank Display:**
-   **Description:** Automatically display the student's current rank from the hackathon leaderboard on their portfolio page.

**17. Peer Skill Endorsements:**
-   **Description:** Similar to LinkedIn, allow other Manda Network students to "endorse" the skills listed on a portfolio, adding a layer of community validation.

**18. Course-Specific Project Galleries:**
-   **Description:** On each course page, automatically generate a gallery showcasing the public portfolio projects submitted by students who completed that course.

**19. Learning Path Visualization:**
-   **Description:** A graphical representation of their learning journey, showing completed courses as a skill tree or timeline, demonstrating their growth over time.

**20. Cross-Course Skill Tracking:**
-   **Description:** A system that tracks skills across all completed courses and visualizes the student's proficiency level in different domains (e.g., "Python: Advanced", "UI/UX Design: Intermediate").
`;
