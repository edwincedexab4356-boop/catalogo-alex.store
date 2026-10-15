import { PaymentConfig } from '../types/database';

const PAYMENT_CONFIG_KEY = 'alexstore_payment_config_v1';

export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  yappy: {
    activo: true,
    telefono: '66212802',
    nombre: 'AlexStore Oficial',
    instrucciones: 'Abre tu app de Banco General -> Yappy -> Enviar a este número o buscar AlexStore. Sube la captura de pantalla del pago exitoso.',
  },
  transferencia: {
    activo: true,
    banco: 'Banco General',
    tipoCuenta: 'Cuenta de Ahorros',
    numeroCuenta: '04-01-01-123456-7',
    beneficiario: 'AlexStore Inc.',
    cedulaRuc: '8-800-1234',
    instrucciones: 'Realiza la transferencia ACH o directa al número de cuenta indicado y adjunta la captura o comprobante bancario.',
  },
};

export const paymentConfigService = {
  getConfig(): PaymentConfig {
    try {
      const stored = localStorage.getItem(PAYMENT_CONFIG_KEY);
      if (stored) {
        return {
          ...DEFAULT_PAYMENT_CONFIG,
          ...JSON.parse(stored),
        };
      }
    } catch (e) {
      console.warn('Error reading payment config:', e);
    }
    return DEFAULT_PAYMENT_CONFIG;
  },

  saveConfig(config: PaymentConfig): void {
    try {
      localStorage.setItem(PAYMENT_CONFIG_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('Error saving payment config:', e);
    }
  },
};
