import type { HttpContext } from '@adonisjs/core/http'
import Partida from '#models/partida'
import { createPartidasValidator } from '#validators/partida'
import { jugarColorValidator } from '#validators/partida'
import User from '#models/user'

export default class PartidasController {
  async create({ request, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()

      const payload = await request.validateUsing(createPartidasValidator)

      const partida = await Partida.create({
        nombre: payload.nombre,
        descripcion: payload.descripcion,
        colores_disponibles: payload.colores_disponibles,
        secuencia: [],
        jugador_1_id: user.id,
        jugador_2_id: null,
        estado: 'esperando',
        turno_actual: 1,
        ganador_id: null,
      })

      console.log(typeof partida.secuencia)
      return response.json({
        message: 'Partida creada exitosamente',
        partida: partida,
      })
    } catch (error) {
      return response.status(400).json({
        message: 'Error al crear partida',
        errors: error.messages || error.message,
      })
    }
  }

  async index({ response }: HttpContext) {
    try {
      const partidas = await Partida.query().where('estado', 'esperando')

      return response.json({
        message: 'Listado de partidas exitoso',
        partidas: partidas,
      })
    } catch (error) {
      return response.status(400).json({
        message: 'Error al obtener listado de partidas',
        errors: error.messages || error.message,
      })
    }
  }

  async salaEspera({ response, params, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      console.log(params.id)

      const partida = await Partida.findOrFail(params.id)

      const esJugador1 = partida.jugador_1_id === user.id
      const esJugador2 = partida.jugador_2_id === user.id

      if (!esJugador1 && !esJugador2) {
        return response.status(403).json({
          message: 'No tienes permiso para unirte a esta partida',
        })
      }

      const totalJugadores = [partida.jugador_1_id, partida.jugador_2_id].filter(Boolean).length

      if (totalJugadores >= 2 && partida.estado === 'en_curso') {
        return response.status(400).json({
          message: 'La partida ya está en curso',
          debeRedirigir: true,
          success: true,
          urlRedireccion: `/juego/${partida.id}`,
        })
      }

      const partidaJugadores = await Partida.query()
        .where('id', partida.id)
        .preload('jugador1', (query) => {
          query.select('id', 'fullName', 'email')
        })
        .preload('jugador2', (query) => {
          query.select('id', 'fullName', 'email')
        })
        .firstOrFail()

      const jugadores = []

      if (partidaJugadores.jugador1) {
        jugadores.push(partidaJugadores.jugador1)
      }

      if (partidaJugadores.jugador2) {
        jugadores.push(partidaJugadores.jugador2)
      }

      return response.json({
        message: 'Sala de espera obtenida exitosamente',
        partida: {
          id: partida.id,
          nombre: partida.nombre,
          descripcion: partida.descripcion,
          jugadores: jugadores,
          totalJugadores,
        },
      })
    } catch (error) {
      console.error('Error en salaEspera:', error)
      return response.status(500).json({
        message: 'Error al obtener la sala de espera',
        errors: error.message,
      })
    }
  }

  async verificarEstado({ response, params }: HttpContext) {
    try {
      const partida = await Partida.findOrFail(params.id)
      const totalJugadores = [partida.jugador_1_id, partida.jugador_2_id].filter(Boolean).length

      if (totalJugadores >= 2 && partida.estado === 'esperando') {
        partida.estado = 'en_curso'

        partida.turno_actual = 1
        partida.ganador_id = null
        await partida.save()
      }

      await partida.refresh()

      let jugadorTurno = null
      if (partida.estado === 'en_curso') {
        if (partida.turno_actual === 1) {
          jugadorTurno = partida.jugador_1_id
        } else {
          jugadorTurno = partida.jugador_2_id
        }
      }

      return response.json({
        message: 'Estado verificado exitosamente',
        data: {
          estado: partida.estado,
          totalJugadores: totalJugadores,
          puedeIniciar: totalJugadores >= 2,
          debeRedirigir: totalJugadores >= 2 && partida.estado === 'en_curso',
          urlRedireccion: `/juego/${partida.id}`,
        },
      })
    } catch (error) {
      return response.status(500).json({
        message: 'Error al verificar el estado de la partida',
        errors: error.message,
      })
    }
  }

