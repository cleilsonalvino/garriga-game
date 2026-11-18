import {
  AchievementDefinition,
  AgeStageInfo,
  DialogueLine,
  GameSaveState,
  LevelThreshold,
  LifeStageId,
  QuestDefinition,
  QuestId,
} from './types';

export const AGE_STAGES: Record<LifeStageId, AgeStageInfo> = {
  INFANCIA: {
    id: 'INFANCIA',
    label: 'Infância',
    ageRange: '8–10 anos',
    subtitle: 'O Recém-Chegado da Roça',
    description:
      'Cleilson acabou de descer da carroça com sua família. Tudo na Praça Central é novidade!',
    minLevel: 1,
  },
  PRE_ADOLESCENCIA: {
    id: 'PRE_ADOLESCENCIA',
    label: 'Pré-Adolescência',
    ageRange: '12–14 anos',
    subtitle: 'Estudante & Craque da Vila',
    description:
      'Mais alto e cheio de energia, Cleilson divide os dias entre a Escola Municipal e o Campo de Futebol.',
    minLevel: 3,
  },
  JUVENTUDE: {
    id: 'JUVENTUDE',
    label: 'Juventude',
    ageRange: '16–18 anos',
    subtitle: 'Explorador da Torre',
    description:
      'Agora um jovem curioso, Cleilson percorre a longa estrada leste até a Torre de Transmissão de Rádio.',
    minLevel: 5,
  },
  ADULTO: {
    id: 'ADULTO',
    label: 'Adulto Jovem',
    ageRange: '21–24 anos',
    subtitle: 'Lenda de Povoado Barriga',
    description:
      'Respeitado por todos os moradores, Cleilson ajuda a unir o povoado e a roça através das ondas do rádio.',
    minLevel: 7,
  },
};

export const LEVEL_TABLE: LevelThreshold[] = [
  { level: 1, xpRequired: 0, age: 8, stageId: 'INFANCIA', title: 'Novato da Carroça' },
  { level: 2, xpRequired: 100, age: 10, stageId: 'INFANCIA', title: 'Curioso da Praça' },
  { level: 3, xpRequired: 230, age: 12, stageId: 'PRE_ADOLESCENCIA', title: 'Aluno Aplicado' },
  { level: 4, xpRequired: 390, age: 14, stageId: 'PRE_ADOLESCENCIA', title: 'Craque do Campo' },
  { level: 5, xpRequired: 580, age: 16, stageId: 'JUVENTUDE', title: 'Aprendiz da Torre' },
  { level: 6, xpRequired: 800, age: 18, stageId: 'JUVENTUDE', title: 'Voz de Barriga' },
  { level: 7, xpRequired: 1060, age: 21, stageId: 'ADULTO', title: 'Guardião da Vila' },
  { level: 8, xpRequired: 1380, age: 24, stageId: 'ADULTO', title: 'Lenda do Povoado' },
];

export function getLevelInfoFromXP(xp: number): {
  current: LevelThreshold;
  next: LevelThreshold | null;
  progressPercent: number;
} {
  let current = LEVEL_TABLE[0];
  for (const row of LEVEL_TABLE) {
    if (xp >= row.xpRequired) {
      current = row;
    }
  }
  const nextIndex = LEVEL_TABLE.findIndex((r) => r.level === current.level) + 1;
  const next = nextIndex < LEVEL_TABLE.length ? LEVEL_TABLE[nextIndex] : null;

  if (!next) {
    return { current, next: null, progressPercent: 100 };
  }

  const span = next.xpRequired - current.xpRequired;
  const gained = xp - current.xpRequired;
  const progressPercent = Math.min(100, Math.max(0, Math.round((gained / span) * 100)));
  return { current, next, progressPercent };
}

