import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

export default class AuthMiddleware {
  public async handle(ctx: HttpContext, next: NextFn) {
    const authHeader = ctx.request.header('authorization')

    if (!authHeader) {
      return ctx.response.status(401).json({
        success: false,
        error: 'No authorization',
        message: 'Token missing or invalid',
      })
    }

    try {
      await ctx.auth.authenticateUsing(['api'])
      await next()
    } catch (error) {
      return ctx.response.status(401).json({
        success: false,
        error: 'No authorization',
        message: 'Token missing or invalid',
        debug: error.message,
      })
    }
  }
}
