/**
 * authorizeRoles(...allowedRoles)
 *
 * Route guard that runs AFTER `authenticate` (which sets req.user.role).
 * Rejects with 403 if the authenticated user's role is not in the allow-list.
 *
 * Usage:
 *   router.post('/:id/admin-approve', authorizeRoles('admin'), c.adminApprove)
 */
module.exports = function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Your role (${req.user.role}) is not allowed to perform this action`,
      });
    }
    next();
  };
};
