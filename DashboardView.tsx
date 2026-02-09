import React, { useMemo, useState } from 'react';
import { useReport } from '../context/ReportContext';
import { GlassPanel } from '../components/ui/GlassPanel';
import { Table } from '../components/ui/Table';
import { 
  LayoutDashboard, Sparkles, TrendingUp, ShoppingCart, 
  Briefcase, Megaphone, Timer, Mail, 
  Eye, MousePointer2, Target, BarChart2, Crown, DollarSign,
  ArrowUpRight, ArrowDownRight, CreditCard, Globe,
  UserPlus, ShieldCheck, Layers, XCircle, Wallet,
  Trophy, TrendingDown, ListFilter, Send, Info, Crosshair, Award
} from 'lucide-react';
import { 
  parseDateBR, formatMoney, isUserValid, 
  getComparisonPeriods, parseDateBrevo, parseRate, calculateMeanMedian, parseMoney 
} from '../utils/helpers';
import { TARGET_PROFESSIONS } from '../constants';

// --- TYPES & INTERFACES ---

interface AggregatedRow {
  name: string;
  total: number;
  prev: number;
  daily: number[];
}

// --- HELPER FUNCTIONS (Globais) ---

const getVal = (row: any, keys: string[]) => {
    if (!row) return undefined;
    for (const k of keys) {
        if (row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
    }
    return undefined;
};

// --- HELPER COMPONENTS ---

const WeeklyScorecard: React.FC<{
  title: string;
  value: string | number;
  subValue?: React.ReactNode;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'orange' | 'purple' | 'cyan' | 'red';
}> = ({ title, value, subValue, icon, color }) => {
  
  const colorStyles = {
    blue:   { border: 'border-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10', text: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-blue-100 dark:bg-blue-500/20' },
    green:  { border: 'border-green-500', bg: 'bg-green-50 dark:bg-green-900/10', text: 'text-green-600 dark:text-green-400', iconBg: 'bg-green-100 dark:bg-green-500/20' },
    orange: { border: 'border-woca-orange', bg: 'bg-orange-50 dark:bg-orange-900/10', text: 'text-woca-orange', iconBg: 'bg-orange-100 dark:bg-orange-500/20' },
    purple: { border: 'border-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/10', text: 'text-purple-600 dark:text-purple-400', iconBg: 'bg-purple-100 dark:bg-purple-500/20' },
    cyan:   { border: 'border-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-900/10', text: 'text-cyan-600 dark:text-cyan-400', iconBg: 'bg-cyan-100 dark:bg-cyan-500/20' },
    red:    { border: 'border-red-500', bg: 'bg-red-50 dark:bg-red-900/10', text: 'text-red-600 dark:text-red-400', iconBg: 'bg-red-100 dark:bg-red-500/20' },
  };

  const s = colorStyles[color];

  return (
    <GlassPanel className={`p-8 flex items-center justify-between border-l-4 ${s.border} ${s.bg} min-h-[160px] transition-all hover:scale-[1.01]`}>
      <div className="flex flex-col justify-center h-full gap-2">
         <h4 className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-wide">{title}</h4>
         <div className="flex flex-col items-start gap-1">
           <span className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">{value}</span>
           {subValue && (
             <div className="mt-2 text-sm font-medium opacity-90 flex items-center gap-2 h-6">
               {subValue}
             </div>
           )}
         </div>
      </div>
      <div className={`p-4 rounded-xl ${s.iconBg} ${s.text}`}>
        {React.cloneElement(icon as React.ReactElement<any>, { size: 36 })}
      </div>
    </GlassPanel>
  );
};

const Trend: React.FC<{ current: number, prev: number }> = ({ current, prev }) => {
  if (current === 0 && prev === 0) return <span className="text-gray-400 font-medium text-sm">-</span>;
  
  let diffPercent = 0;
  if (prev === 0) {
      diffPercent = current > 0 ? 100 : 0;
  } else {
      diffPercent = ((current - prev) / prev) * 100;
  }
  
  const isUp = diffPercent >= 0;
  if (!isFinite(diffPercent)) diffPercent = 100;

  const valStr = Math.abs(diffPercent).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  const color = isUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  
  return (
    <span className={`flex items-center gap-1 text-sm font-bold ${color}`}>
      {isUp ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
      {valStr}%
    </span>
  );
};

const ProgressBar: React.FC<{ value: number, max: number, colorClass: string }> = ({ value, max, colorClass }) => {
    const width = max > 0 ? Math.min((value / max) * 100, 100) : 0;
    return (
        <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full mt-2 overflow-hidden">
            <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${width}%` }}></div>
        </div>
    );
}

// --- MAIN COMPONENT ---

export const DashboardView: React.FC = () => {
  const { 
    reportMode,
    monthDash, setMonthDash,
    dateAcq, setDateAcq,
    rawUsers, setRawUsers,
    rawTransactions, setRawTransactions,
    rawEmails, setRawEmails,
    rawScoring, setRawScoring
  } = useReport();

  const [processed, setProcessed] = useState(false);

  const processData = () => {
      const isWeekly = reportMode === 'weekly';
      const dateVal = isWeekly ? dateAcq : monthDash;
      
      if (!dateVal) { alert(`Selecione ${isWeekly ? 'a data de início' : 'o mês de referência'}.`); return; }
      if (rawUsers.length === 0 || rawTransactions.length === 0) { alert('Dados de Aquisição incompletos.'); }
      
      setProcessed(true);
  };

  // --- Periods ---
  const periods = useMemo(() => {
      if (reportMode === 'weekly') {
          if (!dateAcq) return [];
          const start = new Date(dateAcq + 'T00:00:00');
          return getComparisonPeriods(start, 'weekly');
      } else {
          if (!monthDash) return [];
          const [y, m] = monthDash.split('-');
          const start = new Date(parseInt(y), parseInt(m)-1, 1);
          return getComparisonPeriods(start, 'monthly');
      }
  }, [monthDash, dateAcq, reportMode]);

  // --- Scoring Periods (Lag: 14 days) ---
  const scoringPeriods = useMemo(() => {
    if (reportMode === 'weekly') {
        if (!dateAcq) return [];
        const start = new Date(dateAcq + 'T00:00:00');
        start.setDate(start.getDate() - 14);
        return getComparisonPeriods(start, 'weekly');
    } else {
        if (!monthDash) return [];
        const [y, m] = monthDash.split('-');
        const start = new Date(parseInt(y), parseInt(m)-1, 1);
        start.setMonth(start.getMonth() - 1);
        return getComparisonPeriods(start, 'monthly');
    }
  }, [monthDash, dateAcq, reportMode]);


  // ==========================================
  // LOGIC BLOCKS
  // ==========================================

  const weeklyScorecardData = useMemo(() => {
    if (!processed || periods.length < 2) return null;
    const countLeads = (p: any) => {
        let total = 0;
        let valid = 0;
        rawUsers.forEach(u => {
            const d = parseDateBR(u['data_criacao_usuario (Data)']);
            if (d && d >= p.start && d <= p.end) {
                total++;
                const valRaw = u.value ? String(u.value).trim() : '';
                const isGoogle = valRaw === 'UserCadastroGoogle';
                const isFormValid = isUserValid(u);
                if (isGoogle || isFormValid) valid++;
            }
        });
        return { total, valid };
    };
    const curr = countLeads(periods[0]);
    const prev = countLeads(periods[1]);
    const varValid = prev.valid > 0 ? ((curr.valid - prev.valid) / prev.valid) * 100 : 0;
    return { total: curr.total, valid: curr.valid, validRate: curr.total > 0 ? (curr.valid / curr.total) * 100 : 0, varValid, prevValid: prev.valid };
  }, [processed, periods, rawUsers]);

  const validadosData = useMemo(() => {
      if (!processed || periods.length === 0) return [];
      return [...periods].reverse().map(p => {
          let google = 0, formValid = 0, formInvalid = 0;
          rawUsers.forEach(u => {
              const d = parseDateBR(u['data_criacao_usuario (Data)']);
              if (d && d >= p.start && d <= p.end) {
                  const valRaw = u.value ? String(u.value).trim() : '';
                  if (valRaw === 'UserCadastroGoogle') google++;
                  else if (isUserValid(u)) formValid++; else formInvalid++;
              }
          });
          const total = google + formValid + formInvalid;
          const totalForm = formValid + formInvalid;
          const totalValid = google + formValid;
          
          return { 
              label: p.label, 
              google, 
              formValid, 
              formInvalid, 
              total, 
              formRate: totalForm > 0 ? (formValid / totalForm) * 100 : 0,
              totalRate: total > 0 ? (totalValid / total) * 100 : 0
          };
      });
  }, [processed, periods, rawUsers]);

  const mediumTableData = useMemo(() => {
      if (!processed || periods.length === 0) return { all: [], google: [], eff: [] };
      const all: any = {}, google: any = {}, eff: any = {};
      periods.forEach((p, i) => {
          rawUsers.forEach(u => {
              const d = parseDateBR(u['data_criacao_usuario (Data)']);
              const valRaw = u.value ? String(u.value).trim() : '';
              const isGoogle = valRaw === 'UserCadastroGoogle';
              const isValid = isGoogle || isUserValid(u);
              const m = u['utm_medium'] || '(not set)';
              if (d && d >= p.start && d <= p.end) {
                  if (isValid) { if (!all[m]) all[m] = {}; if (!all[m][`p${i}`]) all[m][`p${i}`] = 0; all[m][`p${i}`]++; }
                  if (isGoogle) { if (!google[m]) google[m] = {}; if (!google[m][`p${i}`]) google[m][`p${i}`] = 0; google[m][`p${i}`]++; }
                  if (!isGoogle) { if (!eff[m]) eff[m] = {}; if (!eff[m][`p${i}`]) eff[m][`p${i}`] = {t:0, v:0}; eff[m][`p${i}`].t++; if (isValid) eff[m][`p${i}`].v++; }
              }
          });
      });
      const fmt = (dict: any) => Object.keys(dict).map(k => { const row = dict[k]; return { key: k, p0: row.p0 || 0, p1: row.p1 || 0 }; }).sort((a,b) => b.p0 - a.p0).filter(r => r.p0 > 0 || r.p1 > 0);
      const effRows = Object.keys(eff).map(k => { const r = eff[k]; const calc = (o: any) => o && o.t > 0 ? (o.v/o.t)*100 : 0; return { key: k, p0: calc(r.p0), p1: calc(r.p1), vol: r.p0 ? r.p0.t : 0 }; }).sort((a,b) => b.p0 - a.p0).filter(r => r.vol > 0);
      return { all: fmt(all), google: fmt(google), eff: effRows };
  }, [processed, periods, rawUsers]);

  const entityMetrics = useMemo(() => {
      if (!processed || periods.length < 2) return null;
      const currentPeriod = periods[0];
      const prevPeriod = periods[1];
      const dates: Date[] = [];
      let currD = new Date(currentPeriod.start);
      while (currD <= currentPeriod.end) { dates.push(new Date(currD)); currD.setDate(currD.getDate() + 1); }
      const dateHeaders = dates.map(d => d.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'}));
      const aggregate = (keyField: string, isProfession = false) => {
          const data: Record<string, AggregatedRow> = {};
          rawUsers.forEach(u => {
              const d = parseDateBR(u['data_criacao_usuario (Data)']);
              const valRaw = u.value ? String(u.value).trim() : '';
              const isValid = valRaw === 'UserCadastroGoogle' || isUserValid(u);
              if (d && isValid) {
                  let key = u[keyField] || '(vazio)';
                  if (isProfession) { const match = TARGET_PROFESSIONS.find(t => t.toLowerCase() === key.trim().toLowerCase()); key = match || 'Outros'; }
                  if (!data[key]) data[key] = { name: key, total: 0, prev: 0, daily: dates.map(() => 0) };
                  if (d >= currentPeriod.start && d <= currentPeriod.end) { data[key].total++; const dayIdx = dates.findIndex(date => date.toDateString() === d.toDateString()); if (dayIdx >= 0) data[key].daily[dayIdx]++; }
                  if (d >= prevPeriod.start && d <= prevPeriod.end) { data[key].prev++; }
              }
          });
          const rows = Object.values(data).filter(r => r.total > 0 || r.prev > 0).sort((a, b) => b.total - a.total);
          
          const validRows = rows.filter(r => r.name !== '(vazio)' && r.name !== '-' && r.name.trim() !== '');

          const topVolume = validRows.length > 0 ? validRows[0] : null;
          const sortedByGrowth = [...validRows].sort((a, b) => (b.total - b.prev) - (a.total - a.prev));
          const topGrowth = sortedByGrowth.length > 0 && (sortedByGrowth[0].total - sortedByGrowth[0].prev) > 0 ? sortedByGrowth[0] : null;
          const sortedByDrop = [...validRows].sort((a, b) => (a.total - a.prev) - (b.total - b.prev));
          const topDrop = sortedByDrop.length > 0 && (sortedByDrop[0].total - sortedByDrop[0].prev) < 0 ? sortedByDrop[0] : null;
          
          const allDaily = rows.flatMap(r => r.daily);
          const maxDaily = Math.max(...allDaily, 1);
          return { rows, topVolume, topGrowth, topDrop, maxDaily };
      };
      return { dates: dateHeaders, profession: aggregate('profissao', true), campaign: aggregate('utm_campaign', false) };
  }, [processed, periods, rawUsers]);

  // --- Email Metrics ---
  const emailMetrics = useMemo(() => {
    if (!processed || rawEmails.length === 0 || periods.length < 2) return null;
    const cleanNum = (val: string | undefined) => { if (!val) return 0; let v = val.replace(/\s/g, ''); if (v.includes('.') && !v.includes(',')) v = v.replace(/\./g, ''); return parseInt(v) || 0; };
    const calcStats = (emails: any[]) => {
        let sent = 0, delivered = 0, weightOpen = 0, weightClick = 0, weightUnsub = 0;
        emails.forEach(e => {
            const s = cleanNum(getVal(e, ['Sent', 'Enviados'])); const d = cleanNum(getVal(e, ['Delivered', 'Entregues'])); sent += s; delivered += d;
            const openRateVal = parseRate(getVal(e, ['Trackable open rate', 'Open rate', 'Taxa de abertura'])); const ctorVal = parseRate(getVal(e, ['Click-to-Open rate', 'CTOR'])); const unsubVal = parseRate(getVal(e, ['Unsubscription rate', 'Taxa de descadastro']));
            weightOpen += d * (openRateVal / 100); weightClick += (d * (openRateVal / 100)) * (ctorVal / 100); weightUnsub += d * (unsubVal / 100);
        });
        return { sent, delivered, count: emails.length, openRate: delivered > 0 ? (weightOpen / delivered) * 100 : 0, ctor: weightOpen > 0 ? (weightClick / weightOpen) * 100 : 0, unsubRate: delivered > 0 ? (weightUnsub / delivered) * 100 : 0, unsubCount: Math.round(weightUnsub) };
    };
    const trendRows = [...periods].reverse().map(p => {
        const emailsInPeriod = rawEmails.filter(e => { const d = parseDateBrevo(getVal(e, ['Sending date', 'Data de envio', 'Data'])); return d && d >= p.start && d <= p.end; });
        return { label: p.label, stats: calcStats(emailsInPeriod) };
    });
    const curr = trendRows[trendRows.length - 1].stats; const prev = trendRows[trendRows.length - 2].stats;
    const currentP = periods[0];
    const actionsRows = rawEmails.filter(e => { const d = parseDateBrevo(getVal(e, ['Sending date', 'Data de envio', 'Data'])); return d && d >= currentP.start && d <= currentP.end; }).map(row => {
         const d = parseDateBrevo(getVal(row, ['Sending date', 'Data de envio', 'Data'])); const sent = cleanNum(getVal(row, ['Sent', 'Enviados'])); const delivered = cleanNum(getVal(row, ['Delivered', 'Entregues'])); const openRate = parseRate(getVal(row, ['Trackable open rate', 'Open rate', 'Taxa de abertura'])); const ctor = parseRate(getVal(row, ['Click-to-Open rate', 'CTOR'])); const unsubRate = parseRate(getVal(row, ['Unsubscription rate', 'Taxa de descadastro'])); const unsubs = Math.round(delivered * (unsubRate / 100));
         return { date: d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit'}) : '-', sortDate: d, name: getVal(row, ['Campaign Name', 'Nome da campanha', 'Nome']) || '-', subject: getVal(row, ['Subject', 'Assunto']) || '-', sent, delivered, openRate, ctor, unsubRate, unsubs };
    }).sort((a,b) => (a.sortDate?.getTime() || 0) - (b.sortDate?.getTime() || 0));
    return { scorecard: { campaigns: { curr: curr.count, prev: prev.count }, sent: { curr: curr.sent, prev: prev.sent }, openRate: { curr: curr.openRate, prev: prev.openRate }, ctor: { curr: curr.ctor, prev: prev.ctor }, unsub: { curr: curr.unsubCount, prev: prev.unsubCount, rate: curr.unsubRate } }, trendRows, actionsRows };
  }, [processed, periods, rawEmails]);

  // --- Conversion Logic ---
  const conversionData = useMemo(() => {
    if (!processed || periods.length === 0) return null;
    const currentP = periods[0]; const transMap: any = {}; rawTransactions.forEach(t => { const u = t.username; if(!transMap[u]) transMap[u]=[]; transMap[u].push(t); });
    const conversions: any[] = []; let totalRevenue = 0; let totalDays = 0;
    rawUsers.forEach(u => {
        const d = parseDateBR(u['data_criacao_usuario (Data)']);
        if (d && d >= currentP.start && d <= currentP.end) {
            const valRaw = u.value ? String(u.value).trim() : ''; const isValid = valRaw === 'UserCadastroGoogle' || isUserValid(u);
            if (isValid) {
                const txs = transMap[u.username];
                if (txs) {
                    txs.forEach((t: any) => {
                         const dt = parseDateBR(t['data_transacao (Data)']);
                         if (dt && dt >= currentP.start && dt <= currentP.end) {
                             const val = parseMoney(t.valor);
                             if (val > 0) { const diff = Math.floor((dt.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)); const days = diff < 0 ? 0 : diff; totalRevenue += val; totalDays += days; conversions.push({ plan: t.Plano, origin: u.utm_medium || 'Direto / Orgânico', value: val, days }); }
                         }
                    });
                }
            }
        }
    });
    const count = conversions.length; const avgTicket = count > 0 ? totalRevenue / count : 0; const avgDays = count > 0 ? totalDays / count : 0;
    const byPlan: any = {}; const byOrigin: any = {};
    conversions.forEach(c => { if (!byPlan[c.plan]) byPlan[c.plan] = { qty: 0, rev: 0 }; byPlan[c.plan].qty++; byPlan[c.plan].rev += c.value; if (!byOrigin[c.origin]) byOrigin[c.origin] = { qty: 0, rev: 0, plans: {} }; byOrigin[c.origin].qty++; byOrigin[c.origin].rev += c.value; if (!byOrigin[c.origin].plans[c.plan]) byOrigin[c.origin].plans[c.plan] = 0; byOrigin[c.origin].plans[c.plan]++; });
    const rowsPlan = Object.keys(byPlan).map(k => ({ plan: k, ...byPlan[k] })).sort((a,b) => b.rev - a.rev);
    const rowsOrigin = Object.keys(byOrigin).map(k => { const item = byOrigin[k]; const mix = Object.keys(item.plans).sort((a,b) => item.plans[b] - item.plans[a]).map(p => `${p} (${item.plans[p]})`).join(', '); return { origin: k, qty: item.qty, rev: item.rev, mix }; }).sort((a,b) => b.rev - a.rev);
    return { count, totalRevenue, avgTicket, avgDays, rowsPlan, rowsOrigin };
  }, [processed, periods, rawUsers, rawTransactions]);

  const cohortDashData = useMemo(() => {
    if (!processed || periods.length === 0) return { history: [], speed: [] };
    const transMap: Record<string, any[]> = {}; rawTransactions.forEach(t => { if(!transMap[t.username]) transMap[t.username] = []; transMap[t.username].push(t); });
    const processedPeriods = periods.map(p => {
        let count0to7 = 0; let count0to30 = 0; let countTotal = 0; const dailySpeed = new Array(31).fill(0);
        const cohortUsers = rawUsers.filter(u => { const d = parseDateBR(u['data_criacao_usuario (Data)']); return d && d >= p.start && d <= p.end; });
        cohortUsers.forEach(u => {
            const createdDate = parseDateBR(u['data_criacao_usuario (Data)']); const valRaw = u.value ? String(u.value).trim() : ''; const isValid = valRaw === 'UserCadastroGoogle' || isUserValid(u);
            if (isValid && createdDate) {
                const txs = transMap[u.username];
                if (txs && txs.length > 0) {
                    const sortedTxs = [...txs].sort((a, b) => { const da = parseDateBR(a['data_transacao (Data)']); const db = parseDateBR(b['data_transacao (Data)']); return (da?.getTime() || 0) - (db?.getTime() || 0); });
                    const firstConversion = sortedTxs.find(t => { const saleDate = parseDateBR(t['data_transacao (Data)']); const val = parseMoney(t.valor); return saleDate && val > 0 && saleDate >= createdDate; });
                    if (firstConversion) { const saleDate = parseDateBR(firstConversion['data_transacao (Data)']); if (saleDate) { const diffTime = saleDate.getTime() - createdDate.getTime(); const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); if (diffDays >= 0) { countTotal++; if (diffDays <= 7) count0to7++; if (diffDays <= 30) count0to30++; if (diffDays <= 30) { dailySpeed[diffDays]++; } } } }
                }
            }
        });
        const leadVolume = cohortUsers.length || 1; return { label: p.label, leadVolume, conversions: countTotal, perc7: (count0to7 / leadVolume) * 100, perc30: (count0to30 / leadVolume) * 100, dailySpeed };
    });
    return { history: processedPeriods.map(d => ({ label: d.label, perc7: d.perc7, perc30: d.perc30 })), speed: processedPeriods };
  }, [processed, periods, rawUsers, rawTransactions]);

  const maxCohortVal = useMemo(() => { if (!cohortDashData.speed.length) return 1; const allValues = cohortDashData.speed.flatMap(r => r.dailySpeed); return Math.max(...allValues, 1); }, [cohortDashData]);

  // ==========================================
  // LOGIC: SCORING (FINAL BLOCK - FIXED)
  // ==========================================

  const scoringMetrics = useMemo(() => {
      if (!processed || rawScoring.length === 0 || scoringPeriods.length < 2) return null;

      const transMap: Record<string, Date> = {};
      rawTransactions.forEach(t => { const email = (t.username || '').toLowerCase().trim(); const dStr = t['data_transacao (Data)']; const date = parseDateBR(dStr); if (email && date) { if (!transMap[email] || date < transMap[email]) { transMap[email] = date; } } });

      const currentP = scoringPeriods[0];
      const prevP = scoringPeriods[1];

      const calcStats = (p: any) => {
          const scores: number[] = [];
          const planData: Record<string, { scores: number[], daysSum: number, countDays: number, vol: number }> = {};
          const originData: Record<string, { scores: number[], vol: number }> = {};
          const profData: Record<string, { scores: number[], vol: number }> = {};
          
          let totalQualified = 0; let totalCount = 0;
          const bucketCounts = [0, 0, 0, 0, 0, 0]; 

          rawScoring.forEach(row => {
              const email = (row.EMAIL || row.Email || row['Email Address'] || '').toLowerCase().trim();
              
              let dStr = row.DATA_CRIACAO_CONTA; if (!dStr && row['data_criacao_usuario (Data)']) dStr = row['data_criacao_usuario (Data)'];
              const d = parseDateBR(dStr);
              const s = parseFloat(row.SCORE ? String(row.SCORE).replace(',', '.') : '0');

              if (d && !isNaN(s) && d >= p.start && d <= p.end) {
                  totalCount++; scores.push(s); if (s >= 50) totalQualified++;
                  if (s < 0) bucketCounts[0]++; else if (s < 25) bucketCounts[1]++; else if (s < 50) bucketCounts[2]++; else if (s < 75) bucketCounts[3]++; else if (s < 100) bucketCounts[4]++; else bucketCounts[5]++;

                  const planName = (row.PLANO_DETALHE || 'Não Identificado').trim();
                  if (!planData[planName]) planData[planName] = { scores: [], daysSum: 0, countDays: 0, vol: 0 };
                  planData[planName].scores.push(s);
                  planData[planName].vol++;

                  if (transMap[email]) { const tDate = transMap[email]; if (tDate >= d) { const diffTime = tDate.getTime() - d.getTime(); const days = Math.floor(diffTime / (1000 * 60 * 60 * 24)); planData[planName].daysSum += days; planData[planName].countDays++; } }

                  const src = getVal(row, ['PRIMEIRA_UTM_SOURCE', 'source', 'Source']) || '(direto)'; const med = getVal(row, ['PRIMEIRA_UTM_MEDIUM', 'medium', 'Medium']) || '(none)'; const originKey = `${src} / ${med}`.toLowerCase();
                  if (!originData[originKey]) originData[originKey] = { scores: [], vol: 0 }; originData[originKey].scores.push(s); originData[originKey].vol++;

                  let prof = getVal(row, ['PROFISSAO', 'Profissao', 'Job', 'profissao']);
                  if (!prof || prof === 'Não Informado' || prof.trim() === '') { prof = 'Profissão customizada'; } else { prof = prof.trim(); const match = TARGET_PROFESSIONS.find(t => t.toLowerCase() === prof.toLowerCase()); if (match) prof = match; else prof = prof.charAt(0).toUpperCase() + prof.slice(1).toLowerCase(); }
                  if (!profData[prof]) profData[prof] = { scores: [], vol: 0 }; profData[prof].scores.push(s); profData[prof].vol++;
              }
          });
          return { scores, totalCount, totalQualified, bucketCounts, planData, originData, profData };
      };

      const curr = calcStats(currentP);
      const prev = calcStats(prevP);
      const statsCurr = calculateMeanMedian(curr.scores);
      const statsPrev = calculateMeanMedian(prev.scores);

      const bucketLabels = ['Negativo (< 0)', '0 a 24', '25 a 49', '50 a 74', '75 a 99', '100 ou mais'];
      const bucketColors = [ { text: 'text-red-500', bar: 'bg-red-500' }, { text: 'text-gray-500', bar: 'bg-gray-400' }, { text: 'text-gray-500', bar: 'bg-gray-400' }, { text: 'text-blue-600', bar: 'bg-blue-500' }, { text: 'text-indigo-600', bar: 'bg-indigo-500' }, { text: 'text-green-600', bar: 'bg-green-500' }, ];
      const distribution = bucketLabels.map((label, i) => ({ label, curr: curr.bucketCounts[i], currPerc: curr.totalCount > 0 ? (curr.bucketCounts[i] / curr.totalCount) * 100 : 0, prevPerc: prev.totalCount > 0 ? (prev.bucketCounts[i] / prev.totalCount) * 100 : 0, ...bucketColors[i] }));

      const allPlans = new Set([...Object.keys(curr.planData), ...Object.keys(prev.planData)]);
      const planRows = Array.from(allPlans).map(plan => {
          const cData = curr.planData[plan]; const pData = prev.planData[plan];
          const meanCurr = cData ? calculateMeanMedian(cData.scores).mean : "0.00"; const meanPrev = pData ? calculateMeanMedian(pData.scores).mean : "0.00";
          const avgDays = cData && cData.countDays > 0 ? cData.daysSum / cData.countDays : null;
          return { plan, vol: cData ? cData.vol : 0, meanCurr: parseFloat(meanCurr), meanPrev: parseFloat(meanPrev), avgDays };
      }).filter(r => { const p = r.plan.toLowerCase(); if (p.includes('gratuito')) return false; if (p.includes('trial')) return false; if (p.includes('engehall_curso')) return false; return r.vol > 0 || r.meanPrev > 0; }).sort((a, b) => b.meanCurr - a.meanCurr);

      const allOrigins = new Set([...Object.keys(curr.originData), ...Object.keys(prev.originData)]);
      const originRows = Array.from(allOrigins).map(origin => { const cData = curr.originData[origin]; const pData = prev.originData[origin]; const meanCurr = cData ? calculateMeanMedian(cData.scores).mean : "0.00"; const meanPrev = pData ? calculateMeanMedian(pData.scores).mean : "0.00"; return { origin, vol: cData ? cData.vol : 0, meanCurr: parseFloat(meanCurr), meanPrev: parseFloat(meanPrev) }; }).filter(r => r.vol > 0).sort((a, b) => b.meanCurr - a.meanCurr);

      const allProfs = new Set([...Object.keys(curr.profData), ...Object.keys(prev.profData)]);
      const profRows = Array.from(allProfs).map(prof => { const cData = curr.profData[prof]; const pData = prev.profData[prof]; const meanCurr = cData ? calculateMeanMedian(cData.scores).mean : "0.00"; const meanPrev = pData ? calculateMeanMedian(pData.scores).mean : "0.00"; return { prof, vol: cData ? cData.vol : 0, meanCurr: parseFloat(meanCurr), meanPrev: parseFloat(meanPrev) }; }).filter(r => r.vol > 0).sort((a, b) => b.meanCurr - a.meanCurr);

      return { currentLabel: currentP.label, prevLabel: prevP.label, mean: { curr: parseFloat(statsCurr.mean), prev: parseFloat(statsPrev.mean) }, median: { curr: statsCurr.median, prev: statsPrev.median }, qualifiedRate: { curr: curr.totalCount > 0 ? (curr.totalQualified / curr.totalCount) * 100 : 0, prev: prev.totalCount > 0 ? (prev.totalQualified / prev.totalCount) * 100 : 0 }, distribution, planRows, originRows, profRows };
  }, [processed, scoringPeriods, rawScoring, rawTransactions, rawUsers]);


  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      
      {/* --- INPUT SECTION --- */}
      {!processed && (
          <GlassPanel className="p-8 mb-10 border-l-4 border-woca-orange">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                  <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                      <LayoutDashboard className="text-woca-orange" size={24} /> 
                      Central de Dados ({reportMode === 'weekly' ? 'Semanal' : 'Mensal'})
                  </h2>
                  <div className="flex items-center gap-4 mt-4 md:mt-0 bg-gray-100 dark:bg-white/5 rounded-lg p-2">
                      <label className="text-sm font-medium opacity-70 text-gray-900 dark:text-white">
                        {reportMode === 'weekly' ? 'Início (Domingo):' : 'Mês de Referência:'}
                      </label>
                      {reportMode === 'weekly' ? (
                        <input 
                            type="date" value={dateAcq} onChange={e => setDateAcq(e.target.value)}
                            className="bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-lg p-2 text-sm text-gray-900 dark:text-white" 
                        />
                      ) : (
                        <input 
                            type="month" value={monthDash} onChange={e => setMonthDash(e.target.value)}
                            className="bg-white dark:bg-black/30 border border-gray-300 dark:border-white/10 rounded-lg p-2 text-sm text-gray-900 dark:text-white" 
                        />
                      )}
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                   {[
                       { l: 'Transações', fn: setRawTransactions, st: rawTransactions.length },
                       { l: 'Usuários', fn: setRawUsers, st: rawUsers.length },
                       { l: 'E-mails (Brevo)', fn: setRawEmails, st: rawEmails.length },
                       { l: 'Scoring', fn: setRawScoring, st: rawScoring.length },
                   ].map((item, i) => (
                       <div key={i}>
                           <label className="text-xs uppercase opacity-50 block mb-1 text-gray-900 dark:text-white">{item.l}</label>
                           <input 
                              type="file" accept=".csv" 
                              onChange={e => item.fn(e.target.files)}
                              className="block w-full text-xs text-gray-500 file:mr-2 file:py-1 file:px-2 file:rounded-sm file:border-0 file:text-[10px] file:bg-gray-200 dark:file:bg-white/10 p-2 rounded bg-gray-100 dark:bg-black/30 border border-gray-300 dark:border-white/10"
                           />
                           <p className="text-[10px] mt-1 opacity-50 text-gray-500">{item.st > 0 ? 'OK' : '--'}</p>
                       </div>
                   ))}
              </div>

              <button 
                  onClick={processData}
                  className="w-full bg-woca-orange hover:bg-orange-600 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 text-sm uppercase tracking-wider transition-all"
              >
                  <Sparkles size={16} /> Gerar Dashboard Completo
              </button>
          </GlassPanel>
      )}

      {processed && (
          <div className="flex flex-col gap-12">
              
              {/* === BLOCK 1: AQUISIÇÃO === */}
              {weeklyScorecardData && (
                <div>
                   <div className="mb-6 flex items-center gap-2">
                      <span className="bg-woca-orange w-1 h-6 rounded-full"></span>
                      <h3 className="text-2xl font-bold uppercase tracking-wide text-gray-900 dark:text-white">Aquisição de Leads</h3>
                   </div>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                       <WeeklyScorecard 
                          title="Total de Cadastros"
                          value={weeklyScorecardData.total}
                          icon={<UserPlus />}
                          color="blue"
                       />
                       <WeeklyScorecard 
                          title="Total Validado"
                          value={weeklyScorecardData.valid}
                          subValue={<span className="text-gray-500 dark:text-gray-400">({weeklyScorecardData.validRate.toFixed(1)}%)</span>}
                          icon={<ShieldCheck />}
                          color="green"
                       />
                       <WeeklyScorecard 
                          title="Variação"
                          value={`${weeklyScorecardData.varValid >= 0 ? '+' : ''}${weeklyScorecardData.varValid.toFixed(1)}%`}
                          subValue={<span className="text-gray-500 dark:text-gray-400 font-normal">em validações</span>}
                          icon={<TrendingUp />}
                          color="orange"
                       />
                   </div>
                   <div className="mb-8">
                       <Table id="wk_status" title={<><Layers size={20} className="text-purple-500"/> Status de Validação e Origem</>} headers={['Período', 'Via Google', 'Via Form (Ok)', '% Validação (Form)', '% Validação (Total)', 'Via Form (Reprov.)', 'Volume Total']}>
                           {validadosData.map((row, i) => (
                               <tr key={i} className="border-b border-gray-200 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                   <td className="p-5 text-base font-semibold capitalize text-gray-900 dark:text-white">{row.label}</td>
                                   <td className="p-5 text-center"><div className="text-lg font-bold text-blue-500">{row.google}</div></td>
                                   <td className="p-5 text-center"><div className="text-lg font-bold text-green-500">{row.formValid}</div></td>
                                   <td className="p-5 text-center"><div className={`text-base font-bold px-2 py-1 rounded w-fit mx-auto ${row.formRate >= 50 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>{row.formRate.toFixed(1)}%</div></td>
                                   <td className="p-5 text-center"><div className="text-base font-bold text-blue-500">{row.totalRate.toFixed(1)}%</div></td>
                                   <td className="p-5 text-center"><div className="text-base text-red-400 font-medium">{row.formInvalid}</div></td>
                                   <td className="p-5 text-center"><span className="text-2xl font-bold text-gray-900 dark:text-white">{row.total}</span></td>
                               </tr>
                           ))}
                       </Table>
                   </div>
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                       <Table id="wk_med_val" title={<><TrendingUp size={20} className="text-woca-orange"/> Aquisição (Validados + Google)</>} headers={['Medium', 'Anterior', 'Atual', 'Evolução']}>
                           {mediumTableData.all.map((r, i) => {
                               const maxVal = Math.max(...mediumTableData.all.map((d: any) => d.p0));
                               return (
                                   <tr key={i} className="border-b border-gray-200 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                       <td className="p-4 text-base font-medium text-gray-900 dark:text-white">{r.key}</td>
                                       <td className="p-4 text-base text-gray-500 text-center">{r.p1}</td>
                                       <td className="p-4 w-[35%] text-center"><div className="flex flex-col justify-center items-center"><span className="text-lg font-bold text-gray-900 dark:text-white">{r.p0}</span><ProgressBar value={r.p0} max={maxVal} colorClass="bg-woca-orange" /></div></td>
                                       <td className="p-4 text-center"><Trend current={r.p0} prev={r.p1} /></td>
                                   </tr>
                               );
                           })}
                       </Table>
                       <Table id="wk_med_goo" title={<><Globe size={20} className="text-blue-500"/> Aquisição Google (Por Medium)</>} headers={['Medium', 'Anterior', 'Atual', 'Evolução']}>
                           {mediumTableData.google.map((r, i) => {
                               const maxVal = Math.max(...mediumTableData.google.map((d: any) => d.p0));
                               return (
                                   <tr key={i} className="border-b border-gray-200 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                       <td className="p-4 text-base font-medium text-gray-900 dark:text-white">{r.key}</td>
                                       <td className="p-4 text-base text-gray-500 text-center">{r.p1}</td>
                                       <td className="p-4 w-[35%] text-center"><div className="flex flex-col justify-center items-center"><span className="text-lg font-bold text-gray-900 dark:text-white">{r.p0}</span><ProgressBar value={r.p0} max={maxVal} colorClass="bg-blue-500" /></div></td>
                                       <td className="p-4 text-center"><Trend current={r.p0} prev={r.p1} /></td>
                                   </tr>
                               );
                           })}
                       </Table>
                   </div>
                   {entityMetrics && (
                       <div className="flex flex-col gap-12 mb-8">
                           <div>
                               <div className="flex items-center gap-2 mb-6"><Briefcase className="text-woca-orange" size={24} /><h3 className="text-xl font-bold text-gray-900 dark:text-white">Performance por Profissão</h3></div>
                               
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                   <WeeklyScorecard title="Mais Leads" value={entityMetrics.profession.topVolume?.name || '-'} icon={<Trophy />} color="blue" />
                                   <WeeklyScorecard title="Maior Aumento" value={entityMetrics.profession.topGrowth?.name || '-'} icon={<TrendingUp />} color="green" />
                                   <WeeklyScorecard title="Maior Queda" value={entityMetrics.profession.topDrop?.name || '-'} icon={<TrendingDown />} color="red" />
                               </div>

                               <Table id="wk_prof_heatmap" title={<><Briefcase size={20} className="text-woca-orange"/> Detalhamento Diário (Profissão)</>} headers={['Profissão', ...entityMetrics.dates, 'Anterior', 'Atual', 'Var']}>
                                   {entityMetrics.profession.rows.map((row: any, i: number) => {
                                       const maxVal = entityMetrics.profession.maxDaily;
                                       return (
                                           <tr key={i} className="border-b border-gray-200 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                               <td className="p-4 font-semibold text-gray-900 dark:text-white">{row.name}</td>
                                               {row.daily.map((val: number, j: number) => {
                                                   const ratio = maxVal > 0 ? val / maxVal : 0;
                                                   const bgStyle = val > 0 ? `rgba(255, 136, 0, ${ratio})` : 'transparent';
                                                   const textColorClass = ratio > 0.5 ? 'text-white font-bold shadow-sm' : 'text-gray-900 dark:text-white/60';
                                                   return <td key={j} className={`text-center border-l border-gray-200 dark:border-white/5 text-sm min-w-[44px] ${textColorClass}`} style={{ backgroundColor: bgStyle }}>{val || '-'}</td>
                                               })}
                                               <td className="p-4 text-gray-500 text-center font-medium border-l border-gray-200 dark:border-white/10">{row.prev}</td>
                                               <td className="p-4 font-bold text-center text-lg">{row.total}</td>
                                               <td className="p-4 text-center"><Trend current={row.total} prev={row.prev} /></td>
                                           </tr>
                                       );
                                   })}
                               </Table>
                           </div>
                           <div>
                               <div className="flex items-center gap-2 mb-6"><Megaphone className="text-purple-500" size={24} /><h3 className="text-xl font-bold text-gray-900 dark:text-white">Performance por Campanha</h3></div>
                               
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                                   <WeeklyScorecard title="Campanha Top" value={entityMetrics.campaign.topVolume?.name || '-'} icon={<Crown />} color="purple" />
                                   <WeeklyScorecard title="Maior Aumento" value={entityMetrics.campaign.topGrowth?.name || '-'} icon={<TrendingUp />} color="green" />
                                   <WeeklyScorecard title="Maior Queda" value={entityMetrics.campaign.topDrop?.name || '-'} icon={<TrendingDown />} color="red" />
                               </div>

                               <Table id="wk_camp_heatmap" title={<><Megaphone size={20} className="text-purple-500"/> Detalhamento Diário (Campanhas)</>} headers={['Campanha', ...entityMetrics.dates, 'Anterior', 'Atual', 'Var']}>
                                   {entityMetrics.campaign.rows.map((row: any, i: number) => {
                                       const maxVal = entityMetrics.campaign.maxDaily;
                                       return (
                                           <tr key={i} className="border-b border-gray-200 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                               <td className="p-4 font-semibold text-gray-900 dark:text-white max-w-[200px] truncate" title={row.name}>{row.name}</td>
                                               {row.daily.map((val: number, j: number) => {
                                                   const ratio = maxVal > 0 ? val / maxVal : 0;
                                                   const bgStyle = val > 0 ? `rgba(168, 85, 247, ${ratio})` : 'transparent'; 
                                                   const textColorClass = ratio > 0.5 ? 'text-white font-bold shadow-sm' : 'text-gray-900 dark:text-white/60';
                                                   return <td key={j} className={`text-center border-l border-gray-200 dark:border-white/5 text-sm min-w-[44px] ${textColorClass}`} style={{ backgroundColor: bgStyle }}>{val || '-'}</td>
                                               })}
                                               <td className="p-4 text-gray-500 text-center font-medium border-l border-gray-200 dark:border-white/10">{row.prev}</td>
                                               <td className="p-4 font-bold text-center text-lg">{row.total}</td>
                                               <td className="p-4 text-center"><Trend current={row.total} prev={row.prev} /></td>
                                           </tr>
                                       );
                                   })}
                               </Table>
                           </div>
                       </div>
                   )}
                </div>
              )}

              {/* === BLOCK 2: CONVERSION & REVENUE === */}
              {conversionData && (
                 <div>
                    <div className="mb-6 flex items-center gap-2">
                        <span className="bg-green-500 w-1 h-6 rounded-full"></span>
                        <h3 className="text-2xl font-bold uppercase tracking-wide text-gray-900 dark:text-white">Conversão e Receita (Safra)</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                         <WeeklyScorecard title="Conversões na Safra" value={conversionData.count} icon={<ShoppingCart />} color="blue" />
                         <WeeklyScorecard title="Receita da Safra" value={formatMoney(conversionData.totalRevenue)} icon={<DollarSign />} color="green" />
                         <WeeklyScorecard title="Ticket Médio" value={formatMoney(conversionData.avgTicket)} icon={<Wallet />} color="orange" />
                         <WeeklyScorecard title="Tempo Médio (Conversão)" value={`${conversionData.avgDays.toFixed(1)} dias`} icon={<Timer />} color="cyan" />
                    </div>
                    <div className="flex flex-col gap-8 mb-8">
                        <Table id="wk_perf_plan" title={<><CreditCard size={20} className="text-purple-500"/> Performance por Plano</>} headers={['Plano', 'Conversões', 'Receita Total', 'Ticket Médio']}>
                            {conversionData.rowsPlan.map((r, i) => {
                                const maxRev = Math.max(...conversionData.rowsPlan.map(d => d.rev));
                                return (
                                    <tr key={i} className="border-b border-gray-200 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-base font-medium text-gray-900 dark:text-white">{r.plan}</td>
                                        <td className="p-4 text-base font-bold text-center">{r.qty}</td>
                                        <td className="p-4 w-[40%] text-center"><div className="flex flex-col justify-center items-center"><span className="text-lg font-bold text-green-600 dark:text-green-400">{formatMoney(r.rev)}</span><ProgressBar value={r.rev} max={maxRev} colorClass="bg-green-500" /></div></td>
                                        <td className="p-4 text-base text-gray-500 text-center">{formatMoney(r.rev / r.qty)}</td>
                                    </tr>
                                );
                            })}
                        </Table>
                        <Table id="wk_cohort_speed" title={<><Timer size={20} className="text-cyan-400"/> Velocidade de Conversão (Cohort 30 Dias - Heatmap)</>} headers={['Período', ...Array.from({length: 31}, (_, i) => i.toString())]} onDownloadImage={true}>
                             {cohortDashData.speed.map((row, i) => (
                                <tr key={i} className="border-b border-gray-200 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                    <td className="p-4 whitespace-nowrap text-xs font-semibold uppercase text-gray-900 dark:text-white">{row.label}</td>
                                    {row.dailySpeed.map((val: number, j: number) => {
                                        const ratio = maxCohortVal > 0 ? val / maxCohortVal : 0;
                                        const bgStyle = val > 0 ? `rgba(255, 136, 0, ${ratio})` : 'transparent';
                                        const textColorClass = ratio > 0.5 ? 'text-white font-bold shadow-sm' : 'text-gray-900 dark:text-white/60';
                                        return <td key={j} className={`text-center border-l border-gray-200 dark:border-white/5 text-sm min-w-[44px] ${textColorClass}`} style={{ backgroundColor: bgStyle }}>{val || '-'}</td>
                                    })}
                                </tr>
                             ))}
                        </Table>
                    </div>
                 </div>
              )}

              {/* === BLOCK 3: EMAIL MARKETING === */}
              {emailMetrics && (
                  <div>
                      <div className="mb-6 flex items-center gap-2">
                          <span className="bg-blue-500 w-1 h-6 rounded-full"></span>
                          <h3 className="text-2xl font-bold uppercase tracking-wide text-gray-900 dark:text-white">Campanhas de E-mail</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                          <WeeklyScorecard title="Campanhas Enviadas" value={emailMetrics.scorecard.campaigns.curr} subValue={<Trend current={emailMetrics.scorecard.campaigns.curr} prev={emailMetrics.scorecard.campaigns.prev} />} icon={<Send />} color="blue" />
                          <WeeklyScorecard title="E-mails Enviados" value={emailMetrics.scorecard.sent.curr.toLocaleString('pt-BR')} subValue={<Trend current={emailMetrics.scorecard.sent.curr} prev={emailMetrics.scorecard.sent.prev} />} icon={<Mail />} color="purple" />
                          <WeeklyScorecard title="Taxa de Abertura" value={`${emailMetrics.scorecard.openRate.curr.toFixed(2)}%`} subValue={<Trend current={emailMetrics.scorecard.openRate.curr} prev={emailMetrics.scorecard.openRate.prev} />} icon={<Eye />} color="green" />
                          <WeeklyScorecard title="CTOR" value={`${emailMetrics.scorecard.ctor.curr.toFixed(2)}%`} subValue={<Trend current={emailMetrics.scorecard.ctor.curr} prev={emailMetrics.scorecard.ctor.prev} />} icon={<MousePointer2 />} color="orange" />
                           <WeeklyScorecard title="Descadastrados" value={emailMetrics.scorecard.unsub.curr} subValue={<span className="text-gray-500">{emailMetrics.scorecard.unsub.rate.toFixed(2)}% taxa</span>} icon={<XCircle />} color="red" />
                      </div>
                      <div className="flex flex-col gap-8 mb-8">
                          <Table id="wk_email_actions" title={<><ListFilter size={20} className="text-woca-orange"/> Ações de E-mail (Detalhado)</>} headers={['Data', 'Nome da Campanha', 'Assunto', 'Enviados', 'Entregues', 'Taxa de Abertura', 'CTOR', 'Descadastrados']}>
                              {emailMetrics.actionsRows.map((row, i) => {
                                  const delRate = row.sent ? (row.delivered / row.sent) * 100 : 0;
                                  return (
                                      <tr key={i} className="border-b border-gray-200 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                          <td className="p-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">{row.date}</td>
                                          <td className="p-4 text-sm font-medium max-w-[200px] truncate" title={row.name}>{row.name}</td>
                                          <td className="p-4 text-sm text-gray-500 dark:text-gray-400 italic max-w-[250px] truncate" title={row.subject}>{row.subject}</td>
                                          <td className="p-4 text-center text-base font-bold text-gray-900 dark:text-white">{row.sent.toLocaleString('pt-BR')}</td>
                                          <td className="p-4 text-center"><div className="flex flex-col items-center"><span className="font-bold text-base text-gray-900 dark:text-white">{delRate.toFixed(2)}%</span><span className="text-xs text-gray-500">({row.delivered.toLocaleString('pt-BR')})</span></div></td>
                                          <td className="p-4 w-[15%] text-center"><div className="flex flex-col items-center"><span className="font-bold text-base text-gray-900 dark:text-white">{row.openRate.toFixed(2)}%</span><ProgressBar value={row.openRate} max={50} colorClass="bg-green-500" /></div></td>
                                          <td className="p-4 w-[15%] text-center"><div className="flex flex-col items-center"><span className="font-bold text-base text-gray-900 dark:text-white">{row.ctor.toFixed(2)}%</span><ProgressBar value={row.ctor} max={20} colorClass="bg-woca-orange" /></div></td>
                                          <td className="p-4 text-center"><div className="flex flex-col items-center"><span className="font-bold text-base text-red-500">{row.unsubRate.toFixed(2)}%</span><span className="text-xs text-gray-500">({row.unsubs.toLocaleString('pt-BR')})</span></div></td>
                                      </tr>
                                  );
                              })}
                          </Table>
                      </div>
                  </div>
              )}

              {/* === BLOCK 4: LEAD SCORING === */}
              {scoringMetrics && (
                  <div>
                      <div className="mb-6 flex items-center gap-2">
                          <span className="bg-woca-orange w-1 h-6 rounded-full"></span>
                          <h3 className="text-2xl font-bold uppercase tracking-wide text-gray-900 dark:text-white">Qualidade de Leads (Scoring)</h3>
                      </div>

                      <GlassPanel className="p-4 mb-8 bg-woca-orange/5 border-l-4 border-woca-orange text-sm flex items-start gap-3">
                           <Info className="text-woca-orange min-w-[20px]" size={20} />
                           <div>
                               <p className="font-bold text-woca-orange uppercase mb-1">Análise de Safra Fechada (Maturação de 15 Dias)</p>
                               <p className="text-gray-600 dark:text-gray-300">
                                   Exibindo dados de leads criados entre <strong>{scoringMetrics.currentLabel}</strong> (Safra Atual Madura) comparados com <strong>{scoringMetrics.prevLabel}</strong>.
                               </p>
                           </div>
                      </GlassPanel>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                           <WeeklyScorecard title="Score Médio (Safra Madura)" value={scoringMetrics.mean.curr.toFixed(2)} subValue={<Trend current={scoringMetrics.mean.curr} prev={scoringMetrics.mean.prev} />} icon={<Target />} color="blue" />
                           <WeeklyScorecard title="Mediana de Score (Safra Madura)" value={scoringMetrics.median.curr.toFixed(2)} subValue={<Trend current={scoringMetrics.median.curr} prev={scoringMetrics.median.prev} />} icon={<Crosshair />} color="purple" />
                           <WeeklyScorecard title="Leads Qualificados (>50)" value={`${scoringMetrics.qualifiedRate.curr.toFixed(1)}%`} subValue={<Trend current={scoringMetrics.qualifiedRate.curr} prev={scoringMetrics.qualifiedRate.prev} />} icon={<Award />} color="green" />
                      </div>

                      <div className="flex flex-col gap-8">
                        {/* 1. Planos + Distribuição */}
                        <div className="flex flex-col lg:flex-row gap-8">
                            <div className="flex-1">
                                <Table id="wk_score_plan" title={<><CreditCard size={20} className="text-purple-500"/> Ranking por Plano (Pagos)</>} headers={['Plano', 'Vol.', 'Score Médio', 'Tempo Médio']}>
                                    {scoringMetrics.planRows.map((row, i) => (
                                        <tr key={i} className="border-b border-gray-200 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                            <td className="p-4 font-semibold text-gray-900 dark:text-white text-sm">{row.plan}</td>
                                            <td className="p-4 text-center font-bold text-gray-900 dark:text-white">{row.vol}</td>
                                            <td className="p-4 text-center font-bold text-lg text-gray-900 dark:text-white">{row.meanCurr.toFixed(2)}</td>
                                            <td className="p-4 text-center">{row.avgDays !== null ? <span className="flex items-center justify-center gap-1 text-cyan-600 dark:text-cyan-400 font-bold bg-cyan-50 dark:bg-cyan-900/20 px-2 py-1 rounded text-xs"><Timer size={12} /> {row.avgDays.toFixed(1)} dias</span> : <span className="text-gray-400 text-xs italic opacity-50">-</span>}</td>
                                        </tr>
                                    ))}
                                </Table>
                            </div>
                            <div className="flex-1">
                                <Table id="wk_score_dist" title={<><BarChart2 size={20} className="text-indigo-500"/> Distribuição de Score (Qualidade)</>} headers={['Faixa de Score', 'Safra Atual (%)', 'Evolução (% Vol)']}>
                                    {scoringMetrics.distribution.map((row, i) => {
                                        const diff = row.currPerc - row.prevPerc;
                                        return (
                                            <tr key={i} className="border-b border-gray-200 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                                <td className={`p-4 font-semibold text-base ${row.text}`}>{row.label}<span className="text-xs text-gray-400 ml-2 font-normal">({row.curr} leads)</span></td>
                                                <td className="p-4 w-[40%] text-center"><div className="flex flex-col justify-center"><div className="flex justify-between items-end mb-1 px-1"><span className={`font-bold ${row.text}`}>{row.currPerc.toFixed(1)}%</span></div><div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${row.bar}`} style={{ width: `${row.currPerc}%` }}></div></div></div></td>
                                                <td className="p-4 text-center"><span className={diff > 0 ? 'text-green-500 font-bold' : (diff < 0 ? 'text-red-500 font-bold' : 'text-gray-400')}>{diff > 0 ? '+' : ''}{diff.toFixed(1)}pp</span></td>
                                            </tr>
                                        );
                                    })}
                                </Table>
                            </div>
                        </div>

                        {/* 2. Origem */}
                        <div className="w-full">
                            <Table id="wk_score_origin" title={<><Globe size={20} className="text-blue-500"/> Ranking por Origem/Mídia</>} headers={['Origem', 'Score Médio', 'Var. Score', 'Vol. (Atual)']}>
                                {scoringMetrics.originRows.map((row, i) => {
                                    const diff = row.meanCurr - row.meanPrev;
                                    const isPos = diff >= 0;
                                    return (
                                        <tr key={i} className="border-b border-gray-200 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                            <td className="p-4 font-medium text-gray-900 dark:text-white text-sm max-w-[250px] truncate capitalize" title={row.origin}>{row.origin}</td>
                                            <td className="p-4 text-center font-bold text-lg text-gray-900 dark:text-white">{row.meanCurr.toFixed(2)}</td>
                                            <td className={`p-4 text-center text-xs font-bold ${isPos ? 'text-green-500' : 'text-red-500'}`}>{row.meanPrev > 0 ? <span className="flex items-center justify-center gap-1">{isPos ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{diff > 0 ? '+' : ''}{diff.toFixed(1)}</span> : <span className="text-gray-400">-</span>}</td>
                                            <td className="p-4 text-center font-bold text-woca-orange">{row.vol}</td>
                                        </tr>
                                    );
                                })}
                            </Table>
                        </div>

                        {/* 3. Profissões */}
                        <div className="w-full">
                            <Table id="wk_score_prof" title={<><Briefcase size={20} className="text-woca-orange"/> Ranking por Profissão (Qualidade)</>} headers={['Profissão', 'Score Médio', 'Var. Score', 'Vol. (Atual)']}>
                                {scoringMetrics.profRows.map((row, i) => {
                                    const diff = row.meanCurr - row.meanPrev;
                                    const isPos = diff >= 0;
                                    return (
                                        <tr key={i} className="border-b border-gray-200 dark:border-white/5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                            <td className="p-4 font-medium text-gray-900 dark:text-white text-sm max-w-[250px] truncate" title={row.prof}>{row.prof}</td>
                                            <td className="p-4 text-center font-bold text-lg text-gray-900 dark:text-white">{row.meanCurr.toFixed(2)}</td>
                                            <td className={`p-4 text-center text-xs font-bold ${isPos ? 'text-green-500' : 'text-red-500'}`}>{row.meanPrev > 0 ? <span className="flex items-center justify-center gap-1">{isPos ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{diff > 0 ? '+' : ''}{diff.toFixed(1)}</span> : <span className="text-gray-400">-</span>}</td>
                                            <td className="p-4 text-center font-bold text-woca-orange">{row.vol}</td>
                                        </tr>
                                    );
                                })}
                            </Table>
                        </div>
                      </div>
                  </div>
              )}
              
          </div>
      )}
    </div>
  );
};