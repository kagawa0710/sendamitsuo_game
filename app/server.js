const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const SocketIO = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = SocketIO(server);

  let agents = [];
  let currentAgentIndex = 0;
  let previousAgentIndex = -1; // To track the previous agent
  let gameOver = false;
  let numAgents = 5; // Default number of agents
  let roundCount = 0;
  let hardMode = false;
  let startTime = null;

  // Initialize agents for the game
  function initializeAgents() {
    agents = Array.from({ length: numAgents }, (_, i) => ({
      id: i,
      state: "",
    }));
    gameOver = false;
    roundCount = 0;

    // Randomly select the first agent to start
    currentAgentIndex = Math.floor(Math.random() * numAgents);
    startTime = Date.now();
  }

  // Handle the turn of an agent
  function handleAgentTurn(agentIndex) {
    if (gameOver) return;

    const agent = agents[agentIndex];
    roundCount += 1;

    // Reset all agents' states after a delay to simulate one tempo difference
    setTimeout(() => {
      agents.forEach((agent) => (agent.state = ""));
      if (roundCount % 2 === 0) {
        // Every even round, agent says "HACK"
        if (agent.state !== "SEC") {
          agent.state = "HACK";

          // Display "365" after a delay
          setTimeout(() => {
            agents[(agentIndex - 1 + numAgents) % numAgents].state = "365";
            agents[(agentIndex + 1) % numAgents].state = "365";
            io.emit("game_state", { agents, roundCount });
          }, 500); // 0.5 seconds delay for "365"
        } else {
          gameOver = true;
          const endTime = Date.now();
          const duration = ((endTime - startTime) / 1000).toFixed(2);
          io.emit("game_over", {
            roundCount,
            duration,
            reason: "SEC and HACK can't be repeated consecutively",
          });
        }
      } else {
        // Otherwise, agent says "SEC"
        if (agent.state !== "HACK") {
          agent.state = "SEC";
        } else {
          gameOver = true;
          const endTime = Date.now();
          const duration = ((endTime - startTime) / 1000).toFixed(2);
          io.emit("game_over", {
            roundCount,
            duration,
            reason: "SEC and HACK can't be repeated consecutively",
          });
        }
      }

      io.emit("game_state", { agents, roundCount });

      // Nominate the next agent
      setTimeout(nominateNextAgent, hardMode ? 1000 : 2000);
    }, 500);
  }

  // Nominate the next agent
  function nominateNextAgent() {
    let nextAgentIndex;
    do {
      nextAgentIndex = Math.floor(Math.random() * numAgents);
    } while (
      nextAgentIndex === currentAgentIndex ||
      nextAgentIndex === previousAgentIndex
    );

    previousAgentIndex = currentAgentIndex;
    currentAgentIndex = nextAgentIndex;

    // Emit the next agent's name before handling the turn
    io.emit("next_agent", { previousAgentIndex, nextAgentIndex });

    setTimeout(() => {
      handleAgentTurn(currentAgentIndex);
    }, 500); // 0.5 seconds delay for name display
  }

  // Start the game
  function startGame(hard, participants) {
    numAgents = participants;
    initializeAgents();
    io.emit("game_state", { agents, roundCount });
    hardMode = hard;

    setTimeout(
      () => {
        if (!gameOver) {
          handleAgentTurn(currentAgentIndex);
        }
      },
      hard ? 1000 : 2000
    );
  }

  // Stop the game
  function stopGame() {
    gameOver = true;
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    io.emit("game_over", {
      roundCount,
      duration,
      reason: "Game stopped by user",
    });
  }

  io.on("connection", (socket) => {
    console.log("New client connected");

    socket.on("start_game", ({ hard, participants }) => {
      startGame(hard, participants);
    });

    socket.on("stop_game", () => {
      stopGame();
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected");
    });
  });

  server.listen(3000, (err) => {
    if (err) throw err;
    console.log("> Ready on http://localhost:3000");
  });
});
