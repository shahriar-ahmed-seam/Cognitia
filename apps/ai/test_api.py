import requests
import json
from datetime import datetime

# Test data
test_payload = {
    "tasks": [
        {
            "id": 1,
            "title": "Complete Security Assignment",
            "description": "Complete the security assignment on side channel attacks",
            "dueDate": "2025-07-10T23:59:00",
            "priority": "MEDIUM",
            "subjectArea": "Computer Security",
            "estimatedTime": 4
        },
        {
            "id": 2,
            "title": "Study for CT",
            "description": "Study for the Fault Tolerant Systems CT",
            "dueDate": "2025-07-06T09:00:00",
            "priority": "MEDIUM",
            "subjectArea": "Systems Engineering",
            "estimatedTime": 3
        },
        {
            "id": 3,
            "title": "Math Problem Set",
            "description": "Complete calculus problem set 5",
            "dueDate": "2025-07-08T23:59:00",
            "priority": "MEDIUM",
            "subjectArea": "Mathematics",
            "estimatedTime": 2
        }
    ],
    "availability": [
        {
            "startTime": "2025-07-04T09:00:00",
            "endTime": "2025-07-04T11:30:00"
        },
        {
            "startTime": "2025-07-04T14:00:00",
            "endTime": "2025-07-04T17:00:00"
        },
        {
            "startTime": "2025-07-04T19:00:00",
            "endTime": "2025-07-04T21:00:00"
        }
    ]
}

def test_api():
    """Test the Flask API"""
    base_url = "http://localhost:5000"
    
    # Test health endpoint
    try:
        health_response = requests.get(f"{base_url}/health")
        print("Health Check:")
        print(f"Status: {health_response.status_code}")
        print(f"Response: {health_response.json()}")
        print()
    except requests.exceptions.ConnectionError:
        print("Error: Could not connect to the API. Make sure the Flask app is running.")
        return
    
    # Test schedule generation
    try:
        response = requests.post(
            f"{base_url}/generate-schedule",
            headers={"Content-Type": "application/json"},
            json=test_payload
        )
        
        print("Schedule Generation:")
        print(f"Status: {response.status_code}")
        
        print(response.json())
            
    except Exception as e:
        print(f"Error testing API: {e}")

if __name__ == "__main__":
    test_api()
