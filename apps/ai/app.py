from flask import Flask, request, jsonify
from dataclasses import dataclass, field
from typing import List, Any, Optional
from datetime import datetime, timedelta
from openai import OpenAI
import os
import json
import re
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)

@dataclass
class Task:
    id: Any
    title: str
    description: str = ""
    dueDate: Optional[str] = None
    priority: Any = "MEDIUM"
    subjectArea: str = "General"
    estimatedTime: int = 1  # in hours

@dataclass
class Availability:
    startTime: str
    endTime: str

@dataclass
class ScheduleSession:
    startTime: str
    endTime: str
    taskId: Any
    goal: str
    duration: int = 60

def _priority_score(priority: Any) -> int:
    if isinstance(priority, int):
        return priority
    p = str(priority).upper()
    if "HIGH" in p:
        return 3
    if "MEDIUM" in p:
        return 2
    return 1

def local_heuristic_schedule(tasks: List[Task], availability: List[Availability]) -> List[ScheduleSession]:
    """
    Deterministic local heuristic scheduler that runs without external API dependencies.
    """
    sorted_tasks = sorted(tasks, key=lambda t: _priority_score(t.priority), reverse=True)
    sessions = []
    task_idx = 0

    for slot in availability:
        try:
            # Parse ISO timestamps
            s_clean = slot.startTime.replace("Z", "+00:00")
            e_clean = slot.endTime.replace("Z", "+00:00")
            start_dt = datetime.fromisoformat(s_clean)
            end_dt = datetime.fromisoformat(e_clean)
        except Exception:
            continue

        slot_duration_minutes = int((end_dt - start_dt).total_seconds() // 60)
        if slot_duration_minutes <= 15:
            continue

        curr_time = start_dt
        while curr_time < end_dt and sorted_tasks:
            task = sorted_tasks[task_idx % len(sorted_tasks)]
            task_idx += 1

            # Chunk session between 45 to 90 minutes
            remaining = int((end_dt - curr_time).total_seconds() // 60)
            if remaining < 30:
                break
            session_len = min(60, remaining)
            session_end = curr_time + timedelta(minutes=session_len)

            goal = f"Work on {task.title}: core concepts & exercises ({task.subjectArea})"
            sessions.append(
                ScheduleSession(
                    startTime=curr_time.isoformat(),
                    endTime=session_end.isoformat(),
                    taskId=task.id,
                    goal=goal,
                    duration=session_len
                )
            )
            # 10 min break
            curr_time = session_end + timedelta(minutes=10)

    return sessions

def generate_daily_schedule(tasks: List[Task], availability: List[Availability]) -> List[ScheduleSession]:
    """
    Generate schedule using DeepSeek/OpenRouter if API key is provided,
    otherwise fallback cleanly to local heuristic scheduler.
    """
    deepseek_key = os.getenv("DEEPSEEK_API_KEY")
    openrouter_key = os.getenv("OPENROUTER_API_KEY")

    client = None
    model_name = "deepseek-chat"

    if deepseek_key and not deepseek_key.startswith("your_"):
        client = OpenAI(
            base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
            api_key=deepseek_key
        )
        model_name = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    elif openrouter_key and not openrouter_key.startswith("your_"):
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=openrouter_key
        )
        model_name = "deepseek/deepseek-r1-0528-qwen3-8b:free"

    if not client:
        print("ℹ️ No active LLM API key detected. Using local heuristic scheduler.")
        return local_heuristic_schedule(tasks, availability)

    prompt = f"""
You are an AI assistant that creates optimal daily schedules for students.
Given:
Tasks: {[t.__dict__ for t in tasks]}
Availability: {[a.__dict__ for a in availability]}

Create a schedule fitting within the availability slots. Prioritize higher priority tasks first.
Return ONLY a valid JSON array of objects with keys: "startTime", "endTime", "taskId", "goal", "duration".
No markdown explanations.
"""
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            timeout=15.0
        )
        content = response.choices[0].message.content.strip()

        # Extract JSON array
        start_idx = content.find('[')
        end_idx = content.rfind(']') + 1
        if start_idx != -1 and end_idx > start_idx:
            raw_json = content[start_idx:end_idx]
            items = json.loads(raw_json)
            sessions = []
            for item in items:
                dur = item.get("duration", 60)
                sessions.append(
                    ScheduleSession(
                        startTime=item["startTime"],
                        endTime=item["endTime"],
                        taskId=item["taskId"],
                        goal=item.get("goal", "Study task"),
                        duration=dur
                    )
                )
            if sessions:
                return sessions
    except Exception as e:
        print(f"⚠️ LLM schedule generation failed: {e}. Falling back to local scheduler.")

    return local_heuristic_schedule(tasks, availability)

@app.route('/generate-schedule', methods=['POST'])
def generate_schedule():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        if 'tasks' not in data or 'availability' not in data:
            return jsonify({"error": "Missing 'tasks' or 'availability' in request"}), 400

        tasks = []
        for t in data['tasks']:
            tasks.append(Task(**t))

        availability = []
        for a in data['availability']:
            availability.append(Availability(**a))

        if not tasks:
            return jsonify({"error": "No tasks provided"}), 400
        if not availability:
            return jsonify({"error": "No availability slots provided"}), 400

        sessions = generate_daily_schedule(tasks, availability)

        result = [
            {
                "startTime": s.startTime,
                "endTime": s.endTime,
                "taskId": s.taskId,
                "goal": s.goal,
                "duration": s.duration
            }
            for s in sessions
        ]
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

@app.route('/health', methods=['GET'])
def health_check():
    load_dotenv(override=True)
    return jsonify({
        "status": "healthy",
        "service": "Cognitia-AI Scheduler",
        "has_deepseek_key": bool(os.getenv("DEEPSEEK_API_KEY")),
        "base_url": os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
        "model": os.getenv("DEEPSEEK_MODEL", "deepseek-chat")
    })

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    # Localhost only by default: this service has no auth and spends DeepSeek credits.
    # Set HOST=0.0.0.0 only inside a private network (e.g. a Docker network).
    host = os.getenv("HOST", "127.0.0.1")
    app.run(debug=False, host=host, port=port)

