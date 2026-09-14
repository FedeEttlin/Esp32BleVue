new Vue({

    el: '#app',

    data: {
        conectado: false,
        valorSensor: '-',
        estadoLed: false,
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


    mounted() {

        BLE.alRecibirSensor(valor => {
            this.valorSensor = valor
            this.ultimaLectura = this.obtenerFechaHora()
        })

        BLE.alRecibirLed(estado => {
            this.estadoLed = estado
        })

        BLE.alDesconectar(() => {
            this.conectado = false
        })
    },


    methods: {

        async conectar() {

            try {

                const estadoInicial = await BLE.conectar()

                this.valorSensor = estadoInicial.sensor

                this.estadoLed = estadoInicial.led

                this.ultimaLectura = this.obtenerFechaHora()

                this.conectado = true

            } catch (error) {

                if (error.name === 'NotFoundError') {
                    console.log('Selección de dispositivo cancelada.')
                    return
                }

                console.error('Error conectando:', error)
                
                this.conectado = false
            }

        },

        async controlarLed(estado) {

            try {
                await BLE.controlarLed(estado)

            } catch (error) {
                console.error('Error escribiendo LED:', error)
            }

        },

        async desconectar() {

            try {

                await BLE.desconectar()
                this.conectado = false

            } catch (error) {
                console.error('Error desconectando:', error)
            }

        },

        obtenerFechaHora() {
            const fecha = new Date()
            return fecha.toLocaleString()
        }

    }

})