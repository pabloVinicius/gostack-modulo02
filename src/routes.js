import { Router } from 'express';
import multer from 'multer';

import {
  SessionController,
  UserController,
  FileController,
} from './app/controllers';
import { authMiddleware } from './app/middlewares';
import { multerConfig } from './config';

const routes = new Router();
const upload = multer(multerConfig);

routes.post('/users', UserController.store);
routes.post('/sessions', SessionController.store);

routes.use(authMiddleware);

routes.put('/users', UserController.update);

routes.post('/files', upload.single('file'), FileController.store);

export default routes;