  async unirse({ params, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const partida = await Partida.findOrFail(params.id)

      if (partida.estado !== 'esperando') {
        return response.status(400).json({
          success: false,
          message: 'Esta partida ya ha comenzado',
        })
      }

      const totalJugadores = [partida.jugador_1_id, partida.jugador_2_id].filter(Boolean).length

      if (totalJugadores >= 2) {
        return response.status(400).json({
          success: false,
          message: 'No se puede unirse a la partida, ya está llena',
        })
      }

      const yaEstaEnPartida = partida.jugador_1_id === user.id || partida.jugador_2_id === user.id

      if (yaEstaEnPartida) {
        return response.json({
          success: true,
          message: 'Ya estás en esta partida',
          data: {
            partida,
            jugador_numero: partida.jugador_1_id === user.id ? 1 : 2,
          },
        })
      }

      if (!partida.jugador_1_id) {
        partida.jugador_1_id = user.id
      } else if (!partida.jugador_2_id) {
        partida.jugador_2_id = user.id
      }

      await partida.save()

      const nuevoTotalJugadores = [partida.jugador_1_id, partida.jugador_2_id].filter(
        Boolean
      ).length

      if (nuevoTotalJugadores >= 2) {
        partida.estado = 'en_curso'
        partida.turno_actual = 1
        await partida.save()
      }

      return response.status(201).json({
        success: true,
        message:
          nuevoTotalJugadores >= 2
            ? 'Te has unido a la partida. ¡Empieza la partida!'
            : 'Te has unido a la partida. Esperando otro jugador.',
        data: {
          partida,
          jugador_numero: partida.jugador_1_id === user.id ? 1 : 2,
          total_jugadores: nuevoTotalJugadores,
        },
      })
    } catch (error) {
      console.error('Error en unirse:', error)
      return response.status(500).json({
        success: false,
        message: 'Error al unirse a la partida',
        error: error.message,
      })
    }
  }

  async obtenerJuego({ params, response, auth }: HttpContext) {
    try {
      const user = await auth.authenticate()
      const partida = await Partida.findOrFail(params.id)

      if (partida.jugador_1_id !== user.id && partida.jugador_2_id !== user.id) {
        return response.status(403).json({
          message: 'No tienes permiso para acceder a esta partida',
        })
      }

      if (partida.estado !== 'en_curso') {
        return response.status(400).json({
          message: 'La partida no está en curso',
        })
      }

      if (!partida.jugador_2_id) {
        return response.status(400).json({
          message: 'No hay jugador 2',
        })
      }

      const jugador1 = await User.findOrFail(partida.jugador_1_id)
      const jugador2 = await User.findOrFail(partida.jugador_2_id)

      const esJugador1 = partida.jugador_1_id === user.id
      const jugadorActual = esJugador1 ? jugador1 : jugador2
      const oponente = esJugador1 ? jugador2 : jugador1

      const esMiTurno = partida.turno_actual === user.id && partida.estado === 'en_curso'

      const juegoTerminado =
        (partida.estado as string) === 'finalizado' || partida.ganador_id !== null
      let ganador = null
      let mensaje = null

      if (juegoTerminado) {
        if (partida.ganador_id === user.id) {
          ganador = user
          mensaje = '¡Felicidades! Has ganado la partida.'
        } else if (partida.ganador_id) {
          ganador = await User.findOrFail(partida.ganador_id)
          mensaje = `El jugador ${ganador.fullName} ha ganado la partida.`
        } else {
          mensaje = 'La partida ha terminado en empate.'
        }
      }

      let ultimoColorAñadido = null
      let mostrarUltimoColor = true

      if (partida.secuencia.length > 0) {
        ultimoColorAñadido = partida.secuencia[partida.secuencia.length - 1]

        if (juegoTerminado) {
          mostrarUltimoColor = true
        }
      }

      const partidaData = {
        success: true,
        data: {
          partida: {
            id: partida.id,
            nombre: partida.nombre,
            estado: partida.estado,
            nivel: partida.secuencia.length,
          },
          jugadorActual: {
            id: jugadorActual.id,
            fullName: jugadorActual.fullName,
            email: jugadorActual.email,
          },
          oponente: {
            id: oponente.id,
            fullName: oponente.fullName,
            email: oponente.email,
          },

          juego: {
            coloresDisponibles: partida.colores_disponibles,
            ultimoColor: ultimoColorAñadido,
            mostrarUltimoColor: mostrarUltimoColor,
            nivelActual: partida.secuencia.length,
            turnoActual: partida.turno_actual,
            secuencia: partida.secuencia,
          },
          estado: {
            esMiTurno: esMiTurno,
            juegoTerminado: juegoTerminado,
            ganador: ganador,
            mensaje:
              mensaje ||
              (esMiTurno
                ? partida.secuencia.length === 0
                  ? 'Tu turno: Elige el primer color'
                  : 'Tu turno: Repite la secuencia y añade un color'
                : 'Esperando al oponente...'),
          },
          resultadoFinal: juegoTerminado
            ? {
                ganador: {
                  id: partida.ganador_id,
                  esGanador: partida.ganador_id === user.id,
                  nombre:
                    partida.ganador_id === user.id ? jugadorActual.fullName : oponente.fullName,
                },
                perdedor: {
                  id: partida.ganador_id === user.id ? oponente.id : user.id,
                  esGanador: false,
                  nombre:
                    partida.ganador_id === user.id ? oponente.fullName : jugadorActual.fullName,
                },
                nivelAlcanzado: partida.secuencia.length,
                secuenciaFinal: juegoTerminado ? partida.secuencia : null,
              }
            : null,
        },
      }

      return response.json(partidaData)
    } catch (error) {
      return response.status(500).json({
        success: false,
        error: 'Error al cargar el estado del juego: ' + error.message,
      })
    }
  }

