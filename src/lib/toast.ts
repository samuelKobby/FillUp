import { toast as toastify } from 'react-toastify'

export default {
  success: (message: string) => toastify.success(message),
  error: (message: string) => toastify.error(message),
  info: (message: string) => toastify.info(message),
  warning: (message: string) => toastify.warning(message)
}
