import { Router } from 'express';
import { SessionController, UserController } from './app/controllers';
import { authMiddleware } from './app/middlewares';

const routes = new Router();

routes.post('/users', UserController.store);
routes.post('/sessions', SessionController.store);

routes.use(authMiddleware);

routes.put('/users', UserController.update);

export default routes;
