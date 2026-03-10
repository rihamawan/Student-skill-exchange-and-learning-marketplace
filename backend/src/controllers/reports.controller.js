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

module.exports = { get };
