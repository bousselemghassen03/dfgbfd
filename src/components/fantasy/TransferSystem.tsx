import React, { useState, useEffect } from 'react';
import { ArrowRightLeft, Clock, AlertTriangle, CheckCircle, X, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Player, FantasyTeam, Roster } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';
import { useGameweek } from '../../contexts/GameweekContext';
import toast from 'react-hot-toast';

interface PlayerWithTeam extends Player {
  team_name?: string;
  team_jersey?: string;
}

interface RosterPlayer extends Roster {
  player: PlayerWithTeam;
}

interface TransferState {
  transfersUsed: number;
  transfersRemaining: number;
  freeTransfers: number;
  bankedTransfers: number;
  transferDeadline: Date | null;
  canMakeTransfers: boolean;
}

export default function TransferSystem() {
  const { user } = useAuth();
  const { gameweekState } = useGameweek();
  const [fantasyTeam, setFantasyTeam] = useState<FantasyTeam | null>(null);
  const [roster, setRoster] = useState<RosterPlayer[]>([]);
  const [availablePlayers, setAvailablePlayers] = useState<PlayerWithTeam[]>([]);
  const [transferState, setTransferState] = useState<TransferState>({
    transfersUsed: 0,
    transfersRemaining: 0,
    freeTransfers: 1,
    bankedTransfers: 0,
    transferDeadline: null,
    canMakeTransfers: false
  });
  const [pendingTransfers, setPendingTransfers] = useState<{
    out: RosterPlayer | null;
    in: PlayerWithTeam | null;
  }>({ out: null, in: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentGameweek, setCurrentGameweek] = useState(1);

  useEffect(() => {
    if (user) {
      fetchFantasyTeam();
      fetchCurrentGameweek();
    }
  }, [user]);

  useEffect(() => {
    updateTransferState();
  }, [gameweekState, currentGameweek]);

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

  const fetchFantasyTeam = async () => {
    if (!user) return;

    try {
      const { data: teamData, error: teamError } = await supabase
        .from('fantasy_teams')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (teamError) throw teamError;
      setFantasyTeam(teamData);

      if (teamData) {
        await fetchRoster(teamData.fantasy_team_id);
        await fetchAvailablePlayers();
      }
    } catch (error) {
      console.error('Error fetching fantasy team:', error);
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
        .eq('fantasy_team_id', fantasyTeamId);

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
    }
  };

  const fetchAvailablePlayers = async () => {
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
        .order('name');

      if (error) throw error;

      const playersWithTeamNames = data?.map(player => ({
        ...player,
        team_name: player.teams?.name,
        team_jersey: player.teams?.jersey
      })) || [];

      setAvailablePlayers(playersWithTeamNames);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const updateTransferState = () => {
    // Calculate transfer deadline (1.5 hours before first match of gameweek)
    const now = new Date();
    const transferDeadline = new Date();
    transferDeadline.setHours(transferDeadline.getHours() + 1.5); // Mock deadline

    let canMakeTransfers = false;
    let freeTransfers = 1;
    let bankedTransfers = fantasyTeam?.transfers_remaining || 0;

    if (currentGameweek === 1) {
      // Before Gameweek 1: Unlimited transfers
      canMakeTransfers = gameweekState === 'outside';
      freeTransfers = 999; // Unlimited
    } else {
      // Regular gameweeks
      if (gameweekState === 'outside') {
        // Between gameweeks: 1 free transfer + banked transfers (max 2 total)
        canMakeTransfers = true;
        const totalTransfers = Math.min(freeTransfers + bankedTransfers, 2);
        freeTransfers = totalTransfers;
      } else {
        // During gameweek: No transfers allowed
        canMakeTransfers = false;
      }
    }

    setTransferState({
      transfersUsed: 0,
      transfersRemaining: freeTransfers,
      freeTransfers,
      bankedTransfers,
      transferDeadline,
      canMakeTransfers
    });
  };

  const selectPlayerOut = (player: RosterPlayer) => {
    setPendingTransfers(prev => ({ ...prev, out: player, in: null }));
  };

  const selectPlayerIn = (player: PlayerWithTeam) => {
    if (!pendingTransfers.out) {
      toast.error('Please select a player to transfer out first');
      return;
    }

    if (player.position !== pendingTransfers.out.player.position) {
      toast.error('Replacement player must be in the same position');
      return;
    }

    const currentBudget = fantasyTeam?.budget_remaining || 0;
    const priceDifference = player.price - pendingTransfers.out.player.price;
    
    if (priceDifference > currentBudget) {
      toast.error('Insufficient budget for this transfer');
      return;
    }

    setPendingTransfers(prev => ({ ...prev, in: player }));
  };

  const confirmTransfer = async () => {
    if (!pendingTransfers.out || !pendingTransfers.in || !fantasyTeam) {
      toast.error('Please select both players for the transfer');
      return;
    }

    if (transferState.transfersRemaining <= 0) {
      toast.error('No transfers remaining');
      return;
    }

    try {
      // Update roster
      const { error: rosterError } = await supabase
        .from('rosters')
        .update({ 
          player_id: pendingTransfers.in.player_id,
          purchase_price: pendingTransfers.in.price
        })
        .eq('roster_id', pendingTransfers.out.roster_id);

      if (rosterError) throw rosterError;

      // Update budget
      const priceDifference = pendingTransfers.in.price - pendingTransfers.out.player.price;
      const newBudget = fantasyTeam.budget_remaining - priceDifference;
      const newTransfersRemaining = Math.max(0, transferState.transfersRemaining - 1);

      const { error: teamError } = await supabase
        .from('fantasy_teams')
        .update({ 
          budget_remaining: newBudget,
          transfers_remaining: newTransfersRemaining
        })
        .eq('fantasy_team_id', fantasyTeam.fantasy_team_id);

      if (teamError) throw teamError;

      // Record transaction
      await supabase
        .from('transactions')
        .insert([
          {
            fantasy_team_id: fantasyTeam.fantasy_team_id,
            player_id: pendingTransfers.out.player.player_id,
            transaction_type: 'transfer_out',
            gameweek: currentGameweek,
            price: pendingTransfers.out.player.price
          },
          {
            fantasy_team_id: fantasyTeam.fantasy_team_id,
            player_id: pendingTransfers.in.player_id,
            transaction_type: 'transfer_in',
            gameweek: currentGameweek,
            price: pendingTransfers.in.price
          }
        ]);

      toast.success(`${pendingTransfers.out.player.name} → ${pendingTransfers.in.name} transfer completed!`);
      
      // Reset state
      setPendingTransfers({ out: null, in: null });
      setFantasyTeam(prev => prev ? { 
        ...prev, 
        budget_remaining: newBudget,
        transfers_remaining: newTransfersRemaining
      } : null);
      
      // Refresh data
      if (fantasyTeam) {
        await fetchRoster(fantasyTeam.fantasy_team_id);
      }
      updateTransferState();
    } catch (error) {
      console.error('Error making transfer:', error);
      toast.error('Failed to complete transfer');
    }
  };

  const cancelTransfer = () => {
    setPendingTransfers({ out: null, in: null });
  };

  const filteredPlayers = availablePlayers.filter(player => {
    if (roster.some(r => r.player.player_id === player.player_id)) return false;
    
    const matchesSearch = player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.team_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPosition = !positionFilter || player.position === positionFilter;
    
    return matchesSearch && matchesPosition;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!fantasyTeam) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">You need to create a fantasy team first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Transfer Status */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <ArrowRightLeft className="h-5 w-5 mr-2" />
          Transfer System
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-emerald-50 p-4 rounded-lg">
            <div className="text-emerald-600 text-sm font-medium">Free Transfers</div>
            <div className="text-2xl font-bold text-emerald-900">{transferState.freeTransfers}</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-blue-600 text-sm font-medium">Transfers Remaining</div>
            <div className="text-2xl font-bold text-blue-900">{transferState.transfersRemaining}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-purple-600 text-sm font-medium">Budget Remaining</div>
            <div className="text-2xl font-bold text-purple-900">£{fantasyTeam.budget_remaining}M</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-orange-600 text-sm font-medium">Gameweek</div>
            <div className="text-2xl font-bold text-orange-900">{currentGameweek}</div>
          </div>
        </div>

        {/* Transfer Status Messages */}
        <div className="space-y-2">
          {!transferState.canMakeTransfers && (
            <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-red-700">
                {gameweekState === 'inside' 
                  ? 'Transfers are not allowed during an active gameweek'
                  : 'Transfer deadline has passed'
                }
              </span>
            </div>
          )}
          
          {transferState.canMakeTransfers && currentGameweek === 1 && (
            <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <span className="text-green-700">
                Unlimited transfers available before Gameweek 1
              </span>
            </div>
          )}
          
          {transferState.canMakeTransfers && currentGameweek > 1 && (
            <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Clock className="h-5 w-5 text-blue-500 mr-2" />
              <span className="text-blue-700">
                Transfer window is open. You have {transferState.transfersRemaining} transfer(s) available.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Pending Transfer */}
      {(pendingTransfers.out || pendingTransfers.in) && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Transfer</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-sm text-gray-500">OUT</div>
                <div className="font-medium">
                  {pendingTransfers.out ? pendingTransfers.out.player.name : 'Select player'}
                </div>
                {pendingTransfers.out && (
                  <div className="text-sm text-gray-500">£{pendingTransfers.out.player.price}M</div>
                )}
              </div>
              <ArrowRightLeft className="h-6 w-6 text-gray-400" />
              <div className="text-center">
                <div className="text-sm text-gray-500">IN</div>
                <div className="font-medium">
                  {pendingTransfers.in ? pendingTransfers.in.name : 'Select player'}
                </div>
                {pendingTransfers.in && (
                  <div className="text-sm text-gray-500">£{pendingTransfers.in.price}M</div>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              {pendingTransfers.out && pendingTransfers.in && (
                <button
                  onClick={confirmTransfer}
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Confirm Transfer
                </button>
              )}
              <button
                onClick={cancelTransfer}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {transferState.canMakeTransfers && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Current Squad */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Squad</h3>
            <div className="space-y-2">
              {roster.map(rosterPlayer => (
                <div
                  key={rosterPlayer.roster_id}
                  onClick={() => selectPlayerOut(rosterPlayer)}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    pendingTransfers.out?.roster_id === rosterPlayer.roster_id
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{rosterPlayer.player.name}</div>
                      <div className="text-sm text-gray-500">
                        {rosterPlayer.player.team_name} • £{rosterPlayer.player.price}M
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      rosterPlayer.player.position === 'GK' ? 'bg-purple-100 text-purple-800' :
                      rosterPlayer.player.position === 'DEF' ? 'bg-blue-100 text-blue-800' :
                      rosterPlayer.player.position === 'MID' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {rosterPlayer.player.position}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Available Players */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Players</h3>
            
            {/* Filters */}
            <div className="flex space-x-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search players..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <select
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">All Positions</option>
                <option value="GK">Goalkeeper</option>
                <option value="DEF">Defender</option>
                <option value="MID">Midfielder</option>
                <option value="FWD">Forward</option>
              </select>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredPlayers
                .filter(player => !pendingTransfers.out || player.position === pendingTransfers.out.player.position)
                .map(player => {
                  const priceDifference = pendingTransfers.out ? player.price - pendingTransfers.out.player.price : 0;
                  const canAfford = priceDifference <= (fantasyTeam?.budget_remaining || 0);
                  
                  return (
                    <div
                      key={player.player_id}
                      onClick={() => canAfford && selectPlayerIn(player)}
                      className={`p-3 border rounded-lg transition-colors ${
                        !canAfford ? 'border-red-200 bg-red-50 cursor-not-allowed' :
                        pendingTransfers.in?.player_id === player.player_id ? 'border-emerald-500 bg-emerald-50 cursor-pointer' :
                        'border-gray-200 hover:border-gray-300 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{player.name}</div>
                          <div className="text-sm text-gray-500">
                            {player.team_name} • £{player.price}M
                            {priceDifference !== 0 && (
                              <span className={`ml-2 ${priceDifference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                ({priceDifference > 0 ? '+' : ''}£{priceDifference.toFixed(1)}M)
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          player.position === 'GK' ? 'bg-purple-100 text-purple-800' :
                          player.position === 'DEF' ? 'bg-blue-100 text-blue-800' :
                          player.position === 'MID' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {player.position}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}