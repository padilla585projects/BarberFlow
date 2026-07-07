/** Código de referido introducido en el registro. Se lee una sola vez al crear el doc de usuario. */
let _code: string | null = null

export function setPendingReferralCode(code: string | null) { _code = code }
export function consumePendingReferralCode(): string | null {
  const c = _code
  _code = null
  return c
}
