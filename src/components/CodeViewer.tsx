import React, { useState } from 'react';
import { androidProjectFiles, AndroidFile } from '../androidProjectCode';
import { Code, FileCode, Check, Copy, FileText, Search, ExternalLink, HardDrive } from 'lucide-react';

export default function CodeViewer() {
  const [activeFileIndex, setActiveFileIndex] = useState<number>(1); // BatteryMonitorService.kt as default (highly interesting to user)
  const [copied, setCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeFile = androidProjectFiles[activeFileIndex];

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredFiles = androidProjectFiles.filter(file => 
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col lg:flex-row h-[720px]">
      
      {/* SIDEBAR FILE NAVIGATOR */}
      <div className="w-full lg:w-80 bg-slate-950 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col">
        
        {/* Search header */}
        <div className="p-4 border-b border-slate-800/80">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск файлов проекта..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none transition"
            />
          </div>
        </div>

        {/* Files Tree */}
        <div className="flex-1 overflow-y-auto p-2.5 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase px-3 mb-2 flex items-center gap-1.5">
            <HardDrive className="w-3 h-3 text-slate-600" />
            Структура проекта Android
          </div>
          
          {filteredFiles.map((file) => {
            const originalIndex = androidProjectFiles.findIndex(f => f.name === file.name);
            const isActive = originalIndex === activeFileIndex;
            
            return (
              <button
                key={file.name}
                onClick={() => {
                  setActiveFileIndex(originalIndex);
                  setCopied(false);
                }}
                className={`w-full text-left p-3 rounded-xl flex items-start gap-2.5 transition-all group ${
                  isActive 
                    ? 'bg-[#1e293b]/60 border border-cyan-500/30' 
                    : 'hover:bg-slate-900 border border-transparent'
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${
                  isActive ? 'bg-cyan-500/10 text-cyan-400' : 'bg-slate-900 text-slate-400 group-hover:text-slate-300'
                }`}>
                  {file.name.endsWith('.kt') ? <FileCode className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-bold truncate ${isActive ? 'text-cyan-400' : 'text-slate-300 group-hover:text-slate-200'}`}>
                    {file.name}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate font-mono mt-0.5">
                    {file.path}
                  </div>
                </div>
              </button>
            );
          })}

          {filteredFiles.length === 0 && (
            <div className="p-4 text-center text-xs text-slate-500">
              Файлы не найдены
            </div>
          )}
        </div>

        {/* Source info note */}
        <div className="p-3.5 bg-slate-900/40 border-t border-slate-800 text-[11px] text-slate-400 leading-normal space-y-1">
          <span className="font-semibold text-slate-300">Рекомендация:</span>
          <p>
            Этот проект готов для импорта в <strong>Android Studio</strong>. Мы используем современный <strong>Kotlin</strong> и чистый SDK Android 10 (targetSdk 29), что дает 100% совместимость с магнитолой Teyes CC3.
          </p>
        </div>
      </div>

      {/* CODE DISPLAY AREA */}
      <div className="flex-1 flex flex-col bg-[#0b0f19] overflow-hidden">
        
        {/* Tab top info */}
        <div className="bg-[#0e1424] px-6 py-4 border-b border-slate-800/80 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded bg-[#1e293b] border border-slate-800 text-cyan-400 font-mono font-bold uppercase">
                {activeFile.language}
              </span>
              <h2 className="text-sm font-bold text-white tracking-tight">{activeFile.name}</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">{activeFile.description}</p>
          </div>

          <button 
            onClick={() => handleCopy(activeFile.code)}
            className={`h-10 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all self-start sm:self-center ${
              copied 
                ? 'bg-emerald-500 text-slate-950' 
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/10'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                КОД СКОПИРОВАН!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                СКОПИРОВАТЬ ФАЙЛ
              </>
            )}
          </button>
        </div>

        {/* Real code box with simple customized visual accents */}
        <div className="flex-1 overflow-auto p-4 text-xs font-mono leading-relaxed text-slate-300 bg-[#070b13] scrollbar-thin scrollbar-thumb-slate-800">
          <pre className="p-2 select-all rounded-lg">
            <code>
              {activeFile.code.split('\n').map((line, i) => {
                // Check if line contains user-desired target comment markers
                const isTargetComment = line.includes('МЕТОД ПОЛУЧЕНИЯ НАПРЯЖЕНИЯ') || 
                                       line.includes('МЕТОД 1:') || 
                                       line.includes('МЕТОД 2:') || 
                                       line.includes('МЕТОД 3:') || 
                                       line.includes('МЕТОД ФОЛБЕКА:') ||
                                       line.includes('readBatteryVoltage()') ||
                                       line.includes('readBatteryVoltage');

                return (
                  <div 
                    key={i} 
                    className={`flex ${isTargetComment ? 'bg-cyan-950/35 border-l-2 border-cyan-500 py-1 pl-2 -ml-2 font-semibold text-cyan-300' : ''}`}
                  >
                    <span className="w-8 select-none text-slate-600 text-right pr-3">{i + 1}</span>
                    <span className="flex-1 whitespace-pre">{line}</span>
                  </div>
                );
              })}
            </code>
          </pre>
        </div>

        {/* Footnote about voltage measurement */}
        {activeFile.name === "BatteryMonitorService.kt" && (
          <div className="bg-[#0e1424] border-t border-slate-800 px-5 py-3.5 text-[11px] text-cyan-300 flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 animate-pulse shrink-0" />
            <p className="leading-relaxed">
              <strong>Внимание на блок:</strong> Функция <code className="text-amber-400 bg-slate-950 px-1 py-0.5 rounded border border-slate-800 font-bold">readBatteryVoltage()</code> (строка 108) реализует многоуровневое чтение данных с ядра Teyes CC3. По умолчанию опрашиваются кастомные sysfs-ноды ядра, MCU-интенты и шина BatteryManager. Вы можете легко изменить путь или добавить прямое чтение UART.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
