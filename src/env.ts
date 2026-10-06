export type Bindings = {
  DB: D1Database
  ENVIRONMENT: string
  OWNER_EMAIL: string
  ACCESS_TEAM_DOMAIN: string
  ACCESS_AUD: string
}

export type AppEnv = {
  Bindings: Bindings
  Variables: { userEmail: string }
}
