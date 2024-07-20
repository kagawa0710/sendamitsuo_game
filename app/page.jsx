"use client";

import { useEffect, useState } from "react";
import io from "socket.io-client";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import "./styles.css";

let socket;

export default function Home() {
  const [agents, setAgents] = useState([]);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [roundCount, setRoundCount] = useState(0);
  const [hardMode, setHardMode] = useState(false);
  const [numParticipants, setNumParticipants] = useState(5);
  const [gameOverMessage, setGameOverMessage] = useState("");
  const [duration, setDuration] = useState("");
  const [nextAgentIndex, setNextAgentIndex] = useState(null);

  useEffect(() => {
    socket = io();

    socket.on("game_state", ({ agents, roundCount }) => {
      setAgents(agents);
      setRoundCount(roundCount);
    });

    socket.on("game_over", ({ roundCount, duration, reason }) => {
      setIsGameStarted(false);
      setDuration(duration);
      setGameOverMessage(`Rounds: ${roundCount}. Reason: ${reason}`);
    });

    socket.on("next_agent", ({ previousAgentIndex, nextAgentIndex }) => {
      setNextAgentIndex(nextAgentIndex);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const startGame = (hard) => {
    socket.emit("start_game", { hard, participants: numParticipants });
    setIsGameStarted(true);
    setHardMode(hard);
  };

  const stopGame = () => {
    socket.emit("stop_game");
    setIsGameStarted(false);
  };

  const handleParticipantsChange = (e) => {
    const value = Number(e.target.value);
    if (value >= 4 && value <= 10) {
      setNumParticipants(value);
    }
  };

  const closePopup = () => {
    setGameOverMessage("");
    setDuration("");
  };

  return (
    <div>
      <h1>偉大なるせんだみつおゲーム</h1>
      {!isGameStarted ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <TextField
            label="参加人数"
            type="number"
            inputProps={{ min: 4, max: 10 }}
            value={numParticipants}
            onChange={handleParticipantsChange}
            sx={{ width: 300 }}
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="contained" onClick={() => startGame(false)}>
              Start Game (Normal)
            </Button>
            <Button variant="contained" onClick={() => startGame(true)}>
              Start Game (Hard)
            </Button>
          </Box>
        </Box>
      ) : (
        <div className="circle-container">
          <ul
            className="agents-circle"
            style={{ "--num-agents": numParticipants }}
          >
            {agents.map((agent, index) => (
              <li
                key={index}
                className={`agent ${agent.state.toLowerCase()}`}
                data-state={agent.state}
                style={{ "--agent-index": index }}
              >
                Agent {index + 1}
                {nextAgentIndex === index && (
                  <div className="next-agent-bubble">Next</div>
                )}
              </li>
            ))}
          </ul>
          <div>Round Count: {roundCount}</div>
          <Button variant="contained" onClick={stopGame} sx={{ mt: 2 }}>
            Stop Game
          </Button>
        </div>
      )}
      {gameOverMessage && (
        <div className="popup">
          <p>{gameOverMessage}</p>
          <p>実行時間: {duration} seconds</p>
          <Button variant="contained" onClick={closePopup}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
}
