
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TaskStats, DailyProgress } from '../types';

interface DashboardProps {
  stats: TaskStats;
  dailyProgress: DailyProgress[];
}

const Dashboard: React.FC<DashboardProps> = ({ stats, dailyProgress }) => {
  const COLORS = ['#64748b', '#3b82f6', '#10b981']; // Slate, Blue, Emerald (Neon)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
      <div className="glass-panel p-8 rounded-[2rem]">
        <h4 className="text-lg font-bold text-white mb-8 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          Workspace Output
        </h4>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyProgress}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
              <XAxis 
                dataKey="date" 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
                dy={10}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false} 
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  borderRadius: '16px', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)',
                  color: '#fff'
                }}
                cursor={{ fill: 'rgba(255,255,255,0.02)' }}
              />
              <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', fontWeight: 'bold' }} />
              <Bar dataKey="pending" name="Queue" stackId="a" fill="#334155" radius={[0, 0, 0, 0]} barSize={28} />
              <Bar dataKey="working" name="Editing" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={28} />
              <Bar dataKey="completed" name="Delivered" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-panel p-8 rounded-[2rem]">
        <h4 className="text-lg font-bold text-white mb-8 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          Pipeline Health
        </h4>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={stats.statusDistribution}
                cx="50%"
                cy="50%"
                innerRadius={75}
                outerRadius={95}
                paddingAngle={10}
                dataKey="value"
              >
                {stats.statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  borderRadius: '16px', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff'
                }}
              />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
