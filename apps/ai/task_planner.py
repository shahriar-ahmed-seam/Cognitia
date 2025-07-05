from dataclasses import dataclass
from typing import List
from datetime import datetime
from openai import OpenAI
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

@dataclass
class Task:
    id: int
    title: str
    description: str
    dueDate: str  # ISO format string for simplicity
    priority: int

@dataclass
class Session:
    taskId: int
    startTime: str  # ISO format string
    endTime: str    # ISO format string
    goal: str
    date: str       # ISO format string

def generate_sessions(tasks: List[Task]) -> List[Session]:
    """
    Given a list of tasks, use the LLM to generate a list of sessions.
    """
    api_key = os.getenv("OPENROUTER_API_KEY")
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key,
    )
    # Format the prompt
    prompt = f"""
You are an AI assistant that helps users break down their tasks into manageable sessions.

You will receive a list of tasks in JSON format. Each task contains an id, title, description, dueDate (ISO 8601), and priority (higher number means higher priority). Analyze the list and generate a plan to complete all tasks by their deadlines, breaking them into manageable sessions distributed over the days. Each session should be for a specific day, not just today. Tasks with higher priority numbers should be given more importance in scheduling.

Please follow these practical constraints:
- Each session must be no longer than 2 hours.
- There must be at least a 1 hour break between sessions, unless the schedule is very tight.
- Do not schedule sessions between 11 PM and 7 AM, or between 1 PM and 4 PM (noon break), unless the schedule is very tight.
- Limit the number of afternoon sessions to a reasonable amount per day.
- Distribute sessions sensibly across days, avoiding stacking too many sessions on one day.

Return ONLY the sessions as a JSON list, with no extra text or explanation. Each session should include: taskId, startTime (ISO 8601), endTime (ISO 8601), goal, and date (ISO 8601).

Tasks (JSON):
{[task.__dict__ for task in tasks]}
"""
    response = client.chat.completions.create(
        model="deepseek/deepseek-r1-0528-qwen3-8b:free",
        messages=[
            {"role": "user", "content": prompt}
        ]
    )
    import json
    # Try to extract JSON from the response
    content = response.choices[0].message.content
    try:
        sessions_data = json.loads(content)
        sessions = [Session(**s) for s in sessions_data]
        return sessions
    except Exception as e:
        print("Failed to parse sessions:", e)
        print("LLM output was:", content)
        return []

if __name__ == "__main__":
    # Example tasks
    tasks = [
        Task(id=1, title="Complete Security Assignment", description="Complete the security assignment on side channel attacks, Pretty Large will take 12 hours atleast", dueDate="2024-06-25T23:59:00", priority=1),
        Task(id=2, title="Study for CT", description="Study for the Fault Tolerant Systems CT, medium and would take 5 hours ", dueDate="2024-06-21T09:00:00", priority=2),
    ]
    sessions = generate_sessions(tasks)
    for session in sessions:
        print(session)