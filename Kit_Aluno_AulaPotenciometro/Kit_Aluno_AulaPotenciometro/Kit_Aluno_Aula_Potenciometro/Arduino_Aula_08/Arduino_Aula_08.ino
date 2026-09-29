// Aula 08 - Potenciometro -> Arduino -> ambiente virtual
// Ligacao: extremidades em 5 V e GND; cursor central no pino A0.

const byte PINO_POTENCIOMETRO = A0;
const unsigned long PERIODO_ENVIO_MS = 50;
const byte AMOSTRAS = 8;

unsigned long ultimoEnvio = 0;

int lerPotenciometroFiltrado() {
  long soma = 0;
  for (byte i = 0; i < AMOSTRAS; i++) {
    soma += analogRead(PINO_POTENCIOMETRO);
  }
  return soma / AMOSTRAS;
}

void setup() {
  Serial.begin(9600);
  pinMode(PINO_POTENCIOMETRO, INPUT);
  delay(500);
  Serial.println("PRONTO");
}

void loop() {
  const unsigned long agora = millis();
  if (agora - ultimoEnvio >= PERIODO_ENVIO_MS) {
    ultimoEnvio = agora;
    Serial.print("POT:");
    Serial.println(lerPotenciometroFiltrado());
  }
}
