// Validación de inputs numéricos
export function validatePositiveNumber(value: string | number, fieldName: string = 'monto'): { valid: boolean; error?: string } {
  const num = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(num)) {
    return { valid: false, error: `El ${fieldName} debe ser un número válido` }
  }

  if (num <= 0) {
    return { valid: false, error: `El ${fieldName} debe ser mayor a 0` }
  }

  return { valid: true }
}

export function validateInteger(value: string | number, fieldName: string = 'cantidad', min: number = 1): { valid: boolean; error?: string } {
  const num = typeof value === 'string' ? parseInt(value) : value

  if (isNaN(num)) {
    return { valid: false, error: `La ${fieldName} debe ser un número válido` }
  }

  if (num < min) {
    return { valid: false, error: `La ${fieldName} debe ser al menos ${min}` }
  }

  return { valid: true }
}

export function validateNotEmpty(value: string, fieldName: string = 'campo'): { valid: boolean; error?: string } {
  if (!value || value.trim().length === 0) {
    return { valid: false, error: `El ${fieldName} es requerido` }
  }

  if (value.trim().length > 200) {
    return { valid: false, error: `El ${fieldName} no puede tener más de 200 caracteres` }
  }

  return { valid: true }
}

export function validateCuotaLogic(cuotaActual: number, cuotasTotal: number): { valid: boolean; error?: string } {
  if (cuotaActual > cuotasTotal) {
    return { valid: false, error: 'La cuota actual no puede ser mayor al total de cuotas' }
  }

  return { valid: true }
}
