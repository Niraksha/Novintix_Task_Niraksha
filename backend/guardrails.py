import re

class GuardrailEngine:
    def __init__(self):
        self.prohibited_keywords = [
            r"\b(suicide|kill myself|end my life|self-harm)\b",
            r"\b(prescribe|give me a prescription for|i need a new drug)\b",
        ]

    async def pre_check(self, message, session):
        # 1. Crisis Check
        if re.search(r"\b(suicide|kill myself|end my life|self-harm)\b", message, re.IGNORECASE):
            return {
                "blocked": True,
                "reason": 'CRISIS_DETECTED',
                "safeResponse": "I'm very concerned about what you're sharing. Please contact the National Suicide Prevention Lifeline at 988 or go to the nearest emergency room. I am also alerting our on-call clinical staff."
            }

        # 2. PII Detection (Basic)
        if re.search(r"\b\d{3}-\d{2}-\d{4}\b", message):
            return {
                "blocked": True,
                "reason": 'PII_EXPOSURE',
                "safeResponse": "For your security, please do not share Social Security Numbers in this chat. How else can I help you today?"
            }

        return {"blocked": False}

    async def post_check(self, content, session):
        # 1. Medical Advice Detection (Heuristic)
        medical_advice_triggers = [
            r"\b(you should take|i recommend taking|increase your dose to|you have|your diagnosis is)\b"
        ]

        for trigger in medical_advice_triggers:
            if re.search(trigger, content, re.IGNORECASE):
                return {"violation": 'UNAUTHORIZED_MEDICAL_ADVICE'}

        # 2. PII Leak Check
        if re.search(r"\b\d{3}-\d{2}-\d{4}\b", content):
            return {"violation": 'PII_LEAK'}

        return {"violation": None}
