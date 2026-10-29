'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Confirmar } from '@/components/ui/Confirmar'
import { Toast } from '@/components/ui/Toast'
import { Upload } from '@/components/ui/Upload'

/** Demonstrações que precisam de interação (modal, toast, upload). */
export function DemoModalToast() {
  const [toast, setToast] = useState(0)
  return (
    <div className="acoes">
      <form onSubmit={(e) => { e.preventDefault(); setToast(Date.now()) }}>
        <Confirmar className="btn perigo" titulo="Excluir vencimento?" confirmar="Excluir vencimento"
          texto="Essa ação não pode ser desfeita. O histórico de renovações também será removido."
          destaque="PMOC - Frigorífico Boi Bom • vence em 09/11/2026">
          <Trash2 size={16} />Abrir modal de exclusão
        </Confirmar>
      </form>
      <button type="button" className="btn sec" onClick={() => setToast(Date.now())}>Mostrar toast</button>
      {toast > 0 && <Toast key={toast} titulo="PMOC do Frigorífico Boi Bom renovado" descricao="Próximo vencimento em 30/11/2026." aoFechar={() => setToast(0)} />}
    </div>
  )
}

export function DemoUpload() {
  return <Upload name="demo" />
}
