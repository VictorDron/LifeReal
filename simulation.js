// Configura o canvas e estatísticas
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth - 300; // Subtrai a largura do painel de estatísticas
canvas.height = window.innerHeight;

// Variáveis globais do ambiente
const ENVIRONMENT = {
  temperature: 20,
  seasonDuration: 1000,
  currentSeason: 'spring',
  resourceScarcity: 1,
  predatorPressure: 1,
  socialComplexity: 0,
  catastropheChance: 0.0001,
  knowledge: 0
};

// Sistema de eventos históricos
const HISTORICAL_EVENTS = [];

// Função auxiliar para números aleatórios
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

// Classes de comportamento social
class SocialBehavior {
  constructor() {
    this.cooperation = rand(0, 1);
    this.aggression = rand(0, 1);
    this.sharing = rand(0, 1);
    this.learning = rand(0, 1);
  }

  evolve() {
    this.cooperation += rand(-0.1, 0.1);
    this.aggression += rand(-0.1, 0.1);
    this.sharing += rand(-0.1, 0.1);
    this.learning += rand(-0.1, 0.1);
    
    // Normalizar valores
    this.cooperation = Math.max(0, Math.min(1, this.cooperation));
    this.aggression = Math.max(0, Math.min(1, this.aggression));
    this.sharing = Math.max(0, Math.min(1, this.sharing));
    this.learning = Math.max(0, Math.min(1, this.learning));
  }
}

// Sistema de recursos e economia
class Resource {
  constructor(type, value, scarcity) {
    this.type = type;
    this.value = value;
    this.scarcity = scarcity;
  }
}

// Classe que representa uma célula na simulação
class Cell {
  constructor(x, y, genes, metabolismRate) {
    // Atributos básicos
    this.x = x;
    this.y = y;
    this.genes = genes || {
      r: Math.floor(rand(100, 255)),
      g: Math.floor(rand(100, 255)),
      b: Math.floor(rand(100, 255)),
      adaptability: rand(0.3, 0.9),
      intelligence: rand(0.3, 0.9),
      resilience: rand(0.4, 0.95)
    };
    
    // Características avançadas
    this.metabolismRate = metabolismRate !== undefined ? metabolismRate : rand(0.02, 0.08);
    this.energy = 150;
    this.age = 0;
    this.radius = 5;
    this.dx = rand(-1, 1);
    this.dy = rand(-1, 1);
    this.reproCooldown = 0;
    
    // Novos atributos
    this.generation = 0;
    this.knowledge = 0;
    this.resources = [];
    this.socialBehavior = new SocialBehavior();
    this.tribe = null;
    this.specialization = Math.random() > 0.7 ? ['gatherer', 'hunter', 'builder', 'healer'][Math.floor(rand(0, 4))] : null;
    this.memories = [];
    this.innovations = [];
    
    // Sistema de saúde
    this.health = {
      immunity: rand(0.5, 1),
      injuries: 0,
      diseases: []
    };
  }
  
