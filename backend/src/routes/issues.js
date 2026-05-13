import express from 'express';
import multer from 'multer';
import issueController from '../controllers/issueController.js';
import requireAuth from '../middleware/requireAuth.js';
import rbac from '../middleware/rbacMiddleware.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(requireAuth);

router.post('/',          rbac(['community_member']),                upload.single('photo'), issueController.createIssue);
router.get('/',           rbac(['facility_manager', 'admin']),       issueController.getAllIssues);
router.get('/my',         rbac(['community_member']),                issueController.getMyIssues);
router.get('/assigned',   rbac(['worker']),                          issueController.getAssignedIssues);
router.get('/:id',                                                  issueController.getIssueById);

router.put('/:id/status', rbac(['facility_manager', 'worker']),      issueController.updateStatus);
router.put('/:id/assign', rbac(['facility_manager']),                issueController.assignIssue);
router.put('/:id/close',  rbac(['facility_manager']),                issueController.closeIssue);

router.post('/:id/comments', rbac(['facility_manager', 'worker']),   issueController.addComment);
router.post('/:id/photo',    rbac(['worker']), upload.single('photo'), issueController.uploadCompletionPhoto);

router.delete('/:id', rbac(['facility_manager']), issueController.deleteIssue);

export default router;
