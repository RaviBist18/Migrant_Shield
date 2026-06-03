interface ConfidenceBarProps {
    value: number; // 0–100
    size?: 'sm' | 'md';
  }
  
  export default function ConfidenceBar({ value, size = 'md' }: ConfidenceBarProps) {
    const color =
      value >= 90 ? 'bg-emerald-500' : value >= 70 ? 'bg-amber-500' : 'bg-red-500';
    const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
    const barHeight = size === 'sm' ? 'h-1.5' : 'h-2';
  
    return (
      <div className="w-full">
        <div className={`flex justify-between items-center mb-1 ${textSize}`}>
          <span className="text-slate-400 font-medium">AI Confidence</span>
          <span className="text-white font-bold">{value}%</span>
        </div>
        <div className={`w-full bg-slate-700 rounded-full ${barHeight}`}>
          <div
            className={`${barHeight} rounded-full ${color} transition-all`}
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
    );
  }