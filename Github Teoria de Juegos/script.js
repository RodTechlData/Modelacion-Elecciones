// ------------------------------
// Modelo base
// ------------------------------
const baseModel = {
  metadata: {
    title: "Modelo de Teoría de Juegos Electoral - Chile 14-12-25",
    version: "1.0",
  },
  players: [
    { id: "A", name: "Kast", baseSupport: 0.45 },
    { id: "B", name: "Jara", baseSupport: 0.43 },
  ],
  strategies: {
    A: ["BD", "MC"],
    B: ["BD", "MC"],
  },
  parameters: {
    sigma: 0.015,
    iterations: 5000,
    timeSteps: 24,
    drift: {
      A: { BD: 0.004, MC: 0.0025 },
      B: { BD: 0.0035, MC: 0.0038 },
    },
    centerSensitivity: {
      A: { BD: -0.017, MC: 0.014 },
      B: { BD: -0.012, MC: 0.02 },
    },
  },
  payoffMatrix: {
    A: {
      BD: { BD: null, MC: null },
      MC: { BD: null, MC: null },
    },
    B: {
      BD: { BD: null, MC: null },
      MC: { BD: null, MC: null },
    },
  },
  modes: {
    demoMode: { active: true },
    seriousMode: {
      active: false,
      targetOutcome: { A: 0.55, B: 0.45 },
    },
  },
};

let model = JSON.parse(JSON.stringify(baseModel));
let chartInstance = null;

