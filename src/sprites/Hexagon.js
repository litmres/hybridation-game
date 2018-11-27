import Phaser from 'phaser';
import color from 'color';
import { forEach, clone } from 'lodash';

export default class extends Phaser.Group {
    constructor ({game, x, y, asset, width, height, cell, player, state, attack}) {
        super(game, x, y, asset);
        this.game = game;

        this.cell = cell;
        this.player = player;
        this.state = state;
        this.attack = attack;
        this.selected = false;

        this.hexagon = new Phaser.Sprite(this.game, x, y, asset);
        this.hexagon.anchor.setTo(0.5);
        this.hexagon.inputEnabled = true;
        this.hexagon.events.onInputDown.add(this.mclick, this);
        this.hexagon.tint = this.getTint();
        this.hexagon.width = width;
        this.hexagon.height = height;

        this.attackText = new Phaser.Text(this.game, x + 2, y + 2, attack, {
            font: '18px KenVector Future ',
            fill: 'black',
            stroke: false,
            strokeWidth: 1,
            wordWrap: false,
            align: 'center'
        });
        this.attackText.smoothed = false;
        this.attackText.setShadow(1, 1, 'rgba(0,0,0,1)', 0);
        this.attackText.anchor.set(0.5);
        this.add(this.hexagon);
        this.add(this.attackText);
    }

    getTint () {
        let minPercentage = 0.5;
        let range = 1 - minPercentage;
        let $attackPercentage = ((this.attack * 100) / this.game.global.MAX_ATTACK) / 100;
        let $inRangePercentage = ($attackPercentage * range);
        let $tint = color(this.player.tint).lighten(1 - (minPercentage + $inRangePercentage)).rgbNumber();
        return $tint;
    }

    mclick () {
        let currentPlayer = this.game.global.PLAYER_ARRAY[this.game.global.CURRENT_PLAYER];
        currentPlayer.interact(this);
    }

    select () {
        this.selected = true;
        this.hexagon.tint = Phaser.Color.RED;
        return this;
    }

    unselect () {
        this.selected = false;
        this.hexagon.tint = this.getTint();
    }

    isAdjacentTo (hexagon) {
        let cellFound = false;
        forEach(this.cell.connections, function (connectionCell) {
            if (typeof connectionCell === 'object' && connectionCell.id === hexagon.cell.id) {
                cellFound = true;
                return false;
            }
        });
        return cellFound;
    }

    updateAttackText () {
        this.attackText.text = this.attack;
    }

    isSelected () {
        return this.selected;
    }

    isOwnedBy (playerId) {
        return playerId === this.player.id;
    }

    increaseAttack () {
        this.attack = this.attack + 1;
        this.hexagon.tint = this.getTint();
        this.updateAttackText();
    }

    getConnectionsByPlayer ($onlyPlayer = null) {
        let $possibleMoves = clone(this.cell.connections).filter(function (cell) {
            if ($onlyPlayer) {
                return (typeof cell === 'object' && cell.asset.player === this.$onlyPlayer);
            } else {
                return (typeof cell === 'object' && cell.asset.player !== this.player);
            }
        }, this);
        return $possibleMoves;
    }

    scoreMoves () {
        let $possibleMoves = this.getConnectionsByPlayer();

        //score diff
        $possibleMoves = $possibleMoves.map(function (cell) {
            cell.movePoints = this.attack - cell.asset.attack;
            return cell;
        }, this);

        //score messing chains
        $possibleMoves = $possibleMoves.map(function (cell) {
            //check how big chain cell is part of
            cell.chainPoints = cell.clusterBelongs.length;
            return cell;
        }, this);

        //score connecting to chains
        $possibleMoves = $possibleMoves.map(function (cell) {
            //find all connecting cells that are the attackers same player
            //exclude attacking hexagon
            //exclude attacking cluster siblings
            //store an increment of chainPoints from found cells in victim cell

            let $friends = cell.asset.getConnectionsByPlayer(this.player);
            if ($friends.length > 0) {
                $friends = $friends.filter(function (cell) {
                    return (cell.id !== this.id &&
                        cell.clusterBelongs.filter(function (value) {
                            return cell.id === this.id;
                        }, this).length === 0);
                }, this);

                cell.friendsPoints = $friends.reduce(function (accumulator, currentCell) {
                    return accumulator + currentCell.clusterBelongs.length;
                });
            }
            return cell;
        }, this);

        return $possibleMoves;
    }
}
