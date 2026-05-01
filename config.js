const CONFIG_DISCIPLINA = {
  titulo: "Portal EA — PGMAD/UESB",
  
  admin: {
    email: "vejasuamaofalar@gmail.com",
    senha: "A1g3d5s@!#"
  },

  alunos: [
    { nome: "RAFAELA BARROS OLIVEIRA", email: "2025A0047@uesb.edu.br", senha: "123@mudar" },
    { nome: "ACÁSSIO FRANCO GOMES FERREIRA", email: "2025A0053@uesb.edu.br", senha: "123@mudar" },
    { nome: "VICTOR ARAUJO DA SILVA", email: "2025A0052@uesb.edu.br", senha: "123@mudar" },
    { nome: "INGRID FERNANDES DA SILVA DE OLIVEIRA FIGUEIRA", email: "2025A0059@uesb.edu.br", senha: "123@mudar" },
    { nome: "ALINE VALENÇA DE OLIVEIRA RIBAS", email: "2025A0048@uesb.edu.br", senha: "123@mudar" },
    { nome: "AMANDA LUISA FAGUNDES AMORIM", email: "2025A0056@uesb.edu.br", senha: "123@mudar" },
    { nome: "ROSANIA GOMES DE PAZ", email: "2025a0049@uesb.edu.br", senha: "123@mudar" },
    { nome: "ANA CRISTINA CAIRES QUEIROGA", email: "anacristinacairesqueiroga@gmail.com", senha: "123@mudar" },
    { nome: "BEATRIZ LIMA BARROS", email: "2025a0054@uesb.edu.br", senha: "123@mudar" },
    { nome: "MICHELLE DE JESUS MACEDO", email: "2025A0051@uesb.edu.br", senha: "123@mudar" },
    { nome: "SANDY RIBEIRO PEREIRA DA SILVA", email: "2025A0046@uesb.edu.br", senha: "123@mudar" }
  ],

  modulos: [
    {
      id: 1,
      titulo: "Sábado Manhã",
      subtitulo: "Fundamentos da EA",
      data: '2026-05-02',
      inicioHora: "09:00",
      fimHora: "12:00",
      materiais: [
        { tipo: 'pdf', nome: 'Educação ambiental: princípios e práticas', autor: 'DIAS, G. F.', link: '#' }
      ],
      atividades: [
        { id:'m1q1', tempoSugerido:'20 min', enunciado:'Quais os marcos históricos da EA?' }
      ]
    },
    {
      id: 2,
      titulo: "Sábado Tarde",
      subtitulo: "Práticas e Metodologias",
      data: '2026-05-02',
      inicioHora: "14:00",
      fimHora: "15:00",
      materiais: [
        { tipo: 'video', nome: 'Documentário: A Lei da Mata', link: '#' }
      ],
      atividades: [
        { id:'m2q1', tempoSugerido:'15 min', enunciado:'Como aplicar a EA no cotidiano escolar?' }
      ]
    },
    {
      id: 3,
      titulo: "Domingo Manhã",
      subtitulo: "Políticas Públicas em EA",
      data: '2026-05-03',
      inicioHora: "09:00",
      fimHora: "12:00",
      materiais: [],
      atividades: []
    },
    {
      id: 4,
      titulo: "Domingo Tarde",
      subtitulo: "Projetos e Intervenções",
      data: '2026-05-03',
      inicioHora: "13:00",
      fimHora: "18:00",
      materiais: [],
      atividades: []
    }
  ]
};
