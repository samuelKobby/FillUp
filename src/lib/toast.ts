import { toast } from 'react-hot-toast'

export default {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  info: (message: string) => toast(message, { icon: 'ℹ️' }),
  warning: (message: string) => toast(message, { icon: '⚠️' }),
  loading: (message: string) => toast.loading(message),
  dismiss: (id?: string) => toast.dismiss(id)
}
