import express from 'express';
import requireAuth from '../middleware/requireAuth.js';
import rbac from '../middleware/rbacMiddleware.js';
import userController from '../controllers/userController.js';

const router = express.Router();
router.use(requireAuth, rbac(['admin']));

router.get('/users',            userController.listUsers);
router.put('/users/:id/status', userController.setUserStatus);

export default router;
