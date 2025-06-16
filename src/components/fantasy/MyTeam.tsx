import React, { useState, useEffect } from 'react'; import { Users, DollarSign, Trophy, Calendar, Edit, Save, X, Plus, Minus, Crown, Star, ArrowRightLeft } from 'lucide-react'; import { supabase } from '../../lib/supabase'; import { Player, Team, FantasyTeam, Roster } from '../../types/database'; im

pasted

1)to this code i want you to instead of having (Total Points
0
This Gameweek
0
Budget Left
£6.7M
Rank
#1) i want you to have Players Selected
15 / 15
Budget
$6.7 of course they have to be dynamic ?
2) on the right side of the pitch i want to add a side bar of transfers
that has these feature of course they have to be working (Player Selection
View
All playersWatchlistGoalkeepersDefendersMidfieldersForwardsManagersArsenalAston VillaBournemouthBrentfordBrightonChelseaCrystal PalaceEvertonFulhamIpswichLeicesterLiverpoolMan CityMan UtdNewcastleNott'm ForestSouthamptonSpursWest HamWolves
Sorted by
Total pointsRound pointsPriceTeam selected by %Minutes playedGoals scoredAssistsClean sheetsGoals concededOwn goalsPenalties savedPenalties missedYellow cardsRed cardsSavesBonusBonus Points SystemInfluenceCreativityThreatICT IndexFormTimes in Dream TeamValue (form)Value (season)Points per matchTransfers inTransfers outTransfers in (round)Transfers out (round)Price risePrice fallPrice rise (round)Price fall (round)xA (Total)xG (Total)xGI (Total)xGC (Total)StartsManager WinsManager DrawsManager LossesManager Table Bonus (Wins)Manager Table Bonus (Draws)Manager Clean sheetsManager Goals scored
Max costBetween 0.5 and 14.9
14.914.413.913.412.912.411.911.410.910.49.99.48.98.47.97.46.96.45.95.44.94.43.93.42.92.41.91.40.9
Search
637 players shown
Goalkeepers
  £
View player information
Pickford
EVEGKP
5.2158
View player information
Sels
NFOGKP
5.2150
Defenders
  £
View player information
Gvardiol
MCIDEF
6.5153
View player information
Alexander-Arnold
LIVDEF
7.2148
Midfielders
  £
View player information
M.Salah
LIVMID
13.6344
View player information
Mbeumo
BREMID
8.3236
View player information
Palmer
CHEMID
10.5214
View player information
Bowen
WHUMID
7.9193
View player information
Luis Díaz
LIVMID
7.5183
View player information
B.Fernandes
MUNMID
8.4174
View player information
Semenyo
BOUMID
5.7165
View player information
Rogers
AVLMID
5.8161
View player information
J.Murphy
NEWMID
5.2159
View player information
Kluivert
BOUMID
5.9158
View player information
Iwobi
FULMID
5.4156
View player information
Gibbs-White
NFOMID
6.5154
View player information
Elanga
NFOMID
5.5153
View player information
Trossard
ARSMID
6.7152
View player information
Schade
BREMID
5.3149
View player information
I.Sarr
CRYMID
5.5149
View player information
Eze
CRYMID
7.0148
View player information
Mitoma
BHAMID
6.3145
Forwards
  £
View player information
Isak
NEWFWD
9.4211
View player information
Wood
NFOFWD
7.2200
View player information
Watkins
AVLFWD
9.2186
View player information
Wissa
BREFWD
6.9185
View player information
Haaland
MCIFWD
14.9181
View player information
Cunha
WOLFWD
7.0178
View player information
Mateta
CRYFWD
7.5150
View player information
Raúl
FULFWD
5.3147
FirstPrevious
1 of 22
Next)

3) above the pitch make a toggle button one for the pitch view its already implemented and the other for a list view 

if you can t complete your work suggest what should be completed

Modifier
I'll implement the requested changes to your MyTeam component. Let me start by updating the team stats section and then add the player selection sidebar.


Updated MyTeam Component
Artéfact interactif 




Continuer

