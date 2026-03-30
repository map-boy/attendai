const AUTH_KEY = '__attendai_auth__'
const PASSWORD = import.meta.env.VITE_TEACHER_PASSWORD ?? '@deeplearning2026'

export function isLoggedIn(): boolean {
  return sessionStorage.getItem(AUTH_KEY) === '1'
}

export function login(password: string): boolean {
  if (password === PASSWORD) {
    sessionStorage.setItem(AUTH_KEY, '1')
    return true
  }
  return false
}

export function logout(): void {
  sessionStorage.removeItem(AUTH_KEY)
}