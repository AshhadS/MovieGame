export default async () => {
  return new Response(JSON.stringify({ msg: 'Hello, World!' }), {
    headers: { 'content-type': 'application/json' },
  })
}