export const QUESTS: Record<QuestId, QuestDefinition> = {
  q1_chegada: {
    id: 'q1_chegada',
    chapterLabel: 'Capítulo 1 · 8 anos',
    title: 'Da Roça para a Praça',
    summary:
      'Você acabou de chegar de carroça com sua família em Povoado Barriga. Conheça sua nova vizinhança na Praça Central!',
    isMain: true,
    xpReward: 110,
    coinReward: 30,
    statBoost: { carisma: 2, coragem: 1 },
    recommendedLevel: 1,
    objectives: [
      {
        id: 'obj_talk_maria',
        description: 'Conversar com Eleonora na porta da sua nova casa',
        targetX: 1110,
        targetY: 810,
        areaName: 'Praça Central',
      },
      {
        id: 'obj_visit_corners',
        description: 'Explorar os 4 cantos com ruas da Praça Central',
        targetX: 1200,
        targetY: 1050,
        areaName: 'Praça Central',
      },
      {
        id: 'obj_talk_carmem',
        description: 'Buscar broa fresca no Mercadinho do Uel (canto sudoeste)',
        targetX: 685,
        targetY: 1495,
        areaName: 'Estrada da Roça Antiga',
      },
    ],
  },
  q2_escola: {
    id: 'q2_escola',
    chapterLabel: 'Capítulo 2 · 11–12 anos',
    title: 'Os Mistérios da Escola',
    summary:
      'O tempo passou e Cleilson cresceu! Siga pela rua do canto noroeste da Praça até a Escola Municipal de Barriga.',
    isMain: true,
    xpReward: 150,
    coinReward: 40,
    statBoost: { sabedoria: 3, carisma: 1 },
    recommendedLevel: 2,
    objectives: [
      {
        id: 'obj_talk_pedrinho',
        description: 'Fazer amizade com Pedrinho no pátio da Escola (canto noroeste)',
        targetX: 560,
        targetY: 430,
        areaName: 'Escola Municipal',
      },
      {
        id: 'obj_complete_school_quiz',
        description: 'Participar da Gincana do Saber com o Professor Edinário',
        targetX: 470,
        targetY: 410,
        areaName: 'Escola Municipal',
      },
    ],
  },
  q3_futebol: {
    id: 'q3_futebol',
    chapterLabel: 'Capítulo 3 · 14 anos',
    title: 'A Copa do Campo de Barriga',
    summary:
      'Já na pré-adolescência, Cleilson quer mostrar talento! Pegue a rua do canto nordeste até o Campo de Futebol.',
    isMain: true,
    xpReward: 190,
    coinReward: 50,
    statBoost: { agilidade: 3, coragem: 2 },
    recommendedLevel: 3,
    objectives: [
      {
        id: 'obj_challenge_ze_bola',
        description: 'Desafiar o goleiro Vitor no Campo de Futebol (canto nordeste)',
        targetX: 1990,
        targetY: 555,
        areaName: 'Campo de Futebol',
      },
      {
        id: 'obj_win_soccer',
        description: 'Vencer o desafio de pênaltis marcando pelo menos 3 gols',
        targetX: 1990,
        targetY: 450,
        areaName: 'Campo de Futebol',
      },
    ],
  },
  q4_torre_radio: {
    id: 'q4_torre_radio',
    chapterLabel: 'Capítulo 4 · 16–18 anos',
    title: 'O Chamado na Torre de Rádio',
    summary:
      'No meio da Praça, pela lateral direita, uma longa avenida segue até o fim do povoado. Lá fica a Torre de Transmissão de Rádio!',
    isMain: true,
    xpReward: 260,
    coinReward: 75,
    statBoost: { coragem: 3, sabedoria: 2 },
    recommendedLevel: 5,
    objectives: [
      {
        id: 'obj_meet_geraldo',
        description: 'Seguir pela rua do meio-direito da Praça até Seu Geraldo na Torre de Rádio',
        targetX: 3255,
        targetY: 1030,
        areaName: 'Torre de Transmissão de Rádio',
      },
      {
        id: 'obj_tune_radio_storm',
        description: 'Sintonizar a Torre de Transmissão e enviar o alerta de chuva para a roça',
        targetX: 3340,
        targetY: 1005,
        areaName: 'Torre de Transmissão de Rádio',
      },
    ],
  },
  q5_festival: {
    id: 'q5_festival',
    chapterLabel: 'Capítulo 5 · 21 anos',
    title: 'O Grande Festival de Povoado Barriga',
    summary:
      'Adulto e querido por todos, Cleilson organiza o festival anual que une a roça e a praça pela Rádio Barriga!',
    isMain: true,
    xpReward: 380,
    coinReward: 120,
    statBoost: { carisma: 3, coragem: 2, sabedoria: 2, agilidade: 2 },
    recommendedLevel: 7,
    objectives: [
      {
        id: 'obj_get_vinyl',
        description: 'Pegar o disco clássico de sanfona com Uel no Mercadinho',
        targetX: 685,
        targetY: 1495,
        areaName: 'Estrada da Roça Antiga',
      },
      {
        id: 'obj_invite_school',
        description: 'Convidar o Professor Edinário e os alunos na Escola Municipal',
        targetX: 470,
        targetY: 410,
        areaName: 'Escola Municipal',
      },
      {
        id: 'obj_broadcast_festival',
        description: 'Transmitir a abertura do Festival na Torre de Transmissão de Rádio',
        targetX: 3340,
        targetY: 1005,
        areaName: 'Torre de Transmissão de Rádio',
      },
    ],
  },
  sq_galinhas: {
    id: 'sq_galinhas',
    chapterLabel: 'Missão Extra',
    title: 'As Galinhas Fuleras do Seu Chico',
    summary: 'Ajude Seu Chico no canto sudeste (Vila Sul) a recolher as galinhas fujonas.',
    isMain: false,
    xpReward: 90,
    coinReward: 35,
    statBoost: { agilidade: 2 },
    recommendedLevel: 1,
    objectives: [
      {
        id: 'obj_chicken_herd',
        description: 'Recolher as galinhas com Seu Chico na Vila Sul',
        targetX: 1790,
        targetY: 1750,
        areaName: 'Rua da Vila Sul',
      },
    ],
  },
  sq_reliquias: {
    id: 'sq_reliquias',
    chapterLabel: 'Coleção do Povoado',
    title: 'Memórias de Barriga',
    summary: 'Encontre todas as 8 relíquias escondidas pelas ruas, interiores e na Roça Antiga.',
    isMain: false,
    xpReward: 150,
    coinReward: 60,
    statBoost: { sabedoria: 2, coragem: 2 },
    recommendedLevel: 1,
    objectives: [
      {
        id: 'obj_all_relics',
        description: 'Coletar as 8 relíquias espalhadas pelo mapa e interiores',
        targetX: 1200,
        targetY: 1050,
        areaName: 'Todo o Povoado',
      },
    ],
  },
};

