import express from 'express';
import requireAuth from '../middleware/requireAuth.js';
import rbac from '../middleware/rbacMiddleware.js';
import userController from '../controllers/userController.js';

const router = express.Router();
router.use(requireAuth, rbac(['facility_manager', 'admin']));

router.get('/workers',            userController.listWorkers);
router.put('/workers/:id/status', userController.setWorkerStatus);

export default router;
