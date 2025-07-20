Cognitia

A comprehensive study platform with features for notes, contests, model tests, and more.

Running with Docker

Prerequisites:
- Docker
- Docker Compose

Steps to Run:
1. Clone the repository:
   git clone <repository-url>
   cd study-platform

2. Build and start the Docker container:
   docker-compose up -d

3. Access the application at http://localhost:3000

Stopping the Application:
To stop the application, run:
docker-compose down

Development

Running Locally Without Docker:
1. Install dependencies:
   npm install

2. Run the development server:
   npm run dev

3. Access the application at http://localhost:3000

Building for Production:
npm run build
npm start

API Documentation

1. User Authentication

POST /api/auth/login
- Description: Authenticate a user and return a session token.
- Request Structure:
  {
    "email": "string",
    "password": "string"
  }
- Response Structure:
  {
    "token": "string",
    "user": {
      "id": "string",
      "name": "string",
      "email": "string"
    }
  }

POST /api/auth/register
- Description: Register a new user.
- Request Structure:
  {
    "name": "string",
    "email": "string",
    "password": "string"
  }
- Response Structure:
  {
    "message": "string",
    "user": {
      "id": "string",
      "name": "string",
      "email": "string"
    }
  }

2. Model Tests

GET /api/model-tests
- Description: Fetch a list of all available model tests.
- Response Structure:
  [
    {
      "id": "string",
      "title": "string",
      "duration": "number",
      "difficulty": "string",
      "questions": "number"
    }
  ]

POST /api/model-tests/create
- Description: Create a new model test.
- Request Structure:
  {
    "title": "string",
    "duration": "number",
    "difficulty": "string",
    "questions": "number",
    "subjects": ["string"]
  }
- Response Structure:
  {
    "message": "string",
    "testId": "string"
  }

3. Contests

GET /api/contests
- Description: Retrieve all contests with their details.
- Response Structure:
  [
    {
      "id": "string",
      "title": "string",
      "status": "string",
      "participants": "number",
      "topics": ["string"]
    }
  ]

POST /api/contests/register
- Description: Register a user for a contest.
- Request Structure:
  {
    "contestId": "string",
    "userId": "string"
  }
- Response Structure:
  {
    "message": "string",
    "status": "string"
  }

4. Notes

GET /api/notes
- Description: Fetch all notes for the logged-in user.
- Response Structure:
  [
    {
      "id": "string",
      "title": "string",
      "content": "string",
      "updatedAt": "string"
    }
  ]

POST /api/notes/create
- Description: Create a new note.
- Request Structure:
  {
    "title": "string",
    "content": "string"
  }
- Response Structure:
  {
    "message": "string",
    "noteId": "string"
  }

5. Study Plans

GET /api/study-plans
- Description: Retrieve all study plans for the user.
- Response Structure:
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

POST /api/study-plans/create
- Description: Create a new study plan.
- Request Structure:
  {
    "title": "string",
    "tasks": [
      {
        "description": "string"
      }
    ]
  }
- Response Structure:
  {
    "message": "string",
    "planId": "string"
  }

6. Notifications

GET /api/notifications
- Description: Fetch all notifications for the user.
- Response Structure:
  [
    {
      "id": "string",
      "message": "string",
      "read": "boolean",
      "createdAt": "string"
    }
  ]

POST /api/notifications/mark-read
- Description: Mark a notification as read.
- Request Structure:
  {
    "notificationId": "string"
  }
- Response Structure:
  {
    "message": "string"
  }

This documentation provides an overview of the API endpoints, their purposes, and the expected request/response structures. Use this as a reference to fine-tune your backend implementation.
