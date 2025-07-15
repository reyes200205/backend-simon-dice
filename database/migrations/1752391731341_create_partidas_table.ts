import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'partidas'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id')
      table.string('nombre').notNullable()
      table.string('descripcion').notNullable()
      table.json('colores_disponibles').notNullable()
      table.json('secuencia').nullable()
      table.bigInteger('jugador_1_id').notNullable().unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.bigInteger('jugador_2_id').nullable().unsigned().references('id').inTable('users').onDelete('CASCADE')
      table.enum('estado', ['esperando', 'en_curso', 'finalizada']).notNullable().defaultTo('esperando')
      table.integer('turno_actual').notNullable().defaultTo(1)
      table.bigInteger('ganador_id').unsigned().references('id').inTable('users').onDelete('SET NULL')
      table.timestamp('created_at').nullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}