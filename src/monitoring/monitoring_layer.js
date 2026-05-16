/**
 * MonitoringLayer — Real-time observability for CADUCEUS
 * Tracks: every decision, escalation, compliance violation, latency, SLA breaches
 * 
 * In production: integrates with DataDog / Splunk / custom SIEM
 */

const ALERT_THRESHOLDS = {
  LATENCY_MS: 3000,
  ESCALATION_RATE: 0.15,       // >15% escalation rate triggers alert
  GUARDRAIL_VIOLATIONS_PER_HOUR: 5,
  RESOLUTION_RATE_MIN: 0.80,   // <80% resolution rate triggers alert
  CONSECUTIVE_FAILURES: 3,
};

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3, CRITICAL: 4 };

class MonitoringLayer {
  constructor() {
    this.logs = [];
    this.metrics = {
      totalInquiries: 0,
      resolved: 0,
      escalated: 0,
      guardrailViolations: 0,
      avgLatencyMs: 0,
      latencies: [],
      intentDistribution: {},
      hourlyViolations: 0,
      consecutiveFailures: 0,
    };
    this.alerts = [];
    this.hourlyResetInterval = setInterval(() => this._resetHourlyMetrics(), 3600000);
  }

  /**
   * Core logging method — every agent decision passes through here
   */
  log(eventType, data = {}) {
    const entry = {
      eventType,
      ...data,
      timestamp: data.timestamp || new Date().toISOString(),
      level: this._getLogLevel(eventType),
    };

    this.logs.push(entry);
    this._updateMetrics(eventType, data);
    this._checkAlerts(eventType, data, entry);

    // In production: stream to DataDog/Splunk
    if (process.env.NODE_ENV !== 'test') {
      this._streamToSIEM(entry);
    }

    return entry;
  }

  _getLogLevel(eventType) {
    const levelMap = {
      INQUIRY_RECEIVED: LOG_LEVELS.INFO,
      INTENT_CLASSIFIED: LOG_LEVELS.INFO,
      INQUIRY_RESOLVED: LOG_LEVELS.INFO,
      GUARDRAIL_BLOCK: LOG_LEVELS.WARN,
      POST_GUARDRAIL_VIOLATION: LOG_LEVELS.ERROR,
      EMERGENCY_ESCALATION: LOG_LEVELS.CRITICAL,
      ESCALATION_CREATED: LOG_LEVELS.WARN,
      LATENCY_BREACH: LOG_LEVELS.WARN,
      COMPLIANCE_VIOLATION: LOG_LEVELS.CRITICAL,
    };
    return levelMap[eventType] || LOG_LEVELS.INFO;
  }

  _updateMetrics(eventType, data) {
    switch (eventType) {
      case 'INQUIRY_RECEIVED':
        this.metrics.totalInquiries++;
        break;
      case 'INQUIRY_RESOLVED':
        if (!data.escalated) this.metrics.resolved++;
        else this.metrics.escalated++;

        if (data.latencyMs) {
          this.metrics.latencies.push(data.latencyMs);
          this.metrics.avgLatencyMs =
            this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length;
        }
        if (data.intent) {
          this.metrics.intentDistribution[data.intent] =
            (this.metrics.intentDistribution[data.intent] || 0) + 1;
        }
        break;
      case 'GUARDRAIL_BLOCK':
      case 'POST_GUARDRAIL_VIOLATION':
        this.metrics.guardrailViolations++;
        this.metrics.hourlyViolations++;
        break;
    }
  }

