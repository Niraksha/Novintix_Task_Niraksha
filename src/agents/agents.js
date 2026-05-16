/**
 * Prescription Validation Agent
 * Handles: refill requests, drug interaction checks, dosage queries
 * Tools: Pharmacy API, Drug Interaction DB, EHR
 * GUARDRAIL: Never prescribe or change dosage — only validate and relay
 */

class PrescriptionAgent {
  constructor() {
    this.name = 'PrescriptionAgent';
    // Hard list of actions this agent is NEVER allowed to perform
    this.forbiddenActions = ['prescribe', 'change_dosage', 'discontinue', 'recommend_drug'];
  }

  async handle({ message, session, traceId }) {
    const action = this._detectAction(message);

    if (this.forbiddenActions.includes(action)) {
      return {
        content: 'For prescription changes or new medications, please speak directly with your physician.',
        status: 'HARD_STOP',
        escalated: true,
        escalationReason: 'PRESCRIPTION_CHANGE_ATTEMPTED',
      };
    }

    switch (action) {
      case 'refill':
        return await this._processRefill(message, session, traceId);
      case 'drug_info':
        return await this._getDrugInfo(message, session, traceId);
      case 'interaction_check':
        return await this._checkInteractions(message, session, traceId);
      default:
        return await this._getMedications(session, traceId);
    }
  }

  _detectAction(message) {
    const lower = message.toLowerCase();
    if (/\b(refill|renew|reorder)\b/.test(lower)) return 'refill';
    if (/\b(interaction|mix|combine|take together)\b/.test(lower)) return 'interaction_check';
    if (/\b(what is|information about|side effect|use of)\b/.test(lower)) return 'drug_info';
    if (/\b(prescribe|new medication|change dose|stop taking|increase|decrease)\b/.test(lower)) return 'prescribe'; // forbidden
    return 'list_medications';
  }

  async _processRefill(message, session, traceId) {
    // [TOOL CALL] → EHR: get current medications
    // [TOOL CALL] → Pharmacy API: check refill eligibility
    const medications = await this._callEHR('get_medications', { patientId: session.patientId });
    const refillStatus = await this._callPharmacyAPI('check_refill_eligibility', {
      patientId: session.patientId,
      medications,
    });

    if (refillStatus.requiresDoctorApproval) {
      return {
        content: `Your refill for ${refillStatus.medicationName} requires physician approval. A request has been sent to Dr. ${refillStatus.prescribingDoctor}. You will be notified within 24 hours.`,
        status: 'PENDING_APPROVAL',
        escalated: true,
        escalationReason: 'DOCTOR_APPROVAL_NEEDED',
      };
    }

    await this._callPharmacyAPI('submit_refill', { patientId: session.patientId, refillStatus });

    return {
      content: `Refill request submitted for ${refillStatus.medicationName} (${refillStatus.dosage}). Ready for pickup at ${refillStatus.pharmacy} in approximately 2 hours.`,
      status: 'RESOLVED',
      escalated: false,
    };
  }

  async _getDrugInfo(message, session, traceId) {
    // Returns only FDA-approved label information — no medical advice
    return {
      content: `I can share official FDA-approved information about your medication. For personalized medical advice about how this medication affects you specifically, please consult your physician or pharmacist.`,
      status: 'RESOLVED',
      escalated: false,
    };
  }

  async _checkInteractions(message, session, traceId) {
    const medications = await this._callEHR('get_medications', { patientId: session.patientId });
    const interactions = await this._callDrugDB('check_interactions', { medications });

    if (interactions.criticalFound) {
      return {
        content: `⚠️ A potential interaction was flagged. Escalating to your care team immediately for review.`,
        status: 'ESCALATED',
        escalated: true,
        escalationReason: 'DRUG_INTERACTION_CRITICAL',
      };
    }

    return {
      content: `No critical interactions found among your current medications. For complete details, please confirm with your pharmacist.`,
      status: 'RESOLVED',
      escalated: false,
    };
  }

  async _getMedications(session, traceId) {
    const meds = await this._callEHR('get_medications', { patientId: session.patientId });
    return {
      content: `Your current active medications on file: ${meds.map(m => `${m.name} ${m.dosage}`).join(', ')}. For any questions about your medications, contact your prescribing physician.`,
      status: 'RESOLVED',
      escalated: false,
    };
  }

  async _callEHR(action, params) {
    return [{ name: 'Metformin', dosage: '500mg', refillsLeft: 2, prescribingDoctor: 'Chen' }];
  }

  async _callPharmacyAPI(action, params) {
    return { medicationName: 'Metformin', dosage: '500mg', requiresDoctorApproval: false, pharmacy: 'CVS Main St' };
  }

  async _callDrugDB(action, params) {
    return { criticalFound: false, interactions: [] };
  }
}

/**
 * Lab Report Explanation Agent
 * Handles: explaining lab results, reference ranges, trend analysis
 * GUARDRAIL: Explains results using approved ranges only — never diagnoses
 */
