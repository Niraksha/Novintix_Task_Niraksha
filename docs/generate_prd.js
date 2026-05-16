const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageBreak
} = require('docx');
const fs = require('fs');

const BRAND_BLUE = '1B4F8A';
const LIGHT_BLUE = 'D6E4F0';
const ACCENT_TEAL = '0E7C7B';
const GRAY = '5D6D7E';
const LIGHT_GRAY = 'F2F3F4';

const border = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: BRAND_BLUE, space: 4 } },
    children: [new TextRun({ text, bold: true, color: BRAND_BLUE, size: 28, font: 'Arial' })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 80 },
    children: [new TextRun({ text, bold: true, color: ACCENT_TEAL, size: 24, font: 'Arial' })],
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text, size: 22, font: 'Arial', ...opts })],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 22, font: 'Arial' })],
  });
}

function makeTable(headers, rows, colWidths) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => new TableCell({
      borders,
      width: { size: colWidths[i], type: WidthType.DXA },
      shading: { fill: BRAND_BLUE, type: ShadingType.CLEAR },
      margins: { top: 100, bottom: 100, left: 150, right: 150 },
      children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 20, font: 'Arial' })] })],
    })),
  });

  const dataRows = rows.map((row, ri) => new TableRow({
    children: row.map((cell, i) => new TableCell({
      borders,
      width: { size: colWidths[i], type: WidthType.DXA },
      shading: { fill: ri % 2 === 0 ? 'FFFFFF' : LIGHT_GRAY, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 150, right: 150 },
      children: [new Paragraph({ children: [new TextRun({ text: cell, size: 20, font: 'Arial' })] })],
    })),
  }));

  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [headerRow, ...dataRows],
  });
}

