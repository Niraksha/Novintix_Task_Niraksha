/**
 * Appointment Scheduling Agent
 * Handles: booking, rescheduling, cancellation, insurance queries
 * Tools: Calendar API, EHR System, Insurance Verifier
 */

class AppointmentAgent {
  constructor() {
    this.name = 'AppointmentAgent';
    this.capabilities = ['book', 'reschedule', 'cancel', 'check_availability', 'insurance_verify'];
  }

  async handle({ message, session, traceId }) {
    const action = this._detectAction(message);

    switch (action) {
      case 'book':
        return await this._bookAppointment(message, session, traceId);
      case 'reschedule':
        return await this._rescheduleAppointment(message, session, traceId);
      case 'cancel':
        return await this._cancelAppointment(message, session, traceId);
      case 'insurance_verify':
        return await this._verifyInsurance(message, session, traceId);
      default:
        return await this._getAvailableSlots(session, traceId);
    }
  }

  _detectAction(message) {
    const lower = message.toLowerCase();
    if (/\b(cancel|cancell)\b/.test(lower)) return 'cancel';
    if (/\b(reschedule|change|move|shift)\b/.test(lower)) return 'reschedule';
    if (/\b(book|schedule|make|set up|appointment)\b/.test(lower)) return 'book';
    if (/\b(insurance|claim|coverage|billing)\b/.test(lower)) return 'insurance_verify';
    return 'check_availability';
  }

  async _bookAppointment(message, session, traceId) {
    // [TOOL CALL] → Calendar API: check doctor availability
    // [TOOL CALL] → EHR: validate patient eligibility
    // [TOOL CALL] → Notification Service: send confirmation SMS/email
    
    // Simulated tool interaction
    const slot = await this._callCalendarAPI('find_next_available', session.patientId);
    const confirmation = await this._callEHR('create_appointment', {
      patientId: session.patientId,
      slot,
      traceId,
    });

    return {
      content: `Your appointment has been scheduled for ${slot.dateTime} with Dr. ${slot.doctor}. 
                Confirmation #: ${confirmation.id}. You will receive an SMS reminder 24 hours before.`,
      status: 'RESOLVED',
      escalated: false,
      toolsUsed: ['CalendarAPI', 'EHR', 'NotificationService'],
    };
  }

  async _rescheduleAppointment(message, session, traceId) {
    const existingAppt = await this._callEHR('get_upcoming_appointment', { patientId: session.patientId });
    if (!existingAppt) {
      return {
        content: 'No upcoming appointment found to reschedule. Would you like to book a new one?',
        status: 'RESOLVED',
        escalated: false,
      };
    }

    const newSlot = await this._callCalendarAPI('find_next_available', session.patientId);
    await this._callEHR('reschedule_appointment', { appointmentId: existingAppt.id, newSlot, traceId });

    return {
      content: `Your appointment has been rescheduled from ${existingAppt.dateTime} to ${newSlot.dateTime}. Confirmation updated.`,
      status: 'RESOLVED',
      escalated: false,
    };
  }

  async _cancelAppointment(message, session, traceId) {
    const appt = await this._callEHR('get_upcoming_appointment', { patientId: session.patientId });
    if (!appt) {
      return { content: 'No upcoming appointments found to cancel.', status: 'RESOLVED', escalated: false };
    }

    // Guardrail: cancellation within 24h requires human confirmation
    const hoursUntilAppt = (new Date(appt.dateTime) - new Date()) / 3600000;
    if (hoursUntilAppt < 24) {
      return {
        content: 'Your appointment is less than 24 hours away. A staff member will call you to confirm cancellation.',
        status: 'ESCALATED',
        escalated: true,
        escalationReason: 'LATE_CANCELLATION',
      };
    }

    await this._callEHR('cancel_appointment', { appointmentId: appt.id, traceId });
    return {
      content: `Your appointment on ${appt.dateTime} has been cancelled. Cancellation confirmation sent to your email.`,
      status: 'RESOLVED',
      escalated: false,
    };
  }

  async _verifyInsurance(message, session, traceId) {
    // [TOOL CALL] → Insurance Verifier API
    const coverage = await this._callInsuranceAPI('verify_coverage', { patientId: session.patientId });
    return {
      content: `Your ${coverage.provider} plan is active. Your copay is $${coverage.copay} and you have met $${coverage.deductibleMet} of your $${coverage.totalDeductible} deductible.`,
      status: 'RESOLVED',
      escalated: false,
    };
  }

  async _getAvailableSlots(session, traceId) {
    const slots = await this._callCalendarAPI('get_available_slots', session.patientId);
    return {
      content: `Available appointment slots this week:\n${slots.map(s => `• ${s.dateTime} with ${s.doctor}`).join('\n')}\nReply with your preferred time to confirm.`,
      status: 'NEEDS_INPUT',
      escalated: false,
    };
  }

  // ---- Mock Tool Calls (replace with real API integrations) ----
  async _callCalendarAPI(action, patientId) {
    return { dateTime: '2025-05-20 10:00 AM', doctor: 'Sarah Chen' };
  }

  async _callEHR(action, params) {
    return { id: `APT-${Math.random().toString(36).substr(2, 8).toUpperCase()}`, dateTime: '2025-05-20 10:00 AM' };
  }

  async _callInsuranceAPI(action, params) {
    return { provider: 'BlueCross', copay: 30, deductibleMet: 850, totalDeductible: 1500 };
  }
}

module.exports = { AppointmentAgent };
