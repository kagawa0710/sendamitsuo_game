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
  let gameOver = false;
  const numAgents = 5;

  function initializeAgents() {
    agents = Array.from({ length: numAgents }, (_, i) => ({
      id: i,
      state: "",
    }));
  }

  function handleAgentTurn(agentIndex) {
    const agent = agents[agentIndex];
    if (!gameOver) {
      if (agentIndex === 0) {
        agent.state = "SEC";
        currentAgentIndex = (agentIndex + 1) % numAgents;
      } else if (agentIndex === 1) {
        agent.state = "HACK";
        currentAgentIndex = (agentIndex + 1) % numAgents;
      } else {
        agent.state = "365";
        agents[(agentIndex - 1 + numAgents) % numAgents].state = "365";
        agents[(agentIndex + 1) % numAgents].state = "365";
        gameOver = true;
      }
    }
  }

  io.on("connection", (socket) => {
    console.log("New client connected");

    socket.on("start_game", () => {
      initializeAgents();
      socket.emit("game_state", agents);
    });

    socket.on("agent_turn", (agentIndex) => {
      handleAgentTurn(agentIndex);
      io.emit("game_state", agents);
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
