/**
 * src/controllers/reports.controller.js
 * Dashboard stats. Superadmin: platform. Admin: university-scoped.
 */

const reportService = require('../services/report.service');

async function get(req, res) {
  try {
    const role = String(req.user?.role ?? '').toLowerCase();
    if (role === 'superadmin') {
      const stats = await reportService.getPlatformStats();
      return res.status(200).json({ success: true, data: stats });
    }
    if (role === 'admin') {
      const universityId = req.user?.adminUniversityID;
      if (universityId == null) {
        return res.status(403).json({ success: false, error: 'Admin university not set' });
      }
      const stats = await reportService.getUniversityStats(universityId);
      return res.status(200).json({ success: true, data: stats });
    }
    return res.status(403).json({ success: false, error: 'Admin or superadmin only' });
  } catch (err) {
    console.error('reports.get', err);
    res.status(500).json({ success: false, error: 'Failed to get reports' });
  }
}

function clampMonths(raw) {
  const n = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return 12;
  return Math.min(n, 36);
}

function clampLimit(raw, defaultLimit = 10, max = 30) {
  const n = Number.parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return defaultLimit;
  return Math.min(n, max);
}

/** GET /reports/payment-trend?months=12 — monthly payment totals for charts */
async function getPaymentTrend(req, res) {
  try {
    const months = clampMonths(req.query.months);
    const role = String(req.user?.role ?? '').toLowerCase();
    if (role === 'superadmin') {
      const series = await reportService.getPlatformPaymentTrend(months);
      return res.status(200).json({ success: true, data: { months, series } });
    }
    if (role === 'admin') {
      const universityId = req.user?.adminUniversityID;
      if (universityId == null) {
        return res.status(403).json({ success: false, error: 'Admin university not set' });
      }
      const series = await reportService.getUniversityPaymentTrend(universityId, months);
      return res.status(200).json({ success: true, data: { months, series } });
    }
    return res.status(403).json({ success: false, error: 'Admin or superadmin only' });
  } catch (err) {
    console.error('reports.getPaymentTrend', err);
    res.status(500).json({ success: false, error: 'Failed to get payment trend' });
  }
}

/** GET /reports/exchange-trend?months=12 — exchanges created per month */
async function getExchangeTrend(req, res) {
  try {
    const months = clampMonths(req.query.months);
    const role = String(req.user?.role ?? '').toLowerCase();
    if (role === 'superadmin') {
      const series = await reportService.getPlatformExchangeTrend(months);
      return res.status(200).json({ success: true, data: { months, series } });
    }
    if (role === 'admin') {
      const universityId = req.user?.adminUniversityID;
      if (universityId == null) {
        return res.status(403).json({ success: false, error: 'Admin university not set' });
      }
      const series = await reportService.getUniversityExchangeTrend(universityId, months);
      return res.status(200).json({ success: true, data: { months, series } });
    }
    return res.status(403).json({ success: false, error: 'Admin or superadmin only' });
  } catch (err) {
    console.error('reports.getExchangeTrend', err);
    res.status(500).json({ success: false, error: 'Failed to get exchange trend' });
  }
}

/** GET /reports/top-skills?limit=10 */
async function getTopSkills(req, res) {
  try {
    const limit = clampLimit(req.query.limit, 10, 30);
    const role = String(req.user?.role ?? '').toLowerCase();
    if (role === 'superadmin') {
      const skills = await reportService.getPlatformTopSkills(limit);
      return res.status(200).json({ success: true, data: { limit, skills } });
    }
    if (role === 'admin') {
      const universityId = req.user?.adminUniversityID;
      if (universityId == null) {
        return res.status(403).json({ success: false, error: 'Admin university not set' });
      }
      const skills = await reportService.getUniversityTopSkills(universityId, limit);
      return res.status(200).json({ success: true, data: { limit, skills } });
    }
    return res.status(403).json({ success: false, error: 'Admin or superadmin only' });
  } catch (err) {
    console.error('reports.getTopSkills', err);
    res.status(500).json({ success: false, error: 'Failed to get top skills' });
  }
}

/** GET /reports/university-leaderboard?limit=10 — superadmin only */
async function getUniversityLeaderboard(req, res) {
  try {
    const limit = clampLimit(req.query.limit, 10, 30);
    const role = String(req.user?.role ?? '').toLowerCase();
    if (role !== 'superadmin') {
      return res.status(403).json({ success: false, error: 'Superadmin only' });
    }
    const universities = await reportService.getUniversityExchangeLeaderboard(limit);
    return res.status(200).json({ success: true, data: { limit, universities } });
  } catch (err) {
    console.error('reports.getUniversityLeaderboard', err);
    res.status(500).json({ success: false, error: 'Failed to get university leaderboard' });
  }
}

module.exports = { get, getPaymentTrend, getExchangeTrend, getTopSkills, getUniversityLeaderboard };
