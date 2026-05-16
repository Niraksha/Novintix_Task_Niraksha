import json
from groq import AsyncGroq

class BaseAgent:
    def __init__(self, groq_client: AsyncGroq, role: str, system_prompt: str):
        self.groq = groq_client
        self.role = role
        self.system_prompt = system_prompt

    async def handle(self, message: str, history: list, session: dict, trace_id: str):
        try:
            # Construct messages with history
            messages = [{"role": "system", "content": f"{self.system_prompt}\n\nReturn your response as a JSON object with keys: 'content' (string) and 'status' ('RESOLVED' or 'ESCALATED')."}]
            
            # Add historical context
            for msg in history:
                messages.append(msg)
                
            # Add current message
            messages.append({"role": "user", "content": f"Patient ID: {session['patientId']}. Message: {message}"})

            completion = await self.groq.chat.completions.create(
                messages=messages,
                model="llama-3.3-70b-versatile",
                response_format={"type": "json_object"}
            )

            result = json.loads(completion.choices[0].message.content)
            return {
                "content": result.get("content", ""),
                "status": result.get("status", "RESOLVED"),
                "traceId": trace_id,
                "escalated": result.get("status") == "ESCALATED"
            }
        except Exception as e:
            print(f"[{self.role}] Error: {e}")
            return {
                "content": "I'm having trouble processing that right now. Let me connect you with a staff member.",
                "status": "ESCALATED",
                "escalated": True,
                "traceId": trace_id
            }

class AppointmentAgent(BaseAgent):
    def __init__(self, groq_client):
        super().__init__(groq_client, "Appointment", """You are a medical scheduling assistant.
        Your goal is to help patients book, reschedule, or cancel appointments.
        Be professional, empathetic, and efficient.
        Do NOT give medical advice.
        If a patient wants to cancel an appointment less than 24 hours in advance, inform them of the policy and set status to 'ESCALATED' for human review of fee waiver.""")

class PrescriptionAgent(BaseAgent):
    def __init__(self, groq_client):
        super().__init__(groq_client, "Prescription", """You are a pharmacy assistant.
        You help with prescription refills and general medication information (e.g., "how should I store this?").
        CRITICAL: Never prescribe new medication or change dosages.
        If a patient asks for a controlled substance refill or reports severe side effects, set status to 'ESCALATED' immediately.""")

class ReportAgent(BaseAgent):
    def __init__(self, groq_client):
        super().__init__(groq_client, "Lab Report", """You are a lab results assistant.
        Your job is to explain lab results using reference ranges.
        Use simple, non-alarmist language.
        CRITICAL: Never provide a clinical diagnosis.
        If values are significantly outside normal ranges (Abnormal), provide a basic explanation and set status to 'ESCALATED' stating that a physician must review these results.""")

class InsuranceAgent(BaseAgent):
    def __init__(self, groq_client):
        super().__init__(groq_client, "Insurance", """You are an insurance and billing specialist.
        Help patients understand their coverage, copays, and claim status.
        Be clear about what is an estimate versus a final bill.""")

class EscalationAgent:
    def __init__(self, groq_client):
        self.groq = groq_client

    async def handle(self, reason, original_message, session, trace_id):
        handoff_messages = {
            'EMERGENCY_DETECTED': "🚨 CRITICAL: Emergency detected. I am routing you to our immediate care team and notifying emergency services if necessary. Please stay on the line or call 911 immediately if you are alone.",
            'LOW_CONFIDENCE_INTENT': "I want to make sure I get you the right help. I'm connecting you with a patient coordinator who can assist with your request.",
            'RESPONSE_VIOLATION': "I apologize, but I need a human specialist to review this specific request to ensure we provide the most accurate and safe information."
        }
        
        content = handoff_messages.get(reason, "I'm connecting you with a human representative who can better assist with this specialized request.")
        
        return {
            "content": content,
            "status": "ESCALATED",
            "escalated": True,
            "reason": reason,
            "traceId": trace_id
        }
