# Task Planner Flask API

A Flask API that uses AI (DeepSeek model via OpenRouter) to generate optimized daily schedules based on tasks and availability.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables:
Create a `.env` file with your OpenRouter API key:
```
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

3. Run the Flask application:
```bash
python app.py
```

The API will be available at `http://localhost:5000`

## API Endpoints

### POST /generate-schedule

Generates a daily schedule based on tasks and availability.

**Request Body:**
```json
{
    "tasks": [
        {
            "id": 1,
            "title": "Study Math",
            "description": "Algebra problems",
            "dueDate": "2025-07-10T23:59:00",
            "priority": 3,
            "subjectArea": "Mathematics",
            "estimatedTime": 2
        }
    ],
    "availability": [
        {
            "startTime": "2025-07-04T09:00:00",
            "endTime": "2025-07-04T12:00:00"
        }
    ]
}
```

**Response:**
```json
[
    {
        "startTime": "2025-07-04T09:00:00",
        "endTime": "2025-07-04T11:00:00",
        "taskId": 1,
        "goal": "Complete first 3 algebra problems and review concepts"
    }
]
```

### GET /health

Health check endpoint.

**Response:**
```json
{
    "status": "healthy",
    "message": "Task Planner API is running"
}
```

## Testing

Run the test script to see the API in action:
```bash
python test_api.py
```

## Task Fields

- `id`: Unique identifier for the task
- `title`: Task title
- `description`: Detailed description
- `dueDate`: Due date in ISO 8601 format
- `priority`: Priority level (higher number = more important)
- `subjectArea`: Subject/category of the task
- `estimatedTime`: Estimated time to complete in hours

## Availability Fields

- `startTime`: Available start time in ISO 8601 format
- `endTime`: Available end time in ISO 8601 format

## Schedule Output Fields

- `startTime`: Session start time in ISO 8601 format
- `endTime`: Session end time in ISO 8601 format
- `taskId`: ID of the task for this session
- `goal`: Specific goal/objective for this session