  update() {
    // Incrementa idade e consome energia de acordo com o metabolismo
    this.age += 0.02;
    
    // Ajusta consumo de energia baseado na temperatura
    const tempEffect = Math.abs(ENVIRONMENT.temperature - 20) / 20; // 20°C é a temperatura ideal
    const tempStress = tempEffect * 0.2; // Fator de estresse por temperatura
    
    this.energy -= this.metabolismRate * (1 - this.genes.resilience * 0.5) * (1 + tempStress);
    
    // Atualiza posição com base na velocidade
    this.x += this.dx;
    this.y += this.dy;
    // Variação aleatória para movimento menos previsível
    this.dx += rand(-0.1, 0.1);
    this.dy += rand(-0.1, 0.1);
    // Limita a velocidade máxima
    const speed = Math.hypot(this.dx, this.dy);
    const maxSpeed = 2;
    if (speed > maxSpeed) {
      this.dx = (this.dx / speed) * maxSpeed;
      this.dy = (this.dy / speed) * maxSpeed;
    }
    
    // Se bater nas bordas, inverte a direção
    if(this.x < this.radius || this.x > canvas.width - this.radius) {
      this.dx *= -1;
    }
    if(this.y < this.radius || this.y > canvas.height - this.radius) {
      this.dy *= -1;
    }
    
    // Atualiza o cooldown de reprodução
    if (this.reproCooldown > 0) {
      this.reproCooldown -= 1;
    }
  }
  
  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${this.genes.r}, ${this.genes.g}, ${this.genes.b})`;
    ctx.fill();
  }

  think() {
    // Processo de tomada de decisão baseado em conhecimento e experiência
    if (this.energy < 30) {
      // Comportamento de sobrevivência
      this.seekFood();
    } else if (this.health.injuries > 0 || this.health.diseases.length > 0) {
      // Comportamento de cura
      this.seekHealing();
    } else if (this.energy > 80 && this.resources.length < 3) {
      // Comportamento de acumulação
      this.gatherResources();
    }

    // Aprendizado
    if (Math.random() < this.genes.intelligence) {
      this.learn();
    }

    // Inovação
    if (Math.random() < this.genes.intelligence * 0.1) {
      this.innovate();
    }
  }

  learn() {
    this.knowledge += 0.1 * this.genes.intelligence;
    if (this.knowledge > ENVIRONMENT.knowledge) {
      ENVIRONMENT.knowledge = this.knowledge;
      this.recordHistoricalEvent('New Knowledge Discovered');
    }
  }

  innovate() {
    if (Math.random() < 0.01 * this.knowledge) {
      const innovation = {
        type: ['tool', 'technique', 'social'][Math.floor(rand(0, 3))],
        value: rand(0.1, 1)
      };
      this.innovations.push(innovation);
      this.recordHistoricalEvent('Innovation Created');
    }
  }

  recordHistoricalEvent(event) {
    HISTORICAL_EVENTS.push({
      event: event,
      time: Date.now(),
      cell: this,
      environmentState: {...ENVIRONMENT}
    });
  }

  seekFood() {
    let nearestFood = null;
    let minDist = Infinity;
    
    for (let food of foods) {
      const dx = this.x - food.x;
      const dy = this.y - food.y;
      const dist = Math.hypot(dx, dy);
      if (dist < minDist) {
        minDist = dist;
        nearestFood = food;
      }
    }
    
    if (nearestFood) {
      const dx = nearestFood.x - this.x;
      const dy = nearestFood.y - this.y;
      const dist = Math.hypot(dx, dy);
      this.dx = dx / dist;
      this.dy = dy / dist;
    }
  }

  seekHealing() {
    if (this.tribe) {
      const healer = this.tribe.members.find(m => m.specialization === 'healer');
      if (healer) {
        const dx = healer.x - this.x;
        const dy = healer.y - this.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 20) {
          this.health.injuries *= 0.9;
          this.health.diseases = [];
        } else {
          this.dx = dx / dist;
          this.dy = dy / dist;
        }
      }
    }
  }

  gatherResources() {
    if (Math.random() < 0.1 / ENVIRONMENT.resourceScarcity) {
      this.resources.push(new Resource(
        ['food', 'material', 'tool'][Math.floor(rand(0, 3))],
        rand(10, 30),
        ENVIRONMENT.resourceScarcity
      ));
    }
  }
}

// Classe que representa o alimento (recurso econômico) no ambiente
class Food {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.energy = 70;
    this.radius = 3;
  }
  
  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#0f0';  // alimento exibido em verde
    ctx.fill();
  }
}

// Arrays que armazenam as células e os alimentos do ambiente
let cells = [];
let foods = [];

// Inicializa algumas células de partida
for (let i = 0; i < 30; i++) {
  cells.push(new Cell(rand(0, canvas.width), rand(0, canvas.height)));
}

// Função para gerar alimento aleatoriamente na tela
function spawnFood() {
  foods.push(new Food(rand(0, canvas.width), rand(0, canvas.height)));
}

// Função que calcula o custo de reprodução de forma dinâmica
function getReproductionCost() {
  return 30 + cells.length * 0.03;
}

// Tenta reproduzir duas células próximas e com energia suficiente
function tryReproduce(cell1, cell2) {
  const dx = cell1.x - cell2.x;
  const dy = cell1.y - cell2.y;
  const dist = Math.hypot(dx, dy);
  // Se as células estão próximas
  if (dist < cell1.radius + cell2.radius + 5) {
    const reproCost = getReproductionCost();
    // Verifica se ambas têm energia acima do custo e não estão em cooldown
    if (cell1.energy > reproCost && cell2.energy > reproCost &&
        cell1.reproCooldown <= 0 && cell2.reproCooldown <= 0) {
      
      // Combina os genes dos pais com uma mutação leve
      let newGenes = {
        r: Math.floor((cell1.genes.r + cell2.genes.r) / 2 + rand(-10, 10)),
        g: Math.floor((cell1.genes.g + cell2.genes.g) / 2 + rand(-10, 10)),
        b: Math.floor((cell1.genes.b + cell2.genes.b) / 2 + rand(-10, 10))
      };
      // Ajusta os valores para que fiquem entre 0 e 255
      newGenes.r = Math.min(255, Math.max(0, newGenes.r));
      newGenes.g = Math.min(255, Math.max(0, newGenes.g));
      newGenes.b = Math.min(255, Math.max(0, newGenes.b));
      
      // Determina a nova taxa de metabolismo herdada dos pais (com mutação pequena)
      let newMetabolism = ((cell1.metabolismRate + cell2.metabolismRate) / 2) + rand(-0.01, 0.01);
      newMetabolism = Math.min(0.2, Math.max(0.05, newMetabolism));
      
      // Cria a nova célula (descendente) próximo à posição do pai
      const offspring = new Cell(cell1.x, cell1.y, newGenes, newMetabolism);
      offspring.energy = 80;
      cells.push(offspring);
      
      // Deduz o custo da reprodução de ambos os pais
      cell1.energy -= reproCost * 0.8;
      cell2.energy -= reproCost * 0.8;
      
      // Define um cooldown para evitar reprodução imediata novamente
      cell1.reproCooldown = 60;
      cell2.reproCooldown = 60;
    }
  }
}

// Nova classe para grupos sociais
class Tribe {
  constructor(founder) {
    this.members = [founder];
    this.resources = [];
    this.knowledge = founder.knowledge;
    this.culture = {
      traditions: [],
      beliefs: [],
      technology: 0
    };
    this.territory = {
      center: { x: founder.x, y: founder.y },
      radius: 100
    };
  }

  update() {
    this.updateCulture();
    this.shareTechnology();
    this.distributeResources();
  }

  updateCulture() {
    this.culture.technology += this.members.reduce((sum, member) => sum + member.knowledge, 0) * 0.001;
    
    if (Math.random() < 0.01) {
      this.culture.traditions.push({
        type: ['ritual', 'custom', 'belief'][Math.floor(rand(0, 3))],
        value: rand(0.1, 1)
      });
    }
  }

  shareTechnology() {
    const maxKnowledge = Math.max(...this.members.map(m => m.knowledge));
    this.members.forEach(member => {
      if (member.knowledge < maxKnowledge) {
        member.knowledge += (maxKnowledge - member.knowledge) * 0.1;
      }
    });
  }

  distributeResources() {
    const totalResources = this.resources.length;
    if (totalResources > 0) {
      this.members.forEach(member => {
        if (member.energy < 50 && this.resources.length > 0) {
          member.energy += 20;
          this.resources.pop();
        }
      });
    }
  }
}

// Sistema de eventos ambientais
function updateEnvironment() {
  // Mudança de estações
  ENVIRONMENT.seasonCounter = (ENVIRONMENT.seasonCounter || 0) + 1;
  if (ENVIRONMENT.seasonCounter >= ENVIRONMENT.seasonDuration) {
    ENVIRONMENT.seasonCounter = 0;
    const seasons = ['spring', 'summer', 'autumn', 'winter'];
    const currentIndex = seasons.indexOf(ENVIRONMENT.currentSeason);
    ENVIRONMENT.currentSeason = seasons[(currentIndex + 1) % 4];
    
    // Ajusta temperatura base com a mudança de estação
    switch(ENVIRONMENT.currentSeason) {
      case 'spring':
        ENVIRONMENT.temperature = 20 + rand(-2, 2);
        break;
      case 'summer':
        ENVIRONMENT.temperature = 30 + rand(-3, 3);
        break;
      case 'autumn':
        ENVIRONMENT.temperature = 15 + rand(-2, 2);
        break;
      case 'winter':
        ENVIRONMENT.temperature = 5 + rand(-3, 3);
        break;
    }
  }
  
  // Pequena variação diária de temperatura
  ENVIRONMENT.temperature += rand(-0.1, 0.1);

  // Eventos aleatórios
  if (Math.random() < ENVIRONMENT.catastropheChance) {
    triggerCatastrophicEvent();
  }

  // Atualização de recursos
  updateResourceScarcity();
}

function triggerCatastrophicEvent() {
  const events = [
    { name: 'Natural Disaster', impact: 0.5 },
    { name: 'Disease Outbreak', impact: 0.3 },
    { name: 'Climate Change', impact: 0.2 }
  ];
  
  const event = events[Math.floor(Math.random() * events.length)];
  HISTORICAL_EVENTS.push({
    event: event.name,
    time: Date.now(),
    impact: event.impact,
    environmentState: {...ENVIRONMENT}
  });
  
  // Aplicar efeitos do evento
  cells.forEach(cell => {
    if (Math.random() < event.impact) {
      cell.energy *= (1 - event.impact);
      cell.health.injuries += event.impact * 10;
    }
  });
}

// Função principal de atualização
function updateSimulation() {
  updateEnvironment();
  
  // Spawn de comida com mais frequência
  if (Math.random() < 0.2 / ENVIRONMENT.resourceScarcity) {
    spawnFood();
  }
  
  // Atualização das células
  for (let cell of cells) {
    cell.think();
    cell.update();
    
    // Interações sociais
    if (cell.tribe) {
      cell.tribe.update();
    } else if (Math.random() < cell.socialBehavior.cooperation) {
      tryFormTribe(cell);
    }
    
    // Chance de ganhar energia naturalmente (simulando fotossíntese ou recurso passivo)
    if (Math.random() < 0.1) {
      cell.energy += 2;
    }
  }
  
  // Remove células mortas com idade mais alta
  cells = cells.filter(cell => cell.energy > 0 && cell.age < 300);
  
  // Tenta reprodução entre células
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      tryReproduce(cells[i], cells[j]);
    }
  }
  
  // Análise e registro de dados
  if (cells.length % 100 === 0) {
    analyzePopulationData();
  }
  
  // Atualiza a interface a cada 30 frames
  if (frameCount % 30 === 0) {
    updateInterface();
  }
}

function analyzePopulationData() {
  const data = {
    populationSize: cells.length,
    averageIntelligence: cells.reduce((sum, cell) => sum + cell.genes.intelligence, 0) / cells.length,
    averageKnowledge: cells.reduce((sum, cell) => sum + cell.knowledge, 0) / cells.length,
    socialComplexity: calculateSocialComplexity(),
    innovations: cells.reduce((sum, cell) => sum + cell.innovations.length, 0),
    tribalCount: cells.filter(cell => cell.tribe).length
  };
  
  HISTORICAL_EVENTS.push({
    event: 'Population Analysis',
    time: Date.now(),
    data: data
  });
}

// Função que desenha (renderiza) o ambiente e os agentes
function drawSimulation() {
  // Cria um efeito de rastro com fundo semi-transparente
  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Desenha os alimentos
  for (let food of foods) {
    food.draw(ctx);
  }
  
  // Desenha as células
  for (let cell of cells) {
    cell.draw(ctx);
  }
}

// Adiciona contador de frames
let frameCount = 0;

// Modifica a função animate para incluir o contador de frames
function animate() {
  frameCount++;
  updateSimulation();
  drawSimulation();
  requestAnimationFrame(animate);
}

// Inicia a simulação
animate();

// Funções faltantes
function updateResourceScarcity() {
  // Ajusta a escassez com base na estação
  switch(ENVIRONMENT.currentSeason) {
    case 'spring':
      ENVIRONMENT.resourceScarcity = 0.7;
      break;
    case 'summer':
      ENVIRONMENT.resourceScarcity = 0.5;
      break;
    case 'autumn':
      ENVIRONMENT.resourceScarcity = 0.8;
      break;
    case 'winter':
      ENVIRONMENT.resourceScarcity = 1.2;
      break;
  }
  
  // Ajusta com base na população
  ENVIRONMENT.resourceScarcity *= (1 + cells.length * 0.01);
}

function calculateSocialComplexity() {
  const tribalCount = cells.filter(cell => cell.tribe).length;
  const innovationCount = cells.reduce((sum, cell) => sum + cell.innovations.length, 0);
  const averageKnowledge = cells.reduce((sum, cell) => sum + cell.knowledge, 0) / cells.length;
  
  return (tribalCount * 0.3 + innovationCount * 0.4 + averageKnowledge * 0.3) / cells.length;
}

function tryFormTribe(cell) {
  // Procura células próximas que não estejam em tribos
  for (let otherCell of cells) {
    if (otherCell !== cell && !otherCell.tribe) {
      const dx = cell.x - otherCell.x;
      const dy = cell.y - otherCell.y;
      const dist = Math.hypot(dx, dy);
      
      if (dist < 50) { // Distância para formar tribo
        const cooperationChance = (cell.socialBehavior.cooperation + otherCell.socialBehavior.cooperation) / 2;
        if (Math.random() < cooperationChance) {
          const newTribe = new Tribe(cell);
          newTribe.members.push(otherCell);
          cell.tribe = newTribe;
          otherCell.tribe = newTribe;
          return;
        }
      }
    }
  }
}

// Função para atualizar a interface
function updateInterface() {
  // Atualiza estatísticas do ambiente
  const envStats = document.getElementById('environment-stats');
  envStats.innerHTML = `
    <div class="stat-item">
      <span>Estação:</span>
      <span>${ENVIRONMENT.currentSeason}</span>
    </div>
    <div class="stat-item">
      <span>Temperatura:</span>
      <span>${ENVIRONMENT.temperature.toFixed(1)}°C</span>
    </div>
    <div class="stat-item">
      <span>Escassez:</span>
      <span>${ENVIRONMENT.resourceScarcity.toFixed(2)}</span>
    </div>
  `;
  
  // Atualiza estatísticas da população
  const popStats = document.getElementById('population-stats');
  const stats = {
    population: cells.length,
    avgIntelligence: cells.length > 0 ? 
      cells.reduce((sum, cell) => sum + cell.genes.intelligence, 0) / cells.length : 
      0,
    tribes: cells.filter(cell => cell.tribe).length
  };
  
  popStats.innerHTML = `
    <div class="stat-item">
      <span>População:</span>
      <span>${stats.population}</span>
    </div>
    <div class="stat-item">
      <span>Inteligência Média:</span>
      <span>${stats.avgIntelligence > 0 ? stats.avgIntelligence.toFixed(2) : '0.00'}</span>
    </div>
    <div class="stat-item">
      <span>Tribos:</span>
      <span>${stats.tribes}</span>
    </div>
  `;
  
  // Atualiza eventos históricos
  const eventsDiv = document.getElementById('historical-events');
  eventsDiv.innerHTML = HISTORICAL_EVENTS.slice(-5).reverse().map(event => `
    <div class="event">
      <strong>${event.event}</strong>
      <div>${new Date(event.time).toLocaleTimeString()}</div>
    </div>
  `).join('');
  
  // Atualiza insights
  const insightsDiv = document.getElementById('insights');
  const currentInsights = generateInsights();
  insightsDiv.innerHTML = currentInsights.map(insight => `
    <div class="insight">
      ${insight}
    </div>
  `).join('');
}

// Sistema de Insights
function generateInsights() {
  const insights = [];
  
  // Análise populacional
  if (cells.length > 0) {
    const previousPopulation = HISTORICAL_EVENTS
      .filter(e => e.event === 'Population Analysis')
      .slice(-2)[0]?.data?.populationSize || 0;
    
    const currentPopulation = cells.length;
    const populationChange = currentPopulation - previousPopulation;
    
    if (Math.abs(populationChange) > 10) {
      insights.push(
        populationChange > 0 
          ? `Crescimento populacional significativo: +${populationChange} células`
          : `Declínio populacional significativo: ${populationChange} células`
      );
    }
  }
  
  // Análise de tribos
  const tribalCount = cells.filter(cell => cell.tribe).length;
  const tribalPercentage = (tribalCount / cells.length) * 100;
  
  if (tribalPercentage > 60) {
    insights.push(`Alta cooperação social: ${tribalPercentage.toFixed(1)}% das células em tribos`);
  } else if (tribalPercentage < 20 && cells.length > 10) {
    insights.push(`Baixa cooperação social: apenas ${tribalPercentage.toFixed(1)}% das células em tribos`);
  }
  
  // Análise de recursos
  if (ENVIRONMENT.resourceScarcity > 1.5) {
    insights.push(`Escassez crítica de recursos: ${ENVIRONMENT.resourceScarcity.toFixed(2)}`);
  }
  
  // Análise de inovações
  const totalInnovations = cells.reduce((sum, cell) => sum + cell.innovations.length, 0);
  const avgInnovations = totalInnovations / cells.length;
  if (avgInnovations > 2) {
    insights.push(`Alto nível de inovação: média de ${avgInnovations.toFixed(1)} inovações por célula`);
  }
  
  // Análise de temperatura
  const tempEffect = ENVIRONMENT.temperature;
  if (tempEffect > 35) {
    insights.push(`Temperatura crítica alta: ${tempEffect.toFixed(1)}°C - Risco para a população`);
  } else if (tempEffect < 0) {
    insights.push(`Temperatura crítica baixa: ${tempEffect.toFixed(1)}°C - Risco para a população`);
  }
  
  // Análise de conhecimento
  if (ENVIRONMENT.knowledge > 0) {
    const knowledgeLevel = ENVIRONMENT.knowledge.toFixed(1);
    insights.push(`Nível de conhecimento coletivo: ${knowledgeLevel}`);
  }
  
  return insights.slice(-3); // Retorna os 3 insights mais recentes
}
