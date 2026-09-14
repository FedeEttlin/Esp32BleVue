// NOTIFY: envía el dato sin esperar confirmación. Es más rápido y liviano.
// INDICATE: envía el dato y el receptor debe confirmar que lo recibió. Es más confiable, pero más lento.

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

BLEServer* servidorBLE = NULL;
BLECharacteristic* caracteristicaSensor = NULL;
BLECharacteristic* caracteristicaLed = NULL;

bool dispositivoConectado = false;
bool dispositivoConectadoAnterior = false;

uint32_t valor = 0;
const int pinLed = 22;

void controlarLed(bool encendido);


#define ID_SERVICIO "fede0000-e8f2-537e-4f6c-d104768a1214"
#define ID_SENSOR   "fede0001-e8f2-537e-4f6c-d104768a1214"
#define ID_LED      "fede0002-e8f2-537e-4f6c-d104768a1214"


class EventosServidor : public BLEServerCallbacks {

  void onConnect(BLEServer* servidor) {
    dispositivoConectado = true;
  }

  void onDisconnect(BLEServer* servidor) {
    dispositivoConectado = false;
  }

};


class EventosLed : public BLECharacteristicCallbacks {

  void onWrite(BLECharacteristic* caracteristica) {

    String valorRecibido = caracteristica->getValue();

    if (valorRecibido.length() == 1) {
      bool estadoLed = static_cast<bool>(valorRecibido[0]);
      controlarLed(estadoLed);
    }

  }

};





void setup() {

  Serial.begin(115200);

  pinMode(pinLed, OUTPUT);
  digitalWrite(pinLed, LOW);

  BLEDevice::init("ESP32"); // Crear dispositivo BLE.

  servidorBLE = BLEDevice::createServer();  // Crear servidor BLE.

  servidorBLE->setCallbacks(new EventosServidor()); // Registrar eventos de conexión y desconexión.
  
  BLEService* servicioBLE = servidorBLE->createService(ID_SERVICIO); // Crear servicio BLE.


  // Crear característica del sensor.
  caracteristicaSensor = servicioBLE->createCharacteristic(
    ID_SENSOR,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_NOTIFY |
    BLECharacteristic::PROPERTY_INDICATE
  );


  // Crear característica del LED.
  caracteristicaLed = servicioBLE->createCharacteristic(
    ID_LED,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_WRITE |
    BLECharacteristic::PROPERTY_NOTIFY
  );


  caracteristicaLed->setCallbacks(new EventosLed()); // Registrar la función que recibe los comandos del LED.

  caracteristicaLed->addDescriptor(new BLE2902());  // Descriptor necesario para notificaciones del LED.
  caracteristicaSensor->addDescriptor(new BLE2902()); // Descriptor necesario para notificaciones del sensor.

  // Cargar el estado inicial del LED en la característica BLE.
  uint8_t estadoInicialLed = 0;
  caracteristicaLed->setValue(&estadoInicialLed, 1);

 
  servicioBLE->start(); // Arrancar el servicio.


  BLEAdvertising* publicidadBLE = BLEDevice::getAdvertising();  // Configurar publicidad BLE.

  publicidadBLE->addServiceUUID(ID_SERVICIO);
  publicidadBLE->setScanResponse(false);
  publicidadBLE->setMinPreferred(0x0);

  BLEDevice::startAdvertising();  // Comenzar a anunciar el dispositivo.

  Serial.println("Esperando conexión con cliente...");
}


void loop() {

  // Si hay un dispositivo conectado, enviar el valor del sensor mediante notificación.
  if (dispositivoConectado) {

    caracteristicaSensor->setValue(String(valor).c_str());
    caracteristicaSensor->notify();

    valor++;

    Serial.print("Nuevo valor: ");
    Serial.println(valor);

    delay(1000);
  }


  // Detectar desconexión.
  if (!dispositivoConectado && dispositivoConectadoAnterior) {

    Serial.println("Dispositivo desconectado.");

    delay(500);

    servidorBLE->startAdvertising();

    Serial.println("Comienza a anunciarse nuevamente.");

    dispositivoConectadoAnterior = dispositivoConectado;
  }


  // Detectar nueva conexión.
  if (dispositivoConectado && !dispositivoConectadoAnterior) {

    dispositivoConectadoAnterior = dispositivoConectado;
    Serial.println("Dispositivo conectado.");

  }

}


void controlarLed(bool encendido) {

  digitalWrite(pinLed, encendido ? HIGH : LOW);

  uint8_t valor = encendido ? 1 : 0;
  caracteristicaLed->setValue(&valor, 1);
  caracteristicaLed->notify();
}


