import { Router } from 'express';
import multer from 'multer';

import {
  SessionController,
  UserController,
  FileController,
  ProviderController,
  AppointmentController,
} from './app/controllers';
import { authMiddleware } from './app/middlewares';
import { multerConfig } from './config';

const routes = new Router();
const upload = multer(multerConfig);

routes.get('/', (req, res) => res.json({ message: 'API is running' }));
routes.post('/users', UserController.store);
routes.post('/sessions', SessionController.store);

routes.use(authMiddleware);

routes.put('/users', UserController.update);

routes.get('/providers', ProviderController.index);

routes.post('/appointments', AppointmentController.store);

routes.post('/files', upload.single('file'), FileController.store);

export default routes;
