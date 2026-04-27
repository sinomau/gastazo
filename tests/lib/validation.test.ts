import { describe, it, expect } from 'vitest'
import {
  validatePositiveNumber,
  validateInteger,
  validateNotEmpty,
  validateCuotaLogic,
} from '@/lib/validation'

describe('validatePositiveNumber', () => {
  it('debe validar números positivos', () => {
    expect(validatePositiveNumber('100')).toEqual({ valid: true })
    expect(validatePositiveNumber('0.50')).toEqual({ valid: true })
    expect(validatePositiveNumber(100)).toEqual({ valid: true })
  })

  it('debe rechazar números negativos o cero', () => {
    expect(validatePositiveNumber('-10')).toEqual({
      valid: false,
      error: 'El monto debe ser mayor a 0',
    })
    expect(validatePositiveNumber('0')).toEqual({
      valid: false,
      error: 'El monto debe ser mayor a 0',
    })
  })

  it('debe rechazar valores no numéricos', () => {
    expect(validatePositiveNumber('abc')).toEqual({
      valid: false,
      error: 'El monto debe ser un número válido',
    })
    expect(validatePositiveNumber('')).toEqual({
      valid: false,
      error: 'El monto debe ser un número válido',
    })
  })

  it('debe usar nombre de campo personalizado', () => {
    expect(validatePositiveNumber('-5', 'precio')).toEqual({
      valid: false,
      error: 'El precio debe ser mayor a 0',
    })
  })
})

describe('validateInteger', () => {
  it('debe validar enteros positivos', () => {
    expect(validateInteger('5', 'cantidad', 1)).toEqual({ valid: true })
    expect(validateInteger(10, 'días', 1)).toEqual({ valid: true })
  })

  it('debe rechazar valores menores al mínimo', () => {
    expect(validateInteger('0', 'cantidad', 1)).toEqual({
      valid: false,
      error: 'La cantidad debe ser al menos 1',
    })
  })

  it('debe rechazar valores no numéricos', () => {
    expect(validateInteger('abc', 'cantidad', 1)).toEqual({
      valid: false,
      error: 'La cantidad debe ser un número válido',
    })
  })
})

describe('validateNotEmpty', () => {
  it('debe validar strings no vacíos', () => {
    expect(validateNotEmpty('Hola', 'nombre')).toEqual({ valid: true })
    expect(validateNotEmpty('  texto  ', 'campo')).toEqual({ valid: true })
  })

  it('debe rechazar strings vacíos', () => {
    expect(validateNotEmpty('', 'descripción')).toEqual({
      valid: false,
      error: 'El descripción es requerido',
    })
    expect(validateNotEmpty('   ', 'nombre')).toEqual({
      valid: false,
      error: 'El nombre es requerido',
    })
  })

  it('debe rechazar strings muy largos', () => {
    const longString = 'a'.repeat(201)
    expect(validateNotEmpty(longString, 'descripción')).toEqual({
      valid: false,
      error: 'El descripción no puede tener más de 200 caracteres',
    })
  })
})

describe('validateCuotaLogic', () => {
  it('debe validar cuando cuota actual <= total', () => {
    expect(validateCuotaLogic(1, 12)).toEqual({ valid: true })
    expect(validateCuotaLogic(6, 12)).toEqual({ valid: true })
    expect(validateCuotaLogic(12, 12)).toEqual({ valid: true })
  })

  it('debe rechazar cuando cuota actual > total', () => {
    expect(validateCuotaLogic(13, 12)).toEqual({
      valid: false,
      error: 'La cuota actual no puede ser mayor al total de cuotas',
    })
  })
})
