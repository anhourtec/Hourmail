export default defineEventHandler(async (event) => {
  const accounts = await getAllAccounts(event)
  return { accounts }
})
