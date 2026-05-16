import os
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from orchestrator import orchestrator

app = FastAPI(title="CADUCEUS Healthcare AI API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    sessionId: str
    patientId: str
    channel: str = "web"

@app.post("/api/chat")
async def chat(request: ChatRequest):
    try:
        result = await orchestrator.process_inquiry(request.dict())
        return result
    except Exception as e:
        print(f"Server Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/metrics")
async def get_metrics():
    return orchestrator.monitor.get_metrics()

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "caduceus-ai"}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5000))
    uvicorn.run(app, host="0.0.0.0", port=port)