export const MAIN_QUEST_ORDER: QuestId[] = [
  'q1_chegada',
  'q2_escola',
  'q3_futebol',
  'q4_torre_radio',
  'q5_festival',
];

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'ach_carroca',
    title: 'Pé na Estrada',
    description: 'Completou a viagem de carroça da roça até a Praça de Povoado Barriga.',
    category: 'História',
    xpBonus: 30,
    iconKey: 'wagon',
  },
  {
    id: 'ach_praca_cantos',
    title: 'Vizinho da Praça',
    description: 'Visitou as 4 ruas que saem dos quatro cantos da Praça Central.',
    category: 'Exploração',
    xpBonus: 50,
    iconKey: 'compass',
  },
  {
    id: 'ach_escola',
    title: 'Aluno Nota Dez',
    description: 'Concluiu a Gincana do Saber na Escola Municipal de Barriga.',
    category: 'História',
    xpBonus: 55,
    iconKey: 'book',
  },
  {
    id: 'ach_futebol',
    title: 'Craque de Barriga',
    description: 'Derrotou o goleiro Vitor no Campo de Futebol do povoado.',
    category: 'História',
    xpBonus: 65,
    iconKey: 'trophy',
  },
  {
    id: 'ach_artilheiro',
    title: 'Artilheiro Perfeito',
    description: 'Marcou 5 gols em 5 cobranças no desafio de pênaltis do campo.',
    category: 'Habilidade',
    xpBonus: 80,
    iconKey: 'star',
  },
  {
    id: 'ach_torre_radio',
    title: 'Na Sintonia Certa',
    description: 'Operou a Torre de Transmissão de Rádio no final da avenida leste.',
    category: 'História',
    xpBonus: 75,
    iconKey: 'radio',
  },
  {
    id: 'ach_sinal_limpo',
    title: 'Engenheiro de Ondas',
    description: 'Completou 3 missões de transmissão na Torre de Rádio.',
    category: 'Habilidade',
    xpBonus: 90,
    iconKey: 'signal',
  },
  {
    id: 'ach_crescimento',
    title: 'O Tempo Voa',
    description: 'Chegou à juventude (16 anos) crescendo em Povoado Barriga.',
    category: 'Vida no Povoado',
    xpBonus: 60,
    iconKey: 'sprout',
  },
  {
    id: 'ach_adulto',
    title: 'Filho Ilustre da Praça',
    description: 'Alcançou a fase adulta (21+ anos) como morador respeitado.',
    category: 'Vida no Povoado',
    xpBonus: 100,
    iconKey: 'crown',
  },
  {
    id: 'ach_caramelo',
    title: 'Amigo do Caramelo',
    description: 'Fez carinho no cachorro Caramelo na Praça Central.',
    category: 'Vida no Povoado',
    xpBonus: 25,
    iconKey: 'heart',
  },
  {
    id: 'ach_reliquias',
    title: 'Guardião das Memórias',
    description: 'Encontrou todas as 8 relíquias espalhadas pelo povoado, casas e roça.',
    category: 'Exploração',
    xpBonus: 110,
    iconKey: 'gem',
  },
  {
    id: 'ach_lenda',
    title: 'Lenda de Povoado Barriga',
    description: 'Concluiu toda a jornada de Cleilson e transmitiu o Grande Festival.',
    category: 'História',
    xpBonus: 150,
    iconKey: 'award',
  },
];

