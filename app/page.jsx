"use client";

import { useEffect, useState } from "react";
import io from "socket.io-client";
import Button from "@mui/material/Button";
import "./styles.css";

let socket;

export default function Home() {
  const [agents, setAgents] = useState([]);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [userTurn, setUserTurn] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [nominatedAgent, setNominatedAgent] = useState(null);
  const [roundCount, setRoundCount] = useState(0);
  const [hardMode, setHardMode] = useState(false);
  const [numParticipants, setNumParticipants] = useState(5);
  const [gameOverMessage, setGameOverMessage] = useState("");
  const [userChoice, setUserChoice] = useState("");

  useEffect(() => {
    socket = io();

    socket.on("game_state", ({ agents, roundCount }) => {
      setAgents(agents);
      setRoundCount(roundCount);
    });

    socket.on("game_over", ({ roundCount, reason }) => {
      setIsGameStarted(false);
      setGameOverMessage(`Game over! Rounds: ${roundCount}. Reason: ${reason}`);
    });

    socket.on("user_turn", ({ agentIndex }) => {
      setUserTurn(true);
      setTimeLeft(5); // User has 5 seconds to choose
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (userTurn && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0) {
      setUserTurn(false);
    }
  }, [userTurn, timeLeft]);

  const startGame = (hard) => {
    socket.emit("start_game", { hard, participants: numParticipants });
    setIsGameStarted(true);
    setHardMode(hard);
  };

  const handleUserInput = (choice) => {
    setUserChoice(choice);
  };

  const handleUserNominate = (nominateIndex) => {
    if (userTurn && userChoice) {
      socket.emit("user_choice", { choice: userChoice, nominateIndex });
      setUserTurn(false);
      setUserChoice("");
    } else {
      alert("It's not your turn or you haven't made a choice yet!");
    }
  };

  const handleParticipantsChange = (e) => {
    const value = Number(e.target.value);
    if (value >= 4 && value <= 10) {
      setNumParticipants(value);
    }
  };

  const closePopup = () => {
    setGameOverMessage("");
  };

  return (
    <div>
      <h1>偉大なるせんだみつおゲーム</h1>
      {!isGameStarted ? (
        <div>
          <div>
            <label>
              Number of Participants:
              <input
                type="number"
                min="4"
                max="10"
                value={numParticipants}
                onChange={handleParticipantsChange}
              />
            </label>
          </div>
          <Button variant="contained" onClick={() => startGame(false)}>
            Start Game (Normal)
          </Button>
          <Button variant="contained" onClick={() => startGame(true)}>
            Start Game (Hard)
          </Button>
        </div>
      ) : (
        <div className="circle-container">
          <ul
            className="agents-circle"
            style={{ "--num-agents": numParticipants }}
          >
            {agents.map((agent, index) => (
              <li
                key={index}
                className={`agent ${
                  nominatedAgent === index ? "nominated" : ""
                } ${agent.state.toLowerCase()}`}
                data-state={agent.state}
                style={{ "--agent-index": index }}
              >
                {agent.isUser ? (
                  <div className="user">
                    <span>User</span>
                    <div className="user-buttons">
                      <Button
                        variant="contained"
                        onClick={() => handleUserInput("SEC")}
                      >
                        SEC
                      </Button>
                      <Button
                        variant="contained"
                        onClick={() => handleUserInput("HACK")}
                      >
                        HACK
                      </Button>
                    </div>
                    {userChoice && (
                      <div className="user-nominate-buttons">
                        {agents.map(
                          (_, idx) =>
                            !agents[idx].isUser && (
                              <Button
                                key={idx}
                                variant="contained"
                                onClick={() => handleUserNominate(idx)}
                              >
                                Nominate Agent {idx + 1}
                              </Button>
                            )
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <>Agent {index + 1}</>
                )}
              </li>
            ))}
          </ul>
          <div>Round Count: {roundCount}</div>
        </div>
      )}
      {gameOverMessage && (
        <div className="popup">
          <h2>Game Over</h2>
          <p>{gameOverMessage}</p>
          <Button variant="contained" onClick={closePopup}>
            Close
          </Button>
        </div>
      )}
    </div>
  );
}
