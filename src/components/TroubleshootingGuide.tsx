import React from 'react';
import { ShieldCheck, Cpu, Power, Zap, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

export default function TroubleshootingGuide() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* COLUMN 1: TEYES CC3 POWER MANAGEMENT BYPASS */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold tracking-wider text-slate-200 uppercase flex items-center gap-2">
          <Cpu className="w-4 h-4 text-cyan-400" />
          Настройки Teyes CC3 (Борьба с Task Killer-ом)
        </h3>
        
        <p className="text-xs text-slate-400 leading-relaxed">
          Магнитолы Teyes CC3 работают на кастомной прошивке Android 10 с агрессивным встроенным менеджером памяти. Если приложение просто свернуть, система может завершить его фоновую службу через несколько минут после блокировки экрана.
        </p>

        <div className="space-y-3.5 pt-2">
          <div className="flex gap-3">
            <div className="w-5 h-5 bg-cyan-500/10 text-cyan-400 rounded-md flex items-center justify-center shrink-0 text-xs font-bold">1</div>
            <div>
              <h4 className="text-xs font-bold text-slate-200 leading-tight">Добавление в Белый Список Teyes</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                Откройте системные настройки магнитолы → <strong className="text-slate-300">"Настройки устройства"</strong> → <strong className="text-slate-300">"Приложения"</strong> → найдите <strong className="text-cyan-400">Battery Monitor</strong> → отключите оптимизацию батареи (Разрешить работу в фоновом режиме без ограничений).
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-5 h-5 bg-cyan-500/10 text-cyan-400 rounded-md flex items-center justify-center shrink-0 text-xs font-bold">2</div>
            <div>
              <h4 className="text-xs font-bold text-slate-200 leading-tight">Блокировка в списке запущенных (Замок)</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                Нажмите физическую или сенсорную кнопку "Меню запущенных приложений" (две карточки) на Teyes → найдите карточку приложения → потяните её вниз или нажмите иконку <strong className="text-slate-300">"Замка"</strong>. Это предотвратит выгрузку приложения встроенной утилитой очистки ОЗУ.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-5 h-5 bg-cyan-500/10 text-cyan-400 rounded-md flex items-center justify-center shrink-0 text-xs font-bold">3</div>
            <div>
              <h4 className="text-xs font-bold text-slate-200 leading-tight">Разрешение на автозапуск в фоне</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                Для автоматического включения контроля при включении зажигания автомобиля (АСС), убедитесь, что тумблер автозапуска в приложении включен. В манифесте объявлен фильтр на <code className="text-slate-300 font-mono text-[10px]">BOOT_COMPLETED</code>, который отлично отрабатывает при "холодном" и "горячем" старте Android-платформы Teyes.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-5 h-5 bg-cyan-500/10 text-cyan-400 rounded-md flex items-center justify-center shrink-0 text-xs font-bold">4</div>
            <div>
              <h4 className="text-xs font-bold text-slate-200 leading-tight">Разрешение "Поверх всех окон" (Overlay)</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                При первом запуске и нажатии кнопки "Запустить мониторинг" Android потребует включить разрешение <strong className="text-slate-300">"Показ поверх других приложений"</strong>. Обязательно предоставьте его, иначе оверлей с красным предупреждением не сможет перекрыть навигатор.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* COLUMN 2: INTEGRATION SOURCE DETAILS & BUS READING */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold tracking-wider text-slate-200 uppercase flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          Специфика чтения напряжения на Teyes CC3
        </h3>

        <p className="text-xs text-slate-400 leading-relaxed">
          В отличие от обычных смартфонов, магнитола Teyes CC3 подключена к бортовой сети авто через CAN-шину (декодер) и K-Line MCU. Для получения точного вольтажа в нашем коде <code className="text-cyan-400 font-mono text-[10px]">BatteryMonitorService.kt</code> заложено 4 метода.
        </p>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-slate-300 block">Sysfs файлы ядра (Самый точный способ)</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Магнитола пишет вольтаж напрямую от CAN-адаптера в виртуальные файлы ядра. Наш сервис по очереди опрашивает пути, например <code className="text-amber-400 font-mono text-[10px]">/sys/class/power_supply/battery/voltage_now</code>.
              </span>
            </div>
          </div>

          <div className="flex gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-slate-300 block">Системные свойства Getprop</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Операционная система Teyes дублирует MCU-данные в системный реестр под ключами <code className="text-amber-400 font-mono text-[10px]">sys.car.voltage</code> или <code className="text-amber-400 font-mono text-[10px]">ro.teyes.car.voltage</code>. Наш код считывает их через вызов шелла.
              </span>
            </div>
          </div>

          <div className="flex gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-bold text-slate-300 block">Стандартный BatteryManager</span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Если прошивка эмулирует автомобильный вольтаж как заряд аккумулятора устройства, код перехватывает системный интент <code className="text-amber-400 font-mono text-[10px]">Intent.ACTION_BATTERY_CHANGED</code> и вычленяет милливольты.
              </span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-cyan-950/20 border border-cyan-800/30 rounded-xl text-[11px] text-cyan-300 leading-normal flex gap-2">
          <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <p>
            <strong>Совет разработчика:</strong> Если ваше авто имеет кастомный CAN-декодер и вольтаж в системе не отображается автоматически, вы можете установить сторонний лаунчер (например FCC Launcher) и использовать его API/Бродкасты для трансляции MCU-данных в этот сервис.
          </p>
        </div>
      </div>

    </div>
  );
}
