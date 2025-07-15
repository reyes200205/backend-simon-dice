import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'

export default class Partida extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare nombre: string

  @column()
  declare descripcion: string

  @column({
    prepare: (value: string[] | string) => {
      if (Array.isArray(value)) {
        return JSON.stringify(value)
      }
      return value
    },
    consume: (value: string) => {
      try {
        return typeof value === 'string' ? JSON.parse(value) : value || []
      } catch {
        return []
      }
    }
  })
  declare colores_disponibles: string[]

  @column({
    prepare: (value: string[] | string) => {
      if (Array.isArray(value)) {
        return JSON.stringify(value)
      }
      return value
    },
    consume: (value: string) => {
      try {
        return typeof value === 'string' ? JSON.parse(value) : value || []
      } catch {
        return []
      }
    }
  })
  declare secuencia: string[]

  @column({ columnName: 'jugador_1_id' })
  declare jugador_1_id: number

  @column({ columnName: 'jugador_2_id' })
  declare jugador_2_id: number | null

  @column()
  declare estado: string

  @column()
  declare turno_actual: number

  @column()
  declare ganador_id: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @belongsTo(() => User, { foreignKey: 'jugador_1_id' })
  jugador1!: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'jugador_2_id' })
  jugador2!: BelongsTo<typeof User>

  @belongsTo(() => User, { foreignKey: 'ganador_id' })
  ganador!: BelongsTo<typeof User>

}