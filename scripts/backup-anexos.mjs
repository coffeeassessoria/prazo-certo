// Baixa todos os arquivos do bucket "anexos" do Supabase para a pasta informada (usado pelo backup noturno).
import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

const [, , destino] = process.argv
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const BUCKET = 'anexos'

async function listar(prefixo = '') {
  const arquivos = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await sb.storage.from(BUCKET).list(prefixo, { limit: 1000, offset })
    if (error) throw error
    for (const e of data) {
      const caminho = prefixo ? `${prefixo}/${e.name}` : e.name
      if (e.id) arquivos.push(caminho)
      else arquivos.push(...(await listar(caminho))) // pasta
    }
    if (data.length < 1000) break
  }
  return arquivos
}

const arquivos = await listar()
let ok = 0
for (const caminho of arquivos) {
  const { data, error } = await sb.storage.from(BUCKET).download(caminho)
  if (error) throw new Error(`Falha ao baixar ${caminho}: ${error.message}`)
  const alvo = join(destino, BUCKET, caminho)
  await mkdir(dirname(alvo), { recursive: true })
  await writeFile(alvo, Buffer.from(await data.arrayBuffer()))
  ok++
}
console.log(`Anexos copiados: ${ok}`)
