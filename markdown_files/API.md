# Varban Academy - API Documentation

This document outlines the API endpoints for the Varban Academy application, detailing their purpose, request/response formats, and required permissions.

## 1. Authentication

All API endpoints are secured and require a valid Firebase Authentication ID token to be passed in the `Authorization` header of each request.

**Header Format:**
`Authorization: Bearer <FIREBASE_ID_TOKEN>`

## 2. Endpoints

### 2.1 Course Management

These endpoints are restricted to users with `admin` privileges.

#### **`POST /api/courses`**

- **Description:** Creates a new course using AI-generated content.
- **Request Body:**
  ```json
  {
    "title": "Introduction to Digital Marketing",
    "context": "A beginner-friendly course covering SEO, SEM, and social media marketing for small businesses in Kenya."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "courseId": "new-course-123",
    "title": "Introduction to Digital Marketing",
    "modules": [
      { "moduleId": "m1", "title": "Module 1: SEO Fundamentals" },
      { "moduleId": "m2", "title": "Module 2: Social Media Strategy" }
    ]
  }
  ```

#### **`PUT /api/courses/{courseId}`**

- **Description:** Updates an existing course.
- **Request Body:** The full updated course object.
- **Response (200 OK):**
  ```json
  {
    "message": "Course updated successfully"
  }
  ```

### 2.2 Student Interaction

These endpoints are for authenticated students.

#### **`POST /api/tutor`**

- **Description:** Interacts with the AI Tutor, "Gina".
- **Request Body:**
  ```json
  {
    "lessonContext": "The current lesson is about the basics of photosynthesis...",
    "studentQuery": "What is the chemical equation for photosynthesis?"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "response": "The chemical equation is 6CO2 + 6H2O → C6H12O6 + 6O2."
  }
  ```

#### **`POST /api/exams/{examId}/submit`**

- **Description:** Submits a student's answers for a final exam.
- **Request Body:**
  ```json
  {
    "answers": {
      "question1": "A",
      "question2": "C"
    }
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "submissionId": "sub-456",
    "message": "Exam submitted for grading."
  }
  ```

### 2.3 Document Management (Admin)

These endpoints handle the formal documentation used within the admin panel.

#### **`GET /api/documents/{docType}`**

- **Description:** Retrieves the content of a specific markdown document.
- **URL Parameter `docType`:** One of `PITCH_DECK.md`, `FRAMEWORK.md`, etc.
- **Response (200 OK):**
  ```json
  {
    "content": "## This is the content of the markdown file..."
  }
  ```

#### **`POST /api/documents/{docType}`**

- **Description:** Saves updated content for a specific markdown document.
- **Request Body:**
  ```json
  {
    "content": "## This is the new, updated content."
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "message": "Document saved successfully."
  }
  ```
