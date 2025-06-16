import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Users, Target, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { RealMatch, Player, GameweekScore } from '../../types/database';
import { useGameweek } from '../../contexts/GameweekContext';
import toast from 'react-hot-toast';

interface MatchWithTeams extends RealMatch {
  home_team_name?: string;
  away_team_name?: string;
}

interface PlayerWithTeam extends Player {
  team_name?: string;
  team_jersey?: string;
}

interface MatchLineup {
  starters: PlayerWithTeam[];
  bench: PlayerWithTeam[];
}

interface SimulationEvent {
  minute: number;
  type: 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'substitution' | 'clean_sheet';
  player_id: string;
  player_name: string;
  team: string;
  description: string;
}

export default function LiveMatchSimulation() {
  const { gameweekState, startGameweek, pauseGameweek, resumeGameweek, endGameweek } = useGameweek();
  const [matches, setMatches] = useState<MatchWithTeams[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<MatchWithTeams | null>(null);
  const [homeLineup, setHomeLineup] = useState<MatchLineup>({ starters: [], bench: [] });
  const [awayLineup, setAwayLineup] = useState<MatchLineup>({ starters: [], bench: [] });
  const [currentMinute, setCurrentMinute] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [events, setEvents] = useState<SimulationEvent[]>([]);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentGameweek, setCurrentGameweek] = useState(1);

  useEffect(() => {
    fetchCurrentGameweek();
    fetchMatches();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSimulating && gameweekState === 'inside') {
      interval = setInterval(() => {
        setCurrentMinute(prev => {
          if (prev >= 90) {
            setIsSimulating(false);
            completeMatch();
            return 90;
          }
          
          // Generate random events
          if (Math.random() < 0.1) { // 10% chance per minute
            generateRandomEvent(prev + 1);
          }
          
          return prev + 1;
        });
      }, 1000); // 1 second = 1 minute in simulation
    }
    return () => clearInterval(interval);
  }, [isSimulating, gameweekState, homeLineup, awayLineup]);

  const fetchCurrentGameweek = async () => {
    const { data } = await supabase
      .from('leagues')
      .select('gameweek_current')
      .order('created_at', { ascending: true })
      .limit(1);
    
    if (data && data.length > 0) {
      setCurrentGameweek(data[0].gameweek_current);
    }
  };

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('real_matches')
        .select(`
          *,
          home_team:home_team_id (name),
          away_team:away_team_id (name)
        `)
        .eq('status', 'scheduled')
        .order('match_date', { ascending: true });

      if (error) throw error;

      const matchesWithTeamNames = data?.map(match => ({
        ...match,
        home_team_name: match.home_team?.name,
        away_team_name: match.away_team?.name
      })) || [];

      setMatches(matchesWithTeamNames);
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast.error('Failed to fetch matches');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamPlayers = async (teamId: string) => {
    const { data, error } = await supabase
      .from('players')
      .select(`
        *,
        teams:team_id (name, jersey)
      `)
      .eq('team_id', teamId)
      .eq('injury_status', 'fit');

    if (error) throw error;

    return data?.map(player => ({
      ...player,
      team_name: player.teams?.name,
      team_jersey: player.teams?.jersey
    })) || [];
  };

  const selectMatch = async (match: MatchWithTeams) => {
    setSelectedMatch(match);
    
    if (match.home_team_id && match.away_team_id) {
      const [homePlayers, awayPlayers] = await Promise.all([
        fetchTeamPlayers(match.home_team_id),
        fetchTeamPlayers(match.away_team_id)
      ]);

      // Auto-select formation (4-3-3)
      const selectLineup = (players: PlayerWithTeam[]) => {
        const gk = players.filter(p => p.position === 'GK').slice(0, 1);
        const def = players.filter(p => p.position === 'DEF').slice(0, 4);
        const mid = players.filter(p => p.position === 'MID').slice(0, 3);
        const fwd = players.filter(p => p.position === 'FWD').slice(0, 3);
        
        const starters = [...gk, ...def, ...mid, ...fwd];
        const bench = players.filter(p => !starters.includes(p)).slice(0, 7);
        
        return { starters, bench };
      };

      setHomeLineup(selectLineup(homePlayers));
      setAwayLineup(selectLineup(awayPlayers));
    }
  };

  const generateRandomEvent = (minute: number) => {
    const allPlayers = [...homeLineup.starters, ...awayLineup.starters];
    if (allPlayers.length === 0) return;

    const eventTypes = ['goal', 'assist', 'yellow_card', 'red_card'];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)] as SimulationEvent['type'];
    
    let eligiblePlayers = allPlayers;
    
    // Filter players based on event type
    if (eventType === 'goal') {
      eligiblePlayers = allPlayers.filter(p => p.position !== 'GK');
    }

    const player = eligiblePlayers[Math.floor(Math.random() * eligiblePlayers.length)];
    const isHomePlayer = homeLineup.starters.includes(player);
    
    const event: SimulationEvent = {
      minute,
      type: eventType,
      player_id: player.player_id,
      player_name: player.name,
      team: isHomePlayer ? selectedMatch?.home_team_name || 'Home' : selectedMatch?.away_team_name || 'Away',
      description: `${player.name} ${eventType.replace('_', ' ')}`
    };

    setEvents(prev => [...prev, event]);

    // Update scores for goals
    if (eventType === 'goal') {
      if (isHomePlayer) {
        setHomeScore(prev => prev + 1);
      } else {
        setAwayScore(prev => prev + 1);
      }
    }

    // Save event to database
    savePlayerPerformance(player, eventType, minute);
  };

  const savePlayerPerformance = async (player: PlayerWithTeam, eventType: string, minute: number) => {
    try {
      // Check if player already has a score for this gameweek
      const { data: existingScore } = await supabase
        .from('gameweek_scores')
        .select('*')
        .eq('player_id', player.player_id)
        .eq('gameweek', currentGameweek)
        .single();

      let updateData: any = {
        minutes_played: Math.max(minute, existingScore?.minutes_played || 0)
      };

      // Update stats based on event type
      switch (eventType) {
        case 'goal':
          updateData.goals = (existingScore?.goals || 0) + 1;
          break;
        case 'assist':
          updateData.assists = (existingScore?.assists || 0) + 1;
          break;
        case 'yellow_card':
          updateData.yellow_cards = (existingScore?.yellow_cards || 0) + 1;
          break;
        case 'red_card':
          updateData.red_cards = (existingScore?.red_cards || 0) + 1;
          break;
      }

      // Calculate total points based on position and stats
      const calculatePoints = (stats: any, position: string) => {
        let points = 0;
        
        // Base points for playing
        if (stats.minutes_played >= 60) points += 2;
        else if (stats.minutes_played >= 1) points += 1;
        
        // Goals
        if (position === 'GK' || position === 'DEF') {
          points += (stats.goals || 0) * 6;
        } else if (position === 'MID') {
          points += (stats.goals || 0) * 5;
        } else {
          points += (stats.goals || 0) * 4;
        }
        
        // Assists
        points += (stats.assists || 0) * 3;
        
        // Clean sheet (for GK and DEF)
        if ((position === 'GK' || position === 'DEF') && stats.clean_sheet) {
          points += 4;
        }
        
        // Cards
        points -= (stats.yellow_cards || 0) * 1;
        points -= (stats.red_cards || 0) * 3;
        
        return Math.max(0, points);
      };

      const newStats = { ...existingScore, ...updateData };
      updateData.total_points = calculatePoints(newStats, player.position);

      if (existingScore) {
        await supabase
          .from('gameweek_scores')
          .update(updateData)
          .eq('score_id', existingScore.score_id);
      } else {
        await supabase
          .from('gameweek_scores')
          .insert([{
            player_id: player.player_id,
            gameweek: currentGameweek,
            ...updateData
          }]);
      }
    } catch (error) {
      console.error('Error saving player performance:', error);
    }
  };

  const completeMatch = async () => {
    if (!selectedMatch) return;

    try {
      // Update match status and score
      await supabase
        .from('real_matches')
        .update({
          status: 'completed',
          home_score: homeScore,
          away_score: awayScore
        })
        .eq('match_id', selectedMatch.match_id);

      // Award clean sheet points
      const isHomeCleanSheet = awayScore === 0;
      const isAwayCleanSheet = homeScore === 0;

      if (isHomeCleanSheet) {
        const homeDefenders = homeLineup.starters.filter(p => p.position === 'GK' || p.position === 'DEF');
        for (const player of homeDefenders) {
          await updateCleanSheet(player.player_id, true);
        }
      }

      if (isAwayCleanSheet) {
        const awayDefenders = awayLineup.starters.filter(p => p.position === 'GK' || p.position === 'DEF');
        for (const player of awayDefenders) {
          await updateCleanSheet(player.player_id, true);
        }
      }

      toast.success('Match completed successfully!');
      fetchMatches();
    } catch (error) {
      console.error('Error completing match:', error);
      toast.error('Failed to complete match');
    }
  };

  const updateCleanSheet = async (playerId: string, cleanSheet: boolean) => {
    const { data: existingScore } = await supabase
      .from('gameweek_scores')
      .select('*')
      .eq('player_id', playerId)
      .eq('gameweek', currentGameweek)
      .single();

    const updateData = {
      clean_sheet: cleanSheet,
      total_points: existingScore ? existingScore.total_points + (cleanSheet ? 4 : 0) : (cleanSheet ? 4 : 0)
    };

    if (existingScore) {
      await supabase
        .from('gameweek_scores')
        .update(updateData)
        .eq('score_id', existingScore.score_id);
    } else {
      await supabase
        .from('gameweek_scores')
        .insert([{
          player_id: playerId,
          gameweek: currentGameweek,
          minutes_played: 90,
          ...updateData
        }]);
    }
  };

  const startSimulation = () => {
    if (!selectedMatch) {
      toast.error('Please select a match first');
      return;
    }
    
    if (homeLineup.starters.length < 11 || awayLineup.starters.length < 11) {
      toast.error('Both teams need 11 starters');
      return;
    }

    setIsSimulating(true);
    setCurrentMinute(0);
    setEvents([]);
    setHomeScore(0);
    setAwayScore(0);
    
    if (gameweekState === 'outside') {
      startGameweek();
    }
  };

  const pauseSimulation = () => {
    setIsSimulating(false);
    pauseGameweek();
  };

  const resumeSimulation = () => {
    setIsSimulating(true);
    resumeGameweek();
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    setCurrentMinute(0);
    setEvents([]);
    setHomeScore(0);
    setAwayScore(0);
  };

  const endGameweekAction = async () => {
    try {
      // Update all fantasy team points
      await updateFantasyTeamPoints();
      
      // Increment gameweek in leagues
      await supabase
        .from('leagues')
        .update({ gameweek_current: currentGameweek + 1 });
      
      setCurrentGameweek(prev => prev + 1);
      endGameweek();
      toast.success('Gameweek ended successfully!');
    } catch (error) {
      console.error('Error ending gameweek:', error);
      toast.error('Failed to end gameweek');
    }
  };

  const updateFantasyTeamPoints = async () => {
    // Get all fantasy teams
    const { data: teams } = await supabase
      .from('fantasy_teams')
      .select('*');

    if (!teams) return;

    for (const team of teams) {
      // Get team's roster
      const { data: roster } = await supabase
        .from('rosters')
        .select('player_id, is_starter, is_captain, is_vice_captain')
        .eq('fantasy_team_id', team.fantasy_team_id);

      if (!roster) continue;

      let gameweekPoints = 0;

      for (const rosterPlayer of roster) {
        if (!rosterPlayer.is_starter) continue;

        // Get player's gameweek score
        const { data: score } = await supabase
          .from('gameweek_scores')
          .select('total_points')
          .eq('player_id', rosterPlayer.player_id)
          .eq('gameweek', currentGameweek)
          .single();

        let playerPoints = score?.total_points || 0;

        // Double points for captain
        if (rosterPlayer.is_captain) {
          playerPoints *= 2;
        }

        gameweekPoints += playerPoints;
      }

      // Update fantasy team points
      await supabase
        .from('fantasy_teams')
        .update({
          gameweek_points: gameweekPoints,
          total_points: team.total_points + gameweekPoints
        })
        .eq('fantasy_team_id', team.fantasy_team_id);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Live Match Simulation</h1>
            <p className="text-gray-600">
              Simulate matches and generate player performances for Gameweek {currentGameweek}.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
              gameweekState === 'inside' ? 'bg-green-100 text-green-800' :
              gameweekState === 'paused' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              Gameweek: {gameweekState}
            </div>
            {gameweekState === 'inside' && (
              <button
                onClick={endGameweekAction}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                End Gameweek
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Match Selection */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Match</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {matches.map(match => (
            <div
              key={match.match_id}
              onClick={() => selectMatch(match)}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedMatch?.match_id === match.match_id
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="font-semibold text-gray-900 mb-2">
                  {match.home_team_name || 'TBD'} vs {match.away_team_name || 'TBD'}
                </div>
                <div className="text-sm text-gray-500">
                  Gameweek {match.gameweek}
                </div>
                {match.match_date && (
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(match.match_date).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Simulation Controls */}
      {selectedMatch && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {selectedMatch.home_team_name} vs {selectedMatch.away_team_name}
            </h2>
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold text-gray-900">
                {homeScore} - {awayScore}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-1" />
                {currentMinute}'
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex space-x-4 mb-6">
            {!isSimulating ? (
              <button
                onClick={startSimulation}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Simulation
              </button>
            ) : (
              <button
                onClick={pauseSimulation}
                className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors flex items-center"
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </button>
            )}
            
            {gameweekState === 'paused' && (
              <button
                onClick={resumeSimulation}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Play className="h-4 w-4 mr-2" />
                Resume
              </button>
            )}
            
            <button
              onClick={stopSimulation}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </button>
          </div>

          {/* Lineups */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Home Team */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedMatch.home_team_name} (Home)
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Starting XI</h4>
                  <div className="space-y-2">
                    {homeLineup.starters.map(player => (
                      <div key={player.player_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">{player.name}</span>
                          <span className="ml-2 text-sm text-gray-500">({player.position})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Bench</h4>
                  <div className="space-y-2">
                    {homeLineup.bench.slice(0, 7).map(player => (
                      <div key={player.player_id} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                        <div>
                          <span className="text-sm">{player.name}</span>
                          <span className="ml-2 text-xs text-gray-500">({player.position})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Away Team */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedMatch.away_team_name} (Away)
              </h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Starting XI</h4>
                  <div className="space-y-2">
                    {awayLineup.starters.map(player => (
                      <div key={player.player_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div>
                          <span className="font-medium">{player.name}</span>
                          <span className="ml-2 text-sm text-gray-500">({player.position})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Bench</h4>
                  <div className="space-y-2">
                    {awayLineup.bench.slice(0, 7).map(player => (
                      <div key={player.player_id} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                        <div>
                          <span className="text-sm">{player.name}</span>
                          <span className="ml-2 text-xs text-gray-500">({player.position})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Match Events */}
          {events.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Match Events</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {events.map((event, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                        {event.minute}'
                      </div>
                      <div>
                        <div className="font-medium">{event.description}</div>
                        <div className="text-sm text-gray-500">{event.team}</div>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      event.type === 'goal' ? 'bg-green-100 text-green-800' :
                      event.type === 'assist' ? 'bg-blue-100 text-blue-800' :
                      event.type === 'yellow_card' ? 'bg-yellow-100 text-yellow-800' :
                      event.type === 'red_card' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {event.type.replace('_', ' ').toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}