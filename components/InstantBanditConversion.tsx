
type Options = {
  experimentIds?: string[], // whitelist of experiments to associate with the conversion
  value?: number // optional value of the conversion
}
export async function convert(options: Options) {
  // TODO: unify with storeInSession
  const seenExperimentIds = Object.keys(JSON.parse(sessionStorage.getItem("__all__")) || {})
  // TODO: implement batch POST
  const entries = seenExperimentIds.map((id) => [id, sessionStorage.getItem(id)])
  Object.fromEntries()
  experimentIds.forEach((experimentId) => {
    const variant = window.sessionStorage.getItem(experimentId)
    const req = await fetch("https://mydomain.com/instantbandit", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        experimentIds,
        value,
        variants,
      }),
    })
    return req.json()
  }
}
