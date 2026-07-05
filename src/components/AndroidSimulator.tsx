import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Square, 
  Settings as SettingsIcon, 
  Bell, 
  Smartphone, 
  Volume2, 
  VolumeX, 
  RefreshCw, 
  AlertTriangle, 
  Check, 
  Info, 
  Send,
  Sliders,
  Radio,
  Clock,
  Battery
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AndroidSimulator() {
  // State variables for Android simulation
  const [currentVoltage, setCurrentVoltage] = useState<number>(12.6);
  const [thresholdVoltage, setThresholdVoltage] = useState<number>(11.8);
  const [isMonitoringActive, setIsMonitoringActive] = useState<boolean>(true);
  const [isAutostartEnabled, setIsAutostartEnabled] = useState<boolean>(true);
  // Simulation control states
  const [simulationSpeed, setSimulationSpeed] = useState<'normal' | 'fast'>('fast'); // fast is 3s check interval, normal is 10s
  const [drainActive, setDrainActive] = useState<boolean>(false);
  const [consecutiveLowCount, setConsecutiveLowCount] = useState<number>(0);
  const [nextCheckSeconds, setNextCheckSeconds] = useState<number>(3);
  const [showOverlay, setShowOverlay] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  


  // Interval and timer refs
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const drainIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const secondsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Time formatting for simulator
  const [systemTime, setSystemTime] = useState<string>('12:00');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setSystemTime(now.toTimeString().slice(0, 5));
    };
    updateTime();
    const tInterval = setInterval(updateTime, 60000);
    return () => clearInterval(tInterval);
  }, []);

  // Web Audio Alarm sound helper
  const triggerAudioAlarm = () => {
    if (isMuted) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass();
      
      const playSingleBeep = (delay: number) => {
        setTimeout(() => {
          if (audioCtx.state === 'suspended') return;
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          
          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          
          osc.type = 'sine';
          osc.frequency.setValueAtTime(950, audioCtx.currentTime); // High pitch warning
          gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
          
          osc.start();
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
          
          setTimeout(() => {
            try {
              osc.stop();
            } catch (err) {}
          }, 400);
        }, delay);
      };

      // Triple beep
      playSingleBeep(0);
      playSingleBeep(500);
      playSingleBeep(1000);

      // Auto-close context
      setTimeout(() => {
        audioCtx.close().catch(() => {});
      }, 1600);
    } catch (e) {
      console.warn("Web Audio failed (requires user interaction first)", e);
    }
  };



  // Simulated Battery Monitoring Loop
  const checkInterval = simulationSpeed === 'fast' ? 3 : 10;

  useEffect(() => {
    if (!isMonitoringActive) {
      setConsecutiveLowCount(0);
      return;
    }

    setNextCheckSeconds(checkInterval);

    // Countdown timer for next check visual aid
    if (secondsTimerRef.current) clearInterval(secondsTimerRef.current);
    secondsTimerRef.current = setInterval(() => {
      setNextCheckSeconds(prev => {
        if (prev <= 1) {
          return checkInterval;
        }
        return prev - 1;
      });
    }, 1000);

    // Main check interval
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      // 1. Measure current voltage
      // 2. Compare with threshold
      const roundedVolts = Math.round(currentVoltage * 10) / 10;
      if (roundedVolts < thresholdVoltage) {
        setConsecutiveLowCount(prev => {
          const nextCount = prev + 1;
          if (nextCount >= 2) {
            // Alert!
            setShowOverlay(true);
            triggerAudioAlarm();
            return 2; // cap at 2
          }
          return nextCount;
        });
      } else {
        setConsecutiveLowCount(0);
      }
    }, checkInterval * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (secondsTimerRef.current) clearInterval(secondsTimerRef.current);
    };
  }, [isMonitoringActive, currentVoltage, thresholdVoltage, simulationSpeed, isMuted]);

  // Handle continuous slow battery drain
  useEffect(() => {
    if (drainActive) {
      drainIntervalRef.current = setInterval(() => {
        setCurrentVoltage(prev => {
          const nextVal = prev - 0.05;
          return nextVal < 10.5 ? 10.5 : parseFloat(nextVal.toFixed(2));
        });
      }, 1000);
    } else {
      if (drainIntervalRef.current) clearInterval(drainIntervalRef.current);
    }
    return () => {
      if (drainIntervalRef.current) clearInterval(drainIntervalRef.current);
    };
  }, [drainActive]);

  // Stop alarm if engine is started (voltage high)
  useEffect(() => {
    if (currentVoltage >= thresholdVoltage) {
      setShowOverlay(false);
      setConsecutiveLowCount(0);
    }
  }, [currentVoltage, thresholdVoltage]);

  // Color coding helper for display voltage
  const getVoltageColorClass = (volts: number) => {
    if (volts >= 12.0) return 'text-emerald-400';
    if (volts >= 11.5) return 'text-amber-400 animate-pulse';
    return 'text-rose-500 font-extrabold animate-pulse';
  };

  const getVoltageBgClass = (volts: number) => {
    if (volts >= 12.0) return 'bg-emerald-950/40 border-emerald-500/30';
    if (volts >= 11.5) return 'bg-amber-950/40 border-amber-500/30';
    return 'bg-rose-950/50 border-rose-500/50';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* LEFT: Dashboard simulator (Car multimedia screen) */}
      <div className="space-y-6">
        
        {/* Simulator controls header */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap gap-4 justify-between items-center">
          <div>
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400 animate-ping" />
              Интерактивный пульт симулятора бортовой сети
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Управляйте напряжением автомобиля для тестирования алгоритма приложения</p>
          </div>
          
          <div className="flex gap-2 items-center">
            <span className="text-xs text-slate-400">Режим проверки:</span>
            <button 
              onClick={() => {
                setSimulationSpeed('fast');
                setConsecutiveLowCount(0);
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                simulationSpeed === 'fast' 
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/10' 
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Быстрый (3 сек)
            </button>
            <button 
              onClick={() => {
                setSimulationSpeed('normal');
                setConsecutiveLowCount(0);
              }}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
                simulationSpeed === 'normal' 
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/10' 
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Реальный (10 сек)
            </button>
          </div>
        </div>

        {/* TEYES CC3 HEAD UNIT BODY FRAME */}
        <div className="relative bg-slate-950 border-[10px] border-slate-900 rounded-[2rem] shadow-2xl overflow-hidden aspect-[16/9] flex flex-col group select-none">
          
          {/* Teyes glass glare effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/[0.02] to-white/[0.08] pointer-events-none z-10" />

          {/* SIMULATED SYSTEM BAR */}
          <div className="bg-slate-900 px-5 py-1.5 flex justify-between items-center text-xs text-slate-400 border-b border-slate-900 font-sans z-20">
            <div className="flex items-center gap-3">
              <span className="font-semibold tracking-wider text-slate-300">TEYES CC3</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Android 10</span>
              {isMonitoringActive && (
                <span className="flex items-center gap-1 text-emerald-400 text-[10px] animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Монитор АКБ активен
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsMuted(!isMuted)} 
                className="hover:text-white transition"
                title={isMuted ? "Включить звук" : "Выключить звук"}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400" />}
              </button>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span className="font-medium">{systemTime}</span>
              </div>
            </div>
          </div>

          {/* MAIN TEYES INTERFACE AREA */}
          <div className="relative flex-1 bg-[#121214] flex flex-col p-6 overflow-hidden">
            
            {/* TEYES APP SCREEN */}
            <div className="flex-1 flex flex-col">
              
              {/* Header inside App */}
              <div className="flex justify-between items-start mb-4 border-b border-slate-900 pb-3">
                <div>
                  <h1 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
                    <Battery className="w-5 h-5 text-cyan-400" />
                    Мониторинг АКБ
                    <span className="text-[10px] font-normal uppercase tracking-wider text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      v1.0.0 Teyes Edition
                    </span>
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">Постоянный контроль напряжения в фоне для защиты аккумулятора</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500 font-mono">Цикл опроса: {simulationSpeed === 'fast' ? '3' : '10'} сек</div>
                    {isMonitoringActive && (
                      <div className="text-[10px] text-cyan-400/80 font-mono animate-pulse">Проверка через {nextCheckSeconds}с</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Grid layout of CC3 app */}
              <div className="grid grid-cols-12 gap-5 flex-1">
                
                {/* 1. CURRENT VOLTAGE BIG WIDGET (6 Cols) */}
                <div className={`col-span-6 rounded-2xl border p-5 flex flex-col justify-between transition-all duration-300 ${getVoltageBgClass(currentVoltage)}`}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold tracking-wider text-slate-300 uppercase">
                      Текущая бортовая сеть
                    </span>
                    {isMonitoringActive ? (
                      <span className="text-[10px] bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-mono">
                        Служба запущена
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-900 text-slate-500 border border-slate-800 px-2 py-0.5 rounded font-mono">
                        Служба остановлена
                      </span>
                    )}
                  </div>

                  {/* Main numeric display */}
                  <div className="text-center my-2">
                    <div className={`text-6xl font-black tracking-tight transition-all duration-300 ${getVoltageColorClass(currentVoltage)}`}>
                      {isMonitoringActive ? `${currentVoltage.toFixed(1)}` : '--.-'} <span className="text-2xl font-semibold">V</span>
                    </div>
                    
                    {/* Status text label */}
                    <p className="text-xs font-semibold text-slate-300 mt-1">
                      {currentVoltage >= 12.0 ? (
                        <span className="text-emerald-400">✓ Заряд в норме</span>
                      ) : currentVoltage >= thresholdVoltage ? (
                        <span className="text-amber-400">⚠ Пониженный вольтаж</span>
                      ) : (
                        <span className="text-rose-400 font-bold animate-pulse">🛑 ОПАСНЫЙ РАЗРЯД! ({consecutiveLowCount}/2)</span>
                      )}
                    </p>
                  </div>

                  {/* Toggle service buttons */}
                  <div className="grid grid-cols-1 gap-2">
                    {isMonitoringActive ? (
                      <button 
                        onClick={() => setIsMonitoringActive(false)}
                        className="w-full h-11 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-950/30 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                        ОСТАНОВИТЬ МОНИТОРИНГ
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setIsMonitoringActive(true);
                          setConsecutiveLowCount(0);
                        }}
                        className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/30 flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        ЗАПУСТИТЬ МОНИТОРИНГ
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. THRESHOLD SETTING (6 Cols) */}
                <div className="col-span-6 bg-[#1F1F23] border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold tracking-wider text-slate-300 uppercase flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                        Порог срабатывания
                      </span>
                      <span className="text-sm font-black text-amber-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded font-mono">
                        {thresholdVoltage.toFixed(1)} V
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                      При снижении напряжения ниже этого порога начнется отсчет. Сигнал сработает на второй проверке подряд.
                    </p>

                    {/* Threshold SeekBar slider */}
                    <div className="space-y-1">
                      <input 
                        type="range" 
                        min="11.0" 
                        max="12.5" 
                        step="0.1" 
                        value={thresholdVoltage}
                        onChange={(e) => setThresholdVoltage(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer bg-slate-800 h-2 rounded-lg appearance-none"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>11.0V (Разряжен)</span>
                        <span>11.8V (Рекомендуемый)</span>
                        <span>12.5V (Высокий)</span>
                      </div>
                    </div>
                  </div>

                  {/* Settings section */}
                  <div className="border-t border-slate-800/80 pt-3 mt-2 flex justify-between items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={isAutostartEnabled}
                        onChange={(e) => setIsAutostartEnabled(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-800 text-cyan-400 focus:ring-cyan-400/30 w-4 h-4"
                      />
                      <span className="text-xs font-medium text-slate-300">
                        Автозапуск при загрузке (Boot)
                      </span>
                    </label>
                  </div>
                </div>

              </div>

            </div>

            {/* FULLSCREEN SYSTEM OVERLAY (DISPLAY OVER OTHER WINDOWS) */}
            <AnimatePresence>
              {showOverlay && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-slate-950/95 flex flex-col justify-center items-center p-6 z-50 text-center"
                >
                  {/* Flashing alert frame */}
                  <div className="max-w-md bg-[#1c080a] border-2 border-rose-500 rounded-3xl p-8 shadow-2xl relative overflow-hidden animate-pulse">
                    
                    {/* Corner hazard style accents */}
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500" />
                    
                    <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center mx-auto mb-4 text-rose-500">
                      <AlertTriangle className="w-8 h-8 text-rose-500 animate-bounce" />
                    </div>

                    <h2 className="text-rose-500 font-extrabold text-2xl tracking-wide uppercase">
                      ВНИМАНИЕ!
                    </h2>
                    <h3 className="text-white text-base font-bold mt-1 tracking-tight">
                      КРИТИЧЕСКИЙ РАЗРЯД БАТАРЕИ
                    </h3>

                    {/* Big flashing voltage value */}
                    <div className="text-5xl font-black text-amber-400 font-mono my-4 animate-ping absolute opacity-10 left-1/2 -translate-x-1/2">
                      {currentVoltage.toFixed(1)}V
                    </div>
                    <div className="text-5xl font-black text-amber-400 font-mono my-4 relative">
                      {currentVoltage.toFixed(1)} <span className="text-xl">V</span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto mb-6">
                      Напряжение упало ниже безопасного порога <strong className="text-amber-400">{thresholdVoltage.toFixed(1)}V</strong>.
                      Немедленно запустите двигатель автомобиля, иначе аккумулятор полностью разрядится!
                    </p>

                    <div className="flex gap-3">
                      <button 
                        onClick={() => {
                          setShowOverlay(false);
                          // Reset consecutive counter, will trigger alert again if next check is still low
                          setConsecutiveLowCount(0);
                        }}
                        className="flex-1 h-12 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-rose-950/40"
                      >
                        Я понял (Скрыть)
                      </button>
                      <button 
                        onClick={() => {
                          setCurrentVoltage(14.2);
                        }}
                        className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Завести мотор (14.2V)
                      </button>
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* BOTTOM PANEL: QUICK SIMULATION TRIGGER DECK */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              Эмулятор событий автомобиля (Тест-Сценарии)
            </h4>
            <div className="text-xs font-mono text-cyan-400 bg-cyan-950/50 border border-cyan-800/30 px-2 py-0.5 rounded">
              Текущее значение: {currentVoltage.toFixed(2)} V
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <button 
              onClick={() => {
                setCurrentVoltage(14.2);
                setDrainActive(false);
              }}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 hover:border-emerald-500/30 rounded-xl text-left transition group"
            >
              <div className="text-[10px] text-slate-500 font-bold group-hover:text-emerald-400 transition">СТАРТ МОТОРА</div>
              <div className="text-xs font-black text-slate-200 mt-0.5">14.2 V</div>
              <span className="text-[9px] text-slate-400 block mt-1">Генератор заряжает</span>
            </button>

            <button 
              onClick={() => {
                setCurrentVoltage(12.6);
                setDrainActive(false);
              }}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 hover:border-cyan-500/30 rounded-xl text-left transition group"
            >
              <div className="text-[10px] text-slate-500 font-bold group-hover:text-cyan-400 transition">ГЛУШЕНИЕ ДВС</div>
              <div className="text-xs font-black text-slate-200 mt-0.5">12.6 V</div>
              <span className="text-[9px] text-slate-400 block mt-1">Нормальное состояние</span>
            </button>

            <button 
              onClick={() => {
                setDrainActive(true);
              }}
              className={`px-3 py-2.5 border rounded-xl text-left transition group ${
                drainActive 
                  ? 'bg-amber-950/40 border-amber-500/30' 
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700/50 hover:border-amber-500/30'
              }`}
            >
              <div className={`text-[10px] font-bold ${drainActive ? 'text-amber-400' : 'text-slate-500 group-hover:text-amber-400'} transition`}>
                СЛУШАТЬ МУЗЫКУ
              </div>
              <div className="text-xs font-black text-slate-200 mt-0.5">РАЗРЯД -0.05V/с</div>
              <span className="text-[9px] text-slate-400 block mt-1">Плавное падение</span>
            </button>

            <button 
              onClick={() => {
                setCurrentVoltage(prev => {
                  const nextVal = prev - 0.4;
                  return nextVal < 10.5 ? 10.5 : parseFloat(nextVal.toFixed(2));
                });
              }}
              className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 hover:border-rose-500/30 rounded-xl text-left transition group"
            >
              <div className="text-[10px] text-slate-500 font-bold group-hover:text-rose-400 transition">УДАР БАСА (САБ)</div>
              <div className="text-xs font-black text-slate-200 mt-0.5">Спад -0.4 V</div>
              <span className="text-[9px] text-slate-400 block mt-1">Проверка просадки</span>
            </button>

            <button 
              onClick={() => {
                setCurrentVoltage(11.3);
                setDrainActive(false);
              }}
              className="px-3 py-2.5 bg-rose-950/20 hover:bg-rose-950/30 border border-rose-900/30 hover:border-rose-500/50 rounded-xl text-left transition group"
            >
              <div className="text-[10px] text-rose-400/80 font-bold group-hover:text-rose-400 transition">АВАРИЙНЫЙ РАЗРЯД</div>
              <div className="text-xs font-black text-rose-300 mt-0.5">11.3 V</div>
              <span className="text-[9px] text-rose-400/60 block mt-1">Форс-мажор</span>
            </button>
          </div>

          {/* Interactive slider for granular voltage testing */}
          <div className="pt-2">
            <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1">
              <span>Грубая ручная регулировка напряжения АКБ:</span>
              <span className="font-mono text-cyan-400 font-bold">{currentVoltage.toFixed(1)}V</span>
            </div>
            <input 
              type="range" 
              min="10.5" 
              max="14.5" 
              step="0.1" 
              value={currentVoltage}
              onChange={(e) => {
                setCurrentVoltage(parseFloat(e.target.value));
                setDrainActive(false);
              }}
              className="w-full accent-cyan-400 cursor-ew-resize bg-slate-950 h-2 rounded-lg appearance-none"
            />
          </div>
        </div>

      </div>

    </div>
  );
}
