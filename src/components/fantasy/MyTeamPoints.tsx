import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Trophy, Calendar, Users } from 'lucide-react';

export default function MyTeamPoints() {
  const { user } = useAuth();
  const [gameweeks, setGameweeks] = useState<number[]>([]);
  const [selectedGameweek, setSelectedGameweek] = useState<number | null>(null);
  const [playerPoints, setPlayerPoints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamStats, setTeamStats] = useState({
    totalPoints: 0,
    gameweekPoints: 0,
    teamName: ''
  });

  // Fetch all gameweeks the user has points for
  useEffect(() => {
    const fetchGameweeks = async () => {
      if (!user) return;
      // Get user's fantasy team
      const { data: teamData } = await supabase
        .from('fantasy_teams')
        .select('fantasy_team_id, team_name, total_points')
        .eq('user_id', user.id)
        .single();
      if (!teamData) return;
      
      setTeamStats(prev => ({
        ...prev,
        teamName: teamData.team_name,
        totalPoints: teamData.total_points
      }));

      // Get all gameweeks from gameweek_scores for this team's players
      const { data: roster } = await supabase
        .from('rosters')
        .select('player_id')
        .eq('fantasy_team_id', teamData.fantasy_team_id);
      if (!roster) return;
      const playerIds = roster.map((r: any) => r.player_id);
      const { data: scores } = await supabase
        .from('gameweek_scores')
        .select('gameweek')
        .in('player_id', playerIds);
      const uniqueGameweeks = [...new Set((scores || []).map((s: any) => s.gameweek))].sort((a, b) => b - a);
      setGameweeks(uniqueGameweeks);
      setSelectedGameweek(uniqueGameweeks[0] || null);
    };
    fetchGameweeks();
  }, [user]);

  // Fetch player points for selected gameweek
  useEffect(() => {
    const fetchPoints = async () => {
      if (!user || !selectedGameweek) return;
      setLoading(true);
      // Get user's fantasy team
      const { data: teamData } = await supabase
        .from('fantasy_teams')
        .select('fantasy_team_id')
        .eq('user_id', user.id)
        .single();
      if (!teamData) {
        setPlayerPoints([]);
        setLoading(false);
        return;
      }
      // Get roster with team info
      const { data: roster } = await supabase
        .from('rosters')
        .select(`
          player_id, 
          is_starter,
          is_captain,
          is_vice_captain,
          player:player_id (
            *,
            teams:team_id (
              name,
              jersey
            )
          )
        `)
        .eq('fantasy_team_id', teamData.fantasy_team_id);
      if (!roster) {
        setPlayerPoints([]);
        setLoading(false);
        return;
      }
      // Get points for each player for selected gameweek
      const playerIds = roster.map((r: any) => r.player_id);
      const { data: scores } = await supabase
        .from('gameweek_scores')
        .select('*')
        .in('player_id', playerIds)
        .eq('gameweek', selectedGameweek);
      
      // Calculate gameweek total points
      const gameweekTotal = scores?.reduce((sum: number, score: any) => sum + (score.total_points || 0), 0) || 0;
      setTeamStats(prev => ({
        ...prev,
        gameweekPoints: gameweekTotal
      }));

      // Merge player info and points
      const pointsTable = roster.map((r: any) => {
        const score = scores?.find((s: any) => s.player_id === r.player_id);
        return {
          name: r.player.name,
          position: r.player.position,
          team_name: r.player.teams?.name,
          team_jersey: r.player.teams?.jersey,
          points: score?.total_points ?? 0,
          is_starter: r.is_starter,
          is_captain: r.is_captain,
          is_vice_captain: r.is_vice_captain,
        };
      }).sort((a, b) => {
        // Sort by starter status first, then by points
        if (a.is_starter && !b.is_starter) return -1;
        if (!a.is_starter && b.is_starter) return 1;
        return b.points - a.points;
      });
      
      setPlayerPoints(pointsTable);
      setLoading(false);
    };
    if (selectedGameweek) fetchPoints();
  }, [user, selectedGameweek]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen p-4">
      {/* Team Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold">{teamStats.teamName || 'My Team'}</h1>
            <p className="text-emerald-100">Points History</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedGameweek || ''}
              onChange={e => setSelectedGameweek(Number(e.target.value))}
              className="px-4 py-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white placeholder-white/70 focus:ring-2 focus:ring-white/50 focus:border-white/50"
            >
              <option value="" disabled>Select Gameweek</option>
              {gameweeks.map(gw => (
                <option key={gw} value={gw} className="text-gray-900">Gameweek {gw}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Team Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20">
            <div className="flex items-center">
              <Trophy className="h-5 w-5 mr-2" />
              <div>
                <p className="text-sm text-emerald-100">Total Points</p>
                <p className="text-lg font-semibold">{teamStats.totalPoints}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              <div>
                <p className="text-sm text-emerald-100">Gameweek {selectedGameweek} Points</p>
                <p className="text-lg font-semibold">{teamStats.gameweekPoints}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20">
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              <div>
                <p className="text-sm text-emerald-100">Players</p>
                <p className="text-lg font-semibold">{playerPoints.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Points Table */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden border border-white/50">
        <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center justify-between">
            <div className="text-xl font-semibold text-gray-800">
              {selectedGameweek ? `Gameweek ${selectedGameweek} Performance` : 'Select a Gameweek'}
            </div>
            {selectedGameweek && (
              <div className="text-sm text-gray-600">
                Total: {teamStats.gameweekPoints} points
              </div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : playerPoints.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg">No data available</p>
            <p className="text-sm">Select a gameweek to view player points</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Player</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Position</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {playerPoints.map((player, index) => (
                  <tr key={index} className={`hover:bg-gray-50 transition-colors ${
                    player.is_starter ? 'bg-emerald-50/30' : 'bg-gray-50/30'
                  }`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-12 h-16 flex-shrink-0 mr-4">
                          {player.team_jersey ? (
                            <img
                              src={player.team_jersey}
                              alt={`${player.team_name} jersey`}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.nextElementSibling!.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={`w-full h-full bg-gray-200 rounded-lg flex items-center justify-center ${
                            player.team_jersey ? 'hidden' : 'flex'
                          }`}>
                            <span className="text-xs text-gray-400">No Jersey</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 flex items-center">
                            {player.name}
                            {player.is_captain && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                C
                              </span>
                            )}
                            {player.is_vice_captain && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                VC
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {player.team_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        player.position === 'GK' ? 'bg-purple-100 text-purple-800' :
                        player.position === 'DEF' ? 'bg-blue-100 text-blue-800' :
                        player.position === 'MID' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {player.position}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        player.is_starter ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {player.is_starter ? 'Starter' : 'Bench'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-lg font-bold ${
                        player.points > 5 ? 'text-emerald-700' : 
                        player.points > 0 ? 'text-blue-600' : 'text-gray-500'
                      }`}>
                        {player.points}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {playerPoints.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/50">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Gameweek Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl">
              <div className="text-2xl font-bold text-emerald-700">
                {playerPoints.filter(p => p.is_starter).reduce((sum, p) => sum + p.points, 0)}
              </div>
              <div className="text-sm text-emerald-600">Starting XI Points</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl">
              <div className="text-2xl font-bold text-blue-700">
                {playerPoints.filter(p => !p.is_starter).reduce((sum, p) => sum + p.points, 0)}
              </div>
              <div className="text-sm text-blue-600">Bench Points</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl">
              <div className="text-2xl font-bold text-yellow-700">
                {Math.max(...playerPoints.map(p => p.points), 0)}
              </div>
              <div className="text-sm text-yellow-600">Highest Score</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl">
              <div className="text-2xl font-bold text-purple-700">
                {(playerPoints.reduce((sum, p) => sum + p.points, 0) / playerPoints.length).toFixed(1)}
              </div>
              <div className="text-sm text-purple-600">Average Points</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}