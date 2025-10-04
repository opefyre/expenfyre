'use client'

import { useConfirmDialog } from '@/contexts/ConfirmDialogContext'
import ConfirmDialog from './ConfirmDialog'

export default function ConfirmDialogContainer() {
  const { isOpen, dialogData, hideConfirm } = useConfirmDialog()

  if (!dialogData) return null

  return (
    <ConfirmDialog
      isOpen={isOpen}
      title={dialogData.title}
      message={dialogData.message}
      confirmText={dialogData.confirmText}
      cancelText={dialogData.cancelText}
      type={dialogData.type}
      onConfirm={() => {
        dialogData.onConfirm()
        hideConfirm()
      }}
      onCancel={hideConfirm}
    />
  )
}
