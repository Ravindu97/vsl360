import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { validate } from '../middleware/validate';
import { createUserSchema, updateUserSchema } from '../validators/user.schema';

const router = Router();

router.use(authenticate, authorize('OPS_MANAGER'));

router.get('/', (req, res) => userController.findAll(req, res));
router.post('/', validate(createUserSchema), (req, res) => userController.create(req, res));
router.get('/:id', (req, res) => userController.findById(req, res));
router.put('/:id', validate(updateUserSchema), (req, res) => userController.update(req, res));
router.delete('/:id', (req, res) => userController.delete(req, res));

export default router;
