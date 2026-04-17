/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw, 
  Play, 
  Volume2,
  VolumeX,
  Timer, 
  Info,
  ChevronRight,
  History,
  MapPin,
  Utensils,
  Leaf,
  MessagesSquare,
  Sparkles,
  LogOut,
  Users,
  User
} from 'lucide-react';
import { audioService } from './services/audioService';
import { generateQuestion, QuizQuestion } from './services/geminiService';

type GameState = 'START' | 'MODE_SELECT' | 'PLAYING' | 'SPINNING' | 'QUESTION' | 'RESULT' | 'GAMEOVER';
type GameMode = 'SOLO' | 'VERSUS';

interface Category {
  id: string;
  label: string;
  color: string;
  icon: React.ElementType;
}

const CATEGORIES: Category[] = [
  { id: 'hawker', label: 'Hawker Culture', color: '#FF595E', icon: Utensils },
  { id: 'landmarks', label: 'Landmarks', color: '#FFCA3A', icon: MapPin },
  { id: 'heritage', label: 'History', color: '#8AC926', icon: History },
  { id: 'singlish', label: 'Singlish', color: '#1982C4', icon: MessagesSquare },
  { id: 'green', label: 'Green City', color: '#6A4C93', icon: Leaf },
  { id: 'festivals', label: 'Festivals', color: '#FF924C', icon: Sparkles },
];

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [gameMode, setGameMode] = useState<GameMode>('SOLO');
  const [score, setScore] = useState(0);
  const [p2Score, setP2Score] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState(1);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [isMuted, setIsMuted] = useState(false);
  const [rounds, setRounds] = useState(0);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const [showTimeoutPopup, setShowTimeoutPopup] = useState(false);
  const TOTAL_ROUNDS = 10;

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Handlers ---

  const startGame = () => {
    setGameState('MODE_SELECT');
    if (!isMuted) {
      audioService.init().then(() => audioService.playMelody());
    }
  };

  const initGame = (mode: GameMode) => {
    setGameMode(mode);
    setScore(0);
    setP2Score(0);
    setRounds(0);
    setCurrentPlayer(1);
    setGameState('SPINNING');
  };

  useEffect(() => {
    if (isMuted || gameState === 'START' || gameState === 'GAMEOVER') {
      audioService.stop();
    } else {
      audioService.init().then(() => audioService.playMelody());
    }
  }, [isMuted, gameState]);

  const handleQuit = () => {
    audioService.stop();
    setGameState('START');
    setScore(0);
    setRounds(0);
    setShowQuitConfirm(false);
  };

  const spinWheel = () => {
    if (gameState !== 'SPINNING' || isSpinning) return;
    
    setIsSpinning(true);
    // Increased spins for a faster look
    const extraSpins = 10 + Math.random() * 10;
    const currentRot = rotation;
    const targetRot = currentRot + 360 * extraSpins + Math.random() * 360;
    setRotation(targetRot);

    // Longer spin duration
    setTimeout(() => {
      const normalizedRot = (targetRot % 360);
      const sectorSize = 360 / CATEGORIES.length;
      // Index is based on the pointer at the top (negative because clockwise rotation)
      const index = Math.floor(((360 - (normalizedRot % 360)) % 360) / sectorSize);
      const selected = CATEGORIES[index];
      
      setCurrentCategory(selected);
      handleFetchQuestion(selected.label);
      setIsSpinning(false);
    }, 10000);
  };

  const handleFetchQuestion = async (categoryLabel: string) => {
    setIsLoading(true);
    try {
      const q = await generateQuestion(categoryLabel);
      setQuestion(q);
      setGameState('QUESTION');
      setTimeLeft(20);
      startTimer();
    } catch (error) {
      console.error(error);
      // Fallback or retry
    } finally {
      setIsLoading(false);
    }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          if (!isMuted) audioService.playFailSound();
          setShowTimeoutPopup(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleAnswer = (index: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    const isCorrect = index === question?.correctAnswerIndex;
    if (isCorrect) {
      const speedBonus = timeLeft * 10;
      const points = 100 + speedBonus;
      if (gameMode === 'VERSUS' && currentPlayer === 2) {
        setP2Score(s => s + points);
      } else {
        setScore(s => s + points);
      }
    }

    setRounds(r => r + 1);
    setGameState('RESULT');
  };

  const nextRound = () => {
    if (rounds >= TOTAL_ROUNDS) {
      setGameState('GAMEOVER');
    } else {
      if (gameMode === 'VERSUS') {
        setCurrentPlayer(p => p === 1 ? 2 : 1);
      }
      setGameState('SPINNING');
    }
  };

  // --- Visual Components ---

  const LandmarkBackground = () => (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex items-end justify-around opacity-40">
      <div className="bg-deep-teal w-[140px] h-[180px] rounded-[100px_100px_0_0] mb-0" />
      <div className="flex gap-2 items-end">
        <div className="bg-deep-teal w-15 h-[300px]" />
        <div className="bg-deep-teal w-15 h-[300px]" />
        <div className="bg-deep-teal w-15 h-[300px]" />
      </div>
      <div className="bg-deep-teal w-[120px] h-[120px] rounded-full mb-10" />
      <div className="bg-deep-teal w-[180px] h-[150px] rounded-[80px_80px_0_0]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-sky-blue text-[#333] font-sans selection:bg-red-200 overflow-hidden flex flex-col items-center justify-start p-4 pt-24 md:pt-32">
      <LandmarkBackground />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 p-5 px-10 flex justify-between items-center z-50 bg-sky-blue shadow-none">
        <div className="flex items-center gap-0">
          <div className="bg-sg-red text-white py-1 px-3 rounded-lg font-black text-2xl mr-3">SG</div>
          <h1 className="text-3xl font-black tracking-tighter text-sg-red font-display">QUEST</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-white px-6 py-2 rounded-full border-[3px] border-sg-red shadow-[4px_4px_0px_rgba(238,44,60,0.2)] flex items-center gap-4">
            <span className="text-xs font-bold uppercase tracking-widest text-[#666]">Score</span>
            <span className="text-2xl font-black text-sg-red font-display">{score.toLocaleString()}</span>
          </div>

          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="w-12 h-12 flex items-center justify-center rounded-full bg-white shadow-md border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          
          {gameState !== 'START' && (
            <button 
              onClick={() => setShowQuitConfirm(true)}
              className="px-6 h-12 flex items-center justify-center rounded-full bg-deep-teal text-white shadow-md hover:bg-teal-700 transition-colors gap-2 font-black uppercase text-xs tracking-widest"
              title="Quit Game"
            >
              <LogOut size={16} /> Quit
            </button>
          )}
        </div>
      </header>

      <AnimatePresence>
        {showQuitConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl border-4 border-sg-red"
            >
              <h2 className="text-2xl font-black text-sg-red mb-4 font-display">Quit Game?</h2>
              <p className="text-gray-600 mb-8 font-medium italic">Your current score ({score}) will be lost!</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowQuitConfirm(false)}
                  className="flex-1 py-4 rounded-full bg-gray-100 font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleQuit}
                  className="flex-1 py-4 rounded-full bg-sg-red text-white font-black hover:bg-red-600 transition-colors"
                >
                  Quit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTimeoutPopup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.5, y: 100 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[40px] p-10 max-w-sm w-full shadow-2xl border-8 border-sg-red text-center"
            >
              <div className="bg-red-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 text-sg-red">
                <Timer size={48} className="animate-pulse" />
              </div>
              <h2 className="text-4xl font-black text-sg-red mb-2 font-display uppercase italic">Time's Up!</h2>
              <p className="text-gray-500 mb-8 font-bold uppercase tracking-widest text-sm">Mission clock expired</p>
              
              <button 
                onClick={() => {
                  setShowTimeoutPopup(false);
                  handleAnswer(-1);
                }}
                className="w-full py-5 rounded-full bg-sg-red text-white font-black hover:bg-red-600 transition-all shadow-[0_6px_0_#b01a27] active:translate-y-1 active:shadow-none text-xl uppercase tracking-tighter"
              >
                Show Answer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {/* State: START */}
        {gameState === 'START' && (
          <motion.div 
            key="start"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="text-center z-10 max-w-lg"
          >
            <div className="relative inline-block mb-8">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-400 blur-3xl opacity-20 -z-10"
              />
              <div className="bg-white p-8 rounded-[40px] shadow-2xl border-8 border-accent-yellow">
                <Trophy size={80} className="text-accent-yellow mx-auto mb-4" />
                <h1 className="text-6xl font-black text-deep-teal tracking-tighter leading-none mb-2 font-display">
                  SG <span className="text-sg-red">LEGACY</span>
                </h1>
                <p className="text-gray-500 font-bold uppercase tracking-[0.3em] text-xs">Heritage Quest 2024</p>
              </div>
            </div>

            <button
              onClick={startGame}
              className="group relative w-full bg-sg-red text-white font-black py-8 rounded-[40px] text-3xl shadow-[0_12px_0px_#b01a27] hover:brightness-110 transition-all active:translate-y-2 active:shadow-none flex items-center justify-center gap-4 uppercase tracking-tighter mb-4"
            >
              <Play size={40} fill="white" /> Start Mission
              <span className="absolute -top-4 -right-2 bg-accent-yellow text-white text-xs py-1 px-3 rounded-full animate-bounce">NEW</span>
            </button>
            <p className="text-deep-teal/60 font-bold text-sm tracking-widest uppercase">Select your path below</p>
          </motion.div>
        )}

        {/* State: MODE_SELECT */}
        {gameState === 'MODE_SELECT' && (
          <motion.div 
            key="mode-select"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="z-10 w-full max-w-2xl px-4 grid gap-6 md:grid-cols-2"
          >
            <button 
              onClick={() => initGame('SOLO')}
              className="bg-white p-10 rounded-[3rem] shadow-xl border-8 border-white hover:border-sky-blue transition-all group text-left relative overflow-hidden active:scale-95"
            >
              <div className="bg-sky-blue/20 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-sky-blue group-hover:scale-110 transition-transform">
                <User size={32} />
              </div>
              <h3 className="text-3xl font-black text-deep-teal mb-2 font-display">Solo Explorer</h3>
              <p className="text-gray-500 font-medium">Test your own Singapore knowledge and hit a personal record!</p>
              <div className="mt-8 flex items-center gap-2 text-sky-blue font-black uppercase text-xs tracking-widest">
                Start Quest <ChevronRight size={16} />
              </div>
            </button>

            <button 
              onClick={() => initGame('VERSUS')}
              className="bg-white p-10 rounded-[3rem] shadow-xl border-8 border-white hover:border-sg-red transition-all group text-left relative overflow-hidden active:scale-95"
            >
              <div className="bg-red-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-sg-red group-hover:scale-110 transition-transform">
                <Users size={32} />
              </div>
              <h3 className="text-3xl font-black text-deep-teal mb-2 font-display text-sg-red">Family Face-off</h3>
              <p className="text-gray-500 font-medium">Local multiplayer mode! Take turns and see who is the heritage genius.</p>
              <div className="mt-8 flex items-center gap-2 text-sg-red font-black uppercase text-xs tracking-widest">
                2 Players <ChevronRight size={16} />
              </div>
              <div className="absolute top-4 right-4 bg-sg-red text-white text-[10px] py-1 px-3 rounded-full font-black">TURN-BASED</div>
            </button>
          </motion.div>
        )}

        {/* State: SPINNING */}
        {(gameState === 'SPINNING') && (
          <motion.div 
            key="spinning"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="flex flex-col items-center z-10 w-full max-w-6xl"
          >
            <div className="mb-4 text-center bg-white border-2 border-deep-teal px-6 py-2 rounded-full shadow-sm">
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-deep-teal">Round {rounds + 1} / {TOTAL_ROUNDS}</span>
            </div>
            
            <h2 className="text-3xl md:text-5xl font-black text-deep-teal mb-8 font-display uppercase italic text-center">
              {gameMode === 'VERSUS' ? `PLAYER ${currentPlayer}'S TURN` : 'Choose your Fate!'}
            </h2>

            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12 w-full justify-center">
              
              <div className="flex flex-col items-center">
                <div className="relative">
                  {/* Pointer */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-40 w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[40px] border-t-sg-red drop-shadow-md"></div>

                  {/* Wheel */}
                  <motion.div 
                    animate={{ rotate: rotation }}
                    transition={isSpinning ? { duration: 10, ease: [0.13, 0.99, 0, 1] } : { duration: 0 }}
                    className="w-[300px] h-[300px] md:w-[480px] md:h-[480px] rounded-full relative border-[12px] border-white shadow-2xl overflow-hidden ring-12 ring-white/20"
                    style={{
                      background: 'conic-gradient(' + CATEGORIES.map((c, i) => `${c.color} ${i * (360/CATEGORIES.length)}deg ${(i+1) * (360/CATEGORIES.length)}deg`).join(', ') + ')'
                    }}
                  >
                    {/* Dividers */}
                    {CATEGORIES.map((_, i) => (
                      <div 
                        key={`line-${i}`}
                        className="absolute top-1/2 left-1/2 w-full h-[2px] bg-white/30 -translate-x-1/2 -translate-y-1/2 origin-center"
                        style={{ transform: `translate(-50%, -50%) rotate(${i * (360/CATEGORIES.length)}deg)` }}
                      />
                    ))}

                    {/* Labels */}
                    {CATEGORIES.map((cat, i) => {
                      const angle = (360 / CATEGORIES.length) * i + (360 / CATEGORIES.length / 2);
                      return (
                        <div 
                          key={cat.id}
                          className="absolute inset-0 flex flex-col items-center pointer-events-none"
                          style={{ transform: `rotate(${angle}deg)` }}
                        >
                          <div className="mt-4 md:mt-6 bg-white/20 backdrop-blur-[4px] p-2 md:p-3 rounded-2xl md:rounded-3xl flex flex-col items-center border-2 border-white/30 shadow-lg">
                            <cat.icon size={24} className="md:w-10 md:h-10 mb-1 text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
                            <span className="text-[10px] md:text-sm font-black uppercase tracking-tight text-white text-center leading-[0.9] max-w-[80px] md:max-w-[120px] drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                              {cat.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </motion.div>

                  {/* Center Cap */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 md:w-20 md:h-20 bg-white rounded-full shadow-lg flex items-center justify-center border-[6px] border-sg-red z-30">
                    <div className="w-4 h-4 bg-sg-red rounded-full" />
                  </div>
                </div>

                <motion.button 
                  disabled={gameState === 'QUESTION' || isLoading}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={spinWheel}
                  className="mt-12 bg-sg-red text-white font-black py-5 px-16 rounded-full shadow-[0_8px_0px_#b01a27] text-2xl uppercase tracking-tighter transition-all active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:active:translate-y-0 disabled:shadow-[0_8px_0px_#b01a27]"
                >
                  {isLoading ? 'PREPARING...' : 'SPIN WHEEL!'}
                </motion.button>
              </div>

              {gameMode === 'VERSUS' && (
                <div className="flex flex-col gap-4 w-full md:w-[320px]">
                  {/* Player 1 Card */}
                  <div className={`p-8 bg-white rounded-[2.5rem] shadow-xl border-4 transition-all relative overflow-hidden ${currentPlayer === 1 ? 'border-accent-yellow scale-105 shadow-accent-yellow/20' : 'border-gray-50 opacity-60'}`}>
                    {currentPlayer === 1 && (
                      <div className="absolute top-0 right-0 bg-accent-yellow text-white text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest">
                        Your Turn
                      </div>
                    )}
                    <div className="flex items-center gap-4 mb-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${currentPlayer === 1 ? 'bg-sg-red text-white' : 'bg-gray-100 text-gray-400'}`}>
                        <User size={24} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Player 1</span>
                        <span className="text-2xl font-black text-deep-teal tracking-tight">{score.toLocaleString()}</span>
                      </div>
                    </div>
                    {currentPlayer === 1 && <div className="h-1.5 w-full bg-accent-yellow/20 rounded-full mt-2 overflow-hidden"><div className="h-full bg-accent-yellow animate-pulse w-full" /></div>}
                  </div>

                  {/* Player 2 Card */}
                  <div className={`p-8 bg-white rounded-[2.5rem] shadow-xl border-4 transition-all relative overflow-hidden ${currentPlayer === 2 ? 'border-accent-yellow scale-105 shadow-accent-yellow/20' : 'border-gray-50 opacity-60'}`}>
                    {currentPlayer === 2 && (
                      <div className="absolute top-0 right-0 bg-accent-yellow text-white text-[10px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest">
                        Your Turn
                      </div>
                    )}
                    <div className="flex items-center gap-4 mb-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${currentPlayer === 2 ? 'bg-sg-red text-white' : 'bg-gray-100 text-gray-400'}`}>
                        <User size={24} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Player 2</span>
                        <span className="text-2xl font-black text-deep-teal tracking-tight">{p2Score.toLocaleString()}</span>
                      </div>
                    </div>
                    {currentPlayer === 2 && <div className="h-1.5 w-full bg-accent-yellow/20 rounded-full mt-2 overflow-hidden"><div className="h-full bg-accent-yellow animate-pulse w-full" /></div>}
                  </div>

                  <div className="bg-deep-teal/5 p-6 rounded-[2.5rem] border-2 border-dashed border-deep-teal/10 mt-2">
                    <p className="text-[10px] font-bold text-deep-teal/40 uppercase tracking-widest text-center">Global Ranking Meta</p>
                    <p className="text-gray-500 text-xs text-center mt-2 leading-relaxed">
                      Taking turns helps everyone learn! 
                      Good luck to both explorers.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {currentCategory && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-12 flex items-center gap-2 bg-white px-6 py-3 rounded-full border-2 border-deep-teal shadow-lg"
              >
                <span className="text-xs font-black uppercase text-deep-teal opacity-50">Landed On:</span>
                <span className="font-black text-deep-teal uppercase tracking-widest">{currentCategory.label}</span>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* State: QUESTION/LOADING */}
        {(gameState === 'QUESTION' || isLoading) && (
          <motion.div 
            key="question"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="z-10 w-full max-w-2xl px-4"
          >
            <div className="bg-white rounded-[40px] shadow-2xl border-8 border-accent-yellow relative p-10 mt-10">
              {/* Turn Indicator for Versus Mode */}
              {gameMode === 'VERSUS' && !isLoading && (
                <div className="absolute -top-6 right-10 bg-sg-red px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest text-white shadow-md">
                  Player {currentPlayer} is up!
                </div>
              )}
              
              {/* Category Tag */}
              <div className="absolute -top-6 left-10 bg-accent-yellow px-6 py-2 rounded-full font-black text-xs uppercase tracking-widest text-[#333] shadow-md">
                {currentCategory?.label}
              </div>

              {!isLoading && (
                <div className="absolute top-8 right-10 w-16 h-16 rounded-full border-[5px] border-gray-100 border-t-sg-red flex items-center justify-center text-sg-red font-black text-xl">
                  {timeLeft}
                </div>
              )}

              <div className="mt-8">
                {isLoading ? (
                  <div className="flex flex-col items-center py-20 gap-4">
                    <div className="w-16 h-16 border-4 border-gray-100 border-t-sg-red rounded-full animate-spin" />
                    <p className="text-deep-teal font-black animate-pulse uppercase tracking-widest">Generating Trivia...</p>
                  </div>
                ) : (
                  <>
                    <h3 className="text-2xl md:text-3xl font-bold mb-10 leading-tight text-deep-teal">
                      {question?.question}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {question?.options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleAnswer(idx)}
                          className="p-6 text-left bg-gray-50 border-3 border-gray-100 rounded-3xl hover:border-sg-red hover:bg-white hover:text-sg-red transition-all flex items-center gap-4 group active:scale-[0.98]"
                        >
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs font-black text-gray-500 group-hover:bg-sg-red/10 group-hover:text-sg-red">
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <span className="font-bold text-lg">{option}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* State: RESULT */}
        {gameState === 'RESULT' && (
          <motion.div 
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="z-10 w-full max-w-xl px-4"
          >
            <div className="bg-white rounded-[40px] shadow-2xl p-12 text-center border-8 border-accent-yellow">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${question?.correctAnswerIndex === -1 || (timeLeft === 0) ? 'bg-red-50 text-sg-red' : 'bg-green-50 text-green-600'}`}>
                {question?.correctAnswerIndex !== -1 ? <Trophy size={48} /> : <Info size={48} />}
              </div>
              
              <h2 className="text-3xl font-black mb-2 text-deep-teal font-display">
                {question?.correctAnswerIndex !== -1 ? 'AWESOME WORK!' : 'TOO SLOW!'}
              </h2>
              <p className="text-gray-500 mb-8 text-lg">
                The correct answer was: <span className="font-black text-sg-red">{question?.options[question.correctAnswerIndex]}</span>
              </p>

              <div className="bg-sky-blue/20 rounded-3xl p-6 text-left border-2 border-dashed border-sky-blue mb-8">
                <div className="flex items-center gap-2 text-deep-teal font-black mb-2 uppercase text-xs tracking-widest">
                  <Info size={14} /> Heritage Hint
                </div>
                <p className="text-gray-700 italic leading-relaxed font-medium">
                  "{question?.explanation}"
                </p>
              </div>

              <button
                onClick={nextRound}
                className="w-full bg-deep-teal text-white font-black py-5 rounded-full text-xl shadow-lg hover:brightness-110 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                Continue Mission <ChevronRight />
              </button>
            </div>
          </motion.div>
        )}

        {/* State: GAMEOVER */}
        {gameState === 'GAMEOVER' && (
          <motion.div 
            key="gameover"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="z-10 w-full max-w-lg px-4 text-center"
          >
            <div className="bg-white rounded-[3rem] shadow-2xl p-12 border-8 border-accent-yellow">
              <div className="relative inline-block mb-8">
                <div className="bg-accent-yellow p-8 rounded-full shadow-lg">
                  <Trophy size={64} className="text-white" />
                </div>
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                  className="absolute -top-4 -right-4 bg-sg-red text-white p-4 rounded-full font-black shadow-lg uppercase text-xs"
                >
                  {gameMode === 'SOLO' ? 'Champion' : score === p2Score ? 'Tie!' : score > p2Score ? 'P1 WINS' : 'P2 WINS'}
                </motion.div>
              </div>

              <h2 className="text-4xl font-black mb-2 text-deep-teal font-display">Quest Complete!</h2>
              <p className="text-gray-500 mb-8 font-bold uppercase tracking-widest">Heritage Hero of Singapore</p>
              
              {gameMode === 'SOLO' ? (
                <div className="bg-sky-blue/10 rounded-[40px] p-8 mb-10 border-4 border-white">
                  <span className="text-deep-teal/40 uppercase text-xs font-black tracking-[0.3em]">Final Points</span>
                  <div className="text-7xl font-black text-sg-red mt-2 tracking-tighter font-display">{score.toLocaleString()}</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 mb-10">
                  <div className={`p-6 rounded-3xl border-4 ${score >= p2Score ? 'bg-sg-red/5 border-sg-red/20' : 'bg-gray-50 border-white'}`}>
                    <span className="text-deep-teal/40 uppercase text-[10px] font-black block">Player 1</span>
                    <div className="text-4xl font-black text-deep-teal">{score}</div>
                  </div>
                  <div className={`p-6 rounded-3xl border-4 ${p2Score >= score ? 'bg-sg-red/5 border-sg-red/20' : 'bg-gray-50 border-white'}`}>
                    <span className="text-deep-teal/40 uppercase text-[10px] font-black block">Player 2</span>
                    <div className="text-4xl font-black text-deep-teal">{p2Score}</div>
                  </div>
                </div>
              )}

              <button
                onClick={() => setGameState('START')}
                className="w-full bg-sg-red text-white font-black py-6 rounded-full text-2xl shadow-[0_8px_0px_#b01a27] hover:brightness-110 transition-all active:translate-y-1 active:shadow-none flex items-center justify-center gap-3 uppercase tracking-tighter"
              >
                <RotateCcw size={28} /> Play Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .clip-path-triangle {
          clip-path: polygon(50% 100%, 0 0, 100% 0);
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
