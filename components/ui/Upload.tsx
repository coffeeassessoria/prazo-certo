'use client'

import { useRef, useState } from 'react'
import { FileText, Trash2, UploadCloud } from 'lucide-react'

/** Upload de arquivo do DS: área tracejada → linha do arquivo escolhido com opção de remover. */
export function Upload({ name = 'anexo', atual, accept = '.pdf,image/*,.doc,.docx,.xls,.xlsx', titulo = 'Arraste o PDF ou foto aqui', ajuda = 'PDF, JPG ou PNG até 10 MB. Foto do documento tirada em campo funciona.' }: { name?: string; atual?: string | null; accept?: string; titulo?: string; ajuda?: string }) {
  const ref = useRef<HTMLInputElement>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [arrastando, setArrastando] = useState(false)

  function escolher(f: File | null) {
    setArquivo(f)
    if (!f && ref.current) ref.current.value = ''
  }
  const tamanho = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

  return (
    <div>
      <input ref={ref} id={`up-${name}`} className="sr-only" type="file" name={name} accept={accept}
        onChange={(e) => escolher(e.target.files?.[0] ?? null)} />
      {arquivo ? (
        <div className="arquivo">
          <div className="arquivo-icone"><FileText size={18} /></div>
          <div className="arquivo-info"><b>{arquivo.name}</b><span>{tamanho(arquivo.size)}, pronto para enviar</span></div>
          <button type="button" className="btn ghost icone peq" aria-label="Remover arquivo" onClick={() => escolher(null)}><Trash2 size={16} /></button>
        </div>
      ) : (
        <label htmlFor={`up-${name}`} className={`upload ${arrastando ? 'arrastando' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setArrastando(true) }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault(); setArrastando(false)
            const f = e.dataTransfer.files?.[0]
            if (f && ref.current) { const dt = new DataTransfer(); dt.items.add(f); ref.current.files = dt.files; escolher(f) }
          }}>
          <span className="upload-icone"><UploadCloud size={20} /></span>
          <span className="upload-titulo">{titulo}</span>
          <span className="upload-sub">{ajuda}</span>
          {atual && <span className="upload-sub">Atual: {atual}. Enviar outro substitui.</span>}
          <span className="btn sec peq">Selecionar arquivo</span>
        </label>
      )}
    </div>
  )
}
