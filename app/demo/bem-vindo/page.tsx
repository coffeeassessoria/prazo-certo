import { Quiz } from '@/app/bem-vindo/Quiz'

// Demonstração do quiz de boas-vindas (não salva nada)
export default function DemoQuiz() {
  return (
    <Quiz
      inicial={{ nome: 'Empresa demonstração', documento: '', cidade: 'Sinop - MT', responsavel: 'Visitante', segmento: '', modelos: [], antecedencia: 30, emails: ['voce@empresa.com.br'], whatsapp: '', clientes: [] }}
      primeiroNome="Visitante"
      podeConcluir={false}
    />
  )
}
