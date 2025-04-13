// Configura o canvas e estatísticas
let canvas, ctx;
let isMobile = window.innerWidth <= 768;

function initCanvas() {
  try {
    canvas = document.getElementById("canvas");
    if (!canvas) {
      throw new Error("Canvas element not found");
    }
    
    ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get canvas context");
    }
    
    // Ajusta o tamanho do canvas
    function resizeCanvas() {
      isMobile = window.innerWidth <= 768;
      if (isMobile) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight * 0.45; // 45% da altura da tela
      } else {
        canvas.width = window.innerWidth - 300; // Subtrai a largura do painel de estatísticas
        canvas.height = window.innerHeight;
      }
    }
    
    // Ajusta o tamanho inicial
    resizeCanvas();
    
    // Adiciona listener para redimensionamento
    window.addEventListener('resize', resizeCanvas);
    
    return true;
  } catch (error) {
    console.error("Error initializing canvas:", error);
    return false;
  }
}

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

// Sistema de catástrofes
class Catastrophe {
  constructor(type, x, y) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.radius = type === 'earthquake' ? 100 : 150;
    this.duration = type === 'earthquake' ? 100 : 300;
    this.intensity = rand(0.5, 1);
    this.age = 0;
    this.active = true;
  }

  update() {
    this.age++;
    if (this.age >= this.duration) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;
    
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.type === 'earthquake' ? 
      `rgba(139, 69, 19, ${0.3 * (1 - this.age/this.duration)})` : 
      `rgba(255, 0, 0, ${0.3 * (1 - this.age/this.duration)})`;
    ctx.fill();
  }

  affects(cell) {
    if (!this.active) return false;
    const distance = Math.hypot(this.x - cell.x, this.y - cell.y);
    return distance <= this.radius;
  }
}