const doc = new Document({
  numbering: {
    config: [{
      reference: 'bullets',
      levels: [{
        level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }, {
        level: 1, format: LevelFormat.BULLET, text: '○', alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 1080, hanging: 360 } } },
      }],
    }],
  },
  styles: {
    default: { document: { run: { font: 'Arial', size: 22 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: BRAND_BLUE },
        paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: ACCENT_TEAL },
        paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 1 } },
    ],
  },
  sections: [{
    properties: {
      page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
    },
    children: [
      // Cover
      new Paragraph({ spacing: { before: 1440, after: 200 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'CADUCEUS', bold: true, size: 56, color: BRAND_BLUE, font: 'Arial' })] }),
      new Paragraph({ spacing: { before: 0, after: 100 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Central Agentic Director for Universal Clinical Efficiency & Understanding System', size: 24, color: GRAY, font: 'Arial', italics: true })] }),
      new Paragraph({ spacing: { before: 200, after: 600 }, alignment: AlignmentType.CENTER,
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: ACCENT_TEAL, space: 4 } },
        children: [new TextRun({ text: 'Product Requirements Document (PRD)', bold: true, size: 28, color: ACCENT_TEAL, font: 'Arial' })] }),
      new Paragraph({ spacing: { before: 400, after: 80 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Version 1.0  |  Healthcare AI Systems Design Challenge', size: 20, color: GRAY, font: 'Arial' })] }),
      new Paragraph({ spacing: { before: 80, after: 1440 }, alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: 'Confidential — Internal Use Only', size: 18, color: GRAY, font: 'Arial', italics: true })] }),

      // Page Break
      new Paragraph({ children: [new PageBreak()] }),

      // Section 1: Executive Summary
      h1('1. Executive Summary'),
      body('Healthcare providers receiving 5,000+ patient inquiries daily face a systemic capacity crisis. Response delays lead to missed appointments, medication non-adherence, and declining patient satisfaction — all of which carry measurable clinical and financial consequences.'),
      body('CADUCEUS is an orchestrated multi-agent AI system designed to resolve the majority of routine patient inquiries within 3 seconds, 24 hours a day, 7 days a week — while enforcing HIPAA-compliant guardrails and maintaining a complete audit trail for every interaction.'),
      body(''),
      makeTable(
        ['Metric', 'Current State', 'Target with CADUCEUS'],
        [
          ['Average Response Time', '35–45 minutes (hold queue)', '< 3 seconds (AI) / < 15 min (escalation)'],
          ['Daily Inquiry Capacity', '~800 (staff-limited)', '5,000+ (AI-handled)'],
          ['First Contact Resolution', '~55%', '> 80%'],
          ['After-Hours Coverage', '0% (voicemail only)', '100% (24/7 AI)'],
          ['HIPAA Audit Coverage', 'Partial / manual', '100% automated, immutable log'],
        ],
        [2800, 3280, 3280]
      ),

      new Paragraph({ children: [new PageBreak()] }),

      // Section 2: Problem Statement
      h1('2. Problem Statement'),
      body('HOW MIGHT WE...', { bold: true, color: BRAND_BLUE, size: 24 }),
      new Paragraph({
        spacing: { before: 120, after: 120 },
        shading: { fill: LIGHT_BLUE, type: ShadingType.CLEAR },
        border: { left: { style: BorderStyle.SINGLE, size: 20, color: ACCENT_TEAL, space: 8 } },
        children: [new TextRun({
          text: '"How Might We reduce patient inquiry response time from hours to seconds for patients seeking appointments, prescriptions, lab results, and insurance help — so that no patient faces a health risk because the healthcare system was too slow to respond?"',
          size: 22, font: 'Arial', italics: true, color: BRAND_BLUE,
        })],
      }),
      body(''),
      h2('2.1 Stakeholder Impact Analysis'),
      makeTable(
        ['Stakeholder', 'Pain Point', 'Risk If Unaddressed'],
        [
          ['Patient', 'Long hold times, no 24/7 access, confusing lab results', 'Medication non-adherence, missed diagnoses, ER overuse'],
          ['Front-Desk Staff', '200+ repetitive calls/day, no capacity for complex cases', 'Burnout, turnover, errors under pressure'],
          ['Physician', 'Inbox flooded with routine requests', 'Delayed clinical decisions, burnout'],
          ['Healthcare Organization', 'Declining CSAT, no-show revenue loss, compliance risk', 'CMS penalties, reputation damage, revenue loss'],
          ['Insurance/Payers', 'Incorrect claims from human error', 'Processing delays, fraud exposure'],
        ],
        [2000, 3680, 3680]
      ),

      new Paragraph({ children: [new PageBreak()] }),

      // Section 3: System Design
      h1('3. Agent System Design'),
      h2('3.1 Orchestrator — The Central Router'),
      body('The Orchestrator is the brain of CADUCEUS. Every incoming patient message passes through the orchestrator before reaching any specialized agent. It performs five functions in sequence:'),
      bullet('Session Isolation: Creates a clean, isolated session for each patient interaction — no data from previous sessions is accessible'),
      bullet('Pre-flight Guardrail Check: Scans the incoming message for crisis signals, PII exposure, and prohibited topics before any routing occurs'),
      bullet('Intent Classification: Uses NLP pattern matching (production: fine-tuned transformer) to classify the inquiry type with a confidence score'),
      bullet('Agent Routing: Dispatches to the appropriate specialized agent based on intent type and confidence threshold (≥ 75%)'),
      bullet('Post-response Validation: Scans every agent response for medical advice patterns or PII before delivering to the patient'),
      body(''),
      h2('3.2 Specialized Agents'),
      makeTable(
        ['Agent', 'Handles', 'Tools Required', 'Escalation Condition'],
        [
          ['Appointment Agent', 'Book, reschedule, cancel appointments; insurance verification', 'Calendar API, EHR (FHIR), Insurance Verifier, Notification Service', 'Cancellation < 24h before appointment'],
          ['Prescription Agent', 'Refill requests, drug information (FDA-approved only), interaction checks', 'Pharmacy API, Drug Interaction DB, EHR', 'Controlled substances, critical interactions, doctor approval needed'],
          ['Report Agent', 'Lab result explanation using standard reference ranges', 'EHR, Lab Information System', 'Any value flagged as outside normal reference range'],
          ['Escalation Agent', 'Human handoff, emergency routing, ticket creation, crisis response', 'Ticketing System, PagerDuty, Nurse Line Integration', 'This IS the escalation pathway — handles all critical cases'],
        ],
        [1800, 2200, 2560, 2800]
      ),
      body(''),
      h2('3.3 Human Escalation Framework'),
      body('Escalation is not a fallback — it is a designed, optimized pathway with defined SLAs:'),
      makeTable(
        ['Priority', 'Trigger', 'Response SLA', 'Escalation Path'],
        [
          ['CRITICAL', 'Emergency keywords, crisis signals, drug interaction', 'Immediate (<1 min)', '911 redirect + on-call nurse page via PagerDuty'],
          ['HIGH', 'Abnormal lab values, compliance violations', '< 2 hours', 'Physician inbox + nurse notification'],
          ['MEDIUM', 'Low confidence intent, late cancellation', '< 15 minutes', 'Front-desk specialist callback queue'],
          ['LOW', 'Doctor approval for refill', '< 24 hours', 'Physician approval queue in EHR'],
        ],
        [1800, 2400, 1800, 3360]
      ),

      new Paragraph({ children: [new PageBreak()] }),

      // Section 4: Guardrails
      h1('4. Guardrails & Compliance'),
      h2('4.1 Hard Stops — Never Bypassed'),
      makeTable(
        ['Rule', 'Description', 'Trigger Condition', 'Action'],
        [
          ['NO_DIAGNOSIS', 'Agent cannot diagnose any medical condition', 'Response contains diagnostic language', 'Block response, escalate to physician'],
          ['NO_PRESCRIPTION_CHANGE', 'Agent cannot create, modify, or discontinue prescriptions', 'Prescription modification intent detected', 'Hard stop, redirect to physician'],
          ['NO_PII_EXPOSURE', 'Patient PII must never appear in any response', 'SSN, DOB, account numbers detected in output', 'Block response, HIPAA alert triggered'],
          ['CRISIS_OVERRIDE', 'Suicidal or self-harm signals always escalate immediately', 'Crisis keywords detected at any point', 'Immediate 988/911 redirect + alert'],
          ['SESSION_ISOLATION', 'Zero data leakage across patient sessions', 'Cross-session token detected', 'Block, CRITICAL compliance alert'],
        ],
        [1800, 2200, 2160, 3200]
      ),
      body(''),
      h2('4.2 Escalation Thresholds'),
      bullet('Intent classification confidence < 75% → route to human specialist'),
      bullet('Response latency > 3,000ms → alert + queue review'),
      bullet('Guardrail violations > 5 per hour → CISO notification'),
      bullet('Escalation rate > 20% → system review triggered'),
      bullet('Any CRITICAL guardrail violation → immediate incident response'),

      new Paragraph({ children: [new PageBreak()] }),

      // Section 5: Monitoring
      h1('5. Monitoring & Success Metrics'),
      h2('5.1 What Is Logged'),
      body('Every agent decision generates an immutable log entry containing:'),
      bullet('Trace ID (unique per inquiry, links all events in a flow)'),
      bullet('Session ID (anonymized — never contains patient name or MRN directly)'),
      bullet('Intent classification result and confidence score'),
      bullet('Agent selected and tool calls made'),
      bullet('Guardrail check results (pre and post)'),
      bullet('Response latency in milliseconds'),
      bullet('Escalation reason (if applicable)'),
      bullet('Timestamp (ISO 8601)'),
      body(''),
      h2('5.2 Alert Conditions'),
      makeTable(
        ['Alert Type', 'Trigger Condition', 'Severity', 'Notification Channel'],
        [
          ['LATENCY_BREACH', 'P95 response latency > 3,000ms', 'HIGH', 'Slack #ops-alerts'],
          ['HIGH_ESCALATION_RATE', 'Escalation rate > 15% over 1 hour', 'HIGH', 'Slack + Email to team lead'],
          ['VIOLATION_SPIKE', '5+ guardrail violations in 1 hour', 'CRITICAL', 'PagerDuty + CISO email'],
          ['EMERGENCY_DETECTED', 'Any emergency escalation triggered', 'CRITICAL', 'Immediate PagerDuty page'],
          ['COMPLIANCE_VIOLATION', 'Medical advice or PII in response', 'CRITICAL', 'Incident ticket + CISO'],
        ],
        [2000, 2400, 1400, 3560]
      ),
      body(''),
      h2('5.3 Success Metrics'),
      makeTable(
        ['Metric', 'Definition', 'Target', 'Measurement Method'],
        [
          ['First Contact Resolution Rate', '% of inquiries resolved by AI without human intervention', '> 80%', 'resolved_count / total_inquiries'],
          ['Average Response Latency (P95)', '95th percentile end-to-end response time', '< 3,000ms', 'Latency histogram in monitoring layer'],
          ['Escalation Rate', '% of inquiries requiring human handoff', '10–15%', 'escalated_count / total_inquiries'],
          ['Guardrail Violation Rate', 'Policy violations caught per total inquiries', '< 0.1%', 'violations / total_inquiries'],
          ['Patient Satisfaction Score', 'Post-interaction CSAT (1–5 stars)', '> 4.2 / 5.0', 'Optional post-chat survey'],
        ],
        [2200, 2200, 1400, 3560]
      ),

      new Paragraph({ children: [new PageBreak()] }),

      // Section 6: Tech Stack
      h1('6. Technology Stack'),
      makeTable(
        ['Layer', 'Technology', 'Purpose'],
        [
          ['Orchestrator', 'Node.js / Python (FastAPI)', 'Routing, session management, guardrail enforcement'],
          ['Intent Classification', 'Fine-tuned BERT / GPT-4o', 'Multi-class intent classification with confidence scoring'],
          ['EHR Integration', 'HL7 FHIR R4 APIs', 'Patient records, appointments, medications'],
          ['Pharmacy Integration', 'REST API (Surescripts)', 'Refill eligibility, submission, drug interactions'],
          ['Guardrail Engine', 'Custom rule engine + LLM classifier', 'Medical advice detection, PII scanning'],
          ['Monitoring', 'DataDog / Splunk + Custom Metrics Layer', 'Real-time observability, HIPAA audit trail'],
          ['Alerting', 'PagerDuty + Slack webhooks', 'Incident response, on-call notification'],
          ['Data Storage', 'Session-scoped in-memory (Redis TTL 30min)', 'HIPAA-compliant session isolation'],
          ['Audit Log', 'Immutable append-only store (AWS CloudTrail)', 'Compliance, legal hold, forensics'],
        ],
        [2000, 3000, 4360]
      ),

      new Paragraph({ children: [new PageBreak()] }),

      // Section 7: Risks
      h1('7. Risks & Mitigations'),
      makeTable(
        ['Risk', 'Likelihood', 'Impact', 'Mitigation'],
        [
          ['Medical advice slips through guardrails', 'Low', 'Critical', 'Dual-layer guardrail (pre + post check), red-team testing'],
          ['Intent misclassification routes to wrong agent', 'Medium', 'High', 'Confidence threshold < 75% → human escalation'],
          ['Patient PII exposed in response', 'Very Low', 'Critical', 'PII pattern scanner in post-check, automatic block'],
          ['System downtime affects patient safety', 'Low', 'High', 'Graceful degradation to human queue, 99.9% SLA'],
          ['HIPAA audit failure', 'Very Low', 'Critical', 'Immutable audit log, automated compliance reports'],
          ['Over-escalation reduces AI value', 'Medium', 'Medium', 'Weekly escalation reason analysis, retraining loop'],
        ],
        [2200, 1200, 1200, 4760]
      ),

      new Paragraph({ spacing: { before: 1440 } }),
      new Paragraph({ alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: BRAND_BLUE, space: 8 } },
        children: [new TextRun({ text: 'CADUCEUS — Designed with patient safety as the only non-negotiable.', size: 20, italics: true, color: GRAY, font: 'Arial' })] }),
    ],
  }],
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('/mnt/user-data/outputs/CADUCEUS_PRD.docx', buffer);
  console.log('PRD created successfully');
});
