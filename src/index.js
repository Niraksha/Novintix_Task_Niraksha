/**
 * CADUCEUS Healthcare Agentic AI System - Demo Runner
 */
const { Orchestrator } = require('./orchestrator/orchestrator');

async function demo() {
  const orchestrator = new Orchestrator();

  const testCases = [
    { sessionId: 'S001', patientId: 'P123', message: 'I want to schedule an appointment with my cardiologist next week', channel: 'web' },
    { sessionId: 'S002', patientId: 'P456', message: 'Can I get a refill for my metformin prescription?', channel: 'sms' },
    { sessionId: 'S003', patientId: 'P789', message: 'What do my blood test results mean?', channel: 'app' },
    { sessionId: 'S004', patientId: 'P321', message: 'I have severe chest pain and cannot breathe', channel: 'web' },
    { sessionId: 'S005', patientId: 'P654', message: 'What is my insurance copay for specialist visits?', channel: 'web' },
  ];

  console.log('\n🏥 CADUCEUS Healthcare Agentic AI - Demo\n' + '='.repeat(60));

  for (const inquiry of testCases) {
    console.log(`\n📨 Patient [${inquiry.patientId}]: "${inquiry.message}"`);
    const result = await orchestrator.processInquiry(inquiry);
    console.log(`🤖 Intent: ${result.intent?.toUpperCase() || 'N/A'} | Status: ${result.status}`);
    console.log(`📋 Response: ${result.content?.substring(0, 120)}...`);
    console.log(`🔍 Trace: ${result.traceId}`);
  }

  console.log('\n📊 SYSTEM METRICS\n' + '='.repeat(60));
  console.log(JSON.stringify(orchestrator.monitor.getMetrics(), null, 2));

  orchestrator.monitor.destroy();
}

demo().catch(console.error);