class ReportAgent {
  constructor() {
    this.name = 'ReportAgent';
  }

  async handle({ message, session, traceId }) {
    // [TOOL CALL] → EHR: fetch lab results
    const report = await this._callEHR('get_lab_results', { patientId: session.patientId });

    const abnormalValues = report.values.filter(v => v.flagged);

    if (abnormalValues.length > 0) {
      // Abnormal values always get escalated for physician review
      return {
        content: `Your recent ${report.testName} results are available. Some values are outside the standard reference range. Your care team has been notified and will contact you within 24 hours to discuss.
                  \nFor urgent concerns, please call our nurse line at 1-800-HEALTH.`,
        status: 'ESCALATED',
        escalated: true,
        escalationReason: 'ABNORMAL_LAB_VALUES',
        toolsUsed: ['EHR'],
      };
    }

    return {
      content: `Your ${report.testName} results from ${report.date} are within normal reference ranges. 
               ${report.values.map(v => `• ${v.name}: ${v.value} ${v.unit} (Normal: ${v.refRange})`).join('\n')}
               \nFor a detailed interpretation, please discuss with your physician at your next appointment.`,
      status: 'RESOLVED',
      escalated: false,
    };
  }

  async _callEHR(action, params) {
    return {
      testName: 'Complete Blood Count',
      date: '2025-05-12',
      values: [
        { name: 'Hemoglobin', value: 14.2, unit: 'g/dL', refRange: '13.5-17.5', flagged: false },
        { name: 'WBC', value: 7.4, unit: 'K/uL', refRange: '4.5-11.0', flagged: false },
      ],
    };
  }
}

/**
 * Human Escalation Agent
 * Handles: emergencies, complex queries, complaints, escalation routing
 * This agent is the LAST LINE of safety
 */
class EscalationAgent {
  constructor() {
    this.name = 'EscalationAgent';
    this.escalationQueue = [];
  }

  async handle({ reason, originalMessage, session, traceId }) {
    const ticket = await this._createEscalationTicket({
      reason,
      message: originalMessage,
      sessionId: session?.id,
      patientId: session?.patientId,
      traceId,
      priority: this._getPriority(reason),
    });

    const responseMap = {
      EMERGENCY_DETECTED: `🚨 This appears to be a medical emergency. Please call 911 immediately or go to your nearest Emergency Room. If you need to speak to a nurse, call 1-800-HEALTH now. Ticket #${ticket.id} created for follow-up.`,
      LOW_CONFIDENCE_INTENT: `I want to make sure you get the right help. A healthcare specialist will contact you within 15 minutes. Your reference number is ${ticket.id}.`,
      RESPONSE_VIOLATION: `For the safety of your care, a qualified staff member will assist you directly. Ticket #${ticket.id} has been created with high priority.`,
      DOCTOR_APPROVAL_NEEDED: `Your request requires physician review. Dr. ${ticket.assignedTo} has been notified and will respond within 24 hours. Reference: ${ticket.id}.`,
      DRUG_INTERACTION_CRITICAL: `⚠️ A critical medication concern was identified. Your care team has been alerted. Please do NOT take any new medications until you hear from your doctor. Ticket #${ticket.id}.`,
      ABNORMAL_LAB_VALUES: `Your lab results require physician review. Your care team will contact you within 24 hours. Reference: ${ticket.id}.`,
      LATE_CANCELLATION: `A staff member will call you within 30 minutes to assist with your cancellation. Reference: ${ticket.id}.`,
      DEFAULT: `You've been connected to a healthcare specialist. Reference number: ${ticket.id}. Expected wait time: under 15 minutes.`,
    };

    return {
      content: responseMap[reason] || responseMap.DEFAULT,
      status: 'ESCALATED',
      escalated: true,
      ticketId: ticket.id,
      priority: ticket.priority,
    };
  }

  _getPriority(reason) {
    const critical = ['EMERGENCY_DETECTED', 'DRUG_INTERACTION_CRITICAL'];
    const high = ['ABNORMAL_LAB_VALUES', 'RESPONSE_VIOLATION'];
    if (critical.includes(reason)) return 'CRITICAL';
    if (high.includes(reason)) return 'HIGH';
    return 'MEDIUM';
  }

  async _createEscalationTicket({ reason, message, sessionId, patientId, traceId, priority }) {
    const ticket = {
      id: `ESC-${Date.now().toString(36).toUpperCase()}`,
      reason,
      sessionId,
      patientId,
      traceId,
      priority,
      assignedTo: 'On-Call Nurse',
      createdAt: new Date().toISOString(),
      status: 'OPEN',
    };
    this.escalationQueue.push(ticket);
    // [TOOL CALL] → Ticketing System: create ticket
    // [TOOL CALL] → Notification: alert on-call staff
    return ticket;
  }
}

module.exports = { PrescriptionAgent, ReportAgent, EscalationAgent };