  async jugarColor({ params, request, response, auth }: HttpContext) {
  try {
    const payload = await request.validateUsing(jugarColorValidator)
    const user = await auth.authenticate()
    const partida = await Partida.findOrFail(params.id)

    if (partida.estado !== 'en_curso') {
      return response.status(400).json({
        message: 'La partida no está en curso',
      })
    }

    if (partida.turno_actual !== user.id) {
      return response.status(403).json({
        message: 'No es tu turno',
      })
    }

    
    const coloresInvalidos = payload.secuencia.filter(
      color => !partida.colores_disponibles.includes(color)
    )

    if (coloresInvalidos.length > 0) {
      return response.status(400).json({
        message: `Colores no válidos: ${coloresInvalidos.join(', ')}`,
      })
    }

    const secuenciaActual = partida.secuencia
    const secuenciaJugador = payload.secuencia

    let juegoTerminado = false
    let colorCorrecto = true
    let mensaje = ''
    let nuevoColorAñadido = null

    if (secuenciaActual.length === 0) {
      if (secuenciaJugador.length === 1) {
        partida.secuencia = secuenciaJugador
        nuevoColorAñadido = secuenciaJugador[0]
        mensaje = 'Has añadido el primer color a la secuencia.'
      } else {
        return response.status(400).json({
          message: 'Debes añadir exactamente un color para empezar',
        })
      }
    }
    
    else if (secuenciaJugador.length === secuenciaActual.length) {
      const esCorrecta = secuenciaJugador.every((color, index) => 
        color === secuenciaActual[index]
      )
      
      if (esCorrecta) {
        mensaje = 'Has repetido correctamente la secuencia. Ahora añade un nuevo color.'
      } else {
        colorCorrecto = false
        mensaje = 'Secuencia incorrecta. Has perdido la partida.'
        juegoTerminado = true
        partida.estado = 'finalizada'
        const oponenteId = partida.jugador_1_id === user.id ? partida.jugador_2_id : partida.jugador_1_id
        partida.ganador_id = oponenteId
      }
    }
    
    else if (secuenciaJugador.length === secuenciaActual.length + 1) {
    
      const secuenciaCorrecta = secuenciaActual.every((color, index) => 
        color === secuenciaJugador[index]
      )
      
      if (secuenciaCorrecta) {
        partida.secuencia = secuenciaJugador
        nuevoColorAñadido = secuenciaJugador[secuenciaJugador.length - 1]
        mensaje = 'Has repetido la secuencia y añadido un nuevo color.'
      } else {
        colorCorrecto = false
        mensaje = 'Secuencia incorrecta. Has perdido la partida.'
        juegoTerminado = true
        partida.estado = 'finalizada'
        const oponenteId = partida.jugador_1_id === user.id ? partida.jugador_2_id : partida.jugador_1_id
        partida.ganador_id = oponenteId
      }
    }
    else {
      return response.status(400).json({
        message: 'La secuencia debe tener la misma longitud que la actual, o una más para añadir un nuevo color',
      })
    }

    if (!juegoTerminado && nuevoColorAñadido) {
      if (partida.jugador_1_id !== null && partida.jugador_2_id !== null) {
        partida.turno_actual =
          partida.jugador_1_id === user.id ? partida.jugador_2_id! : partida.jugador_1_id!
      }
    }

    await partida.save()

    const oponenteId =
      partida.jugador_1_id === user.id ? partida.jugador_2_id : partida.jugador_1_id
    const oponente = await User.findOrFail(oponenteId!)

    const responseData = {
      success: true,
      resultado: {
        secuenciaJugada: secuenciaJugador,
        secuenciaCorrecta: colorCorrecto,
        mensaje: mensaje,
        nuevoColorAñadido: nuevoColorAñadido,
      },
      estado: {
        nivelActual: partida.secuencia.length,
        juegoTerminado: juegoTerminado,
        esMiTurno: !juegoTerminado && partida.turno_actual === user.id,
        mensaje: mensaje,
        secuenciaActual: partida.secuencia,
      },
      turno: {
        turnoActual: juegoTerminado ? null : partida.turno_actual,
        siguienteJugador: juegoTerminado ? null : oponente.fullName,
      },
      ganador: juegoTerminado
        ? {
            id: partida.ganador_id,
            esGanador: partida.ganador_id === user.id,
            mensaje:
              partida.ganador_id === user.id
                ? '¡Felicidades! Has ganado la partida.'
                : `El jugador ${oponente.fullName} ha ganado la partida.`,
          }
        : null,
    }

    return response.json(responseData)
  } catch (error) {
    console.error('Error al jugar color:', error)

    if (error.messages) {
      return response.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        messages: error.messages,
      })
    }

    return response.status(500).json({
      success: false,
      error: 'Ocurrió un error inesperado',
      message: error.message,
    })
  }
}
}
