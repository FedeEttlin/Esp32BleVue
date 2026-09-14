new Vue({
    el: '#app',
    data: {

        nombreDispositivo: 'ESP32',
        idServicio: 'fede0000-e8f2-537e-4f6c-d104768a1214',
        idSensor:   'fede0001-e8f2-537e-4f6c-d104768a1214',
        idLed:      'fede0002-e8f2-537e-4f6c-d104768a1214',

        // Objetos BLE
        dispositivoBLE: null,
        servidorBLE: null,
        servicioBLE: null,
        caracteristicaSensor: null,
        caracteristicaLed: null,

        // Estado de interfaz
        conectado: false,

        valorSensor: '-',
        estadoLed: false,
        ultimoValorEnviado: '-',
        ultimaLectura: null
    },

    computed: {

        estadoConexion() {

            if (this.conectado) {
                return 'Conectado'
            }
            return 'Desconectado'
        }
    },

    methods: {

        async conectar() {

            try {

                if (!navigator.bluetooth) {
                    alert('Web Bluetooth no está disponible en este navegador.')
                    return
                }

                console.log('Buscando dispositivo...')

                this.dispositivoBLE = await navigator.bluetooth.requestDevice({

                    filters: [
                        {
                            name: this.nombreDispositivo
                        }
                    ],

                    optionalServices: [
                        this.idServicio
                    ]

                })


                console.log('Dispositivo seleccionado:', this.dispositivoBLE.name)

             
                this.dispositivoBLE.addEventListener('gattserverdisconnected', () => this.limpiarConexion())


                // Conectar al servidor GATT
                this.servidorBLE = await this.dispositivoBLE.gatt.connect()

                console.log('Conectado al servidor GATT')


                // Obtener servicio
                this.servicioBLE = await this.servidorBLE.getPrimaryService(this.idServicio)


                console.log('Servicio encontrado:', this.servicioBLE.uuid)


                // Obtener característica del sensor
                this.caracteristicaSensor = await this.servicioBLE.getCharacteristic(this.idSensor)


                // Obtener característica del LED
                this.caracteristicaLed = await this.servicioBLE.getCharacteristic(this.idLed)

                // Evento del LED
                this.caracteristicaLed.addEventListener('characteristicvaluechanged', this.recibirLed)

                // Activar notificaciones del LED
                await this.caracteristicaLed.startNotifications()


                // Evento del sensor
                this.caracteristicaSensor.addEventListener('characteristicvaluechanged', this.recibirSensor)


                // Activar notificaciones
                await this.caracteristicaSensor.startNotifications()

                console.log('Notificaciones activadas')

                // Leer valor inicial
                const valorSensor = await this.caracteristicaSensor.readValue()

                this.valorSensor = new TextDecoder().decode(valorSensor)
                this.ultimaLectura = this.obtenerFechaHora()

                const valorLed = await this.caracteristicaLed.readValue()
                this.estadoLed = Boolean(valorLed.getUint8(0))

                this.conectado = true

                console.log('BLE conectado correctamente')

            } catch (error) {

                if (error.name === 'NotFoundError') {
                    console.log('Selección de dispositivo cancelada.')
                    return
                }

                console.error('Error conectando:', error)

                this.limpiarConexion()
            }
        },

        recibirLed(event) {
            const valor = event.target.value.getUint8(0)
            this.estadoLed = Boolean(valor)
            console.log('Estado LED recibido:', this.estadoLed)
        },

        recibirSensor(event) {
            const valor = new TextDecoder().decode(event.target.value)
            this.valorSensor = valor
            this.ultimaLectura = this.obtenerFechaHora()

        },

        async controlarLed(estado) {

            if (!this.conectado) {
                return
            }

            try {

                const valor = estado ? 1 : 0
                const datos = new Uint8Array([valor])
                await this.caracteristicaLed.writeValue(datos)
                this.ultimoValorEnviado = estado ? 'Encendido' : 'Apagado'

            } catch (error) {
                console.error('Error escribiendo LED:', error)
            }
        },

        async desconectar() {

            try {

                if (this.caracteristicaSensor) {
                    await this.caracteristicaSensor.stopNotifications()
                }

                if (this.caracteristicaLed) {
                    await this.caracteristicaLed.stopNotifications()
                }


                if (this.servidorBLE && this.servidorBLE.connected) {
                    this.servidorBLE.disconnect()
                }

                this.limpiarConexion()

            } catch (error) {
                console.error('Error desconectando:', error)
            }
        },

        limpiarConexion() {
            this.conectado = false
            this.dispositivoBLE = null
            this.servidorBLE = null
            this.servicioBLE = null
            this.caracteristicaSensor = null
            this.caracteristicaLed = null
        },

        obtenerFechaHora() {
            const fecha = new Date()
            return fecha.toLocaleString()
        }

    }

})
