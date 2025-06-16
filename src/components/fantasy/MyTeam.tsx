import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Trophy, Calendar, Edit, Save, X, Plus, Minus, Crown, Star, ArrowRightLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Player, Team, FantasyTeam, Roster } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';
import TeamCreation from './TeamCreation';
import PlayerProfileModal from './PlayerProfileModal';
import TransferSystem from './TransferSystem';
import toast from 'react-hot-toast';
import { useGameweek } from '../../contexts/GameweekContext';

interface PlayerWithTeam extends Player {
  team_name?: string;
  team_jersey?: string;
}

interface RosterPlayer extends Roster {
  player: PlayerWithTeam;
}

export default function MyTeam() {
  const { user } = useAuth();
  const [fantasyTeam, setFantasyTeam] = useState<FantasyTeam | null>(null);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayerForProfile, setSelectedPlayerForProfile] = useState<PlayerWithTeam | null>(null);
  const [showPlayerProfile, setShowPlayerProfile] = useState(false);
  const [showTransfers, setShowTransfers] = useState(false);
  const { gameweekState } = useGameweek();
  const [currentGameweek, setCurrentGameweek] = useState<number>(1);
  const [playerPoints, setPlayerPoints] = useState<any[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);

  useEffect(() => {
    if (user) {
      fetchFantasyTeam();
    }
  }, [user]);

  useEffect(() => {
    // Fetch current gameweek from leagues table
    const fetchCurrentGameweek = async () => {
      const { data, error } = await supabase
        .from('leagues')
        .select('gameweek_current')
        .order('created_at', { ascending: true })
        .limit(1);
      if (!error && data && data.length > 0 && data[0].gameweek_current) {
        setCurrentGameweek(data[0].gameweek_current);
      } else {
        setCurrentGameweek(1);
      }
    };
    fetchCurrentGameweek();
  }, [gameweekState]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const fetchPoints = async () => {
      if (!user) return;
      setLoadingPoints(true);
      // Get user's fantasy team
      const { data: teamData } = await supabase
        .from('fantasy_teams')
        .select('fantasy_team_id')
        .eq('user_id', user.id)
        .single();
      if (!teamData) {
        setPlayerPoints([]);
        setLoadingPoints(false);
        return;
      }
      // Get roster
      const { data: roster } = await supabase
        .from('rosters')
        .select('player_id, is_starter, player:player_id(*)')
        .eq('fantasy_team_id', teamData.fantasy_team_id);
      if (!roster) {
        setPlayerPoints([]);
        setLoadingPoints(false);
        return;
      }
      // Get points for each player for current gameweek
      const playerIds = roster.map((r: any) => r.player_id);
      const { data: scores } = await supabase
        .from('gameweek_scores')
        .select('*')
        .in('player_id', playerIds)
        .eq('gameweek', currentGameweek);
      // Merge player info and points
      const pointsTable = roster.map((r: any) => {
        const score = scores?.find((s: any) => s.player_id === r.player_id);
        return {
          name: r.player.name,
          position: r.player.position,
          team: r.player.team_id,
          points: score?.total_points ?? 0,
          is_starter: r.is_starter,
        };
      });
      setPlayerPoints(pointsTable);
      setLoadingPoints(false);
    };
    if (gameweekState === 'inside') {
      fetchPoints();
      interval = setInterval(fetchPoints, 10000);
    } else {
      setPlayerPoints([]);
    }
    return () => interval && clearInterval(interval);
  }, [user, gameweekState, currentGameweek]);

  const fetchFantasyTeam = async () => {
    if (!user) return;

    try {
      // First check if user has a fantasy team
      const { data: teamData, error: teamError } = await supabase
        .from('fantasy_teams')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (teamError) {
        if (teamError.code === 'PGRST116') {
          // No team found - user needs to create one
          setFantasyTeam(null);
          setLoading(false);
          return;
        }
        throw teamError;
      }

      setFantasyTeam(teamData);

      // Fetch roster if team exists
      if (teamData) {
        await fetchRoster(teamData.fantasy_team_id);
      }
    } catch (error) {
      console.error('Error fetching fantasy team:', error);
      toast.error('Failed to fetch your team');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoster = async (fantasyTeamId: string) => {
    try {
      const { data, error } = await supabase
        .from('rosters')
        .select(`
          *,
          player:player_id (
            *,
            teams:team_id (
              name,
              jersey
            )
          )
        `)
        .eq('fantasy_team_id', fantasyTeamId)
        .order('squad_position');

      if (error) throw error;

      const rosterWithTeamNames = data?.map(rosterItem => ({
        ...rosterItem,
        player: {
          ...rosterItem.player,
          team_name: rosterItem.player?.teams?.name,
          team_jersey: rosterItem.player?.teams?.jersey
        }
      })) || [];

      setRoster(rosterWithTeamNames);
    } catch (error) {
      console.error('Error fetching roster:', error);
      toast.error('Failed to fetch roster');
    }
  };

  const getPlayersByPosition = (position: string, isStarter: boolean) => {
    return roster.filter(r => 
      r.player?.position === position && 
      r.is_starter === isStarter
    );
  };

  const getFormationCounts = () => {
    const starters = roster.filter(r => r.is_starter);
    return {
      defenders: starters.filter(r => r.player?.position === 'DEF').length,
      midfielders: starters.filter(r => r.player?.position === 'MID').length,
      forwards: starters.filter(r => r.player?.position === 'FWD').length,
    };
  };

  const setCaptain = async (rosterId: string) => {
    try {
      // Remove captain from all players
      await supabase
        .from('rosters')
        .update({ is_captain: false })
        .eq('fantasy_team_id', fantasyTeam?.fantasy_team_id);

      // Set new captain
      const { error } = await supabase
        .from('rosters')
        .update({ is_captain: true })
        .eq('roster_id', rosterId);

      if (error) throw error;

      toast.success('Captain updated');
      if (fantasyTeam) {
        await fetchRoster(fantasyTeam.fantasy_team_id);
      }
    } catch (error) {
      console.error('Error setting captain:', error);
      toast.error('Failed to set captain');
    }
  };

  const setViceCaptain = async (rosterId: string) => {
    try {
      // Remove vice captain from all players
      await supabase
        .from('rosters')
        .update({ is_vice_captain: false })
        .eq('fantasy_team_id', fantasyTeam?.fantasy_team_id);

      // Set new vice captain
      const { error } = await supabase
        .from('rosters')
        .update({ is_vice_captain: true })
        .eq('roster_id', rosterId);

      if (error) throw error;

      toast.success('Vice captain updated');
      if (fantasyTeam) {
        await fetchRoster(fantasyTeam.fantasy_team_id);
      }
    } catch (error) {
      console.error('Error setting vice captain:', error);
      toast.error('Failed to set vice captain');
    }
  };

  const handlePlayerClick = (player: PlayerWithTeam) => {
    setSelectedPlayerForProfile(player);
    setShowPlayerProfile(true);
  };

  const handleTeamCreated = () => {
    // Refresh the team data after creation
    fetchFantasyTeam();
  };

  const canMakeChanges = () => {
    if (currentGameweek === 1) {
      return gameweekState === 'outside'; // Unlimited transfers before GW1
    }
    return gameweekState === 'outside'; // Only between gameweeks
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // If user doesn't have a fantasy team, show team creation
  if (!fantasyTeam) {
    return <TeamCreation onTeamCreated={handleTeamCreated} />;
  }

  const formation = getFormationCounts();
  const starters = roster.filter(r => r.is_starter);
  const bench = roster.filter(r => !r.is_starter);
  const captain = roster.find(r => r.is_captain);
  const viceCaptain = roster.find(r => r.is_vice_captain);

  return (
    <div className="max-w-7xl mx-auto space-y-6 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen p-4">
      {/* Transfer System Modal */}
      {showTransfers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">Transfer System</h2>
                <button
                  onClick={() => setShowTransfers(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            <div className="p-6">
              <TransferSystem />
            </div>
          </div>
        </div>
      )}


      {/* Team Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold">{fantasyTeam.team_name}</h1>
            <p className="text-emerald-100">Your Fantasy Soccer Team</p>
          </div>
          <div className="flex items-center space-x-4">
            {canMakeChanges() && (
              <button
                onClick={() => setShowTransfers(true)}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-6 py-3 rounded-xl transition-all duration-200 flex items-center font-medium"
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Transfers
              </button>
            )}
          </div>
        </div>

        {/* Team Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20">
            <div className="flex items-center">
              <Trophy className="h-5 w-5 mr-2" />
              <div>
                <p className="text-sm text-emerald-100">Total Points</p>
                <p className="text-lg font-semibold">{fantasyTeam.total_points}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              <div>
                <p className="text-sm text-emerald-100">This Gameweek</p>
                <p className="text-lg font-semibold">{fantasyTeam.gameweek_points}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              <div>
                <p className="text-sm text-emerald-100">Budget Left</p>
                <p className="text-lg font-semibold">£{fantasyTeam.budget_remaining}M</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20">
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              <div>
                <p className="text-sm text-emerald-100">Rank</p>
                <p className="text-lg font-semibold">#{fantasyTeam.rank}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Transfer Status */}
        <div className="mt-4">
          {gameweekState === 'inside' && (
            <div className="p-3 bg-red-500/20 border border-red-400/30 rounded-xl backdrop-blur-sm">
              <p className="text-red-100 text-sm">
                Gameweek is active. No transfers allowed until gameweek ends.
              </p>
            </div>
          )}
          {gameweekState === 'outside' && currentGameweek === 1 && (
            <div className="p-3 bg-green-500/20 border border-green-400/30 rounded-xl backdrop-blur-sm">
              <p className="text-green-100 text-sm">
                Unlimited transfers available before Gameweek 1 starts.
              </p>
            </div>
          )}
          {gameweekState === 'outside' && currentGameweek > 1 && (
            <div className="p-3 bg-blue-500/20 border border-blue-400/30 rounded-xl backdrop-blur-sm">
              <p className="text-blue-100 text-sm">
                Transfer window is open. You have {fantasyTeam.transfers_remaining} transfer(s) remaining.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Formation and Pitch */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/50">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Formation: {formation.defenders}-{formation.midfielders}-{formation.forwards}
          </h2>
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            {captain && (
              <div className="flex items-center bg-yellow-100 px-3 py-1 rounded-full">
                <Crown className="h-4 w-4 text-yellow-600 mr-1" />
                Captain: {captain.player?.name}
              </div>
            )}
            {viceCaptain && (
              <div className="flex items-center bg-gray-100 px-3 py-1 rounded-full">
                <Star className="h-4 w-4 text-gray-600 mr-1" />
                Vice: {viceCaptain.player?.name}
              </div>
            )}
          </div>
        </div>

        {/* Soccer Pitch */}
        <div 
          className="relative rounded-2xl min-h-[600px] bg-cover bg-center bg-no-repeat p-8 border-2 border-emerald-200"
          style={{
            backgroundImage: `url('https://i.imgur.com/x6NH58g.png')`,
            backgroundSize: 'cover'
          }}
        >
          {/* Starting XI */}
          <div className="relative h-full flex flex-col justify-between py-8">
            {/* Goalkeeper */}
            <div className="flex justify-center mb-8">
              {getPlayersByPosition('GK', true).map((rosterPlayer) => (
                <PlayerCard
                  key={rosterPlayer.roster_id}
                  rosterPlayer={rosterPlayer}
                  canMakeChanges={canMakeChanges()}
                  onSetCaptain={() => setCaptain(rosterPlayer.roster_id)}
                  onSetViceCaptain={() => setViceCaptain(rosterPlayer.roster_id)}
                  onPlayerClick={() => handlePlayerClick(rosterPlayer.player)}
                />
              ))}
            </div>

            {/* Defenders */}
            <div className="flex justify-center space-x-6 mb-8">
              {getPlayersByPosition('DEF', true).map((rosterPlayer) => (
                <PlayerCard
                  key={rosterPlayer.roster_id}
                  rosterPlayer={rosterPlayer}
                  canMakeChanges={canMakeChanges()}
                  onSetCaptain={() => setCaptain(rosterPlayer.roster_id)}
                  onSetViceCaptain={() => setViceCaptain(rosterPlayer.roster_id)}
                  onPlayerClick={() => handlePlayerClick(rosterPlayer.player)}
                />
              ))}
            </div>

            {/* Midfielders */}
            <div className="flex justify-center space-x-6 mb-8">
              {getPlayersByPosition('MID', true).map((rosterPlayer) => (
                <PlayerCard
                  key={rosterPlayer.roster_id}
                  rosterPlayer={rosterPlayer}
                  canMakeChanges={canMakeChanges()}
                  onSetCaptain={() => setCaptain(rosterPlayer.roster_id)}
                  onSetViceCaptain={() => setViceCaptain(rosterPlayer.roster_id)}
                  onPlayerClick={() => handlePlayerClick(rosterPlayer.player)}
                />
              ))}
            </div>

            {/* Forwards */}
            <div className="flex justify-center space-x-6">
              {getPlayersByPosition('FWD', true).map((rosterPlayer) => (
                <PlayerCard
                  key={rosterPlayer.roster_id}
                  rosterPlayer={rosterPlayer}
                  canMakeChanges={canMakeChanges()}
                  onSetCaptain={() => setCaptain(rosterPlayer.roster_id)}
                  onSetViceCaptain={() => setViceCaptain(rosterPlayer.roster_id)}
                  onPlayerClick={() => handlePlayerClick(rosterPlayer.player)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bench */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/50">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Substitutes</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {bench.map((rosterPlayer) => (
            <div key={rosterPlayer.roster_id} className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200">
              <div className="flex flex-col items-center">
                {/* Player Jersey */}
                <div 
                  className="w-60 h-60 mb-2 relative cursor-pointer hover:scale-105 transition-transform"
                  onClick={() => handlePlayerClick(rosterPlayer.player)}
                >
                  {rosterPlayer.player?.team_jersey ? (
                    <img
                      src={rosterPlayer.player.team_jersey}
                      alt={`${rosterPlayer.player?.team_name} jersey`}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling!.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className={`w-full h-full bg-gray-300 rounded-lg flex items-center justify-center ${
                      rosterPlayer.player?.team_jersey ? 'hidden' : 'flex'
                    }`}
                  >
                    <span className="text-xs text-gray-500">No Jersey</span>
                  </div>
                  
                  {/* Captain/Vice Captain badges */}
                  {rosterPlayer.is_captain && (
                    <div className="absolute -top-1 -right-1 bg-yellow-500 text-white rounded-full p-1">
                      <Crown className="h-3 w-3" />
                    </div>
                  )}
                  {rosterPlayer.is_vice_captain && (
                    <div className="absolute -top-1 -right-1 bg-gray-500 text-white rounded-full p-1">
                      <Star className="h-3 w-3" />
                    </div>
                  )}
                </div>

                {/* Player Info */}
                <div className="text-center">
                  <div 
                    className="font-medium text-gray-900 text-sm mb-1 cursor-pointer hover:text-emerald-600 transition-colors"
                    onClick={() => handlePlayerClick(rosterPlayer.player)}
                  >
                    {rosterPlayer.player?.name}
                  </div>
                  <div className="text-xs text-gray-600 mb-1">£{rosterPlayer.player?.price}M</div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    rosterPlayer.player?.position === 'GK' ? 'bg-purple-100 text-purple-800' :
                    rosterPlayer.player?.position === 'DEF' ? 'bg-blue-100 text-blue-800' :
                    rosterPlayer.player?.position === 'MID' ? 'bg-emerald-100 text-emerald-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                    {rosterPlayer.player?.position}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Player Profile Modal */}
      {showPlayerProfile && selectedPlayerForProfile && (
        <PlayerProfileModal
          player={selectedPlayerForProfile}
          onClose={() => {
            setShowPlayerProfile(false);
            setSelectedPlayerForProfile(null);
          }}
        />
      )}
    </div>
  );
}

// Player Card Component
interface PlayerCardProps {
  rosterPlayer: RosterPlayer;
  canMakeChanges: boolean;
  onSetCaptain: () => void;
  onSetViceCaptain: () => void;
  onPlayerClick: () => void;
}

function PlayerCard({ rosterPlayer, canMakeChanges, onSetCaptain, onSetViceCaptain, onPlayerClick }: PlayerCardProps) {
  return (
    <div className="relative flex flex-col items-center">
      {/* Player Jersey - Bigger Size */}
      <div 
        className="w-60 h-60 relative cursor-pointer hover:scale-105 transition-transform mb-1"
        onClick={onPlayerClick}
      >
        {rosterPlayer.player?.team_jersey ? (
          <img
            src={rosterPlayer.player.team_jersey}
            alt={`${rosterPlayer.player?.team_name} jersey`}
            className="w-full h-full object-contain drop-shadow-lg"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling!.style.display = 'flex';
            }}
          />
        ) : null}
        <div 
          className={`w-full h-full bg-white rounded-lg flex items-center justify-center shadow-lg border-2 border-gray-200 ${
            rosterPlayer.player?.team_jersey ? 'hidden' : 'flex'
          }`}
        >
          <span className="text-sm text-gray-500">No Jersey</span>
        </div>
        
        {/* Captain/Vice Captain badges */}
        {rosterPlayer.is_captain && (
          <div className="absolute -top-2 -right-2 bg-yellow-500 text-white rounded-full p-1 shadow-lg">
            <Crown className="h-4 w-4" />
          </div>
        )}
        {rosterPlayer.is_vice_captain && (
          <div className="absolute -top-2 -right-2 bg-gray-500 text-white rounded-full p-1 shadow-lg">
            <Star className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Player Info Card - Very close to jersey */}
      <div 
        className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-2 min-w-[140px] text-center cursor-pointer hover:bg-white transition-all duration-200 border border-white/50"
        onClick={onPlayerClick}
      >
        <div className="font-semibold text-sm text-gray-900 truncate px-1">
          {rosterPlayer.player?.name}
        </div>
        <div className="text-xs font-medium text-emerald-600">
          £{rosterPlayer.player?.price}M
        </div>
      </div>

      {canMakeChanges && (
        <div className="mt-2 flex space-x-1">
          <button
            onClick={onSetCaptain}
            className="bg-yellow-500 text-white px-2 py-1 rounded-lg text-xs hover:bg-yellow-600 transition-colors shadow-md"
          >
            C
          </button>
          <button
            onClick={onSetViceCaptain}
            className="bg-gray-500 text-white px-2 py-1 rounded-lg text-xs hover:bg-gray-600 transition-colors shadow-md"
          >
            VC
          </button>
        </div>
      )}
    </div>
  );
}