export function getNPCDialogue(npcId: string, save: GameSaveState): DialogueLine[] {
  const { current: lvlInfo } = getLevelInfoFromXP(save.xp);
  const age = lvlInfo.age;
  const activeQuest = save.activeQuestId;

  switch (npcId) {
    case 'dona_maria': {
      if (!save.completedObjectiveIds.includes('obj_talk_maria')) {
        return [
          {
            speaker: 'Eleonora',
            role: 'Mãe do Cleilson',
            avatarColor: '#e07a5f',
            text: `Que bom te ver animado, meu filho! Deixamos a roça afastada para trás, mas a nossa casa bem aqui na Praça Central já tem cheiro de café passado.`,
          },
          {
            speaker: 'Eleonora',
            role: 'Mãe do Cleilson',
            avatarColor: '#e07a5f',
            text: `Dê uma volta nos quatro cantos da Praça para conhecer as ruas do povoado e passe no Mercadinho do Uel, ali no canto sudoeste, para buscar broa fresca.`,
            choices: [
              {
                label: 'Pode deixar, mãe! Vou explorar tudo!',
                statGain: { coragem: 1 },
                xpGain: 20,
                completeObjectiveId: 'obj_talk_maria',
                closeAfter: true,
              },
              {
                label: 'Vou sentir falta da roça, mas aqui parece incrível.',
                statGain: { carisma: 1 },
                xpGain: 20,
                completeObjectiveId: 'obj_talk_maria',
                closeAfter: true,
              },
            ],
          },
        ];
      }
      if (activeQuest === 'q5_festival') {
        return [
          {
            speaker: 'Eleonora',
            role: 'Mãe do Cleilson',
            avatarColor: '#e07a5f',
            text: `Olha só você com ${age} anos, Cleilson! Parece que foi ontem que chegamos de carroça... Todo mundo na praça está ajudando a enfeitar as bandeirinhas para o Festival!`,
          },
        ];
      }
      return [
        {
          speaker: 'Eleonora',
          role: 'Mãe do Cleilson',
          avatarColor: '#e07a5f',
          text: `Você está crescendo rápido, Cleilson (${age} anos)! Lembre-se de sempre cumprimentar os vizinhos na Praça e descansar quando precisar.`,
        },
      ];
    }

    case 'seu_antonio': {
      return [
        {
          speaker: 'Meda',
          role: 'Pai do Cleilson',
          avatarColor: '#4a7c59',
          text: `A carroça aguentou firme a viagem da roça até aqui, Cleilson! Deixei ela estacionada lá na entrada sudoeste caso a gente precise buscar lenha.`,
        },
        {
          speaker: 'Meda',
          role: 'Pai do Cleilson',
          avatarColor: '#4a7c59',
          text: `Se olhar no meio da lateral direita da praça, vai ver uma rua reta que leva até o final do povoado — lá fica a famosa Torre de Rádio do Seu Geraldo!`,
          choices: [
            {
              label: 'Um dia ainda vou mandar um recado nessa torre!',
              statGain: { coragem: 1 },
              xpGain: save.storyFlags['antonio_tip'] ? 0 : 15,
              advanceFlag: 'antonio_tip',
              closeAfter: true,
            },
            {
              label: 'Obrigado pelo conselho, pai.',
              closeAfter: true,
            },
          ],
        },
      ];
    }

    case 'dona_carmem': {
      if (
        activeQuest === 'q1_chegada' &&
        !save.completedObjectiveIds.includes('obj_talk_carmem')
      ) {
        return [
          {
            speaker: 'Uel',
            role: 'Dono do Mercadinho',
            avatarColor: '#d97706',
            text: `Ora, você é o filho da Eleonora e do Meda que veio da roça de carroça! Seja muito bem-vindo a Povoado Barriga, pequeno Cleilson.`,
          },
          {
            speaker: 'Uel',
            role: 'Dono do Mercadinho',
            avatarColor: '#d97706',
            text: `Toma aqui uma broa de milho quentinha para sua família! E quando ficar um pouco mais velho, dê um pulo na Escola lá no canto noroeste.`,
            choices: [
              {
                label: 'Muito obrigado, Uel! (Pegar Broa)',
                statGain: { carisma: 1 },
                xpGain: 25,
                coinGain: 15,
                completeObjectiveId: 'obj_talk_carmem',
                closeAfter: true,
              },
            ],
          },
        ];
      }

      if (
        activeQuest === 'q5_festival' &&
        !save.completedObjectiveIds.includes('obj_get_vinyl')
      ) {
        return [
          {
            speaker: 'Uel',
            role: 'Dono do Mercadinho',
            avatarColor: '#d97706',
            text: `Cleilson! Já com ${age} anos e organizando o Grande Festival do povoado! Guardei o disco de vinil de sanfona e forró exatamente para você tocar na Rádio Barriga.`,
            choices: [
              {
                label: 'Pegar o Disco Clássico de Sanfona',
                xpGain: 40,
                statGain: { carisma: 1 },
                completeObjectiveId: 'obj_get_vinyl',
                closeAfter: true,
              },
            ],
          },
        ];
      }

      return [
        {
          speaker: 'Uel',
          role: 'Dono do Mercadinho',
          avatarColor: '#d97706',
          text: `Sempre tem café fresco, doce de leite e boas histórias aqui no Mercadinho da estrada sudoeste!`,
        },
      ];
    }

    case 'pedrinho': {
      if (
        activeQuest === 'q2_escola' &&
        !save.completedObjectiveIds.includes('obj_talk_pedrinho')
      ) {
        return [
          {
            speaker: 'Pedrinho',
            role: 'Colega de Escola',
            avatarColor: '#16a34a',
            text: `E aí, Cleilson! Você veio morar na casa da Praça, né? Eu conheço cada atalho desse povoado, mas o Professor Edinário disse que hoje tem Gincana do Saber!`,
            choices: [
              {
                label: 'Estou pronto! Vamos mostrar o que sabemos!',
                statGain: { sabedoria: 1 },
                xpGain: 25,
                completeObjectiveId: 'obj_talk_pedrinho',
                closeAfter: true,
              },
            ],
          },
        ];
      }
      return [
        {
          speaker: 'Pedrinho',
          role: 'Colega de Escola',
          avatarColor: '#16a34a',
          text: `Depois da aula a gente sempre corre pelo canto nordeste da praça para bater uma bola no Campo de Futebol!`,
        },
      ];
    }

    case 'professora_beatriz': {
      if (
        activeQuest === 'q5_festival' &&
        !save.completedObjectiveIds.includes('obj_invite_school')
      ) {
        return [
          {
            speaker: 'Edinário',
            role: 'Professor da Escola Municipal',
            avatarColor: '#2563eb',
            text: `Que orgulho ver meu antigo aluno com ${age} anos liderando o festival do povoado! As crianças já prepararam as lanternas de papel e vão para a Praça agora mesmo!`,
            choices: [
              {
                label: 'Confirmar participação da Escola no Festival',
                xpGain: 40,
                statGain: { carisma: 1 },
                completeObjectiveId: 'obj_invite_school',
                closeAfter: true,
              },
            ],
          },
        ];
      }

      return [
        {
          speaker: 'Edinário',
          role: 'Professor da Escola Municipal',
          avatarColor: '#2563eb',
          text:
            activeQuest === 'q2_escola'
              ? `Bem-vindo à Escola Municipal de Barriga, Cleilson! Quer participar da nossa Gincana do Saber no quadro-negro para ganhar experiência e sabedoria?`
              : `A escola está sempre aberta para você treinar a mente, Cleilson. Quer tentar um desafio rápido no quadro-negro?`,
          choices: [
            {
              label: 'Participar da Gincana da Escola',
              triggerMiniGame: 'SCHOOL_QUIZ',
              closeAfter: true,
            },
            {
              label: 'Volto mais tarde, professor.',
              closeAfter: true,
            },
          ],
        },
      ];
    }

    case 'ze_bola': {
      if (
        activeQuest === 'q3_futebol' &&
        !save.completedObjectiveIds.includes('obj_challenge_ze_bola')
      ) {
        return [
          {
            speaker: 'Vitor',
            role: 'Goleiro & Capitão do Campo',
            avatarColor: '#eab308',
            text: `Fala, Cleilson! Ouvi dizer que o garoto que chegou da roça cresceu e quer encarar o gol da Arena Barriga. Quero ver se você acerta 3 de 5 pênaltis em mim!`,
            choices: [
              {
                label: 'Aceitar o desafio e ir para a marca do pênalti!',
                statGain: { coragem: 1 },
                xpGain: 20,
                completeObjectiveId: 'obj_challenge_ze_bola',
                triggerMiniGame: 'SOCCER_PENALTY',
                closeAfter: true,
              },
              {
                label: 'Vou aquecer primeiro e já volto.',
                completeObjectiveId: 'obj_challenge_ze_bola',
                closeAfter: true,
              },
            ],
          },
        ];
      }
      return [
        {
          speaker: 'Vitor',
          role: 'Goleiro & Capitão do Campo',
          avatarColor: '#eab308',
          text: `O gramado do Campo de Futebol tá um tapete hoje! Bora bater uma disputa de pênaltis para treinar a pontaria?`,
          choices: [
            {
              label: 'Bora jogar Pênaltis!',
              triggerMiniGame: 'SOCCER_PENALTY',
              closeAfter: true,
            },
            {
              label: 'Agora não, Vitor.',
              closeAfter: true,
            },
          ],
        },
      ];
    }

    case 'seu_chico': {
      return [
        {
          speaker: 'Seu Chico',
          role: 'Artesão da Vila Sul',
          avatarColor: '#92400e',
          text: `Eita, Cleilson! Aqui na rua do canto sudeste as galinhas vivem escapando do cercado para ciscar perto da oficina. Quer dar uma força para juntar as bichinhas?`,
          choices: [
            {
              label: 'Ajudar a recolher as galinhas fujonas!',
              triggerMiniGame: 'CHICKEN_HERD',
              closeAfter: true,
            },
            {
              label: 'Só estou dando uma volta pela Vila Sul.',
              closeAfter: true,
            },
          ],
        },
      ];
    }

    case 'seu_geraldo': {
      const canBroadcastFestival =
        activeQuest === 'q5_festival' &&
        save.completedObjectiveIds.includes('obj_get_vinyl') &&
        save.completedObjectiveIds.includes('obj_invite_school');

      if (
        activeQuest === 'q4_torre_radio' &&
        !save.completedObjectiveIds.includes('obj_meet_geraldo')
      ) {
        return [
          {
            speaker: 'Seu Geraldo',
            role: 'Radialista da Torre',
            avatarColor: '#b91c1c',
            text: `Você seguiu toda a avenida da lateral direita da Praça até o fim do povoado! Bem-vindo à Torre de Transmissão da Rádio Barriga 98.5 FM, jovem Cleilson!`,
          },
          {
            speaker: 'Seu Geraldo',
            role: 'Radialista da Torre',
            avatarColor: '#b91c1c',
            text: `Uma tempestade forte está chegando lá nas roças afastadas de onde sua família veio. Precisamos alinhar a frequência da torre agora para avisar todo mundo!`,
            choices: [
              {
                label: 'Operar a Torre de Transmissão de Rádio!',
                statGain: { coragem: 1 },
                xpGain: 30,
                completeObjectiveId: 'obj_meet_geraldo',
                triggerMiniGame: 'RADIO_TUNER',
                closeAfter: true,
              },
            ],
          },
        ];
      }

      if (canBroadcastFestival) {
        return [
          {
            speaker: 'Seu Geraldo',
            role: 'Radialista da Torre',
            avatarColor: '#b91c1c',
            text: `Com o disco do Uel em mãos e a cidade inteira reunida na Praça, só falta você assumir o microfone da Torre de Rádio para transmitir o Grande Festival ao vivo!`,
            choices: [
              {
                label: 'Iniciar Transmissão do Grande Festival!',
                triggerMiniGame: 'RADIO_TUNER',
                closeAfter: true,
              },
            ],
          },
        ];
      }

      return [
        {
          speaker: 'Seu Geraldo',
          role: 'Radialista da Torre',
          avatarColor: '#b91c1c',
          text: `Aqui do alto da Torre de Transmissão nossa voz alcança cada casa de Povoado Barriga e até as fazendas mais distantes! Quer fazer uma missão de sintonia no rádio?`,
          choices: [
            {
              label: 'Sintonizar Rádio (Missão de Transmissão)',
              triggerMiniGame: 'RADIO_TUNER',
              closeAfter: true,
            },
            {
              label: 'Só admirando a torre por enquanto.',
              closeAfter: true,
            },
          ],
        },
      ];
    }

    case 'tio_benedito': {
      return [
        {
          speaker: 'Danilo',
          role: 'Cuidador da Roça e das Vacas',
          avatarColor: '#ca8a04',
          text: `Olha quem voltou para visitar a antiga roça, Cleilson! Com ${age} anos você cresceu firme! Enquanto isso eu sigo cuidando do milharal e das vacas Mimosa e Estrela aqui no pasto.`,
        },
        {
          speaker: 'Danilo',
          role: 'Cuidador da Roça e das Vacas',
          avatarColor: '#ca8a04',
          text: `Na hora da ordenha eu sempre sintonizo a Rádio Barriga 98.5 FM. Quando a torre lá do povoado transmite, até o gado aqui do cercado fica tranquilo ouvindo modão!`,
          choices: [
            {
              label: 'Bom ver que a roça e as vacas estão bem cuidadas, Danilo!',
              statGain: { coragem: 1 },
              xpGain: save.storyFlags['benedito_visit'] ? 0 : 25,
              advanceFlag: 'benedito_visit',
              closeAfter: true,
            },
          ],
        },
      ];
    }

    case 'matheus': {
      return [
        {
          speaker: 'Matheus',
          role: 'Designer do Povoado',
          avatarColor: '#0284c7',
          text: `E aí, Cleilson! Eu e o Ramon estamos cuidando do design das placas, dos cartazes da Praça Central e da identidade visual da Rádio Barriga.`,
        },
        {
          speaker: 'Matheus',
          role: 'Designer do Povoado',
          avatarColor: '#0284c7',
          text: `A tipografia dos letreiros tem que combinar com a madeira rústica do povoado. Quer uma dica rápida de design para suas aventuras aos ${age} anos?`,
          choices: [
            {
              label: 'Quero sim, Matheus! Como deixar tudo mais harmônico?',
              statGain: { carisma: 1 },
              xpGain: save.storyFlags['matheus_tip'] ? 0 : 20,
              advanceFlag: 'matheus_tip',
              closeAfter: true,
            },
            {
              label: 'Ficou ótimo o visual da Praça!',
              closeAfter: true,
            },
          ],
        },
      ];
    }

    case 'ramon': {
      return [
        {
          speaker: 'Ramon',
          role: 'Designer & Ilustrador',
          avatarColor: '#7c3aed',
          text: `Salve, Cleilson! Enquanto o Matheus organiza o layout das placas do povoado, eu desenho as bandeirinhas do festival, os brasões da escola e os estandartes do campo.`,
        },
        {
          speaker: 'Ramon',
          role: 'Designer & Ilustrador',
          avatarColor: '#7c3aed',
          text: `Um bom designer observa cada detalhe da luz da praça do amanhecer ao anoitecer antes de escolher as cores certas!`,
          choices: [
            {
              label: 'Admiro o trabalho de vocês dois, Ramon!',
              statGain: { sabedoria: 1 },
              xpGain: save.storyFlags['ramon_tip'] ? 0 : 20,
              advanceFlag: 'ramon_tip',
              closeAfter: true,
            },
            {
              label: 'Até logo, Ramon!',
              closeAfter: true,
            },
          ],
        },
      ];
    }

    case 'nosmalda': {
      return [
        {
          speaker: 'Nosmalda',
          role: 'Zeladora da Igreja Matriz',
          avatarColor: '#be123c',
          text: `Que Deus abençoe seus passos, Cleilson! Cuido com muito carinho da Igreja Matriz de Barriga — das flores do altar, dos vitrais e do sino que marca as horas do povoado.`,
        },
        {
          speaker: 'Nosmalda',
          role: 'Zeladora da Igreja Matriz',
          avatarColor: '#be123c',
          text: `Sempre que quiser um momento de paz aos ${age} anos, a porta da Igreja na lateral oeste da Praça estará aberta para você e sua família.`,
          choices: [
            {
              label: 'Obrigado pelas palavras e bênçãos, Nosmalda!',
              statGain: { carisma: 1 },
              xpGain: save.storyFlags['nosmalda_blessing'] ? 0 : 20,
              advanceFlag: 'nosmalda_blessing',
              closeAfter: true,
            },
            {
              label: 'Vou cuidar bem do nosso povoado!',
              closeAfter: true,
            },
          ],
        },
      ];
    }

    default:
      return [
        {
          speaker: 'Morador',
          role: 'Povoado Barriga',
          avatarColor: '#6b7280',
          text: 'Bom dia, Cleilson! Povoado Barriga é pequeno, mas cheio de histórias!',
        },
      ];
  }
}
