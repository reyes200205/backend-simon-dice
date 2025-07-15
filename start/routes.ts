import { middleware } from './kernel.js'
import router from '@adonisjs/core/services/router'


const AuthController = () => import('../app/controllers/auth_controller.js')
const PartidasController = () => import('../app/controllers/partidas_controller.js')

router.get('/', async () => {
  return {
    hello: 'world',
  }
})

router.group(() => {
  router.post('/register', [AuthController, 'register'])
  router.post('/login', [AuthController, 'login'])
  router.post('/logout', [AuthController, 'logout']).use(middleware.auth())
  router.get('/me', [AuthController, 'me']).use(middleware.auth())
}).prefix('/auth')


router.group(() => {
  router.post('/partidas', [PartidasController, 'create'])
  router.get('/partidas', [PartidasController, 'index'])
  router.get('/sala-espera/:id', [PartidasController, 'salaEspera'])
  router.get('verificar-estado/:id', [PartidasController, 'verificarEstado'])
  router.post('/unirse-partida/:id', [PartidasController, 'unirse'])
  router.get('/partida/:id', [PartidasController, 'obtenerJuego'])
  router.post('/disparo/:id', [PartidasController, 'jugarColor'])
}).use(middleware.auth())