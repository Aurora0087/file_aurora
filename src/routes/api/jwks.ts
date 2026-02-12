import { createFileRoute } from '@tanstack/react-router'

const pubjwks = {
  "keys": [
    {
      "kty": "RSA",
      "kid": "kd70xb3yg8gt6rst867rsjh2nx80emk2", 
      "use": "sig",
      "alg": "RS256",
      "n": "rZ3RHV-NeMgpD5Wv31T2PoIWuD4BHBabolkqdl21uNH-6c-9kHwGbN6Gq5WszdChs6DjYNQUpXOK8r-7nYbXvZakQ0c5ZEr4rrAeA3HolyrWYQaUVp6pGDh2k5uZPk79AekRI216qCZxAiMKDzLoOc4dLEeK8tCaW5sCPQbrovtYor9_p12VwYM64gBhuJfBz5c-0JhPloiiX_31Sok4BBn_kVFwIA_Zgodh_6BhZIR0Ojhf3d1X2kxY5SxSLoQBkJS6Z4LtX3cOGhoUIwitvuhjluAXTxhHchXSZkZHW5Wq484atLzkK5tCVvoApITiobaaQ9x3VUhDW9A25h-Wrw",
      "e": "AQAB"
    }
  ]
}
export const Route = createFileRoute('/api/jwks')({
  server: {
    handlers: {
      GET: async ({ }) => {
        return new Response(JSON.stringify(pubjwks), {
          headers: {
            'Content-Type': 'application/json',
          },
        })
      },
    },
  },
})
