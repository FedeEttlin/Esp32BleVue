const BLE = {

    nombreDispositivo: 'ESP32',

    idServicio: 'fede0000-e8f2-537e-4f6c-d104768a1214',
    idSensor:   'fede0001-e8f2-537e-4f6c-d104768a1214',
    idLed:      'fede0002-e8f2-537e-4f6c-d104768a1214',

    dispositivo: null,
    servidor: null,
    servicio: null,

    caracteristicaSensor: null,
    caracteristicaLed: null,

    conectado: false,

    callbackSensor: null,
    callbackLed: null,
    callbackDesconexion: null,


    async conectar() {

        if (!navigator.bluetooth) {
            throw new Error('Web Bluetooth no está disponible en este navegador.')
        }

        this.dispositivo = await navigator.bluetooth.requestDevice({

            filters: [
                {
                    name: this.nombreDispositivo
                }
            ],

            optionalServices: [
                this.idServicio
            ]

        })

        this.dispositivo.addEventListener('gattserverdisconnected', () => this.dispositivoDesconectado())

        this.servidor = await this.dispositivo.gatt.connect()

        this.servicio = await this.servidor.getPrimaryService(this.idServicio)

        this.caracteristicaSensor = await this.servicio.getCharacteristic(this.idSensor)
        this.caracteristicaLed = await this.servicio.getCharacteristic(this.idLed)

        this.caracteristicaSensor.addEventListener('characteristicvaluechanged', event => this.procesarSensor(event))
        this.caracteristicaLed.addEventListener('characteristicvaluechanged', event => this.procesarLed(event))

        await this.caracteristicaSensor.startNotifications()
        await this.caracteristicaLed.startNotifications()


        // Leer valores iniciales
        const valorSensor = await this.caracteristicaSensor.readValue()

        const sensor = new TextDecoder().decode(valorSensor)

        const valorLed = await this.caracteristicaLed.readValue()

        const led = Boolean(valorLed.getUint8(0))

        this.conectado = true

        return {
            sensor: sensor,
            led: led
        }
    },

    procesarSensor(event) {

        const valor = new TextDecoder().decode(event.target.value)

        if (this.callbackSensor) {
            this.callbackSensor(valor)
        }
    },

    procesarLed(event) {

        const valor = event.target.value.getUint8(0)
        const estado = Boolean(valor)

        if (this.callbackLed) {
            this.callbackLed(estado)
        }
    },

    async controlarLed(estado) {

        if (!this.conectado) {
            throw new Error('BLE no está conectado.')
        }

        const valor = estado ? 1 : 0
        const datos = new Uint8Array([valor])
        await this.caracteristicaLed.writeValue(datos)
    },


    async desconectar() {

        try {

            if (this.caracteristicaSensor) {
                await this.caracteristicaSensor.stopNotifications()
            }

            if (this.caracteristicaLed) {
                await this.caracteristicaLed.stopNotifications()
            }

            if (this.servidor && this.servidor.connected) {
                this.servidor.disconnect()
            }

        } catch (error) {
            console.error('Error desconectando BLE:', error)
        } finally {
            this.limpiarConexion()
        }
    },


    dispositivoDesconectado() {

        this.limpiarConexion()

        if (this.callbackDesconexion) {
            this.callbackDesconexion()
        }
    },


    limpiarConexion() {

        this.conectado = false

        this.dispositivo = null
        this.servidor = null
        this.servicio = null

        this.caracteristicaSensor = null
        this.caracteristicaLed = null
    },

    alRecibirSensor(callback) {
        this.callbackSensor = callback
    },

    alRecibirLed(callback) {
        this.callbackLed = callback
    },

    alDesconectar(callback) {
        this.callbackDesconexion = callback
    }

}