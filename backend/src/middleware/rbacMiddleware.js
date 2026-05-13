/**
 * Middleware to check if the user's role is permitted for a route.
 * @param {string[]} roles - Array of allowed roles
 */
export default function rbac(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to perform this action.' });
    }
    next();
  };
}
