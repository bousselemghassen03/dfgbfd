import React, { createContext, useContext, useState, useEffect } from 'react';

// Types
export type GameweekState = 'inside' | 'outside' | 'paused';

interface GameweekContextType {
  gameweekState: GameweekState;
  startGameweek: () => void;
  pauseGameweek: () => void;
  resumeGameweek: () => void;
  endGameweek: () => void;
}

const GameweekContext = createContext<GameweekContextType | undefined>(undefined);

export const GameweekProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gameweekState, setGameweekState] = useState<GameweekState>(() => {
    return (localStorage.getItem('gameweekState') as GameweekState) || 'outside';
  });

  useEffect(() => {
    localStorage.setItem('gameweekState', gameweekState);
  }, [gameweekState]);

  const startGameweek = () => setGameweekState('inside');
  const pauseGameweek = () => setGameweekState('paused');
  const resumeGameweek = () => setGameweekState('inside');
  const endGameweek = () => setGameweekState('outside');

  return (
    <GameweekContext.Provider value={{ gameweekState, startGameweek, pauseGameweek, resumeGameweek, endGameweek }}>
      {children}
    </GameweekContext.Provider>
  );
};

export const useGameweek = () => {
  const ctx = useContext(GameweekContext);
  if (!ctx) throw new Error('useGameweek must be used within a GameweekProvider');
  return ctx;
}; 