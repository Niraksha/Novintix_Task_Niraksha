import os
import uuid
import json
import asyncio
import time
from datetime import datetime
from groq import AsyncGroq
from guardrails import GuardrailEngine
from monitoring import MonitoringLayer
from agents import (
    AppointmentAgent,
    PrescriptionAgent,
    ReportAgent,
    InsuranceAgent,
    EscalationAgent
)

# Initialize Groq Client
groq_client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

class IntentTypes:
    APPOINTMENT = 'appointment'
    PRESCRIPTION = 'prescription'
    LAB_REPORT = 'lab_report'
    INSURANCE = 'insurance'
    EMERGENCY = 'emergency'
    UNKNOWN = 'unknown'

class Orchestrator:
    def __init__(self):
        self.guardrails = GuardrailEngine()
        self.monitor = MonitoringLayer()
        self.agents = {
            IntentTypes.APPOINTMENT: AppointmentAgent(groq_client),
            IntentTypes.PRESCRIPTION: PrescriptionAgent(groq_client),
            IntentTypes.LAB_REPORT: ReportAgent(groq_client),
            IntentTypes.INSURANCE: InsuranceAgent(groq_client),
            IntentTypes.EMERGENCY: EscalationAgent(groq_client),
        }
        self.session_store = {}

    async def process_inquiry(self, inquiry):
        start_time = time.time()
        trace_id = f"TRC-{uuid.uuid4().hex[:8].upper()}"
        
        session_id = inquiry.get("sessionId")
        patient_id = inquiry.get("patientId")
        message = inquiry.get("message")
        
        self.monitor.log('INQUIRY_RECEIVED', {"traceId": trace_id, "sessionId": session_id, "channel": inquiry.get("channel")})

        session = self._get_or_create_session(session_id, patient_id)
        
        # 1. Pre-process Guardrails
        guardrail_result = await self.guardrails.pre_check(message, session)
        if guardrail_result.get("blocked"):
            latency = int((time.time() - start_time) * 1000)
            self.monitor.log('GUARDRAIL_BLOCK', {"traceId": trace_id, "reason": guardrail_result["reason"]})
            self.monitor.log('INQUIRY_RESOLVED', {"traceId": trace_id, "intent": "blocked", "latencyMs": latency})
            return {
                "traceId": trace_id,
                "intent": None,
                "content": guardrail_result["safeResponse"],
                "status": 'BLOCKED'
            }

        # 2. Intent Classification
        intent = await self._classify_intent_with_llm(message)
        self.monitor.log('INTENT_CLASSIFIED', {"traceId": trace_id, "intent": intent["type"], "confidence": intent["confidence"]})

        # 3. Emergency Check
        if intent["type"] == IntentTypes.EMERGENCY or self._is_emergency_keywords(message):
            self.monitor.log('EMERGENCY_ESCALATION', {"traceId": trace_id, "sessionId": session["id"]})
            r = await self.agents[IntentTypes.EMERGENCY].handle(
                reason='EMERGENCY_DETECTED',
                original_message=message,
                session=session,
                trace_id=trace_id
            )
            latency = int((time.time() - start_time) * 1000)
            self.monitor.log('INQUIRY_RESOLVED', {"traceId": trace_id, "intent": "emergency", "latencyMs": latency, "escalated": True})
            return {
                "traceId": trace_id,
                "intent": 'emergency',
                "content": r["content"],
                "status": 'ESCALATED',
                "timestamp": datetime.now().isoformat()
            }

        # 4. Agent Routing
        if intent["confidence"] < 0.7:
            response = await self.agents[IntentTypes.EMERGENCY].handle(
                reason='LOW_CONFIDENCE_INTENT',
                original_message=message,
                session=session,
                trace_id=trace_id
            )
        else:
            agent = self.agents.get(intent["type"], self.agents[IntentTypes.EMERGENCY])
            if isinstance(agent, EscalationAgent):
                 response = await agent.handle(reason='UNKNOWN_INTENT', original_message=message, session=session, trace_id=trace_id)
            else:
                 # Pass history to the agent
                 response = await agent.handle(
                     message=message, 
                     history=session["history"], 
                     session=session, 
                     trace_id=trace_id
                 )

        # 5. Post-process Guardrails
        post_check = await self.guardrails.post_check(response["content"], session)
        if post_check.get("violation"):
            self.monitor.log('POST_GUARDRAIL_VIOLATION', {"traceId": trace_id, "violation": post_check["violation"]})
            response = await self.agents[IntentTypes.EMERGENCY].handle(
                reason='RESPONSE_VIOLATION',
                session=session,
                trace_id=trace_id
            )

        latency = int((time.time() - start_time) * 1000)
        self.monitor.log('INQUIRY_RESOLVED', {
            "traceId": trace_id,
            "intent": intent["type"],
            "latencyMs": latency,
            "escalated": response.get("escalated", False)
        })

        # Update Session History
        session["history"].append({"role": "user", "content": message})
        session["history"].append({"role": "assistant", "content": response["content"]})
        
        # Keep only last 10 messages to manage tokens
        if len(session["history"]) > 10:
            session["history"] = session["history"][-10:]

        return {
            "traceId": trace_id,
            "intent": intent["type"],
            "content": response["content"],
            "status": response["status"],
            "timestamp": datetime.now().isoformat()
        }

    async def _classify_intent_with_llm(self, message):
        try:
            completion = await groq_client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You are a healthcare intent classifier. Classify the user's inquiry into exactly one of these: appointment, prescription, lab_report, insurance, emergency, unknown.\nAppointment: scheduling, canceling, doctor visits.\nPrescription: refills, medication info.\nLab Report: blood tests, results, imaging.\nInsurance: coverage, claims, billing.\nEmergency: chest pain, bleeding, critical symptoms.\nReturn ONLY a JSON object like {'type': 'category', 'confidence': 0.95}"
                    },
                    {"role": "user", "content": message}
                ],
                model="llama-3.3-70b-versatile",
                response_format={"type": "json_object"}
            )
            return json.loads(completion.choices[0].message.content)
        except Exception as e:
            print(f"Classification Error: {e}")
            return {"type": IntentTypes.UNKNOWN, "confidence": 0}

    def _is_emergency_keywords(self, message):
        lower = message.lower()
        return any(kw in lower for kw in ["chest pain", "can't breathe", "unconscious", "stroke", "suicidal", "bleeding", "911"])

    def _get_or_create_session(self, session_id, patient_id):
        if session_id not in self.session_store:
            self.session_store[session_id] = {
                "id": session_id,
                "patientId": patient_id,
                "context": {},
                "createdAt": time.time(),
                "interactions": 0,
                "history": [] # New history field
            }
        s = self.session_store[session_id]
        if patient_id:
            s["patientId"] = patient_id # Update patient ID context
        s["interactions"] += 1
        return s

# Global orchestrator instance for the API
orchestrator = Orchestrator()