// ------------------------------
// Util: gaussiana
// ------------------------------
function randomGaussian() {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// ------------------------------
// Leer parámetros desde la UI
// ------------------------------
function readModelFromUI() {
  const baseAVal = parseFloat(document.getElementById("baseA").value) || 0;
  const baseBVal = parseFloat(document.getElementById("baseB").value) || 0;
  const sigmaVal = parseFloat(document.getElementById("sigma").value) || 0.015;
  const iterationsVal =
    parseInt(document.getElementById("iterations").value, 10) || 5000;
  const timeStepsVal =
    parseInt(document.getElementById("timeSteps").value, 10) || 24;

  model.players[0].baseSupport = Math.max(
    0,
    Math.min(1, baseAVal / 100.0)
  );
  model.players[1].baseSupport = Math.max(
    0,
    Math.min(1, baseBVal / 100.0)
  );
  model.parameters.sigma = sigmaVal;
  model.parameters.iterations = iterationsVal;
  model.parameters.timeSteps = timeStepsVal;
}

// ------------------------------
// Simulación de elección
// ------------------------------
function simulateElection(strategyA, strategyB, recordPath = false) {
  const { sigma, iterations, timeSteps, drift, centerSensitivity } =
    model.parameters;

  let winsA = 0;
  let winsB = 0;

  let samplePathA = [];
  let samplePathB = [];

  const driftA = drift.A[strategyA] + centerSensitivity.A[strategyA];
  const driftB = drift.B[strategyB] + centerSensitivity.B[strategyB];

  for (let i = 0; i < iterations; i++) {
    let VA = model.players[0].baseSupport;
    let VB = model.players[1].baseSupport;

    let pathA = [];
    let pathB = [];

    for (let t = 0; t < timeSteps; t++) {
      const noiseA = sigma * randomGaussian();
      const noiseB = sigma * randomGaussian();

      VA += driftA + noiseA;
      VB += driftB + noiseB;

      // Clampear entre 0 y 1
      VA = Math.max(0, Math.min(1, VA));
      VB = Math.max(0, Math.min(1, VB));

      if (recordPath && i === 0) {
        pathA.push(VA);
        pathB.push(VB);
      }
    }

    if (VA > VB) winsA++;
    else winsB++;

    if (recordPath && i === 0) {
      samplePathA = pathA;
      samplePathB = pathB;
    }
  }

  return {
    probA: winsA / iterations,
    probB: winsB / iterations,
    pathA: samplePathA,
    pathB: samplePathB,
  };
}

// ------------------------------
// Construir matriz de pagos
// ------------------------------
function buildPayoffMatrix() {
  const strategiesA = model.strategies.A;
  const strategiesB = model.strategies.B;

  strategiesA.forEach((sA) => {
    strategiesB.forEach((sB) => {
      const result = simulateElection(sA, sB, false);
      model.payoffMatrix.A[sA][sB] = result.probA;
      model.payoffMatrix.B[sA][sB] = result.probB;
      updateMatrixCell(sA, sB, result.probA, result.probB);
    });
  });
}

// ------------------------------
// Actualizar celdas de la matriz
// ------------------------------
function updateMatrixCell(sA, sB, probA, probB) {
  const key = `${sA.toLowerCase()}-${sB.toLowerCase()}`; // ej: bd-bd
  const id = `cell-${key}`;
  const cell = document.getElementById(id);
  if (!cell) return;
  const pa = (probA * 100).toFixed(1);
  const pb = (probB * 100).toFixed(1);
  cell.textContent = `A: ${pa}% / B: ${pb}%`;
}

// ------------------------------
// Actualizar escenario actual
// ------------------------------
function updateCurrentScenario() {
  readModelFromUI();

  const strategyA = document.getElementById("strategyA").value;
  const strategyB = document.getElementById("strategyB").value;

  const result = simulateElection(strategyA, strategyB, true);

  const probAEl = document.getElementById("probA");
  const probBEl = document.getElementById("probB");

  probAEl.textContent = (result.probA * 100).toFixed(1) + " %";
  probBEl.textContent = (result.probB * 100).toFixed(1) + " %";

  updateChart(result.pathA, result.pathB);
}

// ------------------------------
// Gráfico con Chart.js
// ------------------------------
function updateChart(pathA, pathB) {
  const ctx = document.getElementById("resultChart").getContext("2d");

  const labels = pathA.map((_, idx) => `t${idx + 1}`);

  const data = {
    labels,
    datasets: [
      {
        label: "Kast (A)",
        data: pathA.map((v) => (v * 100).toFixed(2)),
        borderWidth: 2,
        fill: false,
        tension: 0.25,
      },
      {
        label: "Jara (B)",
        data: pathB.map((v) => (v * 100).toFixed(2)),
        borderWidth: 2,
        fill: false,
        tension: 0.25,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        min: 0,
        max: 100,
        title: {
          display: true,
          text: "% de intención de voto",
        },
      },
      x: {
        title: {
          display: true,
          text: "Tiempo",
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: "#e5e7eb",
          font: { size: 11 },
        },
      },
    },
  };

  if (chartInstance) {
    chartInstance.destroy();
  }

  chartInstance = new Chart(ctx, {
    type: "line",
    data,
    options,
  });
}

// ------------------------------
// Modo demostrativo / serio
// ------------------------------
function updateModeHint() {
  const modeToggle = document.getElementById("modeToggle");
  const hint = document.getElementById("modeHint");

  if (modeToggle.checked) {
    model.modes.demoMode.active = false;
    model.modes.seriousMode.active = true;
    hint.textContent =
      "Modo serio / paper: usa parámetros calibrados con datos reales (encuestas, RRSS, histórico). Este panel permite ensayar distintos supuestos.";
  } else {
    model.modes.demoMode.active = true;
    model.modes.seriousMode.active = false;
    hint.textContent =
      "Modo demostrativo: los parámetros son orientativos. Ajusta bases y sigma para explorar escenarios.";
  }
}

// ------------------------------
// Inicializar
// ------------------------------
window.addEventListener("DOMContentLoaded", () => {
  // Valores iniciales
  document.getElementById("strategyA").value = "BD";
  document.getElementById("strategyB").value = "BD";

  updateModeHint();
  updateCurrentScenario();
  buildPayoffMatrix();

  // Eventos
  document
    .getElementById("runScenario")
    .addEventListener("click", updateCurrentScenario);

  document
    .getElementById("runMatrix")
    .addEventListener("click", () => {
      readModelFromUI();
      buildPayoffMatrix();
    });

  document
    .getElementById("modeToggle")
    .addEventListener("change", () => {
      updateModeHint();
      updateCurrentScenario();
    });

  ["baseA", "baseB", "sigma", "iterations", "timeSteps"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", () => {
        updateCurrentScenario();
      });
    }
  });

  ["strategyA", "strategyB"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", () => {
        updateCurrentScenario();
      });
    }
  });
});
