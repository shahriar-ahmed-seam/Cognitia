from flask import Flask, request, jsonify
from dataclasses import dataclass
from typing import List
from datetime import datetime
from openai import OpenAI
import os
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

@dataclass
class Task:
    id: int
    title: str
    description: str
    dueDate: str
    priority: int
    subjectArea: str
    estimatedTime: int  # in hours

@dataclass
class Availability:
    startTime: str
    endTime: str

@dataclass
class ScheduleSession:
    startTime: str
    endTime: str
    taskId: int
    goal: str

def generate_daily_schedule(tasks: List[Task], availability: List[Availability]) -> List[ScheduleSession]:
    """
    Generate a daily schedule using the AI model based on tasks and availability.
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise ValueError("OPENROUTER_API_KEY environment variable not set")
    
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )
    
    # Format the prompt for daily scheduling
    prompt = f"""
You are an AI assistant that creates optimal daily schedules for students.

You will receive:
1. A list of tasks in JSON format with: id, title, description, dueDate (ISO 8601), priority (LOW, MEDIUM, HIGH), subjectArea, and estimatedTime (hours)
2. A list of availability slots with: startTime and endTime (ISO 8601 format)

Create a schedule for TODAY ONLY that fits within the given availability slots. Tasks with higher priority should be scheduled first. Break down larger tasks into smaller sessions if needed.

Constraints:
- Only schedule within the provided availability slots
- Each session should be productive (minimum 30 minutes, maximum 2 hours)
- Consider the estimated time for each task
- Prioritize high-priority tasks
- Include specific goals for each session

Return ONLY a JSON list with no extra text. Each session should have: {{startTime:, endTime:, taskId:, goal:}}.

Tasks:
{[task.__dict__ for task in tasks]}

Availability:
{[avail.__dict__ for avail in availability]}
"""

    try:
        response = client.chat.completions.create(
            model="deepseek/deepseek-r1-0528-qwen3-8b:free",
            messages=[
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )
        
        content = response.choices[0].message.content.strip()
        
        # Try to extract JSON from the response
        # Sometimes the model might include extra text, so we try to find the JSON array
        start_idx = content.find('[')
        end_idx = content.rfind(']') + 1
        
        if start_idx != -1 and end_idx != 0:
            json_content = content[start_idx:end_idx]
            sessions_data = json.loads(json_content)
            sessions = [ScheduleSession(**s) for s in sessions_data]
            return sessions
        else:
            # Fallback: try to parse the entire content as JSON
            sessions_data = json.loads(content)
            sessions = [ScheduleSession(**s) for s in sessions_data]
            return sessions
            
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        print(f"LLM response: {content}")
        return []
    except Exception as e:
        print(f"Error generating schedule: {e}")
        return []

@app.route('/generate-schedule', methods=['POST'])
def generate_schedule():
    """
    Endpoint to generate a daily schedule based on tasks and availability.
    
    Expected JSON payload:
    {
        "tasks": [
            {
                "id": 1,
                "title": "Study Math",
                "description": "Algebra problems",
                "dueDate": "2025-07-10T23:59:00",
                "priority": "MEDIUM",
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
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        if 'tasks' not in data or 'availability' not in data:
            return jsonify({"error": "Missing 'tasks' or 'availability' in request"}), 400
        
        # Parse tasks
        tasks = []
        for task_data in data['tasks']:
            try:
                task = Task(**task_data)
                tasks.append(task)
            except TypeError as e:
                return jsonify({"error": f"Invalid task format: {e}"}), 400
        
        # Parse availability
        availability = []
        for avail_data in data['availability']:
            try:
                avail = Availability(**avail_data)
                availability.append(avail)
            except TypeError as e:
                return jsonify({"error": f"Invalid availability format: {e}"}), 400
        
        if not tasks:
            return jsonify({"error": "No tasks provided"}), 400
        
        if not availability:
            return jsonify({"error": "No availability slots provided"}), 400
        
        # Generate schedule
        sessions = generate_daily_schedule(tasks, availability)
        
        # Convert to dict for JSON response
        result = [
            {
                "startTime": session.startTime,
                "endTime": session.endTime,
                "taskId": session.taskId,
                "goal": session.goal
            }
            for session in sessions
        ]
        print(f"Generated schedule: {result}")
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "message": "Task Planner API is running"})

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Endpoint not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
