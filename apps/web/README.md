# Cognitia

A comprehensive study platform with features for notes, contests, model tests, and more.

## Running with Docker

### Prerequisites

- Docker
- Docker Compose

### Steps to Run

1. Clone the repository:
   \`\`\`bash
   git clone <repository-url>
   cd study-platform
   \`\`\`

2. Build and start the Docker container:
   \`\`\`bash
   docker-compose up -d
   \`\`\`

3. Access the application at http://localhost:3000

### Stopping the Application

To stop the application, run:
\`\`\`bash
docker-compose down
\`\`\`

## Development

### Running Locally Without Docker

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Run the development server:
   \`\`\`bash
   npm run dev
   \`\`\`

3. Access the application at http://localhost:3000

### Building for Production

\`\`\`bash
npm run build
npm start
\`\`\`

## API Documentation

### 1. **User Authentication**

#### **POST** `/api/auth/login`
- **Description**: Authenticate a user and return a session token.
- **Request Structure**:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response Structure**:
  ```json
  {
    "token": "string",
    "user": {
      "id": "string",
      "name": "string",
      "email": "string"
    }
  }
  ```

#### **POST** `/api/auth/register`
- **Description**: Register a new user.
- **Request Structure**:
  ```json
  {
    "name": "string",
    "email": "string",
    "password": "string"
  }
  ```
- **Response Structure**:
  ```json
  {
    "message": "string",
    "user": {
      "id": "string",
      "name": "string",
      "email": "string"
    }
  }
  ```

---

### 2. **Model Tests**

#### **GET** `/api/model-tests`
- **Description**: Fetch a list of all available model tests.
- **Response Structure**:
  ```json
  [
    {
      "id": "string",
      "title": "string",
      "duration": "number",
      "difficulty": "string",
      "questions": "number"
    }
  ]
  ```

#### **POST** `/api/model-tests/create`
- **Description**: Create a new model test.
- **Request Structure**:
  ```json
  {
    "title": "string",
    "duration": "number",
    "difficulty": "string",
    "questions": "number",
    "subjects": ["string"]
  }
  ```
- **Response Structure**:
  ```json
  {
    "message": "string",
    "testId": "string"
  }
  ```

#### **GET** `/api/model-test/results/:attemptId`
- **Description**: Fetch the results for a specific model test attempt.
- **Response Structure**:
  ```json
  {
    "attempt": {
      "id": "string",
      "userId": "string",
      "testId": "string",
      "score": "number",
      "startTime": "string",
      "endTime": "string",
      "timeSpent": "number"
    },
    "test": {
      "id": "string",
      "title": "string",
      "totalPoints": "number",
      "passingScore": "number"
    },
    "questionResults": [
      {
        "questionId": "string",
        "userAnswer": "number", // index of the option
        "isCorrect": "boolean"
      }
    ],
    "isPassed": "boolean"
  }
  ```

---

### 3. **Contests**

#### **GET** `/api/contests`
- **Description**: Retrieve all contests with their details.
- **Response Structure**:
  ```json
  [
    {
      "id": "string",
      "title": "string",
      "status": "string",
      "participants": "number",
      "topics": ["string"]
    }
  ]
  ```

#### **POST** `/api/contests/register`
- **Description**: Register a user for a contest.
- **Request Structure**:
  ```json
  {
    "contestId": "string",
    "userId": "string"
  }
  ```
- **Response Structure**:
  ```json
  {
    "message": "string",
    "status": "string"
  }
  ```

#### **POST** `/api/contests/:id/submit`
- **Description**: Submit a solution for a contest problem.
- **Request Structure**:
  ```json
  {
    "problemId": "string",
    "language": "string",
    "code": "string"
  }
  ```
- **Response Structure**:
  ```json
  {
    "submissionId": "string",
    "status": "string"
  }
  ```

#### **GET** `/api/contests/:id/submissions`
- **Description**: Get all submissions for the current user for a specific contest.
- **Response Structure**:
  ```json
  [
    {
      "id": "string",
      "problemId": "string",
      "status": "string", // e.g., "accepted", "wrong_answer"
      "score": "number",
      "language": "string",
      "executionTime": "number", // in ms
      "memoryUsed": "number", // in KB
      "submissionTime": "string"
    }
  ]
  ```

---

### 4. **Notes**

#### **GET** `/api/notes`
- **Description**: Fetch all notes for the logged-in user.
- **Response Structure**:
  ```json
  [
    {
      "id": "string",
      "title": "string",
      "content": "string",
      "updatedAt": "string"
    }
  ]
  ```

#### **POST** `/api/notes/create`
- **Description**: Create a new note.
- **Request Structure**:
  ```json
  {
    "title": "string",
    "content": "string"
  }
  ```
- **Response Structure**:
  ```json
  {
    "message": "string",
    "noteId": "string"
  }
  ```

---

### 5. **Q&A (Questions & Answers)**

#### **GET** `/api/qa`
- **Description**: Fetch a list of all questions.
- **Response Structure**:
  ```json
  [
    {
      "id": "string",
      "title": "string",
      "author": { "id": "string", "name": "string" },
      "tags": ["string"],
      "views": "number",
      "voteCount": "number",
      "answersCount": "number",
      "createdAt": "string",
      "isResolved": "boolean"
    }
  ]
  ```

#### **GET** `/api/qa/:id`
- **Description**: Fetch a single question with its details, answers, and comments.
- **Response Structure**:
  ```json
  {
    "id": "string",
    "title": "string",
    "body": "string",
    "author": { "id": "string", "name": "string" },
    "tags": ["string"],
    "views": "number",
    "voteCount": "number",
    "createdAt": "string",
    "isResolved": "boolean",
    "answers": [
      {
        "id": "string",
        "author": { "id": "string", "name": "string" },
        "content": "string",
        "isAccepted": "boolean",
        "createdAt": "string",
        "voteCount": "number"
      }
    ],
    "comments": [
      {
        "id": "string",
        "author": { "id": "string", "name": "string" },
        "content": "string",
        "createdAt": "string",
        "likes": "number"
      }
    ]
  }
  ```

#### **POST** `/api/qa/create`
- **Description**: Create a new question.
- **Request Structure**:
  ```json
  {
    "title": "string",
    "body": "string",
    "tags": ["string"]
  }
  ```
- **Response Structure**:
  ```json
  {
    "message": "string",
    "questionId": "string"
  }
  ```

#### **POST** `/api/qa/:id/answer`
- **Description**: Submit an answer to a question.
- **Request Structure**:
  ```json
  {
    "content": "string"
  }
  ```
- **Response Structure**:
  ```json
  {
    "message": "string",
    "answerId": "string"
  }
  ```

---

### 6. **Study Plans**

#### **GET** `/api/study-plans`
- **Description**: Retrieve all study plans for the user.
- **Response Structure**:
  ```json
  [
    {
      "id": "string",
      "title": "string",
      "tasks": [
        {
          "id": "string",
          "description": "string",
          "completed": "boolean"
        }
      ]
    }
  ]
  ```

#### **POST** `/api/study-plans/create`
- **Description**: Create a new study plan.
- **Request Structure**:
  ```json
  {
    "title": "string",
    "tasks": [
      {
        "description": "string"
      }
    ]
  }
  ```
- **Response Structure**:
  ```json
  {
    "message": "string",
    "planId": "string"
  }
  ```

---

### 7. **Notifications**

#### **GET** `/api/notifications`
- **Description**: Fetch all notifications for the user.
- **Response Structure**:
  ```json
  [
    {
      "id": "string",
      "message": "string",
      "read": "boolean",
      "createdAt": "string"
    }
  ]
  ```

#### **POST** `/api/notifications/mark-read`
- **Description**: Mark a notification as read.
- **Request Structure**:
  ```json
  {
    "notificationId": "string"
  }
  ```
- **Response Structure**:
  ```json
  {
    "message": "string"
  }
  ```

---

This documentation provides an overview of the API endpoints, their purposes, and the expected request/response structures. Use this as a reference to fine-tune your backend implementation.