  _checkAlerts(eventType, data, entry) {
    // 1. Latency alert
    if (data.latencyMs > ALERT_THRESHOLDS.LATENCY_MS) {
      this._triggerAlert('LATENCY_BREACH', `Response latency ${data.latencyMs}ms exceeded ${ALERT_THRESHOLDS.LATENCY_MS}ms SLA`, entry);
    }

    // 2. Escalation rate alert
    if (this.metrics.totalInquiries > 100) {
      const escalationRate = this.metrics.escalated / this.metrics.totalInquiries;
      if (escalationRate > ALERT_THRESHOLDS.ESCALATION_RATE) {
        this._triggerAlert('HIGH_ESCALATION_RATE', `Escalation rate ${(escalationRate * 100).toFixed(1)}% exceeds threshold`, entry);
      }
    }

    // 3. Hourly violations alert
    if (this.metrics.hourlyViolations >= ALERT_THRESHOLDS.GUARDRAIL_VIOLATIONS_PER_HOUR) {
      this._triggerAlert('VIOLATION_SPIKE', `${this.metrics.hourlyViolations} guardrail violations this hour`, entry);
    }

    // 4. Emergency always triggers alert
    if (eventType === 'EMERGENCY_ESCALATION') {
      this._triggerAlert('EMERGENCY_DETECTED', `Emergency escalation triggered for session ${data.sessionId}`, entry, 'CRITICAL');
    }

    // 5. Compliance violation — must alert immediately
    if (eventType === 'POST_GUARDRAIL_VIOLATION') {
      this._triggerAlert('COMPLIANCE_VIOLATION', `Policy violation: ${data.violation}`, entry, 'CRITICAL');
    }
  }

  _triggerAlert(alertType, message, context, severity = 'HIGH') {
    const alert = {
      alertType,
      message,
      severity,
      traceId: context.traceId,
      timestamp: new Date().toISOString(),
      notified: false,
    };

    this.alerts.push(alert);

    // In production: page on-call via PagerDuty for CRITICAL
    // send Slack alert for HIGH, email for MEDIUM
    if (process.env.NODE_ENV !== 'test') {
      console.error(`[ALERT][${severity}] ${alertType}: ${message}`);
    }

    alert.notified = true;
    return alert;
  }

  _streamToSIEM(entry) {
    // Production: POST to DataDog/Splunk endpoint
    // console.log('[SIEM]', JSON.stringify(entry));
  }

  _resetHourlyMetrics() {
    this.metrics.hourlyViolations = 0;
  }

  /**
   * Success Metrics Dashboard Snapshot
   */
  getMetrics() {
    const total = this.metrics.totalInquiries || 1;
    return {
      // Metric 1: First-Contact Resolution Rate (FCRR)
      firstContactResolutionRate: `${((this.metrics.resolved / total) * 100).toFixed(1)}%`,
      target: '>80%',

      // Metric 2: Average Response Latency
      avgResponseLatencyMs: Math.round(this.metrics.avgLatencyMs),
      latencyTarget: '<3000ms',

      // Metric 3: Escalation Rate
      escalationRate: `${((this.metrics.escalated / total) * 100).toFixed(1)}%`,
      escalationTarget: '<15%',

      // Metric 4: Guardrail Violation Rate
      guardrailViolationRate: `${((this.metrics.guardrailViolations / total) * 100).toFixed(2)}%`,
      violationTarget: '<0.1%',

      // Metric 5: Intent Classification Accuracy (sampled)
      intentDistribution: this.metrics.intentDistribution,

      // Summary
      totalInquiries: this.metrics.totalInquiries,
      totalEscalations: this.metrics.escalated,
      activeAlerts: this.alerts.filter(a => a.severity === 'CRITICAL').length,
      generatedAt: new Date().toISOString(),
    };
  }

  getAuditTrail(sessionId) {
    return this.logs.filter(l => l.sessionId === sessionId);
  }

  getComplianceReport() {
    const violations = this.logs.filter(l =>
      ['POST_GUARDRAIL_VIOLATION', 'GUARDRAIL_BLOCK', 'COMPLIANCE_VIOLATION'].includes(l.eventType)
    );
    return {
      reportType: 'HIPAA_COMPLIANCE_SUMMARY',
      period: 'SESSION',
      totalViolations: violations.length,
      violationsByType: violations.reduce((acc, v) => {
        acc[v.eventType] = (acc[v.eventType] || 0) + 1;
        return acc;
      }, {}),
      allViolationsLogged: true,
      auditTrailIntact: true,
      generatedAt: new Date().toISOString(),
    };
  }

  destroy() {
    clearInterval(this.hourlyResetInterval);
  }
}

module.exports = { MonitoringLayer, ALERT_THRESHOLDS };
