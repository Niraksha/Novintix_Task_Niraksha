import time
from datetime import datetime
from collections import deque

class MonitoringLayer:
    def __init__(self):
        self.logs = []
        self.metrics = {
            "totalInquiries": 0,
            "intentDistribution": {},
            "escalations": 0,
            "guardrailViolations": 0,
            "latencies": []
        }
        # Keep track of last 50 data points for timeseries
        self.timeseries = deque(maxlen=50)

    def log(self, event, data):
        entry = {
            "timestamp": datetime.now().isoformat(),
            "event": event,
            **data
        }
        self.logs.append(entry)
        print(f"[MONITOR] {event}: {data}")

        # Update metrics
        if event == 'INQUIRY_RECEIVED':
            self.metrics["totalInquiries"] += 1
        elif event == 'INTENT_CLASSIFIED':
            intent = data.get("intent", "unknown")
            self.metrics["intentDistribution"][intent] = self.metrics["intentDistribution"].get(intent, 0) + 1
        elif event == 'EMERGENCY_ESCALATION' or data.get("escalated"):
            self.metrics["escalations"] += 1
        elif event in ['GUARDRAIL_BLOCK', 'POST_GUARDRAIL_VIOLATION']:
            self.metrics["guardrailViolations"] += 1
        elif event == 'INQUIRY_RESOLVED':
            latency = data.get("latencyMs", 0)
            self.metrics["latencies"].append(latency)
            
            # Update timeseries
            self.timeseries.append({
                "time": datetime.now().strftime("%H:%M:%S"),
                "latency": latency,
                "event": data.get("intent", "unknown")
            })

    def get_metrics(self):
        avg_latency = (sum(self.metrics["latencies"]) / len(self.metrics["latencies"])) if self.metrics["latencies"] else 0
        
        return {
            **self.metrics,
            "averageLatencyMs": round(avg_latency),
            "escalationRate": round(self.metrics["escalations"] / self.metrics["totalInquiries"], 2) if self.metrics["totalInquiries"] > 0 else 0,
            "fcrRate": round((self.metrics["totalInquiries"] - self.metrics["escalations"]) / self.metrics["totalInquiries"], 2) if self.metrics["totalInquiries"] > 0 else 0,
            "timeseries": list(self.timeseries)
        }

    def destroy(self):
        pass
