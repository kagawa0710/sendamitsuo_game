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
  let userIndex = 0; // User's index in agents array

  // Initialize agents for the game
  function initializeAgents() {
    agents = Array.from({ length: numAgents }, (_, i) => ({
      id: i,
      state: "",
      isUser: false,
    }));
    userIndex = Math.floor(Math.random() * numAgents); // Randomly assign user index
    agents[userIndex].isUser = true;
    gameOver = false;
    roundCount = 0;

    // Randomly select the first agent to start
    currentAgentIndex = Math.floor(Math.random() * numAgents);
  }

  // Handle the turn of an agent
  function handleAgentTurn(agentIndex) {
    if (gameOver) return;

    const agent = agents[agentIndex];
    roundCount += 1;

    if (agentIndex === userIndex) {
      // User's turn to choose "SEC", "HACK" or "365"
      io.emit("user_turn", { agentIndex });
    } else {
      // Reset all agents' states after a delay to simulate one tempo difference
      setTimeout(() => {
        agents.forEach((agent) => (agent.state = ""));
        if (roundCount % 2 === 0) {
          // Every even round, agent says "HACK"
          if (agent.state !== "SEC") {
            agent.state = "HACK";
            // Agents on both sides of the current agent say "365"
            agents[(agentIndex - 1 + numAgents) % numAgents].state = "365";
            agents[(agentIndex + 1) % numAgents].state = "365";
          } else {
            gameOver = true;
            io.emit("game_over", {
              roundCount,
              reason: "SEC and HACK can't be repeated consecutively",
            });
          }
        } else {
          // Otherwise, agent says "SEC"
          if (agent.state !== "HACK") {
            agent.state = "SEC";
          } else {
            gameOver = true;
            io.emit("game_over", {
              roundCount,
              reason: "SEC and HACK can't be repeated consecutively",
            });
          }
        }

        io.emit("game_state", { agents, roundCount });

        // Nominate the next agent
        setTimeout(nominateNextAgent, hardMode ? 1000 : 2000);
      }, 500);
    }
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
    handleAgentTurn(currentAgentIndex);
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

  io.on("connection", (socket) => {
    console.log("New client connected");

    socket.on("start_game", ({ hard, participants }) => {
      startGame(hard, participants);
    });

    socket.on("user_choice", ({ choice }) => {
      if (gameOver) return;

      const agent = agents[currentAgentIndex];
      if (agent.id === userIndex) {
        // User's choice
        agent.state = choice;
        if (choice === "HACK") {
          // Agents on both sides of the user say "365"
          agents[(userIndex - 1 + numAgents) % numAgents].state = "365";
          agents[(userIndex + 1) % numAgents].state = "365";
        } else if (choice === "365") {
          // No additional actions for 365
        }
        io.emit("game_state", { agents, roundCount });
        setTimeout(nominateNextAgent, 500); // Nominate the next agent after a short delay
      } else {
        gameOver = true;
        io.emit("game_over", {
          roundCount,
          reason: "User made an invalid choice",
        });
      }
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