import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Trophy, Calendar, Edit, Save, X, Plus, Minus, Crown, Star, ArrowRightLeft, Search, Filter, Eye, List, Grid } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'pitch' | 'list'>('pitch');
  
  // Player selection sidebar states
  const [allPlayers, setAllPlayers] = useState<PlayerWithTeam[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<PlayerWithTeam[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<string>('All players');
  const [selectedTeam, setSelectedTeam] = useState<string>('All teams');
  const [sortBy, setSortBy] = useState<string>('Total points');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [maxCost, setMaxCost] = useState<number>(14.9);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  
  const { gameweekState } = useGameweek();
  const [currentGameweek, setCurrentGameweek] = useState<number>(1);
  const [playerPoints, setPlayerPoints] = useState<any[]>([]);
  const [loadingPoints, setLoadingPoints] = useState(false);

  // Teams list for filter
  const teams = [
    'All teams', 'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton',
    'Chelsea', 'Crystal Palace', 'Everton', 'Fulham', 'Ipswich', 'Leicester',
    'Liverpool', 'Man City', 'Man Utd', 'Newcastle', "Nott'm Forest",
    'Southampton', 'Spurs', 'West Ham', 'Wolves'
  ];

  // Position filters
  const positions = [
    'All players', 'Watchlist', 'Goalkeepers', 'Defenders', 'Midfielders', 'Forwards'
  ];

  // Sort options
  const sortOptions = [
    'Total points', 'Round points', 'Price', 'Team selected by %', 'Minutes played',
    'Goals scored', 'Assists', 'Clean sheets', 'Goals conceded', 'Own goals',
    'Penalties saved', 'Penalties missed', 'Yellow cards', 'Red cards', 'Saves',
    'Bonus', 'Bonus Points System', 'Influence', 'Creativity', 'Threat',
    'ICT Index', 'Form', 'Times in Dream Team', 'Value (form)', 'Value (season)',
    'Points per match', 'Transfers in', 'Transfers out'
  ];

  useEffect(() => {
    if (user) {
      fetchFantasyTeam();
      fetchAllPlayers();
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

  // Filter players based on selected criteria
  useEffect(() => {
    let filtered = allPlayers;

    // Filter by position
    if (selectedPosition !== 'All players' && selectedPosition !== 'Watchlist') {
      const positionMap: { [key: string]: string } = {
        'Goalkeepers': 'GK',
        'Defenders': 'DEF',
        'Midfielders': 'MID',
        'Forwards': 'FWD'
      };
      filtered = filtered.filter(player => player.position === positionMap[selectedPosition]);
    }

    // Filter by team
    if (selectedTeam !== 'All teams') {
      filtered = filtered.filter(player => player.team_name === selectedTeam);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(player => 
        player.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by max cost
    filtered = filtered.filter(player => player.price <= maxCost);

    // Sort players
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'Price':
          return b.price - a.price;
        case 'Total points':
          return (b.total_points || 0) - (a.total_points || 0);
        default:
          return a.name.localeCompare(b.name);
      }
    });

    setFilteredPlayers(filtered);
  }, [allPlayers, selectedPosition, selectedTeam, searchQuery, maxCost, sortBy]);

  const fetchAllPlayers = async () => {
    setLoadingPlayers(true);
    try {
      const { data, error } = await supabase
        .from('players')
        .select(`
          *,
          teams:team_id (
            name,
            jersey
          )
        `)
        .order('total_points', { ascending: false });

      if (error) throw error;

      const playersWithTeamNames = data?.map(player => ({
        ...player,
        team_name: player.teams?.name,
        team_jersey: player.teams?.jersey
      })) || [];

      setAllPlayers(playersWithTeamNames);
    } catch (error) {
      console.error('Error fetching players:', error);
      toast.error('Failed to fetch players');
    } finally {
      setLoadingPlayers(false);
    }
  };

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

  const getPlayersSelected = () => {
    return roster.length;
  };

  const getBudgetUsed = () => {
    if (!fantasyTeam) return 0;
    return 100 - fantasyTeam.budget_remaining; // Assuming starting budget is 100
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
    <div className="max-w-full mx-auto bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
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

      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 space-y-6 p-4">
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

            {/* Updated Team Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20">
                <div className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  <div>
                    <p className="text-sm text-emerald-100">Players Selected</p>
                    <p className="text-lg font-semibold">{getPlayersSelected()} / 15</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl border border-white/20">
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  <div>
                    <p className="text-sm text-emerald-100">Budget</p>
                    <p className="text-lg font-semibold">${getBudgetUsed().toFixed(1)}M</p>
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

          {/* View Toggle */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-white/50">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">View:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('pitch')}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'pitch'
                      ? 'bg-white text-emerald-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Grid className="h-4 w-4 mr-2" />
                  Pitch View
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    viewMode === 'list'
                      ? 'bg-white text-emerald-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <List className="h-4 w-4 mr-2" />
                  List View
                </button>
              </div>
            </div>
          </div>

          {/* Pitch View */}
          {viewMode === 'pitch' && (
            <>
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
                          className="w-16 h-16 mb-2 relative cursor-pointer hover:scale-105 transition-transform"
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
            </>
          )}

          {/* List View */}
          {viewMode === 'list' && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-white/50">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Squad</h2>
              
              {/* Starting XI */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-700 mb-3">Starting XI</h3>
                <div className="space-y-2">
                  {starters.map((rosterPlayer) => (
                    <div key={rosterPlayer.roster_id} className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10">
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
                            <span className="text-xs text-gray-500">Jersey</span>
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{rosterPlayer.player?.name}</div>
                          <div className="text-sm text-gray-600">{rosterPlayer.player?.team_name} • {rosterPlayer.player?.position}</div>
                        </div>
                        {rosterPlayer.is_captain && (
                          <div className="bg-yellow-500 text-white rounded-full p-1">
                            <Crown className="h-4 w-4" />
                          </div>
                        )}
                        {rosterPlayer.is_vice_captain && (
                          <div className="bg-gray-500 text-white rounded-full p-1">
                            <Star className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">£{rosterPlayer.player?.price}M</div>
                        <div className="text-sm text-gray-600">{rosterPlayer.player?.total_points || 0} pts</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Substitutes */}
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-3">Substitutes</h3>
                <div className="space-y-2">
                  {bench.map((rosterPlayer) => (
                    <div key={rosterPlayer.roster_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10">
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
                            <span className="text-xs text-gray-500">Jersey</span>
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{rosterPlayer.player?.name}</div>
                          <div className="text-sm text-gray-600">{rosterPlayer.player?.team_name} • {rosterPlayer.player?.position}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">£{rosterPlayer.player?.price}M</div>
                        <div className="text-sm text-gray-600">{rosterPlayer.player?.total_points || 0} pts</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

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

        {/* Player Selection Sidebar */}
        <div className="w-96 bg-white shadow-xl border-l border-gray-200 h-screen overflow-y-auto">
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-emerald-500 to-blue-600 text-white">
            <h2 className="text-lg font-semibold">Player Selection</h2>
          </div>

          {/* Filters */}
          <div className="p-4 space-y-4 border-b border-gray-200">
            {/* View Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">View</label>
              <select
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {positions.map(position => (
                  <option key={position} value={position}>{position}</option>
                ))}
              </select>
            </div>

            {/* Team Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Team</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {teams.map(team => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sorted by</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {sortOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            {/* Max Cost */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max cost: £{maxCost}M
              </label>
              <input
                type="range"
                min="0.5"
                max="14.9"
                step="0.1"
                value={maxCost}
                onChange={(e) => setMaxCost(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>£0.5M</span>
                <span>£14.9M</span>
              </div>
            </div>

            {/* Search */}
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Players List */}
          <div className="p-4">
            <div className="text-sm text-gray-600 mb-4">
              {filteredPlayers.length} players shown
            </div>

            {loadingPlayers ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
              </div>
            ) : (
              <div className="space-y-1">
                {['GK', 'DEF', 'MID', 'FWD'].map((position) => {
                  const positionPlayers = filteredPlayers.filter(player => player.position === position);
                  if (positionPlayers.length === 0) return null;

                  const positionNames = {
                    'GK': 'Goalkeepers',
                    'DEF': 'Defenders', 
                    'MID': 'Midfielders',
                    'FWD': 'Forwards'
                  };

                  return (
                    <div key={position}>
                      <h3 className="font-semibold text-gray-800 py-2 text-sm">
                        {positionNames[position as keyof typeof positionNames]}
                      </h3>
                      {positionPlayers.slice(0, 20).map((player) => (
                        <div
                          key={player.player_id}
                          className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border-b border-gray-100"
                          onClick={() => handlePlayerClick(player)}
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="w-8 h-8 flex-shrink-0">
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
                              <div 
                                className={`w-full h-full bg-gray-300 rounded flex items-center justify-center ${
                                  player.team_jersey ? 'hidden' : 'flex'
                                }`}
                              >
                                <span className="text-xs text-gray-500">{player.position}</span>
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-medium text-gray-900 text-sm truncate">
                                {player.name}
                              </div>
                              <div className="text-xs text-gray-600">
                                {player.team_name} • {player.position}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-900">
                                £{player.price}
                              </div>
                              <div className="text-xs text-gray-600">
                                {player.total_points || 0}
                              </div>
                            </div>
                            <button className="text-gray-400 hover:text-gray-600 p-1">
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Player Card Component for Pitch View
function PlayerCard({ rosterPlayer, canMakeChanges, onSetCaptain, onSetViceCaptain, onPlayerClick }: {
  rosterPlayer: RosterPlayer;
  canMakeChanges: boolean;
  onSetCaptain: () => void;
  onSetViceCaptain: () => void;
  onPlayerClick: () => void;
}) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="relative group">
      <div 
        className="bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-white/50 hover:shadow-xl transition-all duration-200 cursor-pointer hover:scale-105"
        onClick={onPlayerClick}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        {/* Player Jersey */}
        <div className="w-16 h-16 mb-2 relative mx-auto">
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
          <div className="font-medium text-gray-900 text-sm mb-1 truncate">
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

        {/* Action buttons */}
        {canMakeChanges && showActions && (
          <div className="absolute -top-2 -right-2 flex space-x-1">
            {!rosterPlayer.is_captain && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSetCaptain();
                }}
                className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-full p-1 shadow-lg"
                title="Set as Captain"
              >
                <Crown className="h-3 w-3" />
              </button>
            )}
            {!rosterPlayer.is_vice_captain && !rosterPlayer.is_captain && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSetViceCaptain();
                }}
                className="bg-gray-500 hover:bg-gray-600 text-white rounded-full p-1 shadow-lg"
                title="Set as Vice Captain"
              >
                <Star className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}