export interface OutboxMessage {
  id: string
  to: string
  cc?: string
  bcc?: string
  subject: string
  html?: string
  inReplyTo?: string
  status: 'queued' | 'sending' | 'sent' | 'failed'
  error?: string
  queuedAt: number
  sentAt?: number
}

const outboxMessages = ref<OutboxMessage[]>([])

export function useOutbox() {
  const { sendEmail } = useMail()
  const { playSendEmailSound } = useNotifications()
  const toast = useToast()

  function addToOutbox(data: {
    to: string
    cc?: string
    bcc?: string
    subject: string
    html?: string
    inReplyTo?: string
  }): string {
    const id = `outbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    outboxMessages.value.unshift({
      id,
      to: data.to,
      cc: data.cc,
      bcc: data.bcc,
      subject: data.subject || '(no subject)',
      html: data.html,
      inReplyTo: data.inReplyTo,
      status: 'queued',
      queuedAt: Date.now()
    })
    // Start sending immediately
    processMessage(id)
    return id
  }

  async function processMessage(id: string) {
    const msg = outboxMessages.value.find(m => m.id === id)
    if (!msg || msg.status !== 'queued') return

    msg.status = 'sending'

    try {
      await sendEmail({
        to: msg.to,
        cc: msg.cc,
        bcc: msg.bcc,
        subject: msg.subject,
        html: msg.html,
        inReplyTo: msg.inReplyTo
      })
      msg.status = 'sent'
      msg.sentAt = Date.now()
      playSendEmailSound()
      toast.add({ title: 'Message sent', color: 'success', icon: 'i-lucide-check' })

      // Remove sent messages after 10 seconds
      setTimeout(() => {
        outboxMessages.value = outboxMessages.value.filter(m => m.id !== id)
      }, 10000)
    } catch (err: unknown) {
      msg.status = 'failed'
      const error = err as { data?: { message?: string } }
      msg.error = error.data?.message || 'Failed to send'
      toast.add({
        title: 'Failed to send',
        description: msg.error,
        color: 'error',
        icon: 'i-lucide-alert-circle'
      })
    }
  }

  async function retryMessage(id: string) {
    const msg = outboxMessages.value.find(m => m.id === id)
    if (!msg || msg.status !== 'failed') return
    msg.status = 'queued'
    msg.error = undefined
    await processMessage(id)
  }

  function removeMessage(id: string) {
    outboxMessages.value = outboxMessages.value.filter(m => m.id !== id)
  }

  const pendingCount = computed(() =>
    outboxMessages.value.filter(m => m.status === 'queued' || m.status === 'sending').length
  )

  return {
    outboxMessages: readonly(outboxMessages),
    pendingCount,
    addToOutbox,
    retryMessage,
    removeMessage
  }
}
