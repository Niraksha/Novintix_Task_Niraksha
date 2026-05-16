/**
 * GuardrailEngine — Safety & Compliance Layer
 * Enforces: medical advice limits, data privacy, HIPAA compliance, content filters
 * 
 * Architecture: Pre-check (before routing) + Post-check (before response delivery)
 */

const MEDICAL_ADVICE_PATTERNS = [
  /\b(you (should|must|need to) take|prescribe|diagnose|you have|it's cancer|it's diabetes)\b/gi,
  /\b(stop taking|increase your dose|take (more|less) than prescribed)\b/gi,
  /\b(this is definitely|you are (sick|healthy|fine|dying))\b/gi,
];

const PII_PATTERNS = [
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, type: 'SSN' },
  { pattern: /\b\d{16}\b/g, type: 'CREDIT_CARD' },
  { pattern: /\b[A-Z]{2}\d{6,8}\b/g, type: 'PASSPORT' },
];

const CRISIS_KEYWORDS = /\b(suicide|self-harm|kill myself|end my life|overdose intentionally|want to die)\b/gi;

const PROHIBITED_TOPICS = [
  'illegal drug acquisition',
  'weapon information',
  'provider personal information',
];

class GuardrailEngine {
  constructor() {
    this.violations = [];
    this.hardStopReasons = new Set([
      'MEDICAL_ADVICE',
      'PII_IN_RESPONSE',
      'CRISIS_DETECTED',
      'CROSS_SESSION_DATA',
    ]);
  }

  /**
   * Pre-check: Run before routing the inquiry
   * Catches: crisis signals, clearly inappropriate requests
   */
  async preCheck(message, session) {
    // 1. Crisis detection — highest priority
    if (CRISIS_KEYWORDS.test(message)) {
      return {
        blocked: true,
        reason: 'CRISIS_DETECTED',
        safeResponse: this._getCrisisResponse(),
        severity: 'CRITICAL',
      };
    }

    // 2. PII detection in incoming message (log but don't block)
    const piiFound = this._detectPII(message);
    if (piiFound.length > 0) {
      // Redact PII from logs, alert compliance
      return {
        blocked: false,
        piiDetected: piiFound,
        redactedMessage: this._redactPII(message),
        complianceAlert: 'PII_IN_INCOMING_MESSAGE',
      };
    }

    // 3. Prohibited topic check
    for (const topic of PROHIBITED_TOPICS) {
      if (message.toLowerCase().includes(topic)) {
        return {
          blocked: true,
          reason: 'PROHIBITED_TOPIC',
          safeResponse: 'I cannot assist with that request. Please contact us for appropriate healthcare support.',
          severity: 'HIGH',
        };
      }
    }

    return { blocked: false };
  }

  /**
   * Post-check: Run on agent response BEFORE delivering to patient
   * Catches: medical advice slipping through, PII in responses, policy violations
   */
  async postCheck(responseContent, session) {
    if (!responseContent) return { violation: null };

    // 1. Medical advice check
    for (const pattern of MEDICAL_ADVICE_PATTERNS) {
      if (pattern.test(responseContent)) {
        this.violations.push({ type: 'MEDICAL_ADVICE', content: responseContent, sessionId: session.id });
        return {
          violation: 'MEDICAL_ADVICE_DETECTED',
          severity: 'HIGH',
          action: 'BLOCK_AND_ESCALATE',
        };
      }
    }

    // 2. PII in response (must never appear)
    const piiInResponse = this._detectPII(responseContent);
    if (piiInResponse.length > 0) {
      return {
        violation: 'PII_IN_RESPONSE',
        severity: 'CRITICAL',
        action: 'BLOCK_AND_ESCALATE',
      };
    }

    // 3. Cross-session data check (patient data from another session must not appear)
    // In production: compare response tokens against other session's patient identifiers
    const crossSessionViolation = this._checkCrossSessionLeak(responseContent, session);
    if (crossSessionViolation) {
      return {
        violation: 'CROSS_SESSION_DATA_LEAK',
        severity: 'CRITICAL',
        action: 'BLOCK_AND_ESCALATE',
      };
    }

    return { violation: null };
  }

  _detectPII(text) {
    const found = [];
    for (const { pattern, type } of PII_PATTERNS) {
      if (pattern.test(text)) found.push(type);
    }
    return found;
  }

  _redactPII(text) {
    let redacted = text;
    for (const { pattern, type } of PII_PATTERNS) {
      redacted = redacted.replace(pattern, `[REDACTED-${type}]`);
    }
    return redacted;
  }

  _checkCrossSessionLeak(content, session) {
    // In production: this would compare against a session isolation store
    // ensuring no patient identifiers from other sessions appear in content
    return false;
  }

  _getCrisisResponse() {
    return `I'm very concerned about what you've shared. Please reach out for immediate support:
    
🆘 National Crisis Hotline: Call or text 988
🆘 Emergency Services: 911
🆘 Crisis Text Line: Text HOME to 741741

A healthcare specialist has been alerted and will reach out to you shortly. You are not alone.`;
  }

  getViolationReport() {
    return {
      totalViolations: this.violations.length,
      violations: this.violations,
      generatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Guardrail Rules Reference (for documentation/compliance)
 */
const GUARDRAIL_RULES = {
  HARD_STOPS: [
    { rule: 'NO_DIAGNOSIS', description: 'Agent must never diagnose a condition', trigger: 'Medical advice patterns' },
    { rule: 'NO_PRESCRIPTION_CHANGE', description: 'Agent cannot alter prescriptions', trigger: 'Prescription modification intent' },
    { rule: 'NO_PII_EXPOSURE', description: 'PII must never appear in any response', trigger: 'PII detected in output' },
    { rule: 'CRISIS_OVERRIDE', description: 'Crisis signals always override normal flow', trigger: 'Crisis keywords detected' },
    { rule: 'CROSS_SESSION_ISOLATION', description: 'Zero data leakage across patient sessions', trigger: 'Cross-session token match' },
  ],
  ESCALATION_TRIGGERS: [
    { trigger: 'ABNORMAL_LAB_VALUES', reason: 'Clinical interpretation requires physician' },
    { trigger: 'DRUG_INTERACTION_CRITICAL', reason: 'Patient safety risk' },
    { trigger: 'LOW_CONFIDENCE_INTENT', reason: 'Misrouting risk' },
    { trigger: 'LATE_CANCELLATION', reason: 'Administrative policy and patient communication' },
    { trigger: 'DOCTOR_APPROVAL_NEEDED', reason: 'Controlled substance refill policy' },
  ],
  THRESHOLDS: {
    INTENT_CONFIDENCE_MIN: 0.75,
    RESPONSE_LATENCY_MAX_MS: 3000,
    ESCALATION_QUEUE_MAX: 50,
    SESSION_TIMEOUT_MINUTES: 30,
  },
};

module.exports = { GuardrailEngine, GUARDRAIL_RULES };
