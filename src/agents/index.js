const { PrescriptionAgent, ReportAgent, EscalationAgent } = require('../agents/agents');

module.exports = {
  AppointmentAgent: require('../agents/appointment_agent').AppointmentAgent,
  PrescriptionAgent,
  ReportAgent,
  EscalationAgent,
};