// Lista global de catástrofes ativas
const activeCatastrophes = [];

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
    this.radius = isMobile ? 7 : 5; // Tamanho maior em dispositivos móveis
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

    // Reação a catástrofes
    for (const catastrophe of activeCatastrophes) {
      if (catastrophe.affects(this)) {
        // Dano baseado no tipo de catástrofe e resiliência da célula
        const damage = catastrophe.intensity * (1 - this.genes.resilience);
        this.energy -= damage * 10;
        this.health.injuries += damage;

        // Fuga da área de catástrofe
        const dx = this.x - catastrophe.x;
        const dy = this.y - catastrophe.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0) {
          this.dx = (dx / dist) * 3; // Velocidade de fuga aumentada
          this.dy = (dy / dist) * 3;
        }

        // Adaptação genética gradual
        if (Math.random() < 0.1) {
          this.genes.resilience = Math.min(1, this.genes.resilience + 0.01);
        }
      }
    }

    // Verificar por comida próxima
    for (let i = foods.length - 1; i >= 0; i--) {
      const food = foods[i];
      const distance = Math.hypot(this.x - food.x, this.y - food.y);
      
      if (distance < this.radius + food.radius) {
        this.eat(food);
      }
    }
  }
  
  draw(ctx) {
    // Desenha a célula com um brilho para melhor visibilidade
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${this.genes.r}, ${this.genes.g}, ${this.genes.b})`;
    ctx.fill();
    
    // Adiciona brilho para melhor visibilidade em dispositivos móveis
    if (isMobile) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
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

  eat(food) {
    const energyGain = food.type === 'special' ? 
      food.energy * 1.5 : // Bônus para comida especial
      food.energy;
    
    this.energy += energyGain;
    
    // Chance de aprender com comida especial
    if (food.type === 'special' && Math.random() < this.genes.intelligence) {
      this.knowledge += 0.1;
      this.recordHistoricalEvent('Learned from special food');
    }
    
    // Remove a comida consumida
    const index = foods.indexOf(food);
    if (index > -1) {
      foods.splice(index, 1);
    }
  }
}

// Classe que representa o alimento (recurso econômico) no ambiente
class Food {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.energy = rand(30, 50);
    this.radius = isMobile ? 4 : 3; // Tamanho maior em dispositivos móveis
    this.type = Math.random() < 0.3 ? 'special' : 'normal';
    this.color = this.type === 'special' ? 
      `rgb(255, 215, 0)` : // Dourado para comida especial
      `rgb(0, ${Math.floor(rand(150, 255))}, 0)`; // Verde para comida normal
  }
  
  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    
    // Adiciona brilho para melhor visibilidade em dispositivos móveis
    if (isMobile) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, 0.3)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

// Arrays que armazenam as células e os alimentos do ambiente
let cells = [];
let foods = [];

// Inicialização da simulação
function initSimulation() {
  if (!initCanvas()) {
    console.error("Failed to initialize simulation due to canvas error");
    return false;
  }

  // Limpa arrays existentes
  cells = [];
  foods = [];
  HISTORICAL_EVENTS.length = 0;

  // Cria população inicial de 30 células
  for (let i = 0; i < 30; i++) {
    cells.push(new Cell(
      rand(0, canvas.width),
      rand(0, canvas.height)
    ));
  }

  // Cria comida inicial
  for (let i = 0; i < 50; i++) {
    foods.push(new Food(
      rand(0, canvas.width),
      rand(0, canvas.height)
    ));
  }

  HISTORICAL_EVENTS.push({
    event: 'Simulation Started',
    time: Date.now(),
    initialPopulation: 30,
    type: 'system'
  });

  return true;
}

// Função para gerar alimento aleatoriamente na tela
function spawnFood() {
  const baseSpawnRate = 0.1;
  const scarcityFactor = Math.max(0.2, 1 - ENVIRONMENT.resourceScarcity);
  
  if (Math.random() < baseSpawnRate * scarcityFactor) {
    const x = rand(0, canvas.width);
    const y = rand(0, canvas.height);
    foods.push(new Food(x, y));
  }
}

// Função que calcula o custo de reprodução de forma dinâmica
function getReproductionCost() {
  return 30 + cells.length * 0.03;
}

// Tenta reproduzir duas células próximas e com energia suficiente
function tryReproduce(cell1, cell2) {
  if (cell1.reproCooldown > 0 || cell2.reproCooldown > 0) return null;
  
  const distance = Math.hypot(cell1.x - cell2.x, cell1.y - cell2.y);
  if (distance > 15) return null;

  const reproductionCost = getReproductionCost();
  
  // Verifica energia suficiente
  if (cell1.energy < reproductionCost || cell2.energy < reproductionCost) return null;

  // Chance de reprodução baseada na compatibilidade genética
  const geneticCompatibility = 1 - Math.abs(cell1.genes.adaptability - cell2.genes.adaptability);
  if (Math.random() > geneticCompatibility) return null;

  // Deduz o custo de energia
  cell1.energy -= reproductionCost;
  cell2.energy -= reproductionCost;
  
  // Define cooldown de reprodução
  cell1.reproCooldown = 60;
  cell2.reproCooldown = 60;

  // Cria nova célula com genes combinados
  const childGenes = {
    r: Math.floor((cell1.genes.r + cell2.genes.r) / 2 + rand(-10, 10)),
    g: Math.floor((cell1.genes.g + cell2.genes.g) / 2 + rand(-10, 10)),
    b: Math.floor((cell1.genes.b + cell2.genes.b) / 2 + rand(-10, 10)),
    adaptability: (cell1.genes.adaptability + cell2.genes.adaptability) / 2 + rand(-0.05, 0.05),
    intelligence: (cell1.genes.intelligence + cell2.genes.intelligence) / 2 + rand(-0.05, 0.05),
    resilience: (cell1.genes.resilience + cell2.genes.resilience) / 2 + rand(-0.05, 0.05)
  };

  // Mutações ocasionais
  if (Math.random() < 0.1) {
    const geneToMutate = ['adaptability', 'intelligence', 'resilience'][Math.floor(rand(0, 3))];
    childGenes[geneToMutate] += rand(-0.1, 0.1);
    childGenes[geneToMutate] = Math.max(0, Math.min(1, childGenes[geneToMutate]));
  }

  // Cria nova célula
  const child = new Cell(
    (cell1.x + cell2.x) / 2 + rand(-10, 10),
    (cell1.y + cell2.y) / 2 + rand(-10, 10),
    childGenes,
    (cell1.metabolismRate + cell2.metabolismRate) / 2 + rand(-0.01, 0.01)
  );

  // Herança de conhecimento
  child.knowledge = (cell1.knowledge + cell2.knowledge) * 0.6;
  child.generation = Math.max(cell1.generation, cell2.generation) + 1;

  // Registra evento histórico
  HISTORICAL_EVENTS.push({
    event: 'New Cell Born',
    time: Date.now(),
    parents: [cell1, cell2],
    generation: child.generation,
    type: 'reproduction'
  });

  return child;
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
  if (Math.random() > ENVIRONMENT.catastropheChance) return;

  const type = Math.random() < 0.5 ? 'earthquake' : 'wildfire';
  const x = rand(0, canvas.width);
  const y = rand(0, canvas.height);
  
  const catastrophe = new Catastrophe(type, x, y);
  activeCatastrophes.push(catastrophe);
  
  // Registra o evento histórico
  HISTORICAL_EVENTS.push({
    event: `${type.charAt(0).toUpperCase() + type.slice(1)} occurred`,
    location: `at (${Math.round(x)}, ${Math.round(y)})`,
    time: Date.now(),
    type: 'catastrophe',
    intensity: catastrophe.intensity,
    radius: catastrophe.radius
  });
}

// Função principal de atualização
function updateSimulation() {
  // Atualiza células
  for (let i = cells.length - 1; i >= 0; i--) {
    cells[i].update();
    cells[i].think();

    // Remove células mortas
    if (cells[i].energy <= 0 || cells[i].age > 300) {
      HISTORICAL_EVENTS.push({
        event: `Cell died at age ${Math.floor(cells[i].age)}`,
        time: Date.now(),
        cause: cells[i].energy <= 0 ? 'starvation' : 'old age',
        type: 'death'
      });
      cells.splice(i, 1);
      continue;
    }
  }

  // Tenta reprodução entre células próximas
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      const child = tryReproduce(cells[i], cells[j]);
      if (child) {
        cells.push(child);
      }
    }
  }

  // Gera novo alimento
  spawnFood();

  // Atualiza ambiente
  updateEnvironment();

  // Chance de catástrofe
  if (Math.random() < ENVIRONMENT.catastropheChance) {
    triggerCatastrophicEvent();
  }

  // Atualiza catástrofes ativas
  for (let i = activeCatastrophes.length - 1; i >= 0; i--) {
    activeCatastrophes[i].update();
    if (!activeCatastrophes[i].active) {
      activeCatastrophes.splice(i, 1);
    }
  }

  // Atualiza interface
  updateInterface();
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

  // Desenha catástrofes
  for (const catastrophe of activeCatastrophes) {
    catastrophe.draw(ctx);
  }
}

// Adiciona contador de frames
let frameCount = 0;
let animationId = null;

// Modifica a função animate para incluir o contador de frames e tratamento de erro
function animate() {
  try {
    frameCount++;
    
    // Atualiza a simulação
    updateSimulation();
    
    // Desenha o frame atual
    drawSimulation();
    
    // Agenda o próximo frame
    animationId = requestAnimationFrame(animate);
  } catch (error) {
    console.error("Error in animation loop:", error);
    
    // Tenta recuperar a simulação
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    
    // Registra o erro nos eventos históricos
    HISTORICAL_EVENTS.push({
      event: 'Simulation Error',
      time: Date.now(),
      error: error.message,
      type: 'system'
    });
    
    // Tenta reiniciar a simulação após 1 segundo
    setTimeout(() => {
      if (!animationId) {
        console.log("Attempting to restart animation...");
        animationId = requestAnimationFrame(animate);
      }
    }, 1000);
  }
}

// Função para iniciar a simulação
function startSimulation() {
  try {
    if (initSimulation()) {
      if (!animationId) {
        animationId = requestAnimationFrame(animate);
        console.log("Simulation started successfully");
      }
    } else {
      throw new Error("Failed to initialize simulation");
    }
  } catch (error) {
    console.error("Error starting simulation:", error);
    alert("Erro ao iniciar a simulação. Por favor, recarregue a página.");
  }
}

// Função para formatar eventos históricos
function formatHistoricalEvent(event) {
  const timeStr = new Date(event.time).toLocaleTimeString();
  let message = `[${timeStr}] `;

  switch (event.type) {
    case 'catastrophe':
      message += `🌋 ${event.event} ${event.location} (Intensidade: ${event.intensity.toFixed(2)})`;
      break;
    case 'reproduction':
      message += `🐣 ${event.event} (Geração ${event.generation})`;
      break;
    case 'system':
      message += `🔄 ${event.event}`;
      break;
    case 'death':
      message += `💀 ${event.event} (Causa: ${event.cause})`;
      break;
    default:
      message += `📝 ${event.event}`;
  }

  return message;
}

// Função para atualizar a interface
function updateInterface() {
  try {
    // Atualiza estatísticas do ambiente
    const envStats = document.getElementById('environment-stats');
    if (envStats) {
      envStats.innerHTML = `
        <h3>Ambiente</h3>
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
    }

    // Atualiza estatísticas da população
    const popStats = document.getElementById('population-stats');
    if (popStats) {
      const stats = {
        population: cells.length,
        avgIntelligence: cells.length > 0 ? 
          cells.reduce((sum, cell) => sum + cell.genes.intelligence, 0) / cells.length : 
          0,
        tribes: cells.filter(cell => cell.tribe).length
      };

      popStats.innerHTML = `
        <h3>População</h3>
        <div class="stat-item">
          <span>Total:</span>
          <span>${stats.population}</span>
        </div>
        <div class="stat-item">
          <span>Inteligência Média:</span>
          <span>${stats.avgIntelligence.toFixed(2)}</span>
        </div>
        <div class="stat-item">
          <span>Tribos:</span>
          <span>${stats.tribes}</span>
        </div>
      `;
    }

    // Atualiza painel de eventos históricos
    const eventsPanel = document.getElementById('events-panel');
    if (eventsPanel) {
      const recentEvents = HISTORICAL_EVENTS.slice(-10).reverse();
      eventsPanel.innerHTML = `
        <h3>Eventos Recentes</h3>
        ${recentEvents.map(formatHistoricalEvent).join('<br>')}
      `;
    }

    // Atualiza estatísticas gerais
    const statsPanel = document.getElementById('stats-panel');
    if (statsPanel) {
      const stats = {
        population: cells.length,
        avgEnergy: cells.reduce((sum, cell) => sum + cell.energy, 0) / cells.length || 0,
        avgResilience: cells.reduce((sum, cell) => sum + cell.genes.resilience, 0) / cells.length || 0,
        foodAvailable: foods.length,
        activeCatastrophes: activeCatastrophes.length,
        highestGeneration: Math.max(...cells.map(cell => cell.generation || 0), 0)
      };

      statsPanel.innerHTML = `
        <h3>Estatísticas</h3>
        <p>População: ${stats.population}</p>
        <p>Energia Média: ${stats.avgEnergy.toFixed(1)}</p>
        <p>Resiliência Média: ${stats.avgResilience.toFixed(3)}</p>
        <p>Comida Disponível: ${stats.foodAvailable}</p>
        <p>Catástrofes Ativas: ${stats.activeCatastrophes}</p>
        <p>Maior Geração: ${stats.highestGeneration}</p>
      `;
    }

    // Atualiza insights
    const insightsPanel = document.getElementById('insights');
    if (insightsPanel) {
      const currentInsights = generateInsights();
      insightsPanel.innerHTML = `
        <h3>Insights</h3>
        ${currentInsights.map(insight => `<p>${insight}</p>`).join('')}
      `;
    }
  } catch (error) {
    console.error('Erro ao atualizar interface:', error);
  }
}

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
