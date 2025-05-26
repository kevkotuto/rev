interface WaveCheckoutSession {
  amount: string
  currency: string
  error_url: string
  success_url: string
  client_reference?: string
}

interface WaveCheckoutResponse {
  id: string
  checkout_status: string
  client_reference: string
  currency: string
  amount: string
  payment_status: string
  when_created: string
  when_completed?: string
  checkout_url: string
  business_name: string
  receive_mode: string
  redirect_url: string
  complete_url: string
  error_url: string
  last_payment_error?: any
}

export class WaveAPI {
  private apiKey: string
  private baseUrl = 'https://api.wave.com'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async createCheckoutSession(data: WaveCheckoutSession): Promise<WaveCheckoutResponse> {
    const response = await fetch(`${this.baseUrl}/v1/checkout/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Wave API Error: ${error.message || 'Unknown error'}`)
    }

    return response.json()
  }

  async getCheckoutSession(checkoutId: string): Promise<WaveCheckoutResponse> {
    const response = await fetch(`${this.baseUrl}/v1/checkout/sessions/${checkoutId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Wave API Error: ${error.message || 'Unknown error'}`)
    }

    return response.json()
  }

  async refundCheckout(checkoutId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/v1/checkout/sessions/${checkoutId}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Wave API Error: ${error.message || 'Unknown error'}`)
    }

    return response.json()
  }

  async getBalance(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/v1/me/balance`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`Wave API Error: ${error.message || 'Unknown error'}`)
    }

    return response.json()
  }
}

export function formatWaveAmount(amount: number): string {
  // Wave attend les montants en string sans décimales pour XOF/FCFA
  return Math.round(amount).toString()
}

export function getWaveCurrency(currency: string): string {
  // Mapper les devises locales vers les codes Wave
  switch (currency) {
    case 'FCFA':
      return 'XOF'
    case 'EUR':
      return 'EUR'
    case 'USD':
      return 'USD'
    default:
      return 'XOF'
  }
} 