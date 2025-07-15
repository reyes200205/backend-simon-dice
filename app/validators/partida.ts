import vine from '@vinejs/vine'

export const createPartidasValidator = vine.compile(
  vine.object({
    nombre: vine.string().minLength(3).maxLength(50),
    descripcion: vine.string().minLength(5).maxLength(255),
    colores_disponibles: vine.array(vine.string())
  })
)

export const jugarColorValidator = vine.compile(
  vine.object({
    secuencia: vine.array(vine.string().trim().minLength(1)),
  })
)
