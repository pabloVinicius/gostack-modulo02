import { Router } from 'express';
import { SessionController, UserController } from './app/controllers';

const routes = new Router();

routes.post('/users', UserController.store);
routes.post('/sessions', SessionController.store);

export default routes;
