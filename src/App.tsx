import React, { useState } from 'react';
import AndroidSimulator from './components/AndroidSimulator';
import CodeViewer from './components/CodeViewer';
import TroubleshootingGuide from './components/TroubleshootingGuide';
import { 
  Car, 
  Code, 
  HelpCircle, 
  Cpu, 
  Terminal, 
  ShieldCheck, 
  CheckCircle,
  ExternalLink
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'code' | 'guide'>('simulator');

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-900 pb-16">
      
      {/* GLOWING AMBIENT BACKGROUND ACCENT */}
      <div className="absolute top-0 left-1/4 right-1/4 h-96 bg-gradient-to-b from-cyan-500/10 to-transparent blur-3xl pointer-events-none" />

      {/* HEADER SECTION */}
      <header className="relative border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
          
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-500/10">
              <Car className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-md sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                Teyes CC3 АКБ Монитор
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-400">Android 10</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-400 font-medium">Контроль разряда аккумулятора при прослушивании музыки на парковке</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a 
              href="https://teyes.ru" 
              target="_blank" 
              rel="noreferrer" 
              className="text-[10px] sm:text-xs font-semibold text-slate-400 hover:text-white transition flex items-center gap-1 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl"
            >
              Teyes CC3 Official
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

        </div>
      </header>

      {/* MAIN LAYOUT WRAPPER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8 relative">
        
        {/* SUBHEADER HERO BANNER */}
        <div className="bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="space-y-2 relative z-10">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Берегите ваш аккумулятор с умом
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Готовое решение для автозвука. Фоновая служба опрашивает напряжение каждые 10 секунд, предохраняет от случайного разряда АКБ двойным замером, воспроизводит громкий сигнал сирены и посылает экстренную телеграм-нотификацию на ваш смартфон.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 relative z-10">
            <button 
              onClick={() => setActiveTab('simulator')}
              className={`h-11 px-5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'simulator' 
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20' 
                  : 'bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Terminal className="w-4 h-4" />
              ИНТЕРАКТИВНЫЙ ТЕСТ
            </button>

            <button 
              onClick={() => setActiveTab('code')}
              className={`h-11 px-5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'code' 
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20' 
                  : 'bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Code className="w-4 h-4" />
              ИСХОДНЫЙ КОД ANDROID
            </button>

            <button 
              onClick={() => setActiveTab('guide')}
              className={`h-11 px-5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === 'guide' 
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20' 
                  : 'bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              ИНСТРУКЦИЯ CC3
            </button>
          </div>

          {/* Subheader subtle grid outline backdrop */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-10 pointer-events-none" />
        </div>

        {/* TAB CONTROLLERS & LIVE COMPONENT PORTAL */}
        <div className="space-y-6">
          {activeTab === 'simulator' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  Моделирование работы на магнитоле Teyes CC3
                </h3>
                <span className="text-xs text-slate-500 hidden sm:inline">
                  Эмуляция реального времени • Нажмите кнопки под экраном для тестов
                </span>
              </div>
              <AndroidSimulator />
            </div>
          )}

          {activeTab === 'code' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2">
                  <Code className="w-4 h-4 text-cyan-400" />
                  Готовый к сборке Android-проект (Kotlin & XML)
                </h3>
                <span className="text-xs text-slate-500 hidden sm:inline">
                  Полная структура проекта • Скопируйте файлы в Android Studio
                </span>
              </div>
              <CodeViewer />
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-cyan-400" />
                  Руководство по установке, компиляции и обходу ограничений Teyes
                </h3>
                <span className="text-xs text-slate-500 hidden sm:inline">
                  Технические советы по автоэлектронике и оптимизации Android
                </span>
              </div>
              <TroubleshootingGuide />
            </div>
          )}
        </div>

        {/* COMPREHENSIVE COMPILATION GUIDE BOTTOM SECTION */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-cyan-400" />
            Как запустить проект в Android Studio (Инструкция за 3 минуты)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300 leading-relaxed">
            <div className="space-y-2">
              <div className="text-cyan-400 font-bold uppercase tracking-wider text-[10px] bg-cyan-950/50 border border-cyan-800/30 px-2 py-0.5 rounded w-max">Шаг 1</div>
              <h4 className="font-bold text-slate-200">Создание проекта</h4>
              <p className="text-slate-400">
                Откройте Android Studio → Выберите <strong className="text-slate-300">"New Project"</strong> → <strong className="text-slate-300">"Empty Views Activity"</strong>. Укажите язык <strong className="text-cyan-400">Kotlin</strong>, имя пакета <code className="text-slate-300 bg-slate-900 px-1 rounded">com.teyes.batterymonitor</code> и минимальную версию SDK 21 (Lollipop).
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-cyan-400 font-bold uppercase tracking-wider text-[10px] bg-cyan-950/50 border border-cyan-800/30 px-2 py-0.5 rounded w-max">Шаг 2</div>
              <h4 className="font-bold text-slate-200">Перенос исходников</h4>
              <p className="text-slate-400">
                Скопируйте файлы из вкладки <strong className="text-slate-300">"Исходный код Android"</strong> в соответствующие папки вашего проекта. Проверьте правильность путей и структуры пакета. Не забудьте обновить разрешения в <code className="text-slate-300 bg-slate-900 px-1 rounded">AndroidManifest.xml</code>!
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-cyan-400 font-bold uppercase tracking-wider text-[10px] bg-cyan-950/50 border border-cyan-800/30 px-2 py-0.5 rounded w-max">Шаг 3</div>
              <h4 className="font-bold text-slate-200">Сборка APK и установка</h4>
              <p className="text-slate-400">
                Запустите сборку в меню: <strong className="text-slate-300">Build → Build Bundle(s) / APK(s) → Build APK(s)</strong>. Скиньте полученный APK-файл на флешку, вставьте её в магнитолу Teyes CC3 и установите через встроенный диспетчер файлов.
              </p>
            </div>
          </div>
        </div>

      </main>

      {/* CONVENIENT LIGHTWEIGHT FOOTER */}
      <footer className="mt-16 border-t border-slate-900 pt-8 text-center text-xs text-slate-500 max-w-7xl mx-auto px-4">
        <p>© 2026 Teyes CC3 Battery Monitor Utility. Специально оптимизировано для автомобильных магнитол Teyes CC3 на Android 10.</p>
        <p className="mt-1">Разработано с акцентом на энергосбережение, точность проверки и стабильность фоновой работы бортовой электроники.</p>
      </footer>

    </div>
  );
}
