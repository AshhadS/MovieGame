export default async () => {
  try {
    const response = await fetch('https://icanhazdadjoke.com', {
      headers: { accept: 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Dad joke request failed with ${response.status}`)
    }

    const data = await response.json()

    return new Response(JSON.stringify({ msg: data.joke }), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (err) {
    console.log(err)

    return new Response(JSON.stringify({ msg: err.message }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
}
