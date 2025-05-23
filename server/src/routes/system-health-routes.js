const express = require('express');
const { requireAuth, hasRole, auditAction } = require('../middleware/auth');
const {
  getSystemHealth,
  getServiceHealth,
  getContainers,
  getFeatures,
  updateFeature,
  getSystemLogs,
  getSystemMetrics,
  triggerHealthCheck,
  updateContainerStatus,
} = require('../controllers/system-health-controller');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Apply owner and manager role restriction to all routes
router.use(hasRole(['owner', 'manager']));

/**
 * System Health Routes - MVP 7
 * All routes require owner or manager role for access
 */

// GET /api/system/health - Get overall system health status
router.get(
  '/health',
  auditAction('view_system_health'),
  getSystemHealth
);

// GET /api/system/health/services - Get service health status
router.get(
  '/health/services',
  auditAction('view_service_health'),
  getServiceHealth
);

// POST /api/system/health/check - Trigger manual health check
router.post(
  '/health/check',
  auditAction('trigger_health_check'),
  triggerHealthCheck
);

// GET /api/system/containers - Get container status
router.get(
  '/containers',
  auditAction('view_container_status'),
  getContainers
);

// POST /api/system/containers/update - Update container status
router.post(
  '/containers/update',
  auditAction('update_container_status'),
  updateContainerStatus
);

// GET /api/system/features - Get feature flags
router.get(
  '/features',
  auditAction('view_feature_flags'),
  getFeatures
);

// POST /api/system/features/:feature - Update feature flag
router.post(
  '/features/:feature',
  auditAction('update_feature_flag'),
  updateFeature
);

// GET /api/system/logs - Get system logs
router.get(
  '/logs',
  auditAction('view_system_logs'),
  getSystemLogs
);

// GET /api/system/metrics - Get system metrics
router.get(
  '/metrics',
  auditAction('view_system_metrics'),
  getSystemMetrics
);

module.exports = router;