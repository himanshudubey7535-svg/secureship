import {
  Boxes,
  AlertTriangle,
  Flame,
  ShieldCheck,
  TrendingUp,
  Activity
} from 'lucide-react';

function getStatVisuals(label, tone) {
  const l = (label || '').toLowerCase();
  if (l.includes('image')) {
    return {
      icon: <Boxes size={20} strokeWidth={2.2} />,
      trend: '+12% vs last week',
      trendClass: 'positive'
    };
  }
  if (l.includes('critical')) {
    return {
      icon: <Flame size={20} strokeWidth={2.2} />,
      trend: 'Threat Priority',
      trendClass: 'neutral'
    };
  }
  if (l.includes('vulnerabilit')) {
    return {
      icon: <AlertTriangle size={20} strokeWidth={2.2} />,
      trend: 'Known CVE DB',
      trendClass: 'neutral'
    };
  }
  if (l.includes('score')) {
    return {
      icon: <ShieldCheck size={20} strokeWidth={2.2} />,
      trend: 'Defense Rating',
      trendClass: 'positive'
    };
  }
  return {
    icon: <Activity size={20} strokeWidth={2.2} />,
    trend: 'Real-time sync',
    trendClass: 'neutral'
  };
}

export default function StatCard({ label, value, hint, tone = 'default' }) {
  const { icon, trend, trendClass } = getStatVisuals(label, tone);

  return (
    <div className={`stat-card tone-${tone}`}>
      <div className="stat-top-row">
        <span className="stat-label">{label}</span>
        <div className="stat-icon-wrapper" aria-hidden="true">{icon}</div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-hint-row">
        <span className="stat-hint">{hint || 'Monitored cluster'}</span>
        <span className={`stat-trend ${trendClass}`}>
          <TrendingUp size={12} />
          {trend}
        </span>
      </div>
    </div>
  );
}
