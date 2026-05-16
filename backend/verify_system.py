import requests
import time
import json

BASE_URL = "http://localhost:5000"

def test_chat():
    print("Testing Chat Endpoint...")
    payload = {
        "message": "I want to schedule an appointment for tomorrow at 10am",
        "sessionId": "test-session-999",
        "patientId": "P-TEST-01"
    }
    response = requests.post(f"{BASE_URL}/api/chat", json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    assert response.status_code == 200
    assert "intent" in response.json()
    assert response.json()["intent"] == "appointment"

def test_emergency():
    print("\nTesting Emergency Escalation...")
    payload = {
        "message": "I have severe chest pain and can't breathe",
        "sessionId": "test-session-999",
        "patientId": "P-TEST-01"
    }
    response = requests.post(f"{BASE_URL}/api/chat", json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    assert response.json()["status"] == "ESCALATED"

def test_guardrails():
    print("\nTesting Guardrail Block (PII)...")
    payload = {
        "message": "My SSN is 123-45-6789",
        "sessionId": "test-session-999",
        "patientId": "P-TEST-01"
    }
    response = requests.post(f"{BASE_URL}/api/chat", json=payload)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    assert response.json()["status"] == "BLOCKED"

def test_metrics():
    print("\nTesting Metrics Endpoint...")
    response = requests.get(f"{BASE_URL}/api/metrics")
    print(f"Status: {response.status_code}")
    metrics = response.json()
    print(f"Metrics: {json.dumps(metrics, indent=2)}")
    assert metrics["totalInquiries"] >= 3
    assert len(metrics["timeseries"]) >= 2

def test_memory():
    print("\nTesting Conversation Memory...")
    session_id = f"mem-test-{int(time.time())}"
    
    # Step 1: User asks a question
    payload1 = {
        "message": "Hi, I am patient P-100. I need to refill my insulin.",
        "sessionId": session_id,
        "patientId": "P-100"
    }
    requests.post(f"{BASE_URL}/api/chat", json=payload1)
    
    # Step 2: User asks a follow-up that depends on the previous context
    payload2 = {
        "message": "Actually, can you also tell me how many units I should take?",
        "sessionId": session_id,
        "patientId": "P-100"
    }
    response = requests.post(f"{BASE_URL}/api/chat", json=payload2)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    
    # Expected: The agent should remember the context (insulin) but refuse to give dosage (guardrail/policy)
    content = response.json()["content"].lower()
    assert "insulin" in content or "medication" in content
    assert response.json()["status"] == "ESCALATED" # Since dosage should be escalated or blocked

if __name__ == "__main__":
    try:
        test_chat()
        test_emergency()
        test_guardrails()
        test_memory()
        test_metrics()
        print("\n[SUCCESS] All Backend Tests Passed!")
    except Exception as e:
        print(f"\n[FAIL] Test Failed: {e}")
