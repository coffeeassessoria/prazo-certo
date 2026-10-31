'use client'
import { useEffect, useState } from 'react'
import { FormResultado } from '@/components/FormResultado'
import { BotaoEnviar } from './BotaoEnviar'
import type { IdentidadeDocumento } from '@/lib/pmoc'
import type { Resultado } from '@/lib/usuarios'

export function IdentidadeForm({
  acao,
  identidade,
  logoUrl,
}: {
  acao: (prev: Resultado, fd: FormData) => Promise<Resultado>
  identidade: IdentidadeDocumento
  logoUrl?: string
}) {
  const [preview, setPreview] = useState(logoUrl)
  useEffect(() => {
    setPreview(logoUrl)
  }, [logoUrl])
  return (
    <FormResultado acao={acao}>
      <h2>Identidade da empresa nos documentos</h2>
      <p className="muted">
        Cabeçalho e rodapé em A4 para os PDFs gerados pelo sistema.
      </p>
      <div className="campo">
        <label htmlFor="doc-logo">Logo da empresa prestadora</label>
        {preview && (
          <div className="documento-logo-preview">
            <img src={preview} alt="Prévia do logo da empresa" />
          </div>
        )}
        <input
          id="doc-logo"
          type="file"
          name="logo"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            const arquivo = e.target.files?.[0]
            if (preview?.startsWith('blob:')) URL.revokeObjectURL(preview)
            setPreview(arquivo ? URL.createObjectURL(arquivo) : logoUrl)
          }}
        />
        <span className="dica">
          PNG, JPG ou WebP, até 2 MB. O logo será ajustado sem distorção.
          Prefira fundo transparente.
        </span>
      </div>
      <div className="campo">
        <label htmlFor="doc-nome">Nome / razão social no timbrado</label>
        <input
          id="doc-nome"
          name="nome"
          required
          maxLength={160}
          defaultValue={identidade.nome}
        />
      </div>
      <div className="linha">
        <div className="campo">
          <label htmlFor="doc-cnpj">CNPJ / CPF</label>
          <input
            id="doc-cnpj"
            name="documento"
            maxLength={40}
            defaultValue={identidade.documento}
          />
        </div>
        <div className="campo">
          <label htmlFor="doc-tel">Telefone</label>
          <input
            id="doc-tel"
            name="telefone"
            maxLength={80}
            defaultValue={identidade.telefone}
          />
        </div>
      </div>
      <div className="campo">
        <label htmlFor="doc-end">Endereço completo</label>
        <input
          id="doc-end"
          name="endereco"
          maxLength={500}
          defaultValue={identidade.endereco}
        />
      </div>
      <div className="campo">
        <label htmlFor="doc-email">E-mail</label>
        <input
          id="doc-email"
          name="email"
          type="email"
          maxLength={160}
          defaultValue={identidade.email}
        />
      </div>
      <BotaoEnviar className="btn grande">
        Salvar identidade dos documentos
      </BotaoEnviar>
    </FormResultado>
  )
}
