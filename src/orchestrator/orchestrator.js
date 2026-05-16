const { GuardrailEngine } = require('../guardrails/guardrail_engine');
const { MonitoringLayer } = require('../monitoring/monitoring_layer');
const { AppointmentAgent } = require('../agents/appointment_agent');
const { PrescriptionAgent, ReportAgent, EscalationAgent } = require('../agents/agents');

const INTENT_TYPES = {
  APPOINTMENT: 'appointment', PRESCRIPTION: 'prescription',
  LAB_REPORT: 'lab_report', INSURANCE: 'insurance',
  EMERGENCY: 'emergency', UNKNOWN: 'unknown',
};
const CONFIDENCE_THRESHOLD = 0.75;

class Orchestrator {
  constructor() {
    this.guardrails = new GuardrailEngine();
    this.monitor = new MonitoringLayer();
    this.agents = {
      [INTENT_TYPES.APPOINTMENT]: new AppointmentAgent(),
      [INTENT_TYPES.PRESCRIPTION]: new PrescriptionAgent(),
      [INTENT_TYPES.LAB_REPORT]: new ReportAgent(),
      [INTENT_TYPES.INSURANCE]: new AppointmentAgent(),
      [INTENT_TYPES.EMERGENCY]: new EscalationAgent(),
    };
    this.sessionStore = new Map();
  }

  async processInquiry(inquiry) {
    const startTime = Date.now();
    const traceId = `TRC-${Date.now()}-${Math.random().toString(36).substr(2,9).toUpperCase()}`;
    this.monitor.log('INQUIRY_RECEIVED', { traceId, sessionId: inquiry.sessionId, channel: inquiry.channel });
    const session = this._getOrCreateSession(inquiry.sessionId, inquiry.patientId);
    const guardrailResult = await this.guardrails.preCheck(inquiry.message, session);
    if (guardrailResult.blocked) {
      this.monitor.log('GUARDRAIL_BLOCK', { traceId, reason: guardrailResult.reason });
      return { traceId, intent: null, content: guardrailResult.safeResponse, status: 'BLOCKED' };
    }
    const intent = await this._classifyIntent(inquiry.message);
    this.monitor.log('INTENT_CLASSIFIED', { traceId, intent: intent.type, confidence: intent.confidence });
    if (this._isEmergency(inquiry.message, intent)) {
      this.monitor.log('EMERGENCY_ESCALATION', { traceId, sessionId: session.id });
      const r = await this.agents[INTENT_TYPES.EMERGENCY].handle({ reason: 'EMERGENCY_DETECTED', originalMessage: inquiry.message, session, traceId });
      return { traceId, intent: 'emergency', content: r.content, status: 'ESCALATED', timestamp: new Date().toISOString() };
    }
    let response;
    if (intent.confidence < CONFIDENCE_THRESHOLD) {
      response = await this.agents[INTENT_TYPES.EMERGENCY].handle({ reason: 'LOW_CONFIDENCE_INTENT', originalMessage: inquiry.message, session, traceId });
    } else {
      const agent = this.agents[intent.type] || this.agents[INTENT_TYPES.EMERGENCY];
      response = await agent.handle({ message: inquiry.message, session, traceId });
    }
    const postCheck = await this.guardrails.postCheck(response.content, session);
    if (postCheck.violation) {
      this.monitor.log('POST_GUARDRAIL_VIOLATION', { traceId, violation: postCheck.violation });
      response = await this.agents[INTENT_TYPES.EMERGENCY].handle({ reason: 'RESPONSE_VIOLATION', session, traceId });
    }
    const latency = Date.now() - startTime;
    this.monitor.log('INQUIRY_RESOLVED', { traceId, intent: intent.type, latencyMs: latency, escalated: response.escalated || false });
    return { traceId, intent: intent.type, content: response.content, status: response.status, timestamp: new Date().toISOString() };
  }

  async _classifyIntent(message) {
    const lower = message.toLowerCase();
    const patterns = {
      [INTENT_TYPES.APPOINTMENT]: /\b(appointment|schedule|book|cancel|reschedule|visit|doctor|slot)\b/gi,
      [INTENT_TYPES.PRESCRIPTION]: /\b(prescription|medication|refill|drug|dosage|pill|tablet|pharmacy)\b/gi,
      [INTENT_TYPES.LAB_REPORT]: /\b(lab|result|report|test|blood|urine|scan|mri|x-ray)\b/gi,
      [INTENT_TYPES.INSURANCE]: /\b(insurance|claim|coverage|copay|deductible|billing|payment)\b/gi,
      [INTENT_TYPES.EMERGENCY]: /\b(emergency|chest pain|can't breathe|unconscious|bleeding|stroke|911)\b/gi,
    };
    let best = { type: INTENT_TYPES.UNKNOWN, confidence: 0 };
    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = (lower.match(pattern) || []).length;
      const confidence = Math.min(matches * 0.3 + 0.1, 1.0);
      if (confidence > best.confidence) best = { type, confidence };
    }
    return best;
  }

  _isEmergency(message, intent) {
    return intent.type === INTENT_TYPES.EMERGENCY || /\b(emergency|chest pain|can't breathe|stroke|suicidal|overdose)\b/gi.test(message);
  }

  _getOrCreateSession(sessionId, patientId) {
    if (!this.sessionStore.has(sessionId)) {
      this.sessionStore.set(sessionId, { id: sessionId, patientId, context: {}, createdAt: Date.now(), interactions: 0 });
    }
    const s = this.sessionStore.get(sessionId);
    s.interactions++;
    return s;
  }
}

module.exports = { Orchestrator, INTENT_TYPES };
