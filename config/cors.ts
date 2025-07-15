import { defineConfig } from '@adonisjs/cors'

/**
 * Configuration options to tweak the CORS policy. The following
 * options are documented on the official documentation website.
 *
 * https://docs.adonisjs.com/guides/security/cors
 */
const corsConfig = defineConfig({
  enabled: true,
  origin: [
    'https://front-angular-bn.vercel.app',
    'https://front-angular-bn-git-main-alejandro-renteria-reyes-projects.vercel.app',
    'http://localhost:4200',
    'https://front-angular-bn.vercel.app'
  ],
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
  headers: true,
  exposeHeaders: ['Authorization'], 
  credentials: true,
  maxAge: 90,
})

export default corsConfig